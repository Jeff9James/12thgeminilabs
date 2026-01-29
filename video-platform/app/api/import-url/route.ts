import { NextRequest } from 'next/server';
import { saveFile } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';
import { getFileCategoryFromMimeType, getFileCategoryFromExtension, FileCategory } from '@/lib/fileTypes';
import { put } from '@vercel/blob';

// Use Node.js runtime for fetch operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// Helper to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, data: any) {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Helper to detect MIME type from URL extension
function detectMimeTypeFromUrl(url: string): string {
    const extension = url.split('?')[0].split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
        // Video
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'flv': 'video/x-flv',
        'm4v': 'video/x-m4v',
        '3gp': 'video/3gpp',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        'wma': 'audio/x-ms-wma',
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'ico': 'image/x-icon',
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'odt': 'application/vnd.oasis.opendocument.text',
        'rtf': 'application/rtf',
        // Spreadsheets
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'csv': 'text/csv',
        'ods': 'application/vnd.oasis.opendocument.spreadsheet',
        // Text
        'txt': 'text/plain',
        'md': 'text/markdown',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'htm': 'text/html',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
}

// Helper to check if URL points to a supported file type
function getSupportedFileExtensions(): string[] {
    return [
        // Video
        'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v', '3gp',
        // Audio
        'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma',
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico',
        // Documents
        'pdf', 'doc', 'docx', 'odt', 'rtf',
        // Spreadsheets
        'xls', 'xlsx', 'csv', 'ods',
        // Text
        'txt', 'md', 'json', 'xml', 'html', 'htm'
    ];
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { url, title: customTitle, category: requestedCategory } = await request.json();

                if (!url) {
                    sendEvent(controller, { error: 'No URL provided' });
                    controller.close();
                    return;
                }

                // Validate URL
                let fileUrl: URL;
                try {
                    fileUrl = new URL(url);
                } catch {
                    sendEvent(controller, { error: 'Invalid URL provided' });
                    controller.close();
                    return;
                }

                // Detect file type from URL extension
                const fileExtension = url.split('?')[0].split('.').pop()?.toLowerCase();
                const supportedExtensions = getSupportedFileExtensions();
                const isDirectFile = fileExtension && supportedExtensions.includes(fileExtension);

                if (!isDirectFile) {
                    sendEvent(controller, {
                        error: `URL must point to a supported file type. Detected extension: ${fileExtension || 'none'}. Supported: ${supportedExtensions.join(', ')}`
                    });
                    controller.close();
                    return;
                }

                // Detect MIME type and category
                const detectedMimeType = detectMimeTypeFromUrl(url);
                let category: FileCategory = requestedCategory;

                if (!category) {
                    category = getFileCategoryFromMimeType(detectedMimeType) ||
                        getFileCategoryFromExtension(fileExtension) ||
                        'unknown';
                }

                const fileId = uuidv4();

                sendEvent(controller, { progress: `Fetching ${category} from URL...` });

                // Try multiple fetch strategies
                let fileResponse: Response | null = null;
                let lastError: Error | null = null;

                // Strategy 1: Direct fetch with browser-like headers
                try {
                    fileResponse = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': '*/*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'identity',
                            'Referer': fileUrl.origin,
                            'Origin': fileUrl.origin,
                        },
                        redirect: 'follow',
                    });
                } catch (err) {
                    lastError = err as Error;
                    console.log('Strategy 1 failed:', err);
                }

                // Strategy 2: Try without certain headers that might cause issues
                if (!fileResponse || !fileResponse.ok) {
                    try {
                        fileResponse = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            },
                            redirect: 'follow',
                        });
                    } catch (err) {
                        lastError = err as Error;
                        console.log('Strategy 2 failed:', err);
                    }
                }

                // Strategy 3: Try with Range header for partial content (some servers require this)
                if (!fileResponse || !fileResponse.ok) {
                    try {
                        fileResponse = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Range': 'bytes=0-',
                            },
                            redirect: 'follow',
                        });
                    } catch (err) {
                        lastError = err as Error;
                        console.log('Strategy 3 failed:', err);
                    }
                }

                if (!fileResponse || !fileResponse.ok) {
                    const status = fileResponse?.status || 'unknown';
                    const statusText = fileResponse?.statusText || 'No response';
                    throw new Error(
                        `Failed to fetch file from URL. Server responded with: ${status} ${statusText}. ` +
                        `This URL may not allow direct downloads. Try using a direct file link.`
                    );
                }

                // Get content type from response or use detected type
                const contentType = fileResponse.headers.get('content-type') || detectedMimeType;
                const contentLength = fileResponse.headers.get('content-length');

                // Check if we got HTML instead of file (common with redirect pages)
                if (contentType.includes('text/html')) {
                    throw new Error(
                        'The URL returned an HTML page instead of a file. ' +
                        'Please use a direct file URL.'
                    );
                }

                // Determine size limits based on file type
                const getSizeLimit = (cat: FileCategory): number => {
                    switch (cat) {
                        case 'video':
                        case 'audio': return 100; // 100MB for video/audio
                        case 'image': return 20; // 20MB for images
                        default: return 50; // 50MB for documents
                    }
                };

                const sizeLimitMB = getSizeLimit(category);

                // Check file size if header is available
                if (contentLength) {
                    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
                    if (sizeInMB > sizeLimitMB) {
                        throw new Error(`File too large (${Math.round(sizeInMB)}MB). Maximum size for ${category} URL import is ${sizeLimitMB}MB.`);
                    }
                }

                sendEvent(controller, { progress: `Downloading ${category}...` });

                // Get the file data
                let fileBuffer: ArrayBuffer;
                try {
                    fileBuffer = await fileResponse.arrayBuffer();
                } catch (err) {
                    throw new Error('Failed to download file data. The server may have closed the connection.');
                }

                const fileData = Buffer.from(fileBuffer);

                if (fileData.length === 0) {
                    throw new Error('Downloaded file is empty');
                }

                // Check size after download if Content-Length wasn't provided
                const sizeInMB = Math.round(fileData.length / (1024 * 1024));
                if (sizeInMB > sizeLimitMB) {
                    throw new Error(`File too large (${sizeInMB}MB). Maximum size for ${category} URL import is ${sizeLimitMB}MB.`);
                }

                sendEvent(controller, { progress: `Downloaded ${sizeInMB}MB, uploading to Gemini...` });

                // Use Gemini REST API for resumable upload
                const apiKey = process.env.GEMINI_API_KEY!;

                // Extract filename from URL or use default
                const urlPath = fileUrl.pathname;
                const fileNameFromUrl = urlPath.split('/').pop() || `file.${fileExtension}`;
                const displayName = customTitle || fileNameFromUrl;

                // Step 1: Initialize resumable upload
                const initResponse = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
                    method: 'POST',
                    headers: {
                        'X-Goog-Upload-Protocol': 'resumable',
                        'X-Goog-Upload-Command': 'start',
                        'X-Goog-Upload-Header-Content-Length': fileData.length.toString(),
                        'X-Goog-Upload-Header-Content-Type': contentType,
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify({
                        file: {
                            display_name: displayName
                        }
                    })
                });

                const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
                if (!uploadUrl) {
                    throw new Error('Failed to initialize upload to Gemini');
                }

                // Step 2: Upload the file
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Length': fileData.length.toString(),
                        'X-Goog-Upload-Offset': '0',
                        'X-Goog-Upload-Command': 'upload, finalize'
                    },
                    body: fileData
                });

                if (!uploadResponse.ok) {
                    throw new Error(`Upload to Gemini failed: ${uploadResponse.statusText}`);
                }

                const uploadResult = await uploadResponse.json();
                const geminiFileName = uploadResult.file.name;

                sendEvent(controller, { progress: `Processing ${category} with Gemini...` });

                // Step 3: Wait for processing
                let geminiFileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${apiKey}`)
                    .then(r => r.json());

                let attempts = 0;
                while (geminiFileInfo.state === 'PROCESSING' && attempts < 60) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    geminiFileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${apiKey}`)
                        .then(r => r.json());
                    attempts++;

                    if (attempts % 3 === 0) {
                        sendEvent(controller, { progress: `Processing... (${attempts * 3}s)` });
                    }
                }

                if (geminiFileInfo.state === 'FAILED') {
                    throw new Error('File processing failed in Gemini');
                }

                sendEvent(controller, { progress: 'Saving metadata...' });

                // For images from URL, upload to Vercel Blob for reliable preview
                let playbackUrl = url;
                if (category === 'image') {
                    try {
                        sendEvent(controller, { progress: 'Saving image to cloud storage for preview...' });
                        const blob = await put(`files/${fileId}-${displayName}`, fileData, {
                            access: 'public',
                            contentType: contentType
                        });
                        playbackUrl = blob.url;
                    } catch (err) {
                        console.warn('Failed to save image to Vercel Blob, using original URL:', err);
                        // Fall back to original URL
                    }
                }

                // Save metadata to KV
                const fileMetadata = {
                    id: fileId,
                    title: displayName,
                    fileName: displayName,
                    geminiFileUri: geminiFileInfo.uri,
                    fileUri: geminiFileInfo.uri,
                    geminiFileName: geminiFileName,
                    playbackUrl: playbackUrl, // Store URL for playback/preview
                    sourceUrl: url,   // Track the source
                    sourceType: 'url-import',
                    createdAt: new Date().toISOString(),
                    uploadedAt: new Date().toISOString(),
                    userId: 'demo-user',
                    status: 'ready' as const,
                    mimeType: contentType,
                    size: fileData.length,
                    category: category,
                };
                await saveFile(fileId, fileMetadata);

                sendEvent(controller, { success: true, fileId, metadata: fileMetadata });
                controller.close();
            } catch (error: any) {
                console.error('URL import error:', error);
                sendEvent(controller, { error: error.message });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

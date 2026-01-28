import { NextRequest } from 'next/server';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

// Use Node.js runtime for fetch operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// Helper to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, data: any) {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { url, title: customTitle } = await request.json();

                if (!url) {
                    sendEvent(controller, { error: 'No URL provided' });
                    controller.close();
                    return;
                }

                // Validate URL
                let videoUrl: URL;
                try {
                    videoUrl = new URL(url);
                } catch {
                    sendEvent(controller, { error: 'Invalid URL provided' });
                    controller.close();
                    return;
                }

                // Check for supported video platforms
                const supportedPlatforms = [
                    'youtube.com', 'youtu.be',
                    'vimeo.com',
                    'cloudinary.com',
                    'amazonaws.com', // S3
                    'blob.core.windows.net', // Azure
                    'storage.googleapis.com', // GCS
                    'dropboxusercontent.com',
                    'wistia.com',
                    'dailymotion.com',
                    'tiktok.com'
                ];

                const isDirectVideo = url.match(/\.(mp4|mov|avi|mkv|webm|flv|m4v|3gp)(\?.*)?$/i);
                const isSupportedPlatform = supportedPlatforms.some(platform =>
                    videoUrl.hostname.includes(platform)
                );

                if (!isDirectVideo && !isSupportedPlatform) {
                    sendEvent(controller, {
                        error: 'URL must be a direct video link (ending in .mp4, .mov, etc.) or from a supported platform (YouTube, Vimeo, Cloudinary, etc.)'
                    });
                    controller.close();
                    return;
                }

                const videoId = uuidv4();

                sendEvent(controller, { progress: 'Fetching video from URL...' });

                // Try multiple fetch strategies
                let videoResponse: Response | null = null;
                let lastError: Error | null = null;

                // Strategy 1: Direct fetch with browser-like headers
                try {
                    videoResponse = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'identity', // Don't request compression for binary data
                            'Referer': videoUrl.origin,
                            'Origin': videoUrl.origin,
                        },
                        redirect: 'follow',
                    });
                } catch (err) {
                    lastError = err as Error;
                    console.log('Strategy 1 failed:', err);
                }

                // Strategy 2: Try without certain headers that might cause issues
                if (!videoResponse || !videoResponse.ok) {
                    try {
                        videoResponse = await fetch(url, {
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
                if (!videoResponse || !videoResponse.ok) {
                    try {
                        videoResponse = await fetch(url, {
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

                if (!videoResponse || !videoResponse.ok) {
                    const status = videoResponse?.status || 'unknown';
                    const statusText = videoResponse?.statusText || 'No response';
                    throw new Error(
                        `Failed to fetch video from URL. Server responded with: ${status} ${statusText}. ` +
                        `This URL may not allow direct downloads. Try using a direct video link (ending in .mp4) ` +
                        `or a video from a platform with public download support.`
                    );
                }

                const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
                const contentLength = videoResponse.headers.get('content-length');

                // Check if we got HTML instead of video (common with YouTube/Vimeo)
                if (contentType.includes('text/html')) {
                    throw new Error(
                        'The URL returned an HTML page instead of a video file. ' +
                        'YouTube, Vimeo, and similar platforms block direct video downloads. ' +
                        'Please use a direct video URL (ending in .mp4, .mov, .webm, etc.) ' +
                        'from a storage service like S3, Cloudinary, or Google Cloud Storage.'
                    );
                }

                // Check file size if header is available
                if (contentLength) {
                    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
                    if (sizeInMB > 100) { // 100MB limit for URL imports
                        throw new Error(`Video too large (${Math.round(sizeInMB)}MB). Maximum size for URL import is 100MB.`);
                    }
                }

                sendEvent(controller, { progress: 'Downloading video...' });

                // Get the video data
                let videoBuffer: ArrayBuffer;
                try {
                    videoBuffer = await videoResponse.arrayBuffer();
                } catch (err) {
                    throw new Error('Failed to download video data. The server may have closed the connection.');
                }

                const fileData = Buffer.from(videoBuffer);

                if (fileData.length === 0) {
                    throw new Error('Downloaded video is empty');
                }

                // Check size after download if Content-Length wasn't provided
                const sizeInMB = Math.round(fileData.length / (1024 * 1024));
                if (sizeInMB > 100) {
                    throw new Error(`Video too large (${sizeInMB}MB). Maximum size for URL import is 100MB.`);
                }

                sendEvent(controller, { progress: `Downloaded ${sizeInMB}MB, uploading to Gemini...` });

                // Use Gemini REST API for resumable upload
                const apiKey = process.env.GEMINI_API_KEY!;

                // Extract filename from URL or use default
                const urlPath = videoUrl.pathname;
                const fileNameFromUrl = urlPath.split('/').pop() || 'video.mp4';
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

                sendEvent(controller, { progress: 'Processing video with Gemini...' });

                // Step 3: Wait for processing
                let fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${apiKey}`)
                    .then(r => r.json());

                let attempts = 0;
                while (fileInfo.state === 'PROCESSING' && attempts < 60) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${apiKey}`)
                        .then(r => r.json());
                    attempts++;

                    if (attempts % 3 === 0) {
                        sendEvent(controller, { progress: `Processing... (${attempts * 3}s)` });
                    }
                }

                if (fileInfo.state === 'FAILED') {
                    throw new Error('Video processing failed in Gemini');
                }

                sendEvent(controller, { progress: 'Saving metadata...' });

                // Save metadata to KV
                const videoMetadata = {
                    id: videoId,
                    title: displayName,
                    geminiFileUri: fileInfo.uri,
                    fileUri: fileInfo.uri,
                    geminiFileName: geminiFileName,
                    playbackUrl: url, // Store original URL for playback
                    sourceUrl: url,   // Track the source
                    sourceType: 'url-import',
                    createdAt: new Date().toISOString(),
                    userId: 'demo-user',
                    status: 'ready',
                    mimeType: contentType,
                    size: fileData.length
                };
                await saveVideo(videoId, videoMetadata);

                sendEvent(controller, { success: true, videoId, metadata: videoMetadata });
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

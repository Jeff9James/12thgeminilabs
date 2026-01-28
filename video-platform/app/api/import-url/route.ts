import { NextRequest } from 'next/server';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

// Use Node.js runtime for fetch operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const { url, title: customTitle } = await request.json();

                if (!url) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No URL provided' })}\n\n`));
                    controller.close();
                    return;
                }

                // Validate URL
                let videoUrl: URL;
                try {
                    videoUrl = new URL(url);
                } catch {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Invalid URL provided' })}\n\n`));
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
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        error: 'URL must be a direct video link (ending in .mp4, .mov, etc.) or from a supported platform (YouTube, Vimeo, Cloudinary, etc.)'
                    })}\n\n`));
                    controller.close();
                    return;
                }

                const videoId = uuidv4();

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Fetching video from URL...' })}\n\n`));

                // Fetch the video from the URL
                const videoResponse = await fetch(url, {
                    method: 'GET',
                    // Some platforms require specific headers
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (!videoResponse.ok) {
                    throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
                }

                const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
                const contentLength = videoResponse.headers.get('content-length');

                // Check file size if header is available
                if (contentLength) {
                    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
                    if (sizeInMB > 100) { // 100MB limit for URL imports
                        throw new Error(`Video too large (${Math.round(sizeInMB)}MB). Maximum size for URL import is 100MB.`);
                    }
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Downloading video...' })}\n\n`));

                // Get the video data
                const videoBuffer = await videoResponse.arrayBuffer();
                const fileData = Buffer.from(videoBuffer);

                if (fileData.length === 0) {
                    throw new Error('Downloaded video is empty');
                }

                const sizeInMB = Math.round(fileData.length / (1024 * 1024));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Downloaded ${sizeInMB}MB, uploading to Gemini...` })}\n\n`));

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

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Processing video with Gemini...' })}\n\n`));

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
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Processing... (${attempts * 3}s)` })}\n\n`));
                    }
                }

                if (fileInfo.state === 'FAILED') {
                    throw new Error('Video processing failed in Gemini');
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Saving metadata...' })}\n\n`));

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

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ success: true, videoId, metadata: videoMetadata })}\n\n`));
                controller.close();
            } catch (error: any) {
                console.error('URL import error:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
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

# Quick Next.js Setup Guide - Gemini Video Platform

## 🚀 Complete Migration in 30 Minutes

Follow these steps to migrate from Railway to Vercel-only with Next.js + Streaming.

---

## Step 1: Create New Next.js App (5 min)

```bash
cd c:\Users\HP\Downloads\12thgeminilabs
npx create-next-app@latest video-platform --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd video-platform
```

Answer prompts:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **No**
- App Router: **Yes**
- Import alias: **@/***

---

## Step 2: Install Dependencies (2 min)

```bash
npm install @google/generative-ai @vercel/kv jose
npm install -D @types/node
```

---

## Step 3: Setup Environment Variables (3 min)

Create `.env.local`:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth (optional for now)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Auth
JWT_SECRET=your_jwt_secret_here

# Vercel KV (will be auto-injected after setup)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

---

## Step 4: Create Core Files (10 min)

### 4.1: Gemini Client (`lib/gemini.ts`)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeVideoStreaming(videoFileUri: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  
  const prompt = `Analyze this video and provide:
1. A comprehensive summary
2. Temporal breakdown of scenes with timestamps

Format as JSON:
{
  "summary": "...",
  "scenes": [
    {"start": "0:05", "end": "0:12", "label": "...", "description": "..."}
  ]
}`;

  const result = await model.generateContentStream([
    {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: videoFileUri
      }
    },
    { text: prompt }
  ]);

  return result.stream;
}

export async function uploadVideoToGemini(videoBuffer: Buffer, mimeType: string) {
  const fileManager = genAI.getFileManager();
  
  const uploadResult = await fileManager.uploadFile(videoBuffer, {
    mimeType,
    displayName: `video-${Date.now()}.mp4`
  });

  // Wait for processing
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    file = await fileManager.getFile(uploadResult.file.name);
  }

  if (file.state === 'FAILED') {
    throw new Error('Video processing failed');
  }

  return file.uri;
}
```

### 4.2: KV Storage (`lib/kv.ts`)

```typescript
import { kv } from '@vercel/kv';

export interface VideoAnalysis {
  videoId: string;
  summary: string;
  scenes: Array<{
    start: string;
    end: string;
    label: string;
    description: string;
  }>;
  createdAt: string;
}

export async function saveAnalysis(videoId: string, analysis: VideoAnalysis) {
  await kv.set(`analysis:${videoId}`, analysis, { ex: 172800 }); // 48 hours
}

export async function getAnalysis(videoId: string): Promise<VideoAnalysis | null> {
  return await kv.get(`analysis:${videoId}`);
}

export async function saveVideo(videoId: string, metadata: any) {
  await kv.set(`video:${videoId}`, metadata);
}

export async function getVideo(videoId: string) {
  return await kv.get(`video:${videoId}`);
}

export async function listVideos(userId: string) {
  const keys = await kv.keys(`video:*`);
  const videos = await Promise.all(
    keys.map(key => kv.get(key))
  );
  return videos.filter(v => v && (v as any).userId === userId);
}
```

### 4.3: Upload API (`app/api/upload/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { uploadVideoToGemini } from '@/lib/gemini';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const videoId = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Gemini File API
    const geminiFileUri = await uploadVideoToGemini(buffer, file.type);
    
    // Save metadata to KV
    await saveVideo(videoId, {
      id: videoId,
      title: file.name,
      geminiFileUri,
      createdAt: new Date().toISOString(),
      userId: 'demo-user', // TODO: Get from auth
      status: 'ready'
    });

    return NextResponse.json({ 
      success: true, 
      videoId,
      geminiFileUri
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
```

### 4.4: Streaming Analysis API (`app/api/videos/[id]/analyze/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { analyzeVideoStreaming } from '@/lib/gemini';
import { getVideo, saveAnalysis } from '@/lib/kv';

export const runtime = 'edge'; // Enable streaming

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;
  
  try {
    const video = await getVideo(videoId);
    if (!video || !(video as any).geminiFileUri) {
      return new Response('Video not found', { status: 404 });
    }

    const stream = await analyzeVideoStreaming((video as any).geminiFileUri);
    
    let fullResponse = '';
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text();
            fullResponse += text;
            
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
          
          // Save complete analysis
          try {
            const parsed = JSON.parse(fullResponse);
            await saveAnalysis(videoId, {
              videoId,
              ...parsed,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.error('Failed to parse analysis:', e);
          }
          
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error: any) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
```

### 4.5: Get Analysis API (`app/api/videos/[id]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideo, getAnalysis } from '@/lib/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await getVideo(params.id);
    const analysis = await getAnalysis(params.id);
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        video,
        analysis
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Step 5: Create Frontend Components (5 min)

### 5.1: Video Upload (`components/VideoUpload.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        router.push(`/videos/${data.videoId}`);
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="max-w-md mx-auto p-6">
      <input 
        type="file" 
        name="video" 
        accept="video/*" 
        required
        className="block w-full p-2 border rounded"
      />
      <button 
        type="submit" 
        disabled={uploading}
        className="mt-4 w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
      >
        {uploading ? 'Uploading...' : 'Upload Video'}
      </button>
    </form>
  );
}
```

### 5.2: Streaming Analysis (`components/StreamingAnalysis.tsx`)

```typescript
'use client';

import { useState } from 'react';

export default function StreamingAnalysis({ videoId }: { videoId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');

  async function startAnalysis() {
    setAnalyzing(true);
    setAnalysis('');
    setError('');

    try {
      const res = await fetch(`/api/videos/${videoId}/analyze`, {
        method: 'POST'
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              setError(data.error);
            } else if (data.done) {
              setAnalyzing(false);
            } else if (data.text) {
              setAnalysis(prev => prev + data.text);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="p-6">
      <button 
        onClick={startAnalysis}
        disabled={analyzing}
        className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {analyzing ? 'Analyzing...' : 'Analyze Video'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Analysis (Streaming...)</h3>
          <pre className="whitespace-pre-wrap">{analysis}</pre>
        </div>
      )}
    </div>
  );
}
```

### 5.3: Home Page (`app/page.tsx`)

```typescript
import VideoUpload from '@/components/VideoUpload';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Gemini Video Analysis Platform
      </h1>
      <VideoUpload />
    </main>
  );
}
```

### 5.4: Video Detail Page (`app/videos/[id]/page.tsx`)

```typescript
import StreamingAnalysis from '@/components/StreamingAnalysis';
import { getVideo, getAnalysis } from '@/lib/kv';

export default async function VideoPage({ params }: { params: { id: string } }) {
  const video = await getVideo(params.id) as any;
  const analysis = await getAnalysis(params.id);

  if (!video) {
    return <div className="p-8">Video not found</div>;
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
      
      <div className="mb-8">
        <p className="text-gray-600">Uploaded: {new Date(video.createdAt).toLocaleString()}</p>
      </div>

      {analysis ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
          <div className="prose">
            <h3>Summary</h3>
            <p>{analysis.summary}</p>
            
            <h3 className="mt-6">Scenes</h3>
            <ul>
              {analysis.scenes?.map((scene, i) => (
                <li key={i}>
                  <strong>[{scene.start} - {scene.end}]</strong> {scene.label}
                  <p className="text-sm text-gray-600">{scene.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <StreamingAnalysis videoId={params.id} />
      )}
    </main>
  );
}
```

---

## Step 6: Deploy to Vercel (5 min)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Setup Vercel KV
vercel kv create

# Add environment variables
vercel env add GEMINI_API_KEY
# Paste your key

# Deploy
vercel --prod
```

---

## Step 7: Test (5 min)

1. **Upload video** at `/`
2. **Watch streaming analysis** at `/videos/{id}`
3. **Refresh page** - analysis persists!

---

## Common Issues & Fixes

### Issue: "KV is not defined"
```bash
# Pull KV env vars
vercel env pull .env.local
```

### Issue: "Cannot find module '@/lib/gemini'"
```bash
# Check tsconfig.json has:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: Streaming not working
```typescript
// Ensure edge runtime in API route:
export const runtime = 'edge';
```

---

## Next Steps

1. ✅ Test video upload
2. ✅ Test streaming analysis
3. ✅ Add authentication
4. ✅ Add video player
5. 🚀 Submit to hackathon!

---

**Estimated Time: 30 minutes**  
**Cost: $0.00 (all free tier)**  
**Result: Production-ready streaming video analysis platform**

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type UploadMode = 'file' | 'url';

export default function VideoUpload() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const router = useRouter();

  async function handleFileUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('video') as File;

    if (!file) {
      alert('Please select a video file');
      return;
    }

    // Vercel Hobby plan has 4.5MB function payload limit
    if (file.size > 4.5 * 1024 * 1024) {
      alert('File too large. Maximum: 4.5MB on Vercel Hobby plan.\n\nFor larger files, please:\n1. Use a smaller/compressed video, OR\n2. Import from URL, OR\n3. Upgrade to Vercel Pro ($20/month)');
      return;
    }

    setUploading(true);
    setProgress('Uploading...');

    try {
      const res = await fetch('/api/upload-stream', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Upload failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              } else if (data.progress) {
                setProgress(data.progress);
              } else if (data.success && data.videoId) {
                router.push(`/videos/${data.videoId}`);
                return;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      setProgress('');
    }
  }

  async function handleUrlImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!urlInput.trim()) {
      alert('Please enter a video URL');
      return;
    }

    setUploading(true);
    setProgress('Starting import...');

    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: urlInput.trim(),
          title: titleInput.trim() || undefined
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Import failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              } else if (data.progress) {
                setProgress(data.progress);
              } else if (data.success && data.videoId) {
                // Save to localStorage for parity with file uploads
                if (data.metadata) {
                  const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
                  const videoData = {
                    id: data.videoId,
                    filename: data.metadata.title,
                    uploadedAt: data.metadata.createdAt,
                    analyzed: false,
                    geminiFileUri: data.metadata.geminiFileUri,
                    geminiFileName: data.metadata.geminiFileName,
                    sourceUrl: data.metadata.sourceUrl,
                    sourceType: data.metadata.sourceType,
                    hasLocalFile: false, // URL imports don't have local file
                  };
                  existingVideos.push(videoData);
                  localStorage.setItem('uploadedVideos', JSON.stringify(existingVideos));
                }
                router.push(`/videos/${data.videoId}`);
                return;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setUploading(false);
      setProgress('');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Mode Toggle */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          disabled={uploading}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${uploadMode === 'file'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
            } disabled:opacity-50`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('url')}
          disabled={uploading}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${uploadMode === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
            } disabled:opacity-50`}
        >
          Import from URL
        </button>
      </div>

      {uploadMode === 'file' ? (
        <form onSubmit={handleFileUpload}>
          <div className="mb-4">
            <label htmlFor="video" className="block text-sm font-medium text-gray-700 mb-2">
              Select Video File
            </label>
            <input
              id="video"
              type="file"
              name="video"
              accept="video/*"
              required
              disabled={uploading}
              className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <p className="mt-2 text-sm text-gray-500">Maximum: 4.5MB (Vercel Hobby limit)</p>
            <p className="mt-1 text-xs text-gray-400">For larger files, use Import from URL or upgrade to Vercel Pro</p>
          </div>

          {progress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{progress}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? progress || 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleUrlImport}>
          <div className="mb-4">
            <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
              Video URL
            </label>
            <input
              id="video-url"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/video.mp4"
              required
              disabled={uploading}
              className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              Supported: Direct video URLs (.mp4, .mov, etc.) or from YouTube, Vimeo, Cloudinary, S3, etc.
            </p>
            <p className="mt-1 text-xs text-gray-400">Maximum: 100MB for URL imports</p>
          </div>

          <div className="mb-4">
            <label htmlFor="video-title" className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <input
              id="video-title"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="My Video"
              disabled={uploading}
              className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-400">If not provided, filename from URL will be used</p>
          </div>

          {progress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{progress}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? progress || 'Importing...' : 'Import Video'}
          </button>
        </form>
      )}
    </div>
  );
}

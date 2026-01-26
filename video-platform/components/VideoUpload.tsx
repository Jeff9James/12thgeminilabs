'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const router = useRouter();

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('video') as File;
    
    if (!file) {
      alert('Please select a video file');
      return;
    }

    // Vercel Hobby plan has 4.5MB function payload limit
    if (file.size > 4.5 * 1024 * 1024) {
      alert('File too large. Maximum: 4.5MB on Vercel Hobby plan.\n\nFor larger files, please:\n1. Use a smaller/compressed video, OR\n2. Upgrade to Vercel Pro ($20/month)');
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

  return (
    <form onSubmit={handleUpload} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
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
          className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-2 text-sm text-gray-500">Maximum: 4.5MB (Vercel Hobby limit)</p>
        <p className="mt-1 text-xs text-gray-400">For larger files, compress video or upgrade to Vercel Pro</p>
      </div>
      
      {progress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{progress}</p>
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={uploading}
        className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? progress || 'Uploading...' : 'Upload Video'}
      </button>
    </form>
  );
}

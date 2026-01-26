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

    // Warn for files over 10MB due to upload limits
    if (file.size > 10 * 1024 * 1024) {
      alert('File size limit: 10MB for Vercel Hobby plan. Please use a smaller video or upgrade to Pro.');
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
        <p className="mt-2 text-sm text-gray-500">Maximum: 10MB (Vercel Hobby plan limit)</p>
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

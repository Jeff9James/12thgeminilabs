'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const router = useRouter();

  async function handleFileUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('video') as File;

    if (!file) {
      alert('Please select a file');
      return;
    }

    // Vercel Hobby plan has 4.5MB function payload limit
    if (file.size > 4.5 * 1024 * 1024) {
      alert('File too large. Maximum: 4.5MB on Vercel Hobby plan.\n\nFor larger files, please:\n1. Use a smaller/compressed file, OR\n2. Upgrade to Vercel Pro ($20/month)');
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
              } else if (data.success && data.fileId) {
                // Save to localStorage
                if (data.metadata) {
                  const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
                  const fileData = {
                    id: data.fileId,
                    filename: data.metadata.title,
                    category: data.metadata.category || 'video',
                    mimeType: data.metadata.mimeType,
                    size: data.metadata.size,
                    uploadedAt: data.metadata.createdAt,
                    analyzed: false,
                    geminiFileUri: data.metadata.geminiFileUri,
                    geminiFileName: data.metadata.geminiFileName,
                    sourceType: data.metadata.sourceType,
                    hasLocalFile: true,
                  };
                  existingFiles.push(fileData);
                  localStorage.setItem('uploadedFiles', JSON.stringify(existingFiles));
                }
                router.push(`/files/${data.fileId}`);
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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <form onSubmit={handleFileUpload}>
        <div className="mb-4">
          <label htmlFor="video" className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <input
            id="video"
            type="file"
            name="video"
            accept="video/*,audio/*,image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
            required
            disabled={uploading}
            className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <p className="mt-2 text-sm text-gray-500">Supports: Video, Audio, Images, PDFs, Documents</p>
          <p className="mt-1 text-xs text-gray-400">Maximum: 4.5MB (Vercel Hobby limit)</p>
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
          {uploading ? progress || 'Uploading...' : 'Upload & Analyze File'}
        </button>
      </form>
    </div>
  );
}

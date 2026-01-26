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

    // Check file size (warn for very large files)
    if (file.size > 100 * 1024 * 1024) { // 100MB
      if (!confirm(`This file is ${Math.round(file.size / 1024 / 1024)}MB. Upload may take several minutes. Continue?`)) {
        return;
      }
    }
    
    setUploading(true);
    setProgress('Uploading to Gemini...');
    
    try {
      // Use REST API for file upload (client-side)
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('API key not configured');
      }
      
      // Step 1: Initiate resumable upload
      setProgress('Initializing upload...');
      const initResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files`, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': file.size.toString(),
          'X-Goog-Upload-Header-Content-Type': file.type,
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          file: {
            display_name: file.name
          }
        })
      });
      
      const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL');
      }
      
      // Step 2: Upload the actual file
      setProgress(`Uploading... (${Math.round(file.size / 1024 / 1024)}MB)`);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': file.size.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: file
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const fileName = uploadResult.file.name;
      
      // Step 3: Wait for processing
      setProgress('Waiting for Gemini to process...');
      let fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`)
        .then(r => r.json());
      
      while (fileInfo.state === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 3000));
        fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`)
          .then(r => r.json());
        setProgress('Processing video...');
      }
      
      if (fileInfo.state === 'FAILED') {
        throw new Error('Video processing failed');
      }
      
      setProgress('Saving metadata...');
      
      // Step 4: Save metadata to your database
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: file.name,
          geminiFileUri: fileInfo.uri,
          geminiFileName: fileName,
          mimeType: file.type,
          size: file.size
        })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push(`/videos/${data.videoId}`);
      } else {
        alert('Failed to save video metadata: ' + (data.error || 'Unknown error'));
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
        <p className="mt-2 text-sm text-gray-500">Maximum file size: 2GB</p>
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
        {uploading ? progress : 'Upload Video'}
      </button>
    </form>
  );
}

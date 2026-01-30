'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      
      // Update the file input
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  // Handle click on drop zone to trigger file input
  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

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

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <form onSubmit={handleFileUpload}>
        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          className={`mb-4 p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-center">
            {/* Upload Icon */}
            <svg
              className={`mx-auto h-12 w-12 ${
                isDragging
                  ? 'text-blue-500'
                  : selectedFile
                  ? 'text-green-500'
                  : 'text-gray-400'
              }`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Text */}
            <div className="mt-4">
              {selectedFile ? (
                <>
                  <p className="text-sm font-medium text-green-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Click to change file
                  </p>
                </>
              ) : isDragging ? (
                <>
                  <p className="text-sm font-medium text-blue-700">
                    Drop your file here
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop your file here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or click to browse
                  </p>
                </>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              id="video"
              type="file"
              name="video"
              accept="video/*,audio/*,image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
              required
              disabled={uploading}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* File info and limits */}
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-500">Supports: Video, Audio, Images, PDFs, Documents</p>
          <p className="text-xs text-gray-400 mt-1">Maximum: 4.5MB (Vercel Hobby limit)</p>
        </div>

        {/* Progress indicator */}
        {progress && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">{progress}</p>
          </div>
        )}

        {/* Upload button */}
        <button
          type="submit"
          disabled={uploading || !selectedFile}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? progress || 'Uploading...' : 'Upload & Analyze File'}
        </button>
      </form>
    </div>
  );
}

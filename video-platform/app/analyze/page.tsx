'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Video as VideoIcon, X, Link as LinkIcon, FileText, Image as ImageIcon, Music, FileSpreadsheet } from 'lucide-react';
import { saveVideoFile } from '@/lib/indexeddb';
import { validateFile, getFileCategory, formatFileSize, FILE_INPUT_ACCEPT, FileCategory, getFileIcon, getCategoryDisplayName } from '@/lib/fileTypes';

type UploadMode = 'file' | 'url';

export default function AnalyzePage() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<FileCategory | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    setValidationError(null);
    setFile(selectedFile);
    const category = validation.category!;
    setFileCategory(category);

    // Create preview URL for supported types
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Save to localStorage immediately
    const fileId = Date.now().toString();
    const fileMetadata = {
      id: fileId,
      filename: selectedFile.name,
      category: category,
      uploadedAt: new Date().toISOString(),
      analyzed: false,
      localUrl: url,
    };

    const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    existingFiles.push(fileMetadata);
    localStorage.setItem('uploadedFiles', JSON.stringify(existingFiles));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleUrlPreview = () => {
    if (!urlInput.trim()) {
      alert('Please enter a video URL');
      return;
    }
    // Set the video URL for preview
    setPreviewUrl(urlInput.trim());
  };

  const handleUploadAndAnalyze = async () => {
    if (!file && uploadMode === 'file') return;
    if (!previewUrl && uploadMode === 'url') return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get API key from our server (secure)
      const keyResponse = await fetch('/api/get-upload-url');
      const { apiKey } = await keyResponse.json();

      setUploadProgress(5);

      let fileData: Buffer | Blob;
      let fileName: string;
      let fileType: string;
      let fileSize: number;

      if (uploadMode === 'url') {
        // Use server-side API to fetch and upload video from URL
        setUploadStatus('Importing video from URL...');

        const response = await fetch('/api/import-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlInput.trim(),
            title: titleInput.trim() || undefined
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to import video: ${response.status} ${response.statusText}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to read response stream');
        }

        const decoder = new TextDecoder();
        let result: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.progress) {
                  setUploadStatus(data.progress);
                  // Map progress messages to percentage
                  if (data.progress.includes('Fetching')) setUploadProgress(10);
                  else if (data.progress.includes('Downloading')) setUploadProgress(20);
                  else if (data.progress.includes('uploading')) setUploadProgress(40);
                  else if (data.progress.includes('Processing')) setUploadProgress(60 + Math.min(30, (data.progress.match(/\d+/)?.[0] || 0) as number));
                  else if (data.progress.includes('Saving')) setUploadProgress(95);
                }

                if (data.success) {
                  result = data;
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        if (!result || !result.success) {
          throw new Error('Import failed: No success response from server');
        }

        // Use the metadata from the server
        const { metadata } = result;

        // Update localStorage with the imported video
        const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
        const videoData = {
          id: metadata.id,
          filename: metadata.title,
          uploadedAt: metadata.createdAt,
          analyzed: false,
          geminiFileUri: metadata.geminiFileUri,
          geminiFileName: metadata.geminiFileName,
          hasLocalFile: false,
          sourceUrl: metadata.sourceUrl,
          sourceType: metadata.sourceType,
        };
        existingVideos.push(videoData);
        localStorage.setItem('uploadedVideos', JSON.stringify(existingVideos));

        setUploadProgress(100);

        // Redirect to video detail page
        router.push(`/videos/${metadata.id}`);
        return; // Exit early since we've handled everything
      } else {
        fileData = file!;
        fileName = file!.name;
        fileType = file!.type;
        fileSize = file!.size;
      }

      // Step 1: Initialize resumable upload DIRECTLY to Gemini
      console.log('Initializing upload to Gemini...');
      setUploadStatus('Initializing upload to Gemini...');
      const initResponse = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': fileType,
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          file: {
            display_name: fileName
          }
        })
      });

      if (!initResponse.ok) {
        const error = await initResponse.text();
        throw new Error(`Failed to initialize upload: ${error}`);
      }

      const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        throw new Error('No upload URL received from Gemini');
      }

      setUploadProgress(15);

      // Step 2: Upload file bytes DIRECTLY to Gemini (bypassing our server!)
      console.log(`Uploading ${Math.round(fileSize / 1024 / 1024)}MB to Gemini...`);
      setUploadStatus(`Uploading ${Math.round(fileSize / 1024 / 1024)}MB to Gemini...`);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': fileSize.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: fileData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`Failed to upload file: ${error}`);
      }

      const uploadResult = await uploadResponse.json();
      const geminiFileName = uploadResult.file.name;

      setUploadProgress(60);

      // Step 3: Wait for Gemini processing
      console.log('Waiting for Gemini to process video...');
      setUploadStatus('Processing video with Gemini...');
      let fileInfo = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}`,
        {
          headers: {
            'x-goog-api-key': apiKey,
          }
        }
      ).then(r => r.json());

      let attempts = 0;
      const maxAttempts = 60; // 3 minutes max

      while (fileInfo.state === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        fileInfo = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}`,
          {
            headers: {
              'x-goog-api-key': apiKey,
            }
          }
        ).then(r => r.json());

        attempts++;
        setUploadProgress(60 + (attempts / maxAttempts) * 30);
        setUploadStatus(`Processing... (${attempts * 3}s)`);
      }

      if (fileInfo.state === 'FAILED') {
        throw new Error('Video processing failed on Gemini servers');
      }

      if (fileInfo.state === 'PROCESSING') {
        throw new Error('Video processing timeout. The video may still complete - check "My Videos" later.');
      }

      setUploadProgress(95);
      setUploadStatus('Saving metadata...');

      // Step 4: Save file to IndexedDB for playback/preview (video, audio, and images)
      const videoId = Date.now().toString();

      if (uploadMode === 'file' && file) {
        const fileCategory = getFileCategory(fileType);
        // Save video, audio, and image files to IndexedDB for local preview
        if (fileCategory === 'video' || fileCategory === 'audio' || fileCategory === 'image') {
          console.log(`Saving ${fileCategory} file to IndexedDB...`);
          try {
            await saveVideoFile(videoId, file);
          } catch (err) {
            console.warn(`Failed to save ${fileCategory} file to IndexedDB:`, err);
          }
        }
      }

      // Step 5: Save metadata to our database
      console.log('Saving metadata...');

      // Determine file category from MIME type
      const fileCategory = getFileCategory(fileType);

      try {
        await fetch('/api/files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: videoId,
            title: fileName,
            geminiFileUri: fileInfo.uri,
            geminiFileName: geminiFileName,
            mimeType: fileType,
            size: fileSize,
            category: fileCategory,
            playbackUrl: undefined,
            sourceUrl: undefined,
            sourceType: 'file-upload',
          })
        });
      } catch (err) {
        console.warn('Failed to save to database, using localStorage only:', err);
      }

      // Update localStorage with new 'uploadedFiles' format
      const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      const fileIndex = existingFiles.findIndex((f: any) => f.id === videoId);

      const fileMetadata = {
        id: videoId,
        filename: fileName,
        category: fileCategory,
        mimeType: fileType,
        uploadedAt: new Date().toISOString(),
        analyzed: false,
        geminiFileUri: fileInfo.uri,
        geminiFileName: geminiFileName,
        hasLocalFile: true,
        sourceUrl: undefined,
        sourceType: 'file-upload',
      };

      if (fileIndex !== -1) {
        existingFiles[fileIndex] = fileMetadata;
      } else {
        existingFiles.push(fileMetadata);
      }

      localStorage.setItem('uploadedFiles', JSON.stringify(existingFiles));
      setUploadProgress(100);

      // Redirect to file detail page
      router.push(`/files/${videoId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${(error as Error).message}\n\nPlease try again or use a smaller video file.`);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">File Analysis</h1>
          <p className="text-gray-600">Upload and analyze videos, images, audio, PDFs, and documents with Gemini 3 Flash</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Upload Mode Toggle */}
        {!previewUrl && (
          <div className="flex mb-6 bg-white rounded-xl shadow-sm p-1 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => {
                setUploadMode('file');
                setPreviewUrl(null);
                setUrlInput('');
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${uploadMode === 'file'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('url');
                setPreviewUrl(null);
                setFile(null);
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${uploadMode === 'url'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <LinkIcon className="w-4 h-4" />
              Import from URL
            </button>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center max-w-2xl mx-auto"
          >
            <p className="text-red-600 font-medium">{validationError}</p>
          </motion.div>
        )}

        {/* Upload Area */}
        {!previewUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 transition-colors"
            onDrop={uploadMode === 'file' ? handleDrop : undefined}
            onDragOver={uploadMode === 'file' ? (e) => e.preventDefault() : undefined}
          >
            {uploadMode === 'file' ? (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload your file
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop or click to select a file
                </p>

                {/* Supported file types */}
                <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-lg mx-auto">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <VideoIcon className="w-3 h-3" /> Video
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Images
                  </span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Music className="w-3 h-3" /> Audio
                  </span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </span>
                  <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3" /> Documents
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_INPUT_ACCEPT}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Select File
                </button>

                <p className="text-sm text-gray-500 mt-4">
                  Max sizes: Video/Audio 2GB, Images 20MB, PDFs/Documents 50MB
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LinkIcon className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Import from URL
                </h3>
                <p className="text-gray-600 mb-6">
                  Paste a direct video URL from S3, Cloudinary, Google Cloud Storage, Azure Blob, or any public storage
                </p>
                <p className="text-xs text-orange-500 mb-4">
                  <strong>Note:</strong> YouTube, Vimeo, and similar platforms block direct downloads. Use direct video links only (ending in .mp4, .mov, .webm, etc.)
                </p>

                <div className="max-w-md mx-auto space-y-4">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleUrlPreview}
                    disabled={!urlInput.trim()}
                    className="w-full px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview Video
                  </button>
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  Maximum size: 100MB for URL imports
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* File Preview - Dynamic based on file type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="relative">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setFile(null);
                    setUrlInput('');
                    setFileCategory(null);
                  }}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* File Type Badge */}
                {fileCategory && (
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 rounded-full text-white text-sm font-medium flex items-center gap-2">
                    <span>{getFileIcon(fileCategory)}</span>
                    <span>{getCategoryDisplayName(fileCategory)}</span>
                  </div>
                )}

                {/* Dynamic Preview based on file type */}
                {fileCategory === 'video' && (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {fileCategory === 'audio' && (
                  <div className="w-full p-8 bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <Music className="w-12 h-12 text-purple-600" />
                    </div>
                    <audio src={previewUrl} controls className="w-full max-w-md">
                      Your browser does not support the audio tag.
                    </audio>
                    <p className="text-gray-600 mt-4">{file?.name}</p>
                  </div>
                )}

                {fileCategory === 'image' && (
                  <div className="w-full flex items-center justify-center bg-gray-100">
                    <img
                      src={previewUrl}
                      alt={file?.name || 'Preview'}
                      className="max-w-full max-h-[500px] object-contain"
                    />
                  </div>
                )}

                {fileCategory === 'pdf' && (
                  <div className="w-full h-[500px] bg-gray-100">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title={file?.name || 'PDF Preview'}
                    />
                  </div>
                )}

                {(fileCategory === 'document' || fileCategory === 'spreadsheet' || fileCategory === 'text') && (
                  <div className="w-full p-8 bg-gradient-to-br from-orange-50 to-yellow-50 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-24 h-24 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                      <FileText className="w-12 h-12 text-orange-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-900">{file?.name}</p>
                    <p className="text-gray-600 mt-2">
                      {file ? formatFileSize(file.size) : ''}
                    </p>
                    <p className="text-sm text-gray-500 mt-4 text-center max-w-md">
                      Document preview not available. The file will be analyzed by Gemini 3 Flash.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={isUploading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  {isUploading ? 'Uploading...' : `Upload & Analyze ${fileCategory ? getCategoryDisplayName(fileCategory) : 'File'}`}
                </button>
                <p className="text-sm text-gray-500 text-center mt-3">
                  File will be saved to "My Files" and analyzed with Gemini 3 Flash
                </p>
              </div>
            </motion.div>

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Uploading {fileCategory ? getCategoryDisplayName(fileCategory).toLowerCase() : 'file'}...</h3>
                      <p className="text-sm text-gray-600">{uploadStatus || 'Processing with Gemini 3 Flash'}</p>
                    </div>
                  </div>

                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

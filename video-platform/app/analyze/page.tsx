'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Video as VideoIcon, X, FileText, Image as ImageIcon, Music, FileSpreadsheet } from 'lucide-react';
import { saveVideoFile, savePDFFile, saveFile } from '@/lib/indexeddb';
import { validateFile, getFileCategory, formatFileSize, FILE_INPUT_ACCEPT, FileCategory, getFileIcon, getCategoryDisplayName, needsConversionForGemini } from '@/lib/fileTypes';
import { convertSpreadsheetToCSV } from '@/lib/spreadsheetConverter';
import { FilePreview } from '@/components/FilePreview';

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<FileCategory | null>(null);
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

    // Save to localStorage immediately (this is just temporary until actual upload)
    const fileId = Date.now().toString();
    const fileMetadata = {
      id: fileId,
      filename: selectedFile.name,
      category: category,
      mimeType: selectedFile.type,
      size: selectedFile.size,
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

  const handleUploadAndAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get API key from our server (secure)
      const keyResponse = await fetch('/api/get-upload-url');
      const { apiKey } = await keyResponse.json();

      setUploadProgress(5);

      let fileData: Buffer | Blob = file!;
      let fileName: string = file!.name;
      let fileType: string = file!.type;
      let fileSize: number = file!.size;

      // Convert spreadsheet files to CSV before uploading to Gemini
      if (needsConversionForGemini(fileType)) {
        console.log('Converting spreadsheet to CSV for Gemini compatibility...');
        setUploadStatus('Converting spreadsheet to CSV...');
        
        try {
          const convertedFile = await convertSpreadsheetToCSV(fileData as File);
          fileData = convertedFile;
          fileName = convertedFile.name;
          fileType = 'text/csv';
          fileSize = convertedFile.size;
          
          console.log('Converted to CSV:', fileName);
          setUploadStatus('Converted to CSV successfully');
        } catch (conversionError: any) {
          console.error('Conversion error:', conversionError);
          throw new Error(`Failed to convert spreadsheet: ${conversionError.message}`);
        }
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
      console.log('Waiting for Gemini to process file...');
      setUploadStatus('Processing file with Gemini...');
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
        throw new Error('File processing failed on Gemini servers');
      }

      if (fileInfo.state === 'PROCESSING') {
        throw new Error('File processing timeout. The file may still complete - check "My Files" later.');
      }

      setUploadProgress(95);
      setUploadStatus('Saving metadata...');

      // Step 4: Save file to IndexedDB for playback/preview (video, audio, images, and PDFs)
      const fileId = Date.now().toString();

      // Determine file category from MIME type (do this once at the top)
      const fileCat = getFileCategory(fileType);

      if (file) {
        // Save files to IndexedDB for local preview
        if (fileCat === 'video' || fileCat === 'audio' || fileCat === 'image') {
          console.log(`Saving ${fileCat} file to IndexedDB...`);
          try {
            await saveVideoFile(fileId, file);
          } catch (err) {
            console.warn(`Failed to save ${fileCat} file to IndexedDB:`, err);
          }
        } else if (fileCat === 'pdf') {
          console.log('Saving PDF file to IndexedDB...');
          try {
            await savePDFFile(fileId, file);
          } catch (err) {
            console.warn('Failed to save PDF file to IndexedDB:', err);
          }
        } else if (fileCat === 'spreadsheet' || fileCat === 'document' || fileCat === 'text') {
          // Use universal file storage for spreadsheets, documents, and text files
          console.log(`Saving ${fileCat} file to IndexedDB...`);
          try {
            await saveFile(fileId, file);
          } catch (err) {
            console.warn(`Failed to save ${fileCat} file to IndexedDB:`, err);
          }
        }
      }

      // Step 5: Save metadata to our database
      console.log('Saving metadata...');

      try {
        await fetch('/api/files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: fileId,
            title: fileName,
            geminiFileUri: fileInfo.uri,
            geminiFileName: geminiFileName,
            mimeType: fileType,
            size: fileSize,
            category: fileCat,
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
      const fileIndex = existingFiles.findIndex((f: any) => f.id === fileId);

      const fileMetadata = {
        id: fileId,
        filename: fileName,
        category: fileCat,
        mimeType: fileType,
        size: fileSize,
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
      router.push(`/files/${fileId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${(error as Error).message}\n\nPlease try again or use a smaller file.`);
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
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
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
                    id="videoPlayer"
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
                    <audio id="audioPlayer" src={previewUrl} controls className="w-full max-w-md">
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

                {(fileCategory === 'pdf' || fileCategory === 'document' || fileCategory === 'spreadsheet' || fileCategory === 'text') && (
                  <FilePreview
                    file={file}
                    previewUrl={previewUrl}
                    category={fileCategory}
                    fileName={file?.name}
                    fileSize={file?.size}
                  />
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
                  {isUploading 
                    ? `Uploading ${fileCategory ? getCategoryDisplayName(fileCategory) : 'File'}...` 
                    : `Upload & Analyze ${fileCategory ? getCategoryDisplayName(fileCategory) : 'File'}`}
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

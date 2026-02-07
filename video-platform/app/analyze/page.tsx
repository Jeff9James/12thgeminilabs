'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Video as VideoIcon, X, FileText, Image as ImageIcon, Music, FileSpreadsheet, Link as LinkIcon } from 'lucide-react';
import { saveVideoFile, savePDFFile, saveFile } from '@/lib/indexeddb';
import { validateFile, getFileCategory, formatFileSize, FILE_INPUT_ACCEPT, FileCategory, getFileIcon, getCategoryDisplayName, needsConversionForGemini } from '@/lib/fileTypes';
import { convertSpreadsheetToCSV } from '@/lib/spreadsheetConverter';
import { FilePreview } from '@/components/FilePreview';
import LocalFilePicker from '@/components/LocalFilePicker';

const UppyUploader = dynamic(() => import('@/components/UppyUploader'), { ssr: false });

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<FileCategory | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [showUppyModal, setShowUppyModal] = useState(false);
  const [showDemoFilesDialog, setShowDemoFilesDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Demo file URLs
  const demoFiles = [
    {
      type: 'Image',
      url: 'https://res.cloudinary.com/ddz3nsnq1/image/upload/v1770471275/Screenshot_2026-02-02_214003_whppx7.png',
      icon: ImageIcon,
      color: 'green'
    },
    {
      type: 'Audio',
      url: 'https://res.cloudinary.com/ddz3nsnq1/video/upload/v1770471106/ChatGPT__OpenAI_Sam_Altman_AI_Joe_Rogan_Artificial_Intelligence_Practical_AI-HumansAnd_Raises_480M_Seed_Round_to_Build_AI_for_Human_Collaboration_m006pr.mp3',
      icon: Music,
      color: 'purple'
    },
    {
      type: 'Video',
      url: 'https://res.cloudinary.com/ddz3nsnq1/video/upload/v1770471060/videoplayback_eanr2j.mp4',
      icon: VideoIcon,
      color: 'blue'
    },
    {
      type: 'PDF',
      url: 'https://www.iitjammu.ac.in/events/2021/Disciplined_Entrepreneurship.pdf',
      icon: FileText,
      color: 'orange'
    }
  ];

  const handleFileSelect = async (selectedFile: File, fromUrl: boolean = false) => {
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

    // Note: We don't save to localStorage here anymore.
    // File will be saved only after successful upload in handleUploadAndAnalyze()
  };

  const handleUrlImport = async () => {
    if (!fileUrl.trim()) {
      setValidationError('Please enter a valid URL');
      return;
    }

    setValidationError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Fetching file from URL...');

    try {
      // Fetch file from URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      // Get the blob data
      const blob = await response.blob();

      // Extract filename from URL or use a default name
      const urlPath = new URL(fileUrl).pathname;
      const fileName = urlPath.split('/').pop() || 'imported-file';

      // Create a File object from the blob
      const file = new File([blob], fileName, { type: blob.type });

      setUploadProgress(10);
      setUploadStatus('File fetched successfully');

      // Close modal and continue with normal upload flow
      setShowUrlModal(false);
      setFileUrl('');

      // Use the same file selection handler but mark as URL import
      await handleFileSelect(file, true);

      setIsUploading(false);
      setUploadStatus('');
    } catch (error) {
      console.error('URL import error:', error);
      setValidationError(`Failed to import from URL: ${(error as Error).message}`);
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile, false);
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

      // Save to localStorage with new 'uploadedFiles' format
      const existingFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');

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

      existingFiles.push(fileMetadata);
      localStorage.setItem('uploadedFiles', JSON.stringify(existingFiles));
      setUploadProgress(100);
      setUploadStatus('Upload complete! Redirecting to analysis...');

      // Wait a moment to show completion message
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to file detail page with auto-analyze flag
      router.push(`/files/${fileId}?autoAnalyze=true`);
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
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], false)}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Select File
              </button>

              <LocalFilePicker
                allowMultiple={false}
                onFileSelect={(file, localFile) => {
                  console.log('[AnalyzePage] Local file selected:', localFile);
                  handleFileSelect(file, false);
                }}
              />

              <button
                onClick={() => setShowUrlModal(true)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-5 h-5" />
                Import from URL
              </button>

              <button
                onClick={() => setShowUppyModal(true)}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Advanced Upload (Uppy)
              </button>

              <button
                onClick={() => setShowDemoFilesDialog(true)}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Try Demo Files
              </button>
            </div>

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

        {/* URL Import Modal */}
        <AnimatePresence>
          {showUrlModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowUrlModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <LinkIcon className="w-6 h-6 text-indigo-600" />
                    Import from URL
                  </h2>
                  <button
                    onClick={() => setShowUrlModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="mb-6">
                  <label htmlFor="fileUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    File URL
                  </label>
                  <input
                    id="fileUrl"
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUrlImport();
                      }
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Enter a direct URL to a video, image, audio file, PDF, or document
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUrlModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUrlImport}
                    disabled={isUploading || !fileUrl.trim()}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-5 h-5" />
                        Import
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo Files Dialog */}
        <AnimatePresence>
          {showDemoFilesDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDemoFilesDialog(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-600" />
                    Try Demo Files
                  </h2>
                  <button
                    onClick={() => setShowDemoFilesDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <p className="text-gray-600 mb-6">
                  Click on any demo file below to import it directly, or copy the URL to use with the "Import from URL" feature.
                </p>

                <div className="space-y-3">
                  {demoFiles.map((demo, index) => {
                    const Icon = demo.icon;
                    const colorClasses = {
                      green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
                      purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
                      blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                      orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                    };

                    return (
                      <div
                        key={index}
                        className={`border rounded-xl p-4 transition-all ${colorClasses[demo.color as keyof typeof colorClasses]}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold mb-1">{demo.type} Demo</h3>
                            <p className="text-sm break-all opacity-75 mb-3">
                              {demo.url}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setFileUrl(demo.url);
                                  setShowDemoFilesDialog(false);
                                  setShowUrlModal(true);
                                }}
                                className="px-4 py-2 bg-white border border-current rounded-lg text-sm font-medium hover:bg-opacity-50 transition-colors"
                              >
                                Use This File
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(demo.url);
                                  alert('URL copied to clipboard!');
                                }}
                                className="px-4 py-2 bg-white border border-current rounded-lg text-sm font-medium hover:bg-opacity-50 transition-colors"
                              >
                                Copy URL
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowDemoFilesDialog(false)}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <UppyUploader
          open={showUppyModal}
          onClose={() => setShowUppyModal(false)}
          onFileSelect={(file) => handleFileSelect(file, false)}
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Folder,
  File,
  FolderOpen,
  HardDrive,
  X,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Upload,
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  pickFile,
  pickDirectory,
  readDirectory,
  flattenDirectory,
  filterFilesByExtension,
  searchFilesByName,
  formatFileSize,
  saveDirectoryHandle,
  getAllDirectoryHandles,
  removeDirectoryHandle,
  verifyPermission,
  type LocalFile,
  type LocalDirectory,
  type FileSystemDirectoryHandle,
} from '@/lib/localFileAccess';
import { indexFiles, getIndexStats } from '@/lib/localFileIndex';
=======

interface LocalFilePickerProps {
  onFileSelect?: (file: File, localFile: LocalFile) => void;
  onFilesSelect?: (files: Array<{ file: File; localFile: LocalFile }>) => void;
  allowMultiple?: boolean;
  acceptedTypes?: string[];
}

export default function LocalFilePicker({
  onFileSelect,
  onFilesSelect,
  allowMultiple = true,
  acceptedTypes,
}: LocalFilePickerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<LocalDirectory | null>(null);
  const [savedDirectories, setSavedDirectories] = useState<
    Array<{ name: string; handle: FileSystemDirectoryHandle }>
  >([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExtension, setFilterExtension] = useState<string>('all');

  useEffect(() => {
    setIsSupported(isFileSystemAccessSupported());
    loadSavedDirectories();
  }, []);

  const loadSavedDirectories = async () => {
    try {
      const dirs = await getAllDirectoryHandles();
      setSavedDirectories(dirs);
    } catch (error) {
      console.error('[LocalFilePicker] Error loading saved directories:', error);
    }
  };

  const handlePickFile = async () => {
    setLoading(true);
    setError(null);

    try {
      const files = await pickFile({ multiple: allowMultiple });

      if (files.length > 0) {
        const selectedData = files.map((file) => ({
          file,
          localFile: {
            name: file.name,
            path: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          },
        }));

        if (allowMultiple && onFilesSelect) {
          onFilesSelect(selectedData);
        } else if (onFileSelect) {
          onFileSelect(selectedData[0].file, selectedData[0].localFile);
        }

        setShowPicker(false);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDirectory = async () => {
    setLoading(true);
    setError(null);

    try {
      const dirHandle = await pickDirectory();

      if (dirHandle) {
        // Verify permission
        const hasPermission = await verifyPermission(dirHandle);
        if (!hasPermission) {
          setError('Permission denied to access directory');
          setLoading(false);
          return;
        }

        // Save directory handle
        await saveDirectoryHandle(dirHandle.name, dirHandle);

        // Read directory
        const directory = await readDirectory(dirHandle);
        setCurrentDirectory(directory);
        await loadSavedDirectories();

        // Index files in background
        const allFiles = flattenDirectory(directory);
        console.log(`[LocalFilePicker] Indexing ${allFiles.length} files...`);
        indexFiles(allFiles, dirHandle.name, dirHandle.name).catch((err) => {
          console.error('[LocalFilePicker] Error indexing files:', err);
        });
=======
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshDirectory = async () => {
    if (!currentDirectory?.handle) return;

    setLoading(true);
    setError(null);

    try {
      const hasPermission = await verifyPermission(currentDirectory.handle);
      if (!hasPermission) {
        setError('Permission denied. Please grant access again.');
        setLoading(false);
        return;
      }

      const directory = await readDirectory(currentDirectory.handle);
      setCurrentDirectory(directory);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSavedDirectory = async (handle: FileSystemDirectoryHandle) => {
    setLoading(true);
    setError(null);

    try {
      const hasPermission = await verifyPermission(handle);
      if (!hasPermission) {
        setError('Permission denied. Directory access may have been revoked.');
        setLoading(false);
        return;
      }

      const directory = await readDirectory(handle);
      setCurrentDirectory(directory);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDirectory = async (name: string) => {
    try {
      await removeDirectoryHandle(name);
      await loadSavedDirectories();
      if (currentDirectory?.name === name) {
        setCurrentDirectory(null);
      }
    } catch (error) {
      console.error('[LocalFilePicker] Error removing directory:', error);
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleFileSelection = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectFiles = async () => {
    if (!currentDirectory || selectedFiles.size === 0) return;

    setLoading(true);

    try {
      const allFiles = flattenDirectory(currentDirectory);
      const filesToSelect = allFiles.filter((file) => selectedFiles.has(file.path));

      const selectedData = await Promise.all(
        filesToSelect.map(async (localFile) => {
          if (localFile.handle) {
            const file = await localFile.handle.getFile();
            return { file, localFile };
          }
          return null;
        })
      );

      const validData = selectedData.filter((data) => data !== null) as Array<{
        file: File;
        localFile: LocalFile;
      }>;

      if (allowMultiple && onFilesSelect) {
        onFilesSelect(validData);
      } else if (onFileSelect && validData.length > 0) {
        onFileSelect(validData[0].file, validData[0].localFile);
      }

      setShowPicker(false);
      setSelectedFiles(new Set());
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFiles = (): LocalFile[] => {
    if (!currentDirectory) return [];

    let files = flattenDirectory(currentDirectory);

    // Filter by extension
    if (filterExtension !== 'all') {
      files = filterFilesByExtension(files, [filterExtension]);
    }

    // Filter by accepted types
    if (acceptedTypes && acceptedTypes.length > 0) {
      files = filterFilesByExtension(files, acceptedTypes);
    }

    // Search by name
    if (searchQuery) {
      files = searchFilesByName(files, searchQuery);
    }

    return files;
  };

  const renderDirectory = (dir: LocalDirectory, depth: number = 0) => {
    const isExpanded = expandedDirs.has(dir.path);
    const hasChildren = dir.subdirectories.length > 0 || dir.files.length > 0;

    return (
      <div key={dir.path} style={{ marginLeft: `${depth * 20}px` }}>
        {/* Directory */}
        <div
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg cursor-pointer"
          onClick={() => hasChildren && toggleDirectory(dir.path)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <div className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500" />
          )}
          <span className="text-sm font-medium text-gray-700">{dir.name}</span>
          <span className="text-xs text-gray-400 ml-auto">
            {dir.files.length} files, {dir.subdirectories.length} folders
          </span>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <>
            {dir.files.map((file) => {
              const isSelected = selectedFiles.has(file.path);
              return (
                <div
                  key={file.path}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                  style={{ marginLeft: `${(depth + 1) * 20}px` }}
                  onClick={() => toggleFileSelection(file.path)}
                >
                  <div className="w-4 flex items-center justify-center">
                    {isSelected && <CheckCircle className="w-4 h-4 text-blue-500" />}
                  </div>
                  <File className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                </div>
              );
            })}

            {dir.subdirectories.map((subdir) => renderDirectory(subdir, depth + 1))}
          </>
        )}
      </div>
    );
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-1">
              File System Access Not Supported
            </h3>
            <p className="text-sm text-yellow-700 mb-2">
              Your browser doesn't support the File System Access API. Local file access requires:
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Chrome 86+ or Edge 86+</li>
              <li>Desktop browser (not mobile)</li>
            </ul>
            <p className="text-sm text-yellow-700 mt-2">
              You can still upload files using the regular upload button.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPicker(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
      >
        <HardDrive className="w-5 h-5" />
        Access Local Files
      </button>

      {/* Modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Local File Access</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Pick individual files or browse entire folders
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 p-6 border-b bg-gray-50">
              <button
                onClick={handlePickFile}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Pick File{allowMultiple ? 's' : ''}
              </button>

              <button
                onClick={handlePickDirectory}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Folder className="w-4 h-4" />
                Browse Folder
              </button>

              {currentDirectory && (
                <button
                  onClick={handleRefreshDirectory}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 ml-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {loading && !currentDirectory && (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}

              {!loading && !currentDirectory && savedDirectories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Folders</h3>
                  <div className="space-y-2">
                    {savedDirectories.map((dir) => (
                      <div
                        key={dir.name}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleLoadSavedDirectory(dir.handle)}
                      >
                        <Folder className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 flex-1">
                          {dir.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDirectory(dir.name);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && !currentDirectory && savedDirectories.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <HardDrive className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No folder selected
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Pick individual files or browse a folder to get started with local file
                    access
                  </p>
                </div>
              )}

              {currentDirectory && (
                <div>
                  {/* Search & Filter */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <select
                      value={filterExtension}
                      onChange={(e) => setFilterExtension(e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Files</option>
                      <option value=".mp4">Videos (.mp4)</option>
                      <option value=".pdf">PDFs (.pdf)</option>
                      <option value=".jpg">Images (.jpg)</option>
                      <option value=".txt">Text (.txt)</option>
                    </select>
                  </div>

                  {/* Directory Tree */}
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                    {renderDirectory(currentDirectory)}
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                    </span>
                    <span>{getFilteredFiles().length} total files</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {currentDirectory && selectedFiles.size > 0 && (
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleSelectFiles}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Select {selectedFiles.size} File{selectedFiles.size !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

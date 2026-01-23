import React, { useEffect, useState } from 'react';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import './GoogleDriveImportModal.css';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function GoogleDriveImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: GoogleDriveImportModalProps) {
  const { files, isLoading, error, importStatus, listFiles, importFile, getImportStatus, clearError } =
    useGoogleDrive();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [importingFiles, setImportingFiles] = useState<Set<string>>(new Set());
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNeedsAuth(false); // Reset on modal open
      listFiles().catch((err) => {
        // Check if it's an auth error - check for common patterns
        const errorMessage = err.message?.toLowerCase() || '';
        const isAuthError = 
          errorMessage.includes('not authorized') || 
          errorMessage.includes('expired') ||
          errorMessage.includes('401') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('access not authorized') ||
          err.response?.status === 401;
        
        if (isAuthError) {
          setNeedsAuth(true);
        }
        console.error('Google Drive list files error:', err);
      });
    }
  }, [isOpen, listFiles]);

  useEffect(() => {
    // Poll for import status
    const interval = setInterval(() => {
      importingFiles.forEach((videoId) => {
        const status = importStatus.get(videoId);
        if (status && status.status !== 'complete' && status.status !== 'error') {
          getImportStatus(videoId).catch(console.error);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [importingFiles, importStatus, getImportStatus]);

  // Check if all imports are complete
  useEffect(() => {
    if (importingFiles.size > 0) {
      const allComplete = Array.from(importingFiles).every(
        (videoId) => importStatus.get(videoId)?.status === 'complete'
      );
      if (allComplete && onImportComplete) {
        onImportComplete();
      }
    }
  }, [importingFiles, importStatus, onImportComplete]);

  const handleSelectFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleImport = async () => {
    const filesToImport = Array.from(selectedFiles);
    if (filesToImport.length === 0) return;

    for (const fileId of filesToImport) {
      try {
        const file = files.find((f) => f.id === fileId);
        if (!file) continue;

        const videoId = await importFile(fileId, file.name);
        setImportingFiles((prev) => new Set(prev).add(videoId));
        setSelectedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      } catch (err) {
        console.error(`Failed to import file ${fileId}:`, err);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConnectGoogleDrive = () => {
    // Redirect to backend OAuth start endpoint
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    // Remove trailing slash if present to avoid double slashes when joining
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    // Navigate to the Drive OAuth start endpoint
    window.location.href = `${baseUrl}/google-drive/auth/start`;
  };

  if (!isOpen) return null;

  return (
    <div className="gdrive-modal-overlay" onClick={onClose}>
      <div className="gdrive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gdrive-modal-header">
          <h2>Import from Google Drive</h2>
          <button className="gdrive-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="gdrive-modal-body">
          {needsAuth ? (
            <div className="gdrive-auth-prompt">
              <h3>Connect Google Drive</h3>
              <p>
                To import videos from Google Drive, you need to authorize access to your Drive files.
              </p>
              <button className="btn-primary" onClick={handleConnectGoogleDrive}>
                Connect Google Drive
              </button>
            </div>
          ) : error && (
            <div className="gdrive-error">
              <p>{error}</p>
              <button onClick={clearError}>Dismiss</button>
            </div>
          )}

          {!needsAuth && isLoading ? (
            <div className="gdrive-loading">
              <div className="spinner"></div>
              <p>Loading your Google Drive videos...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="gdrive-empty">
              <p>No videos found in your Google Drive</p>
            </div>
          ) : (
            <>
              <div className="gdrive-files-list">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`gdrive-file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}
                    onClick={() => handleSelectFile(file.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => handleSelectFile(file.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {file.thumbnailLink && (
                      <img
                        src={file.thumbnailLink}
                        alt={file.name}
                        className="gdrive-file-thumbnail"
                      />
                    )}
                    <div className="gdrive-file-info">
                      <h3>{file.name}</h3>
                      <div className="gdrive-file-meta">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.createdTime)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {importingFiles.size > 0 && (
                <div className="gdrive-import-progress">
                  <h3>Importing Videos</h3>
                  {Array.from(importingFiles).map((videoId) => {
                    const status = importStatus.get(videoId);
                    if (!status) return null;

                    return (
                      <div key={videoId} className="gdrive-import-item">
                        <div className="gdrive-import-info">
                          <span>{status.message || 'Importing...'}</span>
                          {status.status === 'complete' && (
                            <span className="gdrive-import-complete">✓</span>
                          )}
                          {status.status === 'error' && (
                            <span className="gdrive-import-error">✗ {status.error}</span>
                          )}
                        </div>
                        {status.status !== 'complete' && status.status !== 'error' && (
                          <div className="gdrive-progress-bar">
                            <div
                              className="gdrive-progress-fill"
                              style={{ width: `${status.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="gdrive-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={selectedFiles.size === 0 || isLoading}
          >
            Import Selected ({selectedFiles.size})
          </button>
        </div>
      </div>
    </div>
  );
}

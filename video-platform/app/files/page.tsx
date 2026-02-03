'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, Clock, Calendar, Trash2, Play, Music, Image as LucideImageIcon, FileText, FileSpreadsheet, Eye, Folder as FolderIcon, Plus, ChevronRight, Edit2, Move, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { deleteVideoFile, deletePDFFile, deleteFile as deleteUniversalFile } from '@/lib/indexeddb';
import { FileCategory, getFileIcon, getCategoryDisplayName } from '@/lib/fileTypes';

interface FileMetadata {
    id: string;
    filename: string;
    title?: string;
    category?: FileCategory;
    uploadedAt: string;
    analyzed: boolean;
    duration?: number;
    folderId?: string | null;
}

interface FolderMetadata {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
}

// Get icon component based on file category
function getCategoryIcon(category: FileCategory | undefined) {
    switch (category) {
        case 'video': return VideoIcon;
        case 'audio': return AudioIcon;
        case 'image': return ImageIcon;
        case 'pdf':
        case 'document':
        case 'text': return DocumentIcon;
        case 'spreadsheet': return SpreadsheetIcon;
        default: return GenericFileIcon;
    }
}

function VideoIcon({ className }: { className?: string }) {
    return (
        <div className={`bg-blue-100 rounded-lg flex items-center justify-center ${className}`}>
            <Play className="w-6 h-6 text-blue-600" />
        </div>
    );
}

function AudioIcon({ className }: { className?: string }) {
    return (
        <div className={`bg-purple-100 rounded-lg flex items-center justify-center ${className}`}>
            <Music className="w-6 h-6 text-purple-600" />
        </div>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <div className={`bg-green-100 rounded-lg flex items-center justify-center ${className}`}>
            <LucideImageIcon className="w-6 h-6 text-green-600" />
        </div>
    );
}

function DocumentIcon({ className }: { className?: string }) {
    return (
        <div className={`bg-orange-100 rounded-lg flex items-center justify-center ${className}`}>
            <FileText className="w-6 h-6 text-orange-600" />
        </div>
    );
}

function SpreadsheetIcon({ className }: { className?: string }) {
    return (
        <div className={`bg-pink-100 rounded-lg flex items-center justify-center ${className}`}>
            <FileSpreadsheet className="w-6 h-6 text-pink-600" />
        </div>
    );
}

function GenericFileIcon({ className }: { className?: string }) {
    return (
        <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
            <File className="w-6 h-6 text-gray-600" />
        </div>
    );
}

// Get gradient based on category
function getCategoryGradient(category: FileCategory | undefined): string {
    switch (category) {
        case 'video': return 'from-blue-500 to-indigo-600';
        case 'audio': return 'from-purple-500 to-pink-600';
        case 'image': return 'from-green-500 to-emerald-600';
        case 'pdf': return 'from-red-500 to-orange-600';
        case 'document': return 'from-orange-500 to-amber-600';
        case 'spreadsheet': return 'from-pink-500 to-rose-600';
        case 'text': return 'from-gray-500 to-slate-600';
        default: return 'from-blue-500 to-indigo-600';
    }
}

export default function FilesPage() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [folders, setFolders] = useState<FolderMetadata[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showRenameModal, setShowRenameModal] = useState<{ id: string, name: string } | null>(null);
    const [showMoveModal, setShowMoveModal] = useState<FileMetadata | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch folders from API
                const foldersRes = await fetch('/api/folders');
                const foldersData = await foldersRes.json();
                if (foldersData.success) {
                    setFolders(foldersData.folders);
                }

                // Fetch files from API
                const filesRes = await fetch('/api/files');
                const filesData = await filesRes.json();

                let allFiles: FileMetadata[] = [];
                if (filesData.success) {
                    allFiles = filesData.files;
                }

                // Merge with localStorage for any local-only metadata (legacy/unsynced)
                const storedFiles = localStorage.getItem('uploadedFiles');
                const storedVideos = localStorage.getItem('uploadedVideos');

                if (storedFiles) {
                    const parsedFiles = JSON.parse(storedFiles);
                    // Add files from localStorage that aren't in API results
                    parsedFiles.forEach((lf: any) => {
                        if (!allFiles.some(af => af.id === lf.id)) {
                            allFiles.push(lf);
                        }
                    });
                }

                if (storedVideos) {
                    const parsedVideos = JSON.parse(storedVideos);
                    parsedVideos.forEach((v: any) => {
                        if (!allFiles.some(af => af.id === v.id)) {
                            allFiles.push({
                                ...v,
                                category: v.category || 'video' as FileCategory,
                                filename: v.filename || v.title || 'Unknown',
                            });
                        }
                    });
                }

                // Sort by upload date (newest first)
                allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
                setFiles(allFiles);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const deleteFile = async (id: string) => {
        try {
            // Delete from API
            const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete file from server');

            setFiles(prev => prev.filter(f => f.id !== id));

            // Update localStorage
            const storedFiles = localStorage.getItem('uploadedFiles');
            const storedVideos = localStorage.getItem('uploadedVideos');

            if (storedFiles) {
                const parsed = JSON.parse(storedFiles);
                const filtered = parsed.filter((f: any) => f.id !== id);
                localStorage.setItem('uploadedFiles', JSON.stringify(filtered));
            }

            if (storedVideos) {
                const parsed = JSON.parse(storedVideos);
                const filtered = parsed.filter((v: any) => v.id !== id);
                localStorage.setItem('uploadedVideos', JSON.stringify(filtered));
            }

            // Clean up IndexedDB
            await deleteVideoFile(id);
            await deletePDFFile(id);
            await deleteUniversalFile(id);

            // Also clean up analysis and chat data
            localStorage.removeItem(`analysis_${id}`);
            localStorage.removeItem(`chat_${id}`);
        } catch (err) {
            console.error('Delete file error:', err);
            alert('Failed to delete file');
        }
    };

    const createFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName, parentId: currentFolderId })
            });
            const data = await res.json();
            if (data.success) {
                setFolders(prev => [...prev, data.folder]);
                setShowNewFolderModal(false);
                setNewFolderName('');
            }
        } catch (err) {
            console.error('Create folder error:', err);
        }
    };

    const renameFolder = async () => {
        if (!showRenameModal || !showRenameModal.name.trim()) return;
        try {
            const res = await fetch(`/api/folders/${showRenameModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: showRenameModal.name })
            });
            const data = await res.json();
            if (data.success) {
                setFolders(prev => prev.map(f => f.id === showRenameModal.id ? data.folder : f));
                setShowRenameModal(null);
            }
        } catch (err) {
            console.error('Rename folder error:', err);
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (!confirm('Are you sure you want to delete this folder? Files inside will be moved to the root.')) return;
        try {
            const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setFolders(prev => prev.filter(f => f.id !== id));
                // Refresh files as they might have been moved
                const filesRes = await fetch('/api/files');
                const filesData = await filesRes.json();
                if (filesData.success) {
                    setFiles(filesData.files);
                }
            }
        } catch (err) {
            console.error('Delete folder error:', err);
        }
    };

    const moveFile = async (fileId: string, folderId: string | null) => {
        try {
            const res = await fetch(`/api/files/${fileId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId })
            });
            if (res.ok) {
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, folderId } : f));
                setShowMoveModal(null);
            }
        } catch (err) {
            console.error('Move file error:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Files</h1>
                        <p className="text-gray-600">
                            Your uploaded files and analysis results
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowNewFolderModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <FolderIcon className="w-4 h-4" />
                            New Folder
                        </button>
                        <Link
                            href="/analyze"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Upload File
                        </Link>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6 text-sm text-gray-600 overflow-x-auto whitespace-nowrap pb-2">
                    <button
                        onClick={() => setCurrentFolderId(null)}
                        className={`hover:text-blue-600 transition-colors ${currentFolderId === null ? 'font-bold text-blue-600' : ''}`}
                    >
                        My Files
                    </button>
                    {currentFolderId && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="font-bold text-blue-600">
                                {folders.find(f => f.id === currentFolderId)?.name || 'Folder'}
                            </span>
                        </>
                    )}
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Folders & Files Grid */}
                        {folders.filter(f => f.parentId === currentFolderId).length === 0 && files.filter(f => f.folderId === currentFolderId).length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center"
                            >
                                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No items here
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Create a folder or upload a file to get started
                                </p>
                                <Link
                                    href="/analyze"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Upload File
                                </Link>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {/* Back Button if in folder */}
                                {currentFolderId && (
                                    <button
                                        onClick={() => {
                                            const currentFolder = folders.find(f => f.id === currentFolderId);
                                            setCurrentFolderId(currentFolder?.parentId || null);
                                        }}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-900">Back</div>
                                            <div className="text-xs text-gray-500 italic">Go up one level</div>
                                        </div>
                                    </button>
                                )}

                                {/* Folders */}
                                {folders.filter(f => f.parentId === currentFolderId).map((folder) => (
                                    <motion.div
                                        key={folder.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between hover:shadow-md transition-all group cursor-pointer"
                                        onClick={() => setCurrentFolderId(folder.id)}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                                                <FolderIcon className="w-6 h-6" fill="currentColor" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 truncate" title={folder.name}>
                                                    {folder.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {files.filter(f => f.folderId === folder.id).length} items
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setShowRenameModal({ id: folder.id, name: folder.name })}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFolder(folder.id)}
                                                className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Files */}
                                {files.filter(f => f.folderId === currentFolderId).map((file, index) => {
                                    const CategoryIcon = getCategoryIcon(file.category);
                                    const gradient = getCategoryGradient(file.category);

                                    return (
                                        <motion.div
                                            key={file.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
                                        >
                                            {/* Thumbnail */}
                                            <div className={`relative bg-gradient-to-br ${gradient} aspect-video flex items-center justify-center`}>
                                                <CategoryIcon className="w-16 h-16" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <Link
                                                        href={`/files/${file.id}`}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                                            {file.category === 'video' || file.category === 'audio' ? (
                                                                <Play className="w-6 h-6 text-gray-900" />
                                                            ) : (
                                                                <Eye className="w-6 h-6 text-gray-900" />
                                                            )}
                                                        </div>
                                                    </Link>
                                                </div>

                                                {/* Category Badge */}
                                                <div className="absolute top-3 left-3">
                                                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                                                        {getFileIcon(file.category || 'unknown')} {getCategoryDisplayName(file.category || 'unknown')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="p-5">
                                                <h3 className="font-semibold text-gray-900 mb-3 truncate" title={file.filename}>
                                                    {file.filename}
                                                </h3>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(file.uploadedAt)}
                                                    </div>

                                                    {file.duration && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Clock className="w-4 h-4" />
                                                            {Math.floor(file.duration / 60)}:{String(Math.floor(file.duration % 60)).padStart(2, '0')}
                                                        </div>
                                                    )}

                                                    {file.analyzed && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                                ✓ Analyzed
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/files/${file.id}`}
                                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                                                    >
                                                        View Details
                                                    </Link>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => setShowMoveModal(file)}
                                                            className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                                            title="Move to folder"
                                                        >
                                                            <Move className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteFile(file.id)}
                                                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                            title="Delete file"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
                {/* Modals */}
                <AnimatePresence>
                    {/* New Folder Modal */}
                    {showNewFolderModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowNewFolderModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                            >
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Folder</h2>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Enter folder name..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowNewFolderModal(false)}
                                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={createFolder}
                                        disabled={!newFolderName.trim()}
                                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        Create
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Rename Folder Modal */}
                    {showRenameModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowRenameModal(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                            >
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Rename Folder</h2>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={showRenameModal.name}
                                        onChange={(e) => setShowRenameModal({ ...showRenameModal, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && renameFolder()}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRenameModal(null)}
                                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={renameFolder}
                                        disabled={!showRenameModal.name.trim()}
                                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Move File Modal */}
                    {showMoveModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowMoveModal(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                            >
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Move File</h2>
                                <p className="text-gray-500 mb-6">Select a destination for <b>{showMoveModal.filename}</b></p>

                                <div className="max-h-[300px] overflow-y-auto mb-6 space-y-2">
                                    <button
                                        onClick={() => moveFile(showMoveModal.id, null)}
                                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${showMoveModal.folderId === null ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                    >
                                        <File className="w-5 h-5" />
                                        <span>My Files (Root)</span>
                                    </button>
                                    {folders.map(folder => (
                                        <button
                                            key={folder.id}
                                            onClick={() => moveFile(showMoveModal.id, folder.id)}
                                            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${showMoveModal.folderId === folder.id ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                        >
                                            <FolderIcon className="w-5 h-5" />
                                            <span>{folder.name}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowMoveModal(null)}
                                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

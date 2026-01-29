'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { File, Clock, Calendar, Trash2, Play, Music, Image as LucideImageIcon, FileText, FileSpreadsheet, Eye } from 'lucide-react';
import Link from 'next/link';
import { deleteVideoFile, deletePDFFile } from '@/lib/indexeddb';
import { FileCategory, getFileIcon, getCategoryDisplayName } from '@/lib/fileTypes';

interface FileMetadata {
    id: string;
    filename: string;
    title?: string;
    category?: FileCategory;
    uploadedAt: string;
    analyzed: boolean;
    duration?: number;
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

    useEffect(() => {
        // Load files from localStorage (both new 'uploadedFiles' and legacy 'uploadedVideos')
        const storedFiles = localStorage.getItem('uploadedFiles');
        const storedVideos = localStorage.getItem('uploadedVideos');

        let allFiles: FileMetadata[] = [];

        if (storedFiles) {
            const parsedFiles = JSON.parse(storedFiles);
            allFiles = [...parsedFiles];
        }

        if (storedVideos) {
            const parsedVideos = JSON.parse(storedVideos);
            // Convert legacy video format to generic file format
            const convertedVideos = parsedVideos.map((v: any) => ({
                ...v,
                category: v.category || 'video' as FileCategory,
                filename: v.filename || v.title || 'Unknown',
            }));
            allFiles = [...allFiles, ...convertedVideos];
        }

        // Sort by upload date (newest first)
        allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        setFiles(allFiles);
    }, []);

    const deleteFile = async (id: string) => {
        const updatedFiles = files.filter(f => f.id !== id);
        setFiles(updatedFiles);

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

        // Clean up IndexedDB - try both video and PDF stores
        try {
            await deleteVideoFile(id);
            await deletePDFFile(id);
        } catch (err) {
            console.warn('Failed to delete file from IndexedDB:', err);
        }

        // Also clean up analysis and chat data
        localStorage.removeItem(`analysis_${id}`);
        localStorage.removeItem(`chat_${id}`);
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
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Files</h1>
                    <p className="text-gray-600">
                        Your uploaded files and analysis results
                    </p>
                </div>

                {/* Files Grid */}
                {files.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center"
                    >
                        <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No files yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Upload your first file to get started with AI-powered analysis
                        </p>
                        <Link
                            href="/analyze"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Upload File
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {files.map((file, index) => {
                            const CategoryIcon = getCategoryIcon(file.category);
                            const gradient = getCategoryGradient(file.category);

                            return (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
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
                                            <button
                                                onClick={() => deleteFile(file.id)}
                                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Delete file"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

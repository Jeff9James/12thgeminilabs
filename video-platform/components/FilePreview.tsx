'use client';

import { FileCategory, getFileIcon, getCategoryDisplayName, formatFileSize } from '@/lib/fileTypes';
import { VideoIcon, Music, Image as ImageIcon, FileText, FileSpreadsheet, File, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface FilePreviewProps {
    file: File | null;
    previewUrl: string | null;
    category: FileCategory | null;
    fileName?: string;
    fileSize?: number;
}

export function FilePreview({ file, previewUrl, category, fileName, fileSize }: FilePreviewProps) {
    const displayName = fileName || file?.name || 'Unknown file';
    const displaySize = fileSize || file?.size;

    if (!previewUrl || !category) {
        return (
            <div className="w-full p-8 bg-gray-100 flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
                    <File className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500">No preview available</p>
            </div>
        );
    }

    switch (category) {
        case 'video':
            return <VideoPreview url={previewUrl} />;
        case 'audio':
            return <AudioPreview url={previewUrl} fileName={displayName} />;
        case 'image':
            return <ImagePreview url={previewUrl} alt={displayName} />;
        case 'pdf':
            return <PDFPreview url={previewUrl} fileName={displayName} />;
        case 'spreadsheet':
            return <SpreadsheetPreview url={previewUrl} fileName={displayName} file={file} />;
        case 'document':
        case 'text':
            return <DocumentPreview fileName={displayName} fileSize={displaySize} category={category} />;
        default:
            return <UnknownFilePreview fileName={displayName} fileSize={displaySize} />;
    }
}

// Video Preview Component
function VideoPreview({ url }: { url: string }) {
    return (
        <video
            id="videoPlayer"
            src={url}
            controls
            className="w-full"
            preload="metadata"
            controlsList="nodownload"
        >
            Your browser does not support the video tag.
        </video>
    );
}

// Audio Preview Component
function AudioPreview({ url, fileName }: { url: string; fileName: string }) {
    return (
        <div className="w-full p-8 bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center min-h-[250px]">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Music className="w-12 h-12 text-purple-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-4 text-center max-w-md truncate">
                {fileName}
            </p>
            <audio id="audioPlayer" src={url} controls className="w-full max-w-md">
                Your browser does not support the audio tag.
            </audio>
        </div>
    );
}

// Image Preview Component
function ImagePreview({ url, alt }: { url: string; alt: string }) {
    return (
        <div className="w-full flex items-center justify-center bg-gray-100 min-h-[300px]">
            <img
                src={url}
                alt={alt}
                className="max-w-full max-h-[600px] object-contain"
            />
        </div>
    );
}

// PDF Preview Component
function PDFPreview({ url, fileName }: { url: string; fileName: string }) {
    return (
        <div className="w-full flex flex-col">
            <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 truncate max-w-md">{fileName}</p>
                        <p className="text-sm text-gray-500">PDF Document</p>
                    </div>
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Open in New Tab
                </a>
            </div>
            <div className="w-full h-[500px] bg-gray-50">
                <iframe
                    src={url}
                    className="w-full h-full"
                    title={fileName}
                />
            </div>
        </div>
    );
}

// Spreadsheet Preview Component
function SpreadsheetPreview({ url, fileName, file }: { url: string; fileName: string; file?: File | null }) {
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [currentSheet, setCurrentSheet] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadSpreadsheet() {
            try {
                setLoading(true);
                setError(null);

                let arrayBuffer: ArrayBuffer;

                // If we have the File object directly (during upload preview), use it
                if (file) {
                    arrayBuffer = await file.arrayBuffer();
                } else {
                    // Otherwise fetch from URL (after upload is complete)
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('Failed to load spreadsheet');
                    }
                    arrayBuffer = await response.arrayBuffer();
                }
                
                // Parse with xlsx
                const wb = XLSX.read(arrayBuffer, { type: 'array' });
                setWorkbook(wb);
                
                // Set first sheet as current
                if (wb.SheetNames.length > 0) {
                    setCurrentSheet(wb.SheetNames[0]);
                }
            } catch (err) {
                console.error('Error loading spreadsheet:', err);
                setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
            } finally {
                setLoading(false);
            }
        }

        loadSpreadsheet();
    }, [url, file]);

    if (loading) {
        return (
            <div className="w-full flex flex-col">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 truncate max-w-md">{fileName}</p>
                            <p className="text-sm text-gray-500">Loading spreadsheet...</p>
                        </div>
                    </div>
                </div>
                <div className="w-full h-[500px] bg-white flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-3"></div>
                        <p className="text-gray-600">Parsing spreadsheet...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full flex flex-col">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 truncate max-w-md">{fileName}</p>
                            <p className="text-sm text-red-500">Error loading spreadsheet</p>
                        </div>
                    </div>
                </div>
                <div className="w-full h-[500px] bg-white flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileSpreadsheet className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-gray-900 font-medium mb-2">Unable to preview spreadsheet</p>
                        <p className="text-gray-600 text-sm">{error}</p>
                        <a
                            href={url}
                            download={fileName}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download File
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (!workbook || !currentSheet) {
        return (
            <div className="w-full p-8 bg-gray-50 flex items-center justify-center min-h-[300px]">
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    const sheet = workbook.Sheets[currentSheet];
    const htmlTable = XLSX.utils.sheet_to_html(sheet, { editable: false });

    return (
        <div className="w-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-green-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 truncate max-w-md">{fileName}</p>
                            <p className="text-sm text-gray-500">Spreadsheet • {workbook.SheetNames.length} sheet{workbook.SheetNames.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <a
                        href={url}
                        download={fileName}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </a>
                </div>

                {/* Sheet tabs */}
                {workbook.SheetNames.length > 1 && (
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto">
                        {workbook.SheetNames.map((sheetName) => (
                            <button
                                key={sheetName}
                                onClick={() => setCurrentSheet(sheetName)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                    currentSheet === sheetName
                                        ? 'bg-green-600 text-white shadow-sm'
                                        : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'
                                }`}
                            >
                                {sheetName}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Spreadsheet content */}
            <div className="w-full h-[600px] bg-white overflow-auto">
                <div 
                    className="spreadsheet-preview p-4"
                    dangerouslySetInnerHTML={{ __html: htmlTable }}
                />
            </div>

            {/* Add custom styles for the table */}
            <style jsx>{`
                .spreadsheet-preview :global(table) {
                    border-collapse: collapse;
                    width: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    font-size: 13px;
                }
                .spreadsheet-preview :global(th),
                .spreadsheet-preview :global(td) {
                    border: 1px solid #e5e7eb;
                    padding: 8px 12px;
                    text-align: left;
                    min-width: 100px;
                }
                .spreadsheet-preview :global(th) {
                    background-color: #f9fafb;
                    font-weight: 600;
                    color: #374151;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .spreadsheet-preview :global(tr:hover) {
                    background-color: #f9fafb;
                }
                .spreadsheet-preview :global(td) {
                    color: #1f2937;
                }
                .spreadsheet-preview :global(tr:nth-child(even)) {
                    background-color: #fafafa;
                }
            `}</style>
        </div>
    );
}

// Document Preview Component (for non-spreadsheet documents)
function DocumentPreview({
    fileName,
    fileSize,
    category
}: {
    fileName: string;
    fileSize?: number;
    category: FileCategory;
}) {
    const icons: Record<string, typeof FileText> = {
        document: FileText,
        text: FileText,
    };

    const colors: Record<string, { bg: string; icon: string }> = {
        document: { bg: 'bg-orange-100', icon: 'text-orange-600' },
        text: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    };

    const Icon = icons[category] || FileText;
    const colorClasses = colors[category] || { bg: 'bg-gray-100', icon: 'text-gray-600' };

    return (
        <div className="w-full p-8 bg-gradient-to-br from-gray-50 to-slate-50 flex flex-col items-center justify-center min-h-[300px]">
            <div className={`w-24 h-24 ${colorClasses.bg} rounded-2xl flex items-center justify-center mb-6`}>
                <Icon className={`w-12 h-12 ${colorClasses.icon}`} />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2 text-center max-w-md">
                {fileName}
            </p>
            {fileSize && (
                <p className="text-gray-600 mb-4">{formatFileSize(fileSize)}</p>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200">
                <span className="text-2xl">{getFileIcon(category)}</span>
                <span className="text-sm font-medium text-gray-700">{getCategoryDisplayName(category)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-6 text-center max-w-md">
                Preview not available for this file type. The file will be analyzed by Gemini 3 Flash.
            </p>
        </div>
    );
}

// Unknown File Preview
function UnknownFilePreview({ fileName, fileSize }: { fileName: string; fileSize?: number }) {
    return (
        <div className="w-full p-8 bg-gray-100 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center mb-6">
                <File className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2 text-center max-w-md">
                {fileName}
            </p>
            {fileSize && (
                <p className="text-gray-600">{formatFileSize(fileSize)}</p>
            )}
            <p className="text-sm text-gray-500 mt-4">Unknown file type</p>
        </div>
    );
}

// File Type Badge Component
export function FileTypeBadge({ category }: { category: FileCategory }) {
    const colors: Record<FileCategory, string> = {
        video: 'bg-blue-100 text-blue-700',
        image: 'bg-green-100 text-green-700',
        audio: 'bg-purple-100 text-purple-700',
        pdf: 'bg-red-100 text-red-700',
        document: 'bg-orange-100 text-orange-700',
        spreadsheet: 'bg-pink-100 text-pink-700',
        text: 'bg-gray-100 text-gray-700',
        unknown: 'bg-gray-100 text-gray-500',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors[category]}`}>
            <span>{getFileIcon(category)}</span>
            <span>{getCategoryDisplayName(category)}</span>
        </span>
    );
}

// File Info Card Component
export function FileInfoCard({
    fileName,
    category,
    fileSize,
    uploadedAt
}: {
    fileName: string;
    category: FileCategory;
    fileSize?: number;
    uploadedAt?: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{getFileIcon(category)}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{fileName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <FileTypeBadge category={category} />
                        {fileSize && (
                            <span className="text-sm text-gray-500">{formatFileSize(fileSize)}</span>
                        )}
                    </div>
                    {uploadedAt && (
                        <p className="text-sm text-gray-400 mt-2">
                            Uploaded {new Date(uploadedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

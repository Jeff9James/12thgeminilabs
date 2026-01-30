/**
 * File type utilities for multi-modal file support
 * Supports video, image, audio, PDF, documents, and spreadsheets
 * 
 * This module is isomorphic - can be used in both server and client components
 */

export type FileCategory = 'video' | 'image' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'text' | 'unknown';

export interface FileTypeConfig {
    category: FileCategory;
    mimeTypes: string[];
    extensions: string[];
    maxSizeMB: number;
    geminiSupported: boolean;
    description: string;
}

// File type configurations based on Gemini File API support
export const FILE_TYPE_CONFIGS: Record<FileCategory, FileTypeConfig> = {
    video: {
        category: 'video',
        mimeTypes: ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'],
        extensions: ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.mpeg'],
        maxSizeMB: 2000, // 2GB
        geminiSupported: true,
        description: 'Video files (MP4, MOV, AVI, WebM)',
    },
    image: {
        category: 'image',
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml'],
        extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.svg'],
        maxSizeMB: 20, // 20MB
        geminiSupported: true,
        description: 'Image files (JPEG, PNG, WebP, GIF)',
    },
    audio: {
        category: 'audio',
        mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/x-m4a'],
        extensions: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma'],
        maxSizeMB: 2000, // 2GB
        geminiSupported: true,
        description: 'Audio files (MP3, WAV, OGG, AAC)',
    },
    pdf: {
        category: 'pdf',
        mimeTypes: ['application/pdf'],
        extensions: ['.pdf'],
        maxSizeMB: 50, // 50MB
        geminiSupported: true,
        description: 'PDF documents',
    },
    document: {
        category: 'document',
        mimeTypes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.oasis.opendocument.text',
            'application/rtf',
        ],
        extensions: ['.doc', '.docx', '.odt', '.rtf'],
        maxSizeMB: 50, // 50MB
        geminiSupported: true,
        description: 'Word documents (DOC, DOCX, ODT)',
    },
    spreadsheet: {
        category: 'spreadsheet',
        mimeTypes: [
            'application/vnd.ms-excel', // .xls (old Excel) - NOT supported by Gemini, will be converted
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx - NOT supported by Gemini, will be converted
            'application/vnd.oasis.opendocument.spreadsheet', // .ods - NOT supported by Gemini, will be converted
            'text/csv', // CSV - SUPPORTED by Gemini
        ],
        extensions: ['.xls', '.xlsx', '.ods', '.csv'],
        maxSizeMB: 50, // 50MB
        geminiSupported: true, // CSV is supported, others need conversion
        description: 'Spreadsheets (XLS, XLSX, ODS, CSV)',
    },
    text: {
        category: 'text',
        mimeTypes: ['text/plain', 'text/markdown', 'text/html', 'text/xml', 'application/json'],
        extensions: ['.txt', '.md', '.html', '.htm', '.xml', '.json'],
        maxSizeMB: 100, // 100MB
        geminiSupported: true,
        description: 'Text files (TXT, MD, JSON)',
    },
    unknown: {
        category: 'unknown',
        mimeTypes: [],
        extensions: [],
        maxSizeMB: 50,
        geminiSupported: false,
        description: 'Unknown file type',
    },
};

// All supported MIME types for file input accept attribute
export const SUPPORTED_MIME_TYPES = Object.values(FILE_TYPE_CONFIGS)
    .flatMap(config => config.mimeTypes)
    .filter(Boolean);

// Accept string for file input
export const FILE_INPUT_ACCEPT = SUPPORTED_MIME_TYPES.join(',');

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
    for (const [category, config] of Object.entries(FILE_TYPE_CONFIGS)) {
        if (config.mimeTypes.includes(mimeType.toLowerCase())) {
            return category as FileCategory;
        }
    }
    return 'unknown';
}

/**
 * Get file category from MIME type (alias for getFileCategory)
 */
export function getFileCategoryFromMimeType(mimeType: string): FileCategory | null {
    const category = getFileCategory(mimeType);
    return category === 'unknown' ? null : category;
}

/**
 * Get file category from file extension
 */
export function getFileCategoryFromExtension(filename: string): FileCategory {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    for (const [category, config] of Object.entries(FILE_TYPE_CONFIGS)) {
        if (config.extensions.includes(ext)) {
            return category as FileCategory;
        }
    }
    return 'unknown';
}

/**
 * Check if file type is supported by Gemini
 */
export function isGeminiSupported(mimeType: string): boolean {
    const category = getFileCategory(mimeType);
    return FILE_TYPE_CONFIGS[category]?.geminiSupported ?? false;
}

/**
 * Get max file size in bytes for a MIME type
 */
export function getMaxFileSizeBytes(mimeType: string): number {
    const category = getFileCategory(mimeType);
    const maxMB = FILE_TYPE_CONFIGS[category]?.maxSizeMB ?? 50;
    return maxMB * 1024 * 1024;
}

/**
 * Validate file type and size
 */
export interface FileValidationResult {
    valid: boolean;
    error?: string;
    category?: FileCategory;
}

export function validateFile(file: File): FileValidationResult {
    const category = getFileCategory(file.type) || getFileCategoryFromExtension(file.name);

    if (category === 'unknown') {
        return {
            valid: false,
            error: `Unsupported file type: ${file.type || 'unknown'}. Please upload a supported file format.`,
        };
    }

    const config = FILE_TYPE_CONFIGS[category];
    const maxSizeBytes = config.maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `File too large. Maximum size for ${config.category} files is ${config.maxSizeMB}MB.`,
            category,
        };
    }

    return {
        valid: true,
        category,
    };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on category
 */
export function getFileIcon(category: FileCategory): string {
    const icons: Record<FileCategory, string> = {
        video: '🎬',
        image: '🖼️',
        audio: '🎵',
        pdf: '📄',
        document: '📝',
        spreadsheet: '📊',
        text: '📃',
        unknown: '📎',
    };
    return icons[category] || icons.unknown;
}

/**
 * Get display name for file category
 */
export function getCategoryDisplayName(category: FileCategory): string {
    const names: Record<FileCategory, string> = {
        video: 'Video',
        image: 'Image',
        audio: 'Audio',
        pdf: 'PDF Document',
        document: 'Document',
        spreadsheet: 'Spreadsheet',
        text: 'Text File',
        unknown: 'File',
    };
    return names[category] || 'File';
}

/**
 * Check if file can be previewed in browser
 */
export function canPreviewInBrowser(category: FileCategory): boolean {
    return ['video', 'image', 'audio', 'pdf', 'text'].includes(category);
}

/**
 * Get media resolution setting for Gemini API based on file category
 * Per Gemini 3 docs recommendations
 */
export function getGeminiMediaResolution(category: FileCategory): string {
    switch (category) {
        case 'image':
            return 'media_resolution_high'; // 1120 tokens for detailed image analysis
        case 'pdf':
            return 'media_resolution_medium'; // 560 tokens - optimal for documents
        case 'video':
            return 'media_resolution_low'; // 70 tokens per frame - sufficient for most video
        default:
            return 'media_resolution_medium';
    }
}

/**
 * Check if a spreadsheet MIME type is supported by Gemini API
 * Only text/csv is natively supported
 */
export function isSpreadsheetSupportedByGemini(mimeType: string): boolean {
    return mimeType === 'text/csv' || mimeType === 'text/plain';
}

/**
 * Check if a file needs conversion before uploading to Gemini
 */
export function needsConversionForGemini(mimeType: string): boolean {
    // Old Excel (.xls), modern Excel (.xlsx), and OpenDocument (.ods) need conversion to CSV
    const unsupportedSpreadsheetTypes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.oasis.opendocument.spreadsheet', // .ods
    ];
    return unsupportedSpreadsheetTypes.includes(mimeType);
}

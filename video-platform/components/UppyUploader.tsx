'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    Uppy,
    Webcam,
    Unsplash,
    Url,
    Audio,
    ScreenCapture,
    ImageEditor,
    XHRUpload,
} from 'uppy';
import DashboardModal from '@uppy/react/dashboard-modal';

import 'uppy/dist/uppy.min.css';

interface UppyUploaderProps {
    open: boolean;
    onClose: () => void;
    onFileSelect: (file: File) => void;
}

// These are only used for the plugins that absolutely require a server (Unsplash, Url)
const companionUrl = '/companion';

export default function UppyUploader({ open, onClose, onFileSelect }: UppyUploaderProps) {
    const [isMounted, setIsMounted] = useState(false);

    // Store callbacks in a ref to prevent effect re-runs when they change
    const onFileSelectRef = useRef(onFileSelect);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onFileSelectRef.current = onFileSelect;
        onCloseRef.current = onClose;
    }, [onFileSelect, onClose]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const uppy = useMemo(() => {
        const u = new Uppy({
            debug: true,
            id: 'uppy-uploader',
            autoProceed: false, // Wait for user to click upload
            restrictions: {
                maxNumberOfFiles: 1,
            },
        })
            .use(Webcam)
            .use(ScreenCapture)
            .use(Audio)
            .use(ImageEditor, {})
            // Unsplash and Url REQUIRE a companionUrl. They cannot run client-only.
            .use(Unsplash, { companionUrl })
            .use(Url, { companionUrl })
            // We need an uploader plugin to satisfy Uppy and trigger 'complete' events.
            .use(XHRUpload, { endpoint: '/api/upload-dummy', formData: true, bundle: true });

        if (typeof window !== 'undefined') {
            (window as any).uppy = u;
        }

        return u;
    }, []);

    useEffect(() => {
        const handleComplete = async (result: any) => {
            if (result.successful && result.successful.length > 0) {
                const uppyFile = result.successful[0];

                let fileToReturn: File;

                // Check if we have actual file data. Remote files initially only have metadata.
                const hasData = uppyFile.data instanceof File || uppyFile.data instanceof Blob;

                if (hasData && uppyFile.data.size > 0) {
                    fileToReturn = uppyFile.data instanceof File
                        ? uppyFile.data
                        : new File([uppyFile.data], uppyFile.name || 'upload', { type: uppyFile.type });
                } else {
                    // This is likely a remote file (Url import). 
                    // To get it to the app's local state, we need to fetch the bytes.
                    try {
                        const sourceUrl = uppyFile.uploadURL || uppyFile.remote?.body?.url || uppyFile.preview;

                        if (sourceUrl) {
                            console.log('[UppyUploader] Fetching remote file data from:', sourceUrl);
                            const response = await fetch(sourceUrl);
                            const blob = await response.blob();
                            fileToReturn = new File([blob], uppyFile.name || 'upload', { type: uppyFile.type });
                        } else {
                            fileToReturn = new File([], uppyFile.name || 'upload', { type: uppyFile.type });
                        }
                    } catch (err) {
                        console.error('Failed to fetch remote file data:', err);
                        fileToReturn = new File([], uppyFile.name || 'upload', { type: uppyFile.type });
                    }
                }

                onFileSelectRef.current(fileToReturn);
                onCloseRef.current();
                uppy.cancelAll();
            }
        };

        uppy.on('complete', handleComplete);

        return () => {
            uppy.off('complete', handleComplete);
        };
    }, [uppy]);

    useEffect(() => {
        return () => {
            uppy.destroy();
        };
    }, [uppy]);

    if (!isMounted) return null;

    return (
        <DashboardModal
            uppy={uppy}
            open={open}
            onRequestClose={onClose}
            closeModalOnClickOutside
            proudlyDisplayPoweredByUppy={false}
        />
    );
}

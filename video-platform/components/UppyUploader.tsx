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
            .use(Url, { companionUrl });

        // Since we removed Tus, we can handle the "upload" event locally
        // or just let 'complete' fire when the user finishes selecting/editing.

        if (typeof window !== 'undefined') {
            (window as any).uppy = u;
        }

        return u;
    }, []);

    useEffect(() => {
        const handleComplete = (result: any) => {
            if (result.successful && result.successful.length > 0) {
                const uppyFile = result.successful[0];

                // Convert Blob to File if necessary
                let fileToReturn: File;
                if (uppyFile.data instanceof File) {
                    fileToReturn = uppyFile.data;
                } else {
                    fileToReturn = new File([uppyFile.data], uppyFile.name || 'upload', { type: uppyFile.type });
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

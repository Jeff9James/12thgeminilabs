'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    Uppy,
    Webcam,
    Zoom,
    Dropbox,
    OneDrive,
    Unsplash,
    Url,
    Box,
    Audio,
    ScreenCapture,
    ImageEditor,
    Tus,
    GoogleDrive,
    Facebook,
    Instagram,
} from 'uppy';
import DashboardModal from '@uppy/react/dashboard-modal';

import 'uppy/dist/uppy.min.css';

interface UppyUploaderProps {
    open: boolean;
    onClose: () => void;
    onFileSelect: (file: File) => void;
}

const companionUrl = 'https://companion.uppy.io';
const endpoint = 'https://tusd.tusdemo.net/files/';

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
            autoProceed: false,
            restrictions: {
                maxNumberOfFiles: 1,
            },
        })
            .use(Webcam)
            .use(ScreenCapture)
            .use(Audio)
            .use(ImageEditor, {})
            .use(Tus, { endpoint })
            .use(Dropbox, { companionUrl })
            .use(Url, { companionUrl })
            .use(OneDrive, { companionUrl })
            .use(Unsplash, { companionUrl })
            .use(Box, { companionUrl })
            .use(Zoom, { companionUrl })
            .use(Facebook, { companionUrl })
            .use(Instagram, { companionUrl })
            .use(GoogleDrive, { companionUrl });

        if (typeof window !== 'undefined') {
            (window as any).uppy = u;
        }

        return u;
    }, []);

    useEffect(() => {
        const handleComplete = (result: any) => {
            if (result.successful && result.successful.length > 0) {
                const uppyFile = result.successful[0];
                if (uppyFile.data instanceof File) {
                    onFileSelectRef.current(uppyFile.data);
                } else if (uppyFile.data instanceof Blob) {
                    const file = new File([uppyFile.data], uppyFile.name, { type: uppyFile.type });
                    onFileSelectRef.current(file);
                }
                onCloseRef.current();
                uppy.cancelAll();
            }
        };

        uppy.on('complete', handleComplete);

        return () => {
            uppy.off('complete', handleComplete);
        };
    }, [uppy]);

    // Cleanup uppy instance only on true unmount
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

'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
        uppy.on('complete', (result) => {
            if (result.successful && result.successful.length > 0) {
                const uppyFile = result.successful[0];
                if (uppyFile.data instanceof File) {
                    onFileSelect(uppyFile.data);
                } else if (uppyFile.data instanceof Blob) {
                    const file = new File([uppyFile.data], uppyFile.name, { type: uppyFile.type });
                    onFileSelect(file);
                }
                onClose();
                uppy.cancelAll();
            }
        });

        return () => {
            uppy.destroy();
        };
    }, [uppy, onFileSelect, onClose]);

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

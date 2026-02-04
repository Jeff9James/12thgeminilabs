'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    Uppy,
    Webcam,
    Zoom,
    Audio,
    ScreenCapture,
    ImageEditor,
    Tus,
    RemoteSources,
} from 'uppy';
import DashboardModal from '@uppy/react/dashboard-modal';

// Use the consolidated Uppy CSS bundle for reliability
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
        return new Uppy({
            id: 'uppy-uploader',
            autoProceed: false,
            debug: process.env.NODE_ENV === 'development',
            restrictions: {
                maxNumberOfFiles: 1,
            },
        })
            .use(Webcam)
            .use(ScreenCapture)
            .use(Audio)
            .use(ImageEditor, {})
            .use(Tus, { endpoint })
            .use(RemoteSources, {
                companionUrl,
                sources: [
                    'GoogleDrive',
                    'Dropbox',
                    'Instagram',
                    'Facebook',
                    'OneDrive',
                    'Box',
                    'Unsplash',
                    'Url',
                    'Zoom',
                ],
            });
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
    }, [uppy, onFileSelect, onClose]);

    if (!isMounted) return null;

    return (
        <DashboardModal
            uppy={uppy}
            open={open}
            onRequestClose={onClose}
            closeModalOnClickOutside
            proudlyDisplayPoweredByUppy={false}
            plugins={[
                'Webcam',
                'ImageEditor',
                'ScreenCapture',
                'Audio',
                'RemoteSources' // handles adding its own plugins to the Dashboard
            ]}
        />
    );
}

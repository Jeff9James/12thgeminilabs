'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Uppy from '@uppy/core';
import DashboardModal from '@uppy/react/dashboard-modal';
import Webcam from '@uppy/webcam';
import ScreenCapture from '@uppy/screen-capture';
import Audio from '@uppy/audio';
import GoogleDrive from '@uppy/google-drive';
import GooglePhotos from '@uppy/google-photos';
import Instagram from '@uppy/instagram';
import OneDrive from '@uppy/onedrive';
import Unsplash from '@uppy/unsplash';
import Url from '@uppy/url';
import Box from '@uppy/box';
import WebDAV from '@uppy/webdav';
import Zoom from '@uppy/zoom';
import Dropbox from '@uppy/dropbox';
import Facebook from '@uppy/facebook';

import '@uppy/core/css/style.css';
import '@uppy/dashboard/css/style.css';
import '@uppy/webcam/css/style.css';
import '@uppy/screen-capture/css/style.css';
import '@uppy/audio/css/style.css';
import '@uppy/url/css/style.css';

interface UppyUploaderProps {
    open: boolean;
    onClose: () => void;
    onFileSelect: (file: File) => void;
    allowedMetaFields?: string[];
}

export default function UppyUploader({ open, onClose, onFileSelect }: UppyUploaderProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const uppy = useMemo(() => {
        const companionUrl = 'https://companion.uppy.io';

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
            .use(Url, { companionUrl })
            .use(GoogleDrive, { companionUrl })
            .use(GooglePhotos, { companionUrl })
            .use(Instagram, { companionUrl })
            .use(OneDrive, { companionUrl })
            .use(Unsplash, { companionUrl })
            .use(Box, { companionUrl })
            .use(WebDAV, { companionUrl })
            .use(Zoom, { companionUrl })
            .use(Dropbox, { companionUrl })
            .use(Facebook, { companionUrl });
    }, []);

    useEffect(() => {
        uppy.on('complete', (result) => {
            if (result.successful && result.successful.length > 0) {
                const uppyFile = result.successful[0];
                // Convert Uppy file to standard File object
                if (uppyFile.data instanceof File) {
                    onFileSelect(uppyFile.data);
                } else if (uppyFile.data instanceof Blob) {
                    const file = new File([uppyFile.data], uppyFile.name, { type: uppyFile.type });
                    onFileSelect(file);
                }
                onClose();
                // Clear uppy state for next time
                uppy.cancelAll();
            }
        });

        return () => {
            // uppy.close() is handled by uppy itself if we don't manage it carefully, 
            // but in React with useMemo we should be careful.
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
            metaFields={[
                { id: 'name', name: 'Name', placeholder: 'file name' },
                { id: 'caption', name: 'Caption', placeholder: 'describe what the file is about' },
            ]}
        />
    );
}

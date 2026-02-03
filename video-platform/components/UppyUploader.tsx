'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Uppy from '@uppy/core';
import Webcam from '@uppy/webcam';
import GoogleDrive from '@uppy/google-drive';
import GooglePhotos from '@uppy/google-photos';
import Dropbox from '@uppy/dropbox';
import Instagram from '@uppy/instagram';
import Facebook from '@uppy/facebook';
import OneDrive from '@uppy/onedrive';
import Box from '@uppy/box';
import Url from '@uppy/url';
import Zoom from '@uppy/zoom';
import Unsplash from '@uppy/unsplash';
import Audio from '@uppy/audio';
import ScreenCapture from '@uppy/screen-capture';
import ImageEditor from '@uppy/image-editor';
import Tus from '@uppy/tus';
import DashboardModal from '@uppy/react/dashboard-modal';

// CSS imports
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import '@uppy/webcam/dist/style.min.css';
import '@uppy/screen-capture/dist/style.min.css';
import '@uppy/audio/dist/style.min.css';
import '@uppy/url/dist/style.min.css';
import '@uppy/image-editor/dist/style.min.css';

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
            .use(Dropbox, { companionUrl })
            .use(Url, { companionUrl })
            .use(OneDrive, { companionUrl })
            .use(Unsplash, { companionUrl })
            .use(Box, { companionUrl })
            .use(Zoom, { companionUrl })
            .use(Facebook, { companionUrl })
            .use(Instagram, { companionUrl })
            .use(GoogleDrive, { companionUrl })
            .use(GooglePhotos, { companionUrl });
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
                'Dropbox',
                'Url',
                'OneDrive',
                'Unsplash',
                'Box',
                'ImageEditor',
                'GoogleDrive',
                'GooglePhotos',
                'Facebook',
                'Instagram',
                'Zoom',
                'ScreenCapture',
                'Audio'
            ]}
        />
    );
}

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
    GoogleDrivePicker,
    GooglePhotosPicker,
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
const googlePickerClientId =
    '458443975467-fiplebcb8bdnplqo8hlfs9pagmseo5nk.apps.googleusercontent.com';
const googlePickerApiKey = 'AIzaSyC6m6CZEFiTtSkBfNf_-PvtCxmDMiAgfag';
const googlePickerAppId = '458443975467';

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
            .use(GoogleDrivePicker, {
                companionUrl,
                clientId: googlePickerClientId,
                apiKey: googlePickerApiKey,
                appId: googlePickerAppId,
            })
            .use(GooglePhotosPicker, {
                companionUrl,
                clientId: googlePickerClientId,
            });

        // Expose for easier debugging as seen in the snippet
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
            // We don't uppy.destroy() here to keep the instance alive for the next open, 
            // matching useMemo behavior.
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
            plugins={[
                'Webcam',
                'Dropbox',
                'Url',
                'OneDrive',
                'Unsplash',
                'Box',
                'ImageEditor',
            ]}
        />
    );
}

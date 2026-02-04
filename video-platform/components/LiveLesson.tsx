'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, X, Radio, Loader2, Play } from 'lucide-react';

interface LiveLessonProps {
    onClose: () => void;
    systemInstruction?: string;
    contextFiles?: any[];
}

export default function LiveLesson({ onClose, systemInstruction, contextFiles }: LiveLessonProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Initializing Real-Time Teacher...');

    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);

    useEffect(() => {
        startSession();
        return () => stopSession();
    }, []);

    const startSession = async () => {
        try {
            setStatus('Requesting secure session...');
            const res = await fetch('/api/chat/live/token', { method: 'POST' });
            const { baseUrl, model, key } = await res.json();

            setStatus('Connecting to Gemini Live...');
            const url = `${baseUrl}?key=${key}`;
            const socket = new WebSocket(url);
            socketRef.current = socket;

            socket.onopen = () => {
                setIsConnected(true);
                setStatus('AI Tutor connected. Speak now!');
                const fileContext = contextFiles?.length
                    ? `\n\nCURRENT STUDY MATERIALS:\n${JSON.stringify(contextFiles.map(f => ({ filename: f.filename || f.title, category: f.category })))}`
                    : "";

                // Send initial config
                socket.send(JSON.stringify({
                    setup: {
                        model: `models/${model}`,
                        generation_config: {
                            response_modalities: ["AUDIO"]
                        },
                        system_instruction: {
                            parts: [{ text: (systemInstruction || "You are a helpful AI Tutor. Explain concepts clearly and patiently.") + fileContext }]
                        }
                    }
                }));
                startMic();
            };

            socket.onmessage = async (event) => {
                const response = JSON.parse(event.data);

                if (response.serverContent?.interrupted) {
                    audioQueueRef.current = [];
                    setIsSpeaking(false);
                    return;
                }

                if (response.serverContent?.modelTurn?.parts) {
                    for (const part of response.serverContent.modelTurn.parts) {
                        if (part.inlineData?.data) {
                            const binary = atob(part.inlineData.data);
                            const buffer = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
                            audioQueueRef.current.push(buffer.buffer);
                            if (!isPlayingRef.current) playNextChunk();
                        }
                    }
                }
            };

            socket.onerror = (err) => {
                console.error("WebSocket Error:", err);
                setError("Connection error. Please try again.");
            };

            socket.onclose = () => {
                setIsConnected(false);
                stopMic();
            };

        } catch (err: any) {
            setError(err.message || "Failed to start live lesson");
        }
    };

    const stopSession = () => {
        socketRef.current?.close();
        stopMic();
        if (audioContextRef.current) audioContextRef.current.close();
    };

    const startMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert float32 to int16 PCM
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }

                    // Convert to Base64
                    const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                    socketRef.current.send(JSON.stringify({
                        realtime_input: {
                            media_chunks: [{
                                data: base64Data,
                                mime_type: "audio/pcm"
                            }]
                        }
                    }));
                    setIsListening(true);
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

        } catch (err) {
            console.error("Mic Error:", err);
            setError("Could not access microphone.");
        }
    };

    const stopMic = () => {
        micStreamRef.current?.getTracks().forEach(track => track.stop());
        processorRef.current?.disconnect();
        setIsListening(false);
    };

    const playNextChunk = async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        isPlayingRef.current = true;
        setIsSpeaking(true);
        const chunk = audioQueueRef.current.shift()!;

        try {
            const audioCtx = audioContextRef.current!;
            // Convert 24kHz PCM to AudioBuffer
            const int16Array = new Int16Array(chunk);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 0x7FFF;

            const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
            buffer.getChannelData(0).set(float32Array);

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.onended = playNextChunk;
            source.start();
        } catch (err) {
            console.error("Playback error:", err);
            playNextChunk();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-purple-900/40 backdrop-blur-md"
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg relative">
                        <AnimatePresence>
                            {(isListening || isSpeaking) && (
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 bg-purple-400 rounded-full -z-10"
                                />
                            )}
                        </AnimatePresence>
                        <Radio className={`w-10 h-10 text-white ${isConnected ? 'animate-pulse' : ''}`} />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Real-Time AI Tutor</h2>
                    <p className="text-gray-500 text-sm mb-8 px-6 leading-relaxed">
                        {status}
                    </p>

                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300'}`}>
                            {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                            <span className="text-[10px] font-bold block mt-1 uppercase">Listening</span>
                        </div>
                        <div className={`p-4 rounded-2xl transition-all ${isSpeaking ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300'}`}>
                            {isSpeaking ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                            <span className="text-[10px] font-bold block mt-1 uppercase">Speaking</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="mt-10 w-full pt-6 border-t border-gray-100 italic text-[11px] text-gray-400">
                        Powered by Gemini Live API • Real-Time Voice Tutoring
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function XCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
    );
}

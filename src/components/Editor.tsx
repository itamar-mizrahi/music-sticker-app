"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Upload, Play, Pause, Scissors, RefreshCw, Loader2 } from 'lucide-react';
import { useStickerCanvas } from '@/hooks/useStickerCanvas';
import { useAudioProcessor } from '@/hooks/useAudioProcessor';

export default function Editor() {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const regionsPlugin = useRef<RegionsPlugin | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [transcript, setTranscript] = useState("");
    const [region, setRegion] = useState<{ start: number, end: number } | null>(null);

    // Style State
    const [bgColor, setBgColor] = useState("#000000");
    const [textColor, setTextColor] = useState("#ffffff");
    const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
    const [fontSize, setFontSize] = useState(80);

    const [isMounted, setIsMounted] = useState(false);

    // Custom Hooks
    const { canvasRef, generateImageBlob } = useStickerCanvas({ transcript, bgColor, textColor, bgImage, fontSize });
    const { isLoaded: isFFmpegLoaded, isProcessing, error: processingError, exportAudio, exportVideo } = useAudioProcessor();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: 'rgba(255, 255, 255, 0.3)',
            progressColor: '#a855f7', // Purple-500
            cursorColor: '#ec4899', // Pink-500
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 128,
            normalize: true,
            minPxPerSec: 50,
        });

        const wsRegions = ws.registerPlugin(RegionsPlugin.create());
        regionsPlugin.current = wsRegions;

        wsRegions.enableDragSelection({
            color: 'rgba(168, 85, 247, 0.2)', // Purple with opacity
        });

        wsRegions.on('region-created', (region) => {
            setRegion({ start: region.start, end: region.end });
            // Ensure only one region exists for now (MVP)
            wsRegions.getRegions().forEach(r => {
                if (r.id !== region.id) r.remove();
            });
        });

        wsRegions.on('region-updated', (region) => {
            setRegion({ start: region.start, end: region.end });
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));

        wavesurfer.current = ws;

        return () => {
            ws.destroy();
        };
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            alert("Please upload a valid audio file.");
            return;
        }

        if (file && wavesurfer.current) {
            setAudioFile(file);
            const url = URL.createObjectURL(file);
            wavesurfer.current.load(url);

            // Auto-select first 10 seconds
            wavesurfer.current.on('ready', () => {
                const duration = wavesurfer.current?.getDuration() || 0;
                const end = Math.min(duration, 10);
                regionsPlugin.current?.addRegion({
                    start: 0,
                    end: end,
                    color: 'rgba(168, 85, 247, 0.2)'
                });
            });
        }
    };

    const handleReplaceAudio = () => {
        setAudioFile(null);
        setRegion(null);
        wavesurfer.current?.empty();
    };

    const togglePlay = () => {
        wavesurfer.current?.playPause();
    };

    const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                setBgImage(img);
            };
        }
    };

    const handleExport = async (type: 'audio' | 'video') => {
        if (!audioFile || !region) return;

        try {
            const audioBlob = await exportAudio(audioFile, region.start, region.end);

            let finalBlob = audioBlob;
            let extension = 'mp3';

            if (type === 'video') {
                const imageBlob = await generateImageBlob();
                if (imageBlob) {
                    finalBlob = await exportVideo(audioBlob, imageBlob);
                    extension = 'mp4';
                }
            }

            // Download
            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sticker-${Date.now()}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            // Error handled in hook
        }
    };

    if (!isMounted) {
        return null;
    }

    return (
        <div className="flex flex-col h-full w-full p-6 gap-6">
            {/* Waveform Area */}
            <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col gap-4 relative group">
                {!audioFile && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 backdrop-blur-sm rounded-xl">
                        <label className="cursor-pointer flex flex-col items-center gap-2 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-purple-500/50 hover:bg-white/5 transition-all">
                            <Upload className="w-8 h-8 text-purple-400" />
                            <span className="text-white/70 font-medium">Upload Audio File</span>
                            <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                )}

                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-white/70 font-medium text-sm uppercase tracking-wider">Waveform</h2>
                    {audioFile && (
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-white/30">{audioFile.name}</span>
                            <button
                                onClick={handleReplaceAudio}
                                className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Replace Audio
                            </button>
                        </div>
                    )}
                </div>

                <div ref={containerRef} className="w-full flex-1" />

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                        onClick={togglePlay}
                        disabled={!audioFile}
                        className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                </div>
            </div>

            {/* Transcript Area */}
            <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    Transcript
                    <span className="text-xs font-normal text-white/40 bg-white/10 px-2 py-1 rounded">Manual Sync</span>
                </h2>
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full h-full bg-transparent resize-none outline-none text-white/80 placeholder:text-white/30 font-mono text-sm leading-relaxed"
                    placeholder="Paste your lyrics or transcript here..."
                />

                {/* Preview Area */}
                <div className="mt-6 border-t border-white/10 pt-6">
                    <h3 className="text-sm font-medium text-white/70 mb-3 uppercase tracking-wider">Sticker Preview</h3>
                    <div className="flex gap-6 items-start">
                        {/* Live Canvas Preview */}
                        <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-white/20 shadow-2xl shrink-0">
                            <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        </div>

                        {/* Style Controls */}
                        <div className="flex flex-col gap-4 flex-1">
                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block">Background Image</label>
                                <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg p-2 transition-colors">
                                    <Upload className="w-4 h-4 text-white/70" />
                                    <span className="text-xs text-white/70">Upload Image</span>
                                    <input type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
                                </label>
                                {bgImage && (
                                    <button onClick={() => setBgImage(null)} className="text-xs text-red-400 hover:text-red-300">
                                        Remove Image
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block">Background Color (Fallback)</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 cursor-pointer hover:scale-110 transition-transform">
                                        <input
                                            type="color"
                                            value={bgColor}
                                            onChange={e => setBgColor(e.target.value)}
                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-white/70">{bgColor}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block">Text Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 cursor-pointer hover:scale-110 transition-transform">
                                        <input
                                            type="color"
                                            value={textColor}
                                            onChange={e => setTextColor(e.target.value)}
                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-white/70">{textColor}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-white/50 block">Font Size ({fontSize}px)</label>
                                <input
                                    type="range"
                                    min="40"
                                    max="150"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="h-20 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between px-6">
                <div className="text-white/50 text-sm flex items-center gap-2">
                    {!isFFmpegLoaded ? (
                        <span className="flex items-center gap-2 text-yellow-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading Audio Processor...
                        </span>
                    ) : (
                        "Select a region on the waveform to export."
                    )}
                    {processingError && <span className="text-red-400">{processingError}</span>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport('audio')}
                        disabled={!region || isProcessing || !isFFmpegLoaded}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                        {isProcessing ? 'Processing...' : 'Audio Only'}
                    </button>
                    <button
                        onClick={() => handleExport('video')}
                        disabled={!region || isProcessing || !isFFmpegLoaded}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                        {isProcessing ? 'Exporting...' : (!region ? 'Select Region' : 'Export Video')}
                    </button>
                </div>
            </div>
        </div>
    );
}

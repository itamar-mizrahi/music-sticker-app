"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Upload, Play, Pause, Scissors } from 'lucide-react';

export default function Editor() {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [transcript, setTranscript] = useState("");
    const [region, setRegion] = useState<{ start: number, end: number } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [bgColor, setBgColor] = useState("#000000");
    const [textColor, setTextColor] = useState("#ffffff");

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
        if (file && wavesurfer.current) {
            setAudioFile(file);
            const url = URL.createObjectURL(file);
            wavesurfer.current.load(url);
        }
    };

    const togglePlay = () => {
        wavesurfer.current?.playPause();
    };

    const updateCanvas = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions (square for stickers)
        // Display size vs internal resolution
        const size = 1080;
        canvas.width = size;
        canvas.height = size;

        // Draw Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 80px sans-serif'; // Larger font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Simple text wrapping
        const words = transcript.split(' ');
        const maxWidth = canvas.width - 200;
        const lineHeight = 100;
        let lines = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const width = ctx.measureText(currentLine + " " + words[i]).width;
            if (width < maxWidth) {
                currentLine += " " + words[i];
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        // Draw lines centered vertically
        const totalHeight = lines.length * lineHeight;
        let startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2);

        if (words.length === 0 || transcript.trim() === '') {
            ctx.fillStyle = textColor + '50'; // Transparent
            ctx.fillText("Lyrics Preview", canvas.width / 2, canvas.height / 2);
        } else {
            lines.forEach((line, i) => {
                ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
            });
        }
    };

    useEffect(() => {
        updateCanvas();
    }, [transcript, bgColor, textColor]);

    const generateImageBlob = async (): Promise<Blob | null> => {
        if (!canvasRef.current) return null;
        return new Promise(resolve => canvasRef.current?.toBlob(resolve, 'image/png'));
    };

    const handleExport = async (type: 'audio' | 'video') => {
        if (!audioFile || !region) return;

        setIsExporting(true);
        try {
            const { audioProcessor } = await import('@/lib/audioProcessor');
            const audioBlob = await audioProcessor.trimAudio(audioFile, region.start, region.end);

            let finalBlob = audioBlob;
            let extension = 'mp3';

            if (type === 'video') {
                const imageBlob = await generateImageBlob();
                if (imageBlob) {
                    finalBlob = await audioProcessor.createVideo(audioBlob, imageBlob);
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
            console.error("Export failed:", error);
            alert("Export failed. See console for details.");
        } finally {
            setIsExporting(false);
        }
    };

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
                        <span className="text-xs text-white/30">{audioFile.name}</span>
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
                                <label className="text-xs text-white/50 block">Background Color</label>
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="h-20 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between px-6">
                <div className="text-white/50 text-sm">
                    Select a region on the waveform to export.
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport('audio')}
                        disabled={!region || isExporting}
                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Scissors className="w-4 h-4" />
                        {isExporting ? '...' : 'Audio Only'}
                    </button>
                    <button
                        onClick={() => handleExport('video')}
                        disabled={!region || isExporting}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Scissors className="w-4 h-4" />
                        {isExporting ? 'Exporting...' : 'Export Video'}
                    </button>
                </div>
            </div>
        </div>
    );
}

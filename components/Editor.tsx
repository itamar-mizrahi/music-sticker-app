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
            // Ensure only one region exists for now (MVP)
            wsRegions.getRegions().forEach(r => {
                if (r.id !== region.id) r.remove();
            });
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
            </div>

            {/* Action Bar */}
            <div className="h-20 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between px-6">
                <div className="text-white/50 text-sm">
                    Select a region on the waveform to export.
                </div>
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20">
                    <Scissors className="w-4 h-4" />
                    Export Sticker
                </button>
            </div>
        </div>
    );
}

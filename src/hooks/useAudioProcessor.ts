import { useState, useEffect } from 'react';
import { audioProcessor } from '@/lib/audioProcessor';

export function useAudioProcessor() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    audioProcessor.load()
      .then(() => setIsLoaded(true))
      .catch((err) => {
        console.error("Failed to load FFmpeg:", err);
        setError("Failed to load audio processor.");
      });
  }, []);

  const exportAudio = async (file: File, start: number, end: number) => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await audioProcessor.trimAudio(file, start, end);
      return blob;
    } catch (err) {
      console.error("Export audio failed:", err);
      setError("Failed to export audio.");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const exportVideo = async (audioBlob: Blob, imageBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    try {
      const blob = await audioProcessor.createVideo(audioBlob, imageBlob);
      return blob;
    } catch (err) {
      console.error("Export video failed:", err);
      setError("Failed to export video.");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { isLoaded, isProcessing, error, exportAudio, exportVideo };
}

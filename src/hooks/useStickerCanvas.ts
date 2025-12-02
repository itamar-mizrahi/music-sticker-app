import { useEffect, useRef, useState } from 'react';

interface UseStickerCanvasProps {
  transcript: string;
  bgColor: string;
  textColor: string;
  bgImage: HTMLImageElement | null;
  fontSize: number;
}

export function useStickerCanvas({ transcript, bgColor, textColor, bgImage, fontSize }: UseStickerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    const size = 1080;
    canvas.width = size;
    canvas.height = size;

    // Draw Background
    if (bgImage) {
      const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
      const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
      const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
      ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw Text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text wrapping
    const words = transcript.split(' ');
    const maxWidth = canvas.width - 200;
    const lineHeight = fontSize * 1.25;
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

    // Draw lines
    const totalHeight = lines.length * lineHeight;
    let startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2);

    if (words.length === 0 || transcript.trim() === '') {
      ctx.fillStyle = textColor + '50';
      ctx.fillText("Lyrics Preview", canvas.width / 2, canvas.height / 2);
    } else {
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
      });
    }
  }, [transcript, bgColor, textColor, bgImage, fontSize]);

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    return new Promise(resolve => canvasRef.current?.toBlob(resolve, 'image/png'));
  };

  return { canvasRef, generateImageBlob };
}

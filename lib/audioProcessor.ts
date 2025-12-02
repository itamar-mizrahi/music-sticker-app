import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export class AudioProcessor {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load() {
    if (this.loaded) return;
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    this.loaded = true;
  }

  async trimAudio(audioFile: File, startTime: number, endTime: number): Promise<Blob> {
    if (!this.loaded) await this.load();

    const inputName = 'input.' + audioFile.name.split('.').pop();
    const outputName = 'output.mp3';

    await this.ffmpeg.writeFile(inputName, await fetchFile(audioFile));

    // ffmpeg -i input.mp3 -ss START -to END -c copy output.mp3
    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
      // Re-encoding is often safer for precise cuts than -c copy
      '-b:a', '192k', 
      outputName
    ]);

    const data = await this.ffmpeg.readFile(outputName);
    return new Blob([data], { type: 'audio/mpeg' });
  }
}

// Helper to fetch file data
const fetchFile = async (file: File): Promise<Uint8Array> => {
  return new Uint8Array(await file.arrayBuffer());
};

export const audioProcessor = new AudioProcessor();

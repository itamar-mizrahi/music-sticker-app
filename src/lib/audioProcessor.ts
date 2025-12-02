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
    return new Blob([data as any], { type: 'audio/mpeg' });
  }

  async createVideo(audioBlob: Blob, imageBlob: Blob): Promise<Blob> {
    if (!this.loaded) await this.load();

    const audioName = 'input_audio.mp3';
    const imageName = 'input_image.png';
    const outputName = 'output_video.mp4';

    await this.ffmpeg.writeFile(audioName, await fetchFile(new File([audioBlob], audioName)));
    await this.ffmpeg.writeFile(imageName, await fetchFile(new File([imageBlob], imageName)));

    // ffmpeg -loop 1 -i image.png -i audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest output.mp4
    await this.ffmpeg.exec([
        '-loop', '1',
        '-i', imageName,
        '-i', audioName,
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        outputName
    ]);

    const data = await this.ffmpeg.readFile(outputName);
    return new Blob([data as any], { type: 'video/mp4' });
  }
}

// Helper to fetch file data
const fetchFile = async (file: File): Promise<Uint8Array> => {
  return new Uint8Array(await file.arrayBuffer());
};

export const audioProcessor = new AudioProcessor();

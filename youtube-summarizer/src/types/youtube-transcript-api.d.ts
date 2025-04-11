declare module 'youtube-transcript-api' {
  export interface TranscriptItem {
    text: string;
    start: string;
    duration: string;
  }

  export default class TranscriptAPI {
    static getTranscript(videoId: string): Promise<TranscriptItem[]>;
    static validateID(videoId: string): Promise<boolean>;
  }
} 
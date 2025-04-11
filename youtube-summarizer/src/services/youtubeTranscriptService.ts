import { ITranscriptService } from '../interfaces/transcriptService';
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Service for fetching and processing YouTube transcripts
 * Implements the ITranscriptService interface
 */
export class YouTubeTranscriptService implements ITranscriptService {
  /**
   * Fetches the transcript for a YouTube video
   * @param videoId YouTube video ID
   * @returns Promise resolving to the transcript text
   */
  async fetchTranscript(videoId: string): Promise<string> {
    try {
      console.log(`Fetching transcript for video ID: ${videoId}`);
      
      // Use the YoutubeTranscript library to fetch the transcript
      const transcriptResult = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptResult || transcriptResult.length === 0) {
        throw new Error("No transcript was returned from the API");
      }
      
      console.log(`Got ${transcriptResult.length} transcript segments`);
      
      // Map the transcript items to text and join them
      const transcript = transcriptResult.map(item => item.text).join(' ');
      
      console.log(`Fetched transcript of length: ${transcript.length} characters`);
      
      return transcript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch transcript: ${errorMessage}`);
      throw new Error(`Failed to fetch transcript for video ID ${videoId}: ${errorMessage}`);
    }
  }

  /**
   * Extracts a video ID from a YouTube URL
   * @param url YouTube URL
   * @returns The extracted video ID or undefined if not found
   */
  extractVideoId(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      
      // Handle youtube.com/watch?v=VIDEO_ID format
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) {
        return urlObj.searchParams.get('v') || undefined;
      }
      
      // Handle youtu.be/VIDEO_ID format
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1) || undefined; // Remove leading slash
      }
      
      return undefined;
    } catch (error) {
      console.error(`Invalid URL: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
} 
/**
 * Interface for transcript service
 * Defines the contract for fetching YouTube video transcripts
 */
export interface ITranscriptService {
  /**
   * Fetches a transcript for the given YouTube video ID
   * @param videoId YouTube video ID
   * @returns Promise resolving to the transcript text
   */
  fetchTranscript(videoId: string): Promise<string>;
  
  /**
   * Extracts a video ID from a YouTube URL
   * @param url YouTube URL
   * @returns The extracted video ID or undefined if not found
   */
  extractVideoId(url: string): string | undefined;
} 
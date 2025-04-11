import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';
import { ITranscriptService } from '../../interfaces/transcriptService';

// Parameters for the TranscriptFetcherNode
export type TranscriptFetcherParams = {
  videoUrl?: string; 
  videoId?: string;
  [key: string]: unknown;
};

/**
 * Node for fetching YouTube video transcripts
 * 
 * Uses dependency injection for the transcript service
 */
export class TranscriptFetcherNode extends Node<YoutubeSharedStore, TranscriptFetcherParams> {
  private transcriptService: ITranscriptService;
  
  /**
   * Creates a new TranscriptFetcherNode
   * @param transcriptService Service for fetching transcripts
   */
  constructor(transcriptService: ITranscriptService) {
    super();
    this.transcriptService = transcriptService;
  }
  
  /**
   * Preparation step: Extract video ID from input
   */
  async prep(shared: YoutubeSharedStore): Promise<string | undefined> {
    // Use provided videoId or videoUrl from params or shared storage
    const videoId = this._params.videoId || shared.videoId;
    const videoUrl = this._params.videoUrl || shared.videoUrl;
    
    console.log(`TranscriptFetcher: Initial videoId: ${videoId}, videoUrl: ${videoUrl}`);
    
    if (!videoId && !videoUrl) {
      shared.error = "No video ID or URL provided";
      return undefined;
    }

    // If we already have a video ID, use it
    if (videoId) {
      return videoId;
    }

    // Otherwise, extract ID from URL
    if (videoUrl) {
      const extractedId = this.transcriptService.extractVideoId(videoUrl);
      
      if (extractedId) {
        shared.videoId = extractedId;
        console.log(`Extracted video ID: ${extractedId}`);
        return extractedId;
      } else {
        shared.error = "Could not extract video ID from URL";
        return undefined;
      }
    }
    
    shared.error = "Failed to determine video ID";
    return undefined;
  }

  /**
   * Execution step: Fetch the transcript
   */
  async exec(videoId: string | undefined): Promise<string> {
    if (!videoId) {
      throw new Error("No video ID available for transcript fetching");
    }
    
    try {
      return await this.transcriptService.fetchTranscript(videoId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch transcript for video ID ${videoId}: ${errorMessage}`);
    }
  }

  /**
   * Post-processing step: Store the transcript
   */
  async post(shared: YoutubeSharedStore, prepRes: string | undefined, execRes: string): Promise<string | undefined> {
    // Store the fetched transcript in shared storage
    console.log(`Storing transcript, length: ${execRes.length}`);
    shared.transcript = execRes;
    
    // Store original length for long video processing
    shared.originalTranscriptLength = execRes.length;
    
    return 'default';
  }
} 
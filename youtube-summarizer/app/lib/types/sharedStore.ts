/**
 * Shared store for YouTube Summarizer
 * This interface defines all the data that is shared between nodes in the flow
 */
export interface YoutubeSharedStore {
  // Input
  videoId?: string;
  videoUrl?: string;
  apiKey?: string;
  
  // Processing
  transcript?: string;
  originalTranscriptLength?: number; // For long videos, tracks original length
  chunks?: string[];
  chunkSummaries?: string[];
  longVideoMode?: boolean; // Indicates if we're processing a sample of a long video
  
  // Output
  summary?: string;
  formattedSummary?: string;
  error?: string;
} 
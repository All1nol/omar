/**
 * YouTube Summarizer Main Entry Point
 * 
 * This application uses PocketFlow to create a pipeline for generating
 * high-quality summaries of YouTube videos by processing their transcripts.
 * 
 * It employs a MapReduce pattern to handle longer videos efficiently:
 * 1. Map phase: Process chunks of transcript independently
 * 2. Reduce phase: Combine the chunk summaries into a coherent final summary
 */

import { runYouTubeSummarizer } from '../lib/core/runner';

// Start the application
runYouTubeSummarizer().catch((error: unknown) => {
  console.error('Unhandled error in YouTube Summarizer:', error);
  process.exit(1);
}); 
import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';

/**
 * Node for handling errors in the flow
 * Acts as a terminal node that formats error messages for the user
 */
export class ErrorHandlerNode extends Node<YoutubeSharedStore> {
  /**
   * Preparation step: Just pass through the shared store
   */
  async prep(shared: YoutubeSharedStore): Promise<YoutubeSharedStore> {
    return shared;
  }

  /**
   * Execution step: Format the error message
   */
  async exec(shared: YoutubeSharedStore): Promise<string> {
    if (!shared.error) {
      return "An unknown error occurred.";
    }
    
    // Format the error message with more context
    let errorMessage = `Error: ${shared.error}`;
    
    // Add context about which part of the process failed
    if (shared.videoId && !shared.transcript) {
      errorMessage = `Failed to fetch transcript for video ${shared.videoId}: ${shared.error}`;
    } else if (shared.transcript && !shared.chunks) {
      errorMessage = `Failed to process transcript: ${shared.error}`;
    } else if (shared.chunks && !shared.summary) {
      errorMessage = `Failed to generate summary: ${shared.error}`;
    }
    
    return errorMessage;
  }

  /**
   * Post-processing step: Store the formatted error and emit event
   */
  async post(shared: YoutubeSharedStore, prepRes: YoutubeSharedStore, execRes: string): Promise<string> {
    // Store the formatted error message
    shared.error = execRes;
    
    // Log the error
    console.error(`Error Handler: ${execRes}`);
    
    return "default";
  }
} 
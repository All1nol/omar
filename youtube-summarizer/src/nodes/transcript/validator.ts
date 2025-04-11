import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';

/**
 * Node that validates if a transcript is suitable for processing
 */
export class TranscriptValidatorNode extends Node<YoutubeSharedStore> {
  // Minimum length for a valid transcript (in characters)
  private minTranscriptLength: number;

  /**
   * Creates a new TranscriptValidatorNode
   * @param minTranscriptLength Minimum valid transcript length (default: 100 chars)
   */
  constructor(minTranscriptLength: number = 100) {
    super();
    this.minTranscriptLength = minTranscriptLength;
  }

  /**
   * Preparation step: Retrieve transcript from shared store
   */
  async prep(shared: YoutubeSharedStore): Promise<string | undefined> {
    return shared.transcript;
  }

  /**
   * Execution step: Validate the transcript
   */
  async exec(transcript: string | undefined): Promise<{ isValid: boolean; reason?: string }> {
    // Check if transcript exists
    if (!transcript) {
      return { 
        isValid: false, 
        reason: "No transcript found" 
      };
    }

    // Check if transcript has sufficient content
    if (transcript.length < this.minTranscriptLength) {
      return { 
        isValid: false, 
        reason: `Transcript is too short (${transcript.length} chars, minimum ${this.minTranscriptLength} required)`
      };
    }
    
    // Check for meaningful content (simple heuristic)
    const words = transcript.split(/\s+/).length;
    if (words < 20) {
      return { 
        isValid: false, 
        reason: `Transcript has too few words (${words}, minimum 20 required)`
      };
    }
    
    // Simple quality check - check for proportion of invalid or special characters
    const alphanumericChars = transcript.replace(/[^a-zA-Z0-9\s]/g, '').length;
    const totalChars = transcript.length;
    const alphanumericRatio = alphanumericChars / totalChars;
    
    if (alphanumericRatio < 0.5) {
      return { 
        isValid: false, 
        reason: `Transcript appears to be low quality (${Math.round(alphanumericRatio * 100)}% alphanumeric)`
      };
    }
    
    // Transcript is valid
    return { isValid: true };
  }

  /**
   * Post-processing step: Emit appropriate event
   */
  async post(shared: YoutubeSharedStore, prepRes: string | undefined, execRes: { isValid: boolean; reason?: string }): Promise<string> {
    if (execRes.isValid) {
      console.log("Transcript validation: Valid");
      return "valid";
    } else {
      console.error(`Transcript validation: Invalid - ${execRes.reason}`);
      shared.error = execRes.reason || "Invalid transcript";
      return "invalid";
    }
  }
} 
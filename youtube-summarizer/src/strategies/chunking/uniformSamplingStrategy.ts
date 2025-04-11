import { BaseChunkingStrategy } from './baseStrategy';

/**
 * Uniform Sampling Strategy
 * 
 * Samples sentences evenly throughout the transcript
 * Good for videos with information distributed evenly
 */
export class UniformSamplingStrategy extends BaseChunkingStrategy {
  /**
   * Chunks a transcript using uniform sampling to maintain coherence
   * @param transcript The transcript to chunk
   * @param maxLength The maximum length of each chunk
   * @returns Array of transcript chunks
   */
  chunkTranscript(transcript: string, maxLength: number): string[] {
    // Split transcript into sentences
    const sentences = this.splitIntoSentences(transcript);
    
    if (sentences.length <= 1) {
      return [transcript]; // If single sentence or couldn't parse, return as is
    }
    
    // Calculate how many sentences we need to sample to stay within token limits
    const totalTokens = this.estimateTokens(transcript);
    const maxTokensPerChunk = maxLength * 0.9; // Keep 10% margin for safety
    
    // Calculate the required reduction factor
    const reductionFactor = Math.max(1, totalTokens / maxTokensPerChunk);
    
    // If we don't need to reduce much, just use context-preserving chunking
    if (reductionFactor < 1.5) {
      return this.createChunksFromSentences(sentences, maxLength);
    }
    
    // For higher reduction factors, use intelligent sampling
    // Use sliding window to create more coherent chunks that preserve local context
    const sampledSentences: string[] = [];
    const windowSize = Math.min(3, Math.floor(sentences.length / 10)); // Adjust window size based on content
    
    // Determine sampling interval
    const samplingInterval = Math.max(1, Math.floor(sentences.length / (sentences.length / reductionFactor)));
    
    for (let i = 0; i < sentences.length; i += samplingInterval) {
      // Add the current sentence
      sampledSentences.push(sentences[i]);
      
      // If window size > 0, add some contextual sentences around this one
      if (windowSize > 0 && i + 1 < sentences.length && samplingInterval > 2) {
        sampledSentences.push(sentences[i + 1]); // Add the next sentence for context
      }
    }
    
    // Create transcript chunks from the sampled sentences
    return this.createChunksFromSentences(sampledSentences, maxLength);
  }
} 
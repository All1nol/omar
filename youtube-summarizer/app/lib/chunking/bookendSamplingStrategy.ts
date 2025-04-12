import { BaseChunkingStrategy } from './baseStrategy';

/**
 * Bookend Sampling Strategy
 * 
 * Focuses on the beginning and end of the transcript, sampling less from the middle.
 * Good for videos where important information is at the start and end.
 */
export class BookendSamplingStrategy extends BaseChunkingStrategy {
  /**
   * Chunks a transcript using bookend sampling to focus on start and end
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
    
    // For higher reduction factors, use bookend sampling
    const sampledSentences: string[] = [];
    
    // Calculate how many sentences to take from beginning and end
    const totalSentencesToKeep = Math.floor(sentences.length / reductionFactor);
    const bookendSize = Math.floor(totalSentencesToKeep * 0.4); // 40% for each bookend
    const middleSentencesToKeep = Math.max(0, totalSentencesToKeep - (bookendSize * 2));
    
    // Take sentences from the beginning
    for (let i = 0; i < bookendSize && i < sentences.length; i++) {
      sampledSentences.push(sentences[i]);
    }
    
    // Sample from the middle if needed (less frequently)
    if (middleSentencesToKeep > 0 && sentences.length > bookendSize * 2) {
      const middleStart = bookendSize;
      const middleEnd = sentences.length - bookendSize;
      const middleRange = middleEnd - middleStart;
      
      if (middleRange > 0) {
        const samplingInterval = Math.max(1, Math.floor(middleRange / middleSentencesToKeep));
        for (let i = middleStart; i < middleEnd; i += samplingInterval) {
          sampledSentences.push(sentences[i]);
          
          // Add occasional context sentence
          if (samplingInterval > 2 && i + 1 < middleEnd) {
            sampledSentences.push(sentences[i + 1]);
            i += 1; // Skip the next iteration since we already added this sentence
          }
        }
      }
    }
    
    // Take sentences from the end
    for (let i = Math.max(0, sentences.length - bookendSize); i < sentences.length; i++) {
      sampledSentences.push(sentences[i]);
    }
    
    // Sort the sentences back into their original order
    sampledSentences.sort((a, b) => {
      return sentences.indexOf(a) - sentences.indexOf(b);
    });
    
    // Create transcript chunks from the sampled sentences
    return this.createChunksFromSentences(sampledSentences, maxLength);
  }
} 
import { IChunkingStrategy } from '../interfaces/chunkingStrategy';

/**
 * Base class for transcript chunking strategies
 * Provides common functionality for all chunking strategies
 */
export abstract class BaseChunkingStrategy implements IChunkingStrategy {
  /**
   * Splits text into sentences using improved regex that better preserves context
   * @param text Text to split into sentences
   * @returns Array of sentences
   */
  protected splitIntoSentences(text: string): string[] {
    console.log("Splitting text into sentences...");
    
    // First attempt with sophisticated sentence boundary detection
    const sentenceRegex = /[^.!?…]+[.!?…]+["']?(?=\s|$)/g;
    let sentences: string[] = Array.from(text.matchAll(sentenceRegex)).map(match => match[0]);
    console.log(`First pass found ${sentences.length} sentences with regex`);
    
    // If no sentences were found or very few sentences (possible parsing error)
    if (sentences.length <= 5 && text.trim().length > 0) {
      // Try a simpler split as fallback
      const simpleSplit = text.split(/(?<=[.!?])\s+/);
      console.log(`Fallback found ${simpleSplit.length} sentences with simple split`);
      
      if (simpleSplit.length > sentences.length) {
        sentences = simpleSplit;
      }
      
      // If we still don't have many sentences, try splitting by line breaks
      // YouTube transcripts often have line breaks between spoken segments
      if (sentences.length <= 5) {
        const lineBreakSplit = text.split(/\n+/).filter(line => line.trim().length > 0);
        console.log(`Line break splitting found ${lineBreakSplit.length} segments`);
        
        if (lineBreakSplit.length > sentences.length) {
          sentences = lineBreakSplit;
        }
      }
      
      // Last resort: force split by chunk size if we still don't have enough sentences
      if (sentences.length <= 5) {
        console.log("Using forced chunking by character count");
        // For YouTube transcripts, often without proper punctuation
        // Force split into manageable chunks (~800-1000 chars)
        const forcedSplit = this.forceSplitByCharCount(text, 800);
        return forcedSplit;
      }
    }
    
    // Post-process sentences to make sure they're not too short or too long
    const processedSentences = sentences.filter(s => s.trim().length >= 5); // Allow shorter segments for YouTube
    console.log(`After processing, found ${processedSentences.length} valid sentences`);
    
    return processedSentences;
  }
  
  /**
   * Force splits text into chunks of roughly equal size
   * Used when normal sentence detection fails
   * @param text Text to split
   * @param targetLength Target length of each chunk
   * @returns Array of text chunks
   */
  protected forceSplitByCharCount(text: string, targetLength: number): string[] {
    const chunks: string[] = [];
    let startIdx = 0;
    
    while (startIdx < text.length) {
      let endIdx = Math.min(startIdx + targetLength, text.length);
      
      // Try to find a good breaking point (space, punctuation)
      if (endIdx < text.length) {
        // Look for spaces or punctuation within 20% of target length
        const searchRange = Math.floor(targetLength * 0.2);
        let breakPoint = -1;
        
        // First look for sentence end within range
        for (let i = endIdx; i >= endIdx - searchRange && i > startIdx; i--) {
          if ('.!?…'.includes(text[i]) && (i + 1 >= text.length || /\s/.test(text[i + 1]))) {
            breakPoint = i + 1;
            break;
          }
        }
        
        // If no sentence end found, look for space
        if (breakPoint === -1) {
          for (let i = endIdx; i >= endIdx - searchRange && i > startIdx; i--) {
            if (/\s/.test(text[i])) {
              breakPoint = i + 1;
              break;
            }
          }
        }
        
        if (breakPoint !== -1) {
          endIdx = breakPoint;
        }
      }
      
      chunks.push(text.substring(startIdx, endIdx).trim());
      startIdx = endIdx;
    }
    
    console.log(`Force splitting created ${chunks.length} chunks`);
    return chunks;
  }
  
  /**
   * Estimates the number of tokens in a string (rough approximation)
   * @param text Text to estimate tokens for
   * @returns Estimated token count
   */
  protected estimateTokens(text: string): number {
    // Rough approximation: 4 characters per token on average
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Groups sentences into chunks that fit within token limits
   * @param sentences Array of sentences
   * @param maxTokensPerChunk Maximum tokens per chunk
   * @returns Array of chunks (each containing multiple sentences)
   */
  protected createChunksFromSentences(sentences: string[], maxTokensPerChunk: number = 1500): string[] {
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    
    // Force at least 3 chunks for long content
    const forceChunks = sentences.length > 10;
    const totalText = sentences.join(' ');
    const totalTokens = this.estimateTokens(totalText);
    const forcedChunkSize = forceChunks ? Math.ceil(totalTokens / Math.max(3, Math.ceil(totalTokens / maxTokensPerChunk))) : maxTokensPerChunk;
    
    console.log(`Creating chunks with ${forcedChunkSize} tokens target size (original: ${maxTokensPerChunk})`);
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokenCount + sentenceTokens > forcedChunkSize && currentChunk.length > 0) {
        // Current chunk is full, start a new one
        chunks.push(currentChunk.join(' '));
        currentChunk = [sentence];
        currentTokenCount = sentenceTokens;
      } else {
        // Add to current chunk
        currentChunk.push(sentence);
        currentTokenCount += sentenceTokens;
      }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    console.log(`Created ${chunks.length} chunks from ${sentences.length} sentences`);
    return chunks;
  }
  
  /**
   * Abstract method to be implemented by specific strategies
   * @param transcript The full transcript text
   * @param maxLength Maximum length to process
   */
  abstract chunkTranscript(transcript: string, maxLength: number): string[];
} 
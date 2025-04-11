/**
 * Interface for transcript chunking strategies
 * Defines the contract for different transcript chunking methods
 */
export interface IChunkingStrategy {
  /**
   * Splits a transcript into manageable chunks
   * @param transcript The full transcript text
   * @param maxLength Maximum length to process (for long videos)
   * @returns Array of transcript chunks
   */
  chunkTranscript(transcript: string, maxLength: number): string[];
} 
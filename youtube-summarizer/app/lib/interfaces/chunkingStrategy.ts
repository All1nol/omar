/**
 * Interface for transcript chunking strategies
 * Defines the contract for different transcript chunking methods
 */
export interface IChunkingStrategy {
  /**
   * Chunks a transcript into manageable pieces
   * @param transcript The full transcript text
   * @param maxLength Maximum length to process
   * @returns Array of transcript chunks
   */
  chunkTranscript(transcript: string, maxLength: number): string[];
} 
import { IChunkingStrategy } from '../interfaces/chunkingStrategy';
import { BaseChunkingStrategy } from '../chunking/baseStrategy';
import { IntelligentSamplingStrategy } from '../chunking/intelligentSamplingStrategy';
import { BookendSamplingStrategy } from '../chunking/bookendSamplingStrategy';
import { UniformSamplingStrategy } from '../chunking/uniformSamplingStrategy';

/**
 * Service for handling transcript chunking in the application
 */
export class ChunkingService {
  private strategies: Map<string, IChunkingStrategy>;
  
  constructor() {
    // Initialize available chunking strategies
    this.strategies = new Map<string, IChunkingStrategy>();
    
    // Register all strategy implementations
    this.strategies.set('intelligent', new IntelligentSamplingStrategy());
    this.strategies.set('bookend', new BookendSamplingStrategy());
    this.strategies.set('uniform', new UniformSamplingStrategy());
  }
  
  /**
   * Gets the available chunking strategy names
   * @returns Array of strategy names
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
  
  /**
   * Gets a specific chunking strategy by name
   * @param name Strategy name
   * @returns The chunking strategy or null if not found
   */
  getStrategy(name: string): IChunkingStrategy | null {
    return this.strategies.get(name) || null;
  }
  
  /**
   * Gets the default strategy
   * @returns The default chunking strategy
   */
  getDefaultStrategy(): IChunkingStrategy {
    return this.strategies.get('intelligent') || 
           this.strategies.get('uniform') || 
           Array.from(this.strategies.values())[0];
  }
  
  /**
   * Chunks a transcript using the specified strategy
   * @param transcript Transcript text to chunk
   * @param strategy Strategy name to use (defaults to 'intelligent')
   * @param maxLength Maximum length to process
   * @returns Array of transcript chunks
   */
  chunkTranscript(
    transcript: string, 
    strategy: string = 'intelligent', 
    maxLength: number = 100000
  ): string[] {
    // Get the requested strategy or fall back to default
    const chunkingStrategy = this.strategies.get(strategy) || this.getDefaultStrategy();
    
    // Perform chunking
    return chunkingStrategy.chunkTranscript(transcript, maxLength);
  }
} 
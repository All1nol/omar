import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';
import { IChunkingStrategy } from '../../interfaces/chunkingStrategy';
import { UniformSamplingStrategy } from '../../strategies/chunking/uniformSamplingStrategy';
import { BookendSamplingStrategy } from '../../strategies/chunking/bookendSamplingStrategy';
import { IntelligentSamplingStrategy } from '../../strategies/chunking/intelligentSamplingStrategy';
import { SamplingMethod } from '../../config/appConfig';

/**
 * Node that splits a transcript into chunks for processing
 * Uses a strategy pattern for different chunking methods
 */
export class TranscriptChunkerNode extends Node<YoutubeSharedStore> {
  private maxTranscriptLength: number;
  private strategy: IChunkingStrategy;
  
  /**
   * Creates a new TranscriptChunkerNode
   * @param maxTranscriptLength Maximum transcript length to process
   * @param strategy Chunking strategy to use
   */
  constructor(
    maxTranscriptLength: number = 300000,
    strategy: IChunkingStrategy | SamplingMethod = 'intelligent'
  ) {
    super();
    this.maxTranscriptLength = maxTranscriptLength;
    
    // Set chunking strategy based on input
    if (typeof strategy === 'string') {
      // If a string is provided, create the corresponding strategy
      this.strategy = this.createStrategyFromName(strategy);
    } else {
      // Otherwise, use the provided strategy object
      this.strategy = strategy;
    }
  }
  
  /**
   * Creates a chunking strategy from a strategy name
   * @param strategyName Name of the strategy to create
   * @returns A chunking strategy instance
   */
  private createStrategyFromName(strategyName: SamplingMethod): IChunkingStrategy {
    switch (strategyName) {
      case 'uniform':
        return new UniformSamplingStrategy();
      case 'bookend':
        return new BookendSamplingStrategy();
      case 'intelligent':
        return new IntelligentSamplingStrategy();
      default:
        console.log(`Unknown strategy '${strategyName}', using intelligent sampling`);
        return new IntelligentSamplingStrategy();
    }
  }
  
  /**
   * Preparation step: Retrieve transcript from shared store
   */
  async prep(shared: YoutubeSharedStore): Promise<string | undefined> {
    return shared.transcript;
  }
  
  /**
   * Execution step: Chunk the transcript using the selected strategy
   */
  async exec(transcript: string | undefined): Promise<string[]> {
    if (!transcript) {
      throw new Error("No transcript available for chunking");
    }
    
    // Check if we need to handle as a long video
    const isLongVideo = transcript.length > this.maxTranscriptLength;
    
    // Store long video mode in shared store
    if (isLongVideo) {
      console.log(`Long video detected: ${transcript.length} chars exceeds limit of ${this.maxTranscriptLength}`);
      console.log(`Using ${this.strategy.constructor.name} for chunking`);
    }
    
    // Use the selected strategy to chunk the transcript
    const chunks = this.strategy.chunkTranscript(transcript, this.maxTranscriptLength);
    
    console.log(`Chunked transcript into ${chunks.length} parts`);
    chunks.forEach((chunk, i) => {
      console.log(`Chunk ${i + 1}: ${chunk.length} chars (approx. ${Math.ceil(chunk.length / 4)} tokens)`);
    });
    
    return chunks;
  }
  
  /**
   * Post-processing step: Store chunks in shared store
   */
  async post(shared: YoutubeSharedStore, prepRes: string | undefined, execRes: string[]): Promise<string> {
    // Check if we're processing a long video and set flag in shared store
    if (shared.transcript && shared.transcript.length > this.maxTranscriptLength) {
      shared.longVideoMode = true;
    }
    
    // Store the chunks in shared store
    shared.chunks = execRes;
    
    return "default";
  }
} 
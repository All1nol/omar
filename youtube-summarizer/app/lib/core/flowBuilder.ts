import { Flow } from 'pocketflow';
import { TranscriptFetcherNode } from '../agentNodes/transcript/fetcher';
import { TranscriptValidatorNode } from '../agentNodes/transcript/validator';
import { TranscriptChunkerNode } from '../agentNodes/transcript/chunker';
import { ChunkSummarizerNode } from '../agentNodes/summarization/chunkSummarizer';
import { SummaryReducerNode } from '../agentNodes/summarization/reducer';
import { SummaryFormatterNode } from '../agentNodes/summarization/formatter';
import { ErrorHandlerNode } from '../agentNodes/error/handler';
import { ITranscriptService } from '../interfaces/transcriptService';
import { IGenerativeService } from '../interfaces/generativeService';
import { AppConfig } from '../config/appConfig';
import { YouTubeTranscriptService } from '../services/youtubeTranscriptService';
import { GeminiService } from '../services/geminiService';

/**
 * Builder class for creating YouTube Summarizer flows
 * 
 * Follows the builder pattern for flexible flow creation
 */
export class YouTubeSummarizerFlowBuilder {
  private config: AppConfig;
  private transcriptService: ITranscriptService;
  private generativeService: IGenerativeService;
  private maxConcurrentSummaries: number = 2;
  private maxRetries: number = 3;
  
  /**
   * Creates a new flow builder with default services
   * @param config Application configuration
   * @param apiKey API key for generative service
   */
  constructor(config: AppConfig, apiKey: string) {
    this.config = config;
    
    // Create default service implementations
    this.transcriptService = new YouTubeTranscriptService();
    this.generativeService = new GeminiService(apiKey);
  }
  
  /**
   * Sets a custom transcript service
   * @param service Implementation of ITranscriptService
   * @returns This builder instance for chaining
   */
  withTranscriptService(service: ITranscriptService): YouTubeSummarizerFlowBuilder {
    this.transcriptService = service;
    return this;
  }
  
  /**
   * Sets a custom generative service
   * @param service Implementation of IGenerativeService
   * @returns This builder instance for chaining
   */
  withGenerativeService(service: IGenerativeService): YouTubeSummarizerFlowBuilder {
    this.generativeService = service;
    return this;
  }
  
  /**
   * Sets concurrency and retry options
   * @param maxConcurrentSummaries Maximum number of concurrent chunk summarizations
   * @param maxRetries Maximum number of retries for failed operations
   * @returns This builder instance for chaining
   */
  withOptions(maxConcurrentSummaries: number, maxRetries: number): YouTubeSummarizerFlowBuilder {
    this.maxConcurrentSummaries = maxConcurrentSummaries;
    this.maxRetries = maxRetries;
    return this;
  }
  
  /**
   * Builds and returns the configured flow
   * @returns Flow instance ready to be executed
   */
  build(): Flow {
    // Create nodes
    const transcriptFetcher = new TranscriptFetcherNode(this.transcriptService);
    const transcriptValidator = new TranscriptValidatorNode();
    const transcriptChunker = new TranscriptChunkerNode(
      this.config.maxTranscriptLength,
      this.config.samplingMethod
    );
    const chunkSummarizer = new ChunkSummarizerNode(
      this.generativeService,
      this.maxConcurrentSummaries,
      this.maxRetries
    );
    const summaryReducer = new SummaryReducerNode(
      this.generativeService,
      this.maxRetries
    );
    const summaryFormatter = new SummaryFormatterNode();
    const errorHandler = new ErrorHandlerNode();
    
    // Connect nodes in the flow
    transcriptFetcher.on("default", transcriptValidator);
    transcriptValidator.on("valid", transcriptChunker);
    transcriptValidator.on("invalid", errorHandler);
    transcriptChunker.on("default", chunkSummarizer);
    chunkSummarizer.on("summarized", summaryReducer);
    summaryReducer.on("default", summaryFormatter);
    
    // Create and return the flow
    return new Flow(transcriptFetcher);
  }
} 
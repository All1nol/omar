import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';
import { IGenerativeService } from '../../interfaces/generativeService';

/**
 * Parameters for ChunkSummarizerNode
 */
export type ChunkSummarizerParams = {
  [key: string]: unknown;
};

/**
 * Node that summarizes individual transcript chunks (Map phase)
 * Processes each chunk in parallel with rate limiting
 */
export class ChunkSummarizerNode extends Node<YoutubeSharedStore, ChunkSummarizerParams> {
  private generativeService: IGenerativeService;
  private maxConcurrent: number;
  private _maxRetries: number;
  
  /**
   * Creates a new ChunkSummarizerNode
   * @param generativeService Service for generating summaries
   * @param maxConcurrent Maximum concurrent chunk summarizations
   * @param maxRetries Maximum retries for failed summarizations
   */
  constructor(
    generativeService: IGenerativeService,
    maxConcurrent: number = 3,
    maxRetries: number = 3
  ) {
    super();
    this.generativeService = generativeService;
    this.maxConcurrent = maxConcurrent;
    this._maxRetries = maxRetries;
  }
  
  /**
   * Preparation step: Get chunks from shared store
   */
  async prep(shared: YoutubeSharedStore): Promise<string[] | undefined> {
    return shared.chunks;
  }

  /**
   * Execution step: Summarize each chunk in parallel
   */
  async exec(chunks: string[] | undefined): Promise<string[]> {
    if (!chunks || chunks.length === 0) {
      throw new Error("No chunks available for summarization");
    }
    
    console.log(`Summarizing ${chunks.length} chunks with max ${this.maxConcurrent} concurrent operations`);
    
    // Process chunks in batches to control concurrency
    const chunkSummaries: string[] = [];
    
    // For shorter chunks, we can use more concurrency as they process faster
    // For longer chunks or many chunks, we adjust the batch size intelligently 
    const actualConcurrency = Math.min(this.maxConcurrent, Math.max(2, Math.ceil(6 / chunks.length)));
    console.log(`Using actual concurrency of ${actualConcurrency} based on ${chunks.length} chunks`);
    
    // Process chunks in batches of actualConcurrency
    for (let i = 0; i < chunks.length; i += actualConcurrency) {
      console.log(`Starting batch ${Math.floor(i/actualConcurrency) + 1} of ${Math.ceil(chunks.length/actualConcurrency)}`);
      const batch = chunks.slice(i, i + actualConcurrency);
      const batchPromises = batch.map((chunk, batchIndex) => 
        this.summarizeChunkWithRetry(chunk, i + batchIndex)
      );
      
      // Wait for all chunks in the batch to complete
      const batchResults = await Promise.all(batchPromises);
      chunkSummaries.push(...batchResults);
      console.log(`Completed batch ${Math.floor(i/actualConcurrency) + 1}`);
    }
    
    return chunkSummaries;
  }

  /**
   * Post-processing step: Store summarized chunks
   */
  async post(shared: YoutubeSharedStore, prepRes: string[] | undefined, execRes: string[]): Promise<string> {
    shared.chunkSummaries = execRes;
    console.log(`Stored ${execRes.length} chunk summaries in shared store`);
    return "summarized";
  }
  
  /**
   * Summarizes a single chunk with retry logic
   * @param chunk The transcript chunk to summarize
   * @param chunkIndex The index of the chunk
   * @returns Promise resolving to the summary
   */
  private async summarizeChunkWithRetry(chunk: string, chunkIndex: number): Promise<string> {
    let attemptCount = 0;
    let lastError: Error | undefined;
    
    while (attemptCount < this._maxRetries) {
      try {
        attemptCount++;
        console.log(`Summarizing chunk ${chunkIndex + 1} (attempt ${attemptCount}/${this._maxRetries})...`);
        
        const prompt = this.createChunkSummaryPrompt(chunk);
        const summary = await this.generativeService.generateContent(prompt, {
          model: 'gemini-2.0-flash',
          maxOutputTokens: 4096,
          temperature: 0.2
        });
        
        console.log(`Chunk ${chunkIndex + 1} summarized successfully (${summary.length} chars)`);
        return summary;
      } catch (error) {
        console.error(`Error summarizing chunk ${chunkIndex + 1}: ${error instanceof Error ? error.message : String(error)}`);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Wait before retry (exponential backoff)
        const backoffMs = Math.pow(2, attemptCount) * 1000;
        console.log(`Retrying in ${backoffMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error(`Failed to summarize chunk ${chunkIndex + 1} after ${this._maxRetries} attempts`);
  }
  
  /**
   * Creates a prompt for summarizing a chunk
   * @param chunk The transcript chunk to summarize
   * @returns The prompt for the LLM
   */
  private createChunkSummaryPrompt(chunk: string): string {
    return `You are summarizing a section of a YouTube video transcript. Create a comprehensive and detailed summary that captures all important information from this section of the transcript.
    
Focus on:
- The main topics and themes in detail
- Key facts, information, and concepts presented
- Important points, arguments, examples, and explanations
- Retain all quantitative information (statistics, dates, figures)
- Preserve technical terms, proper nouns, and specialized vocabulary
- Maintain the logical flow and structure of the original content
- Include important transitions and relationships between ideas
- Capture both explicit statements and implicit meanings

Do not:
- Include your own opinions or evaluations
- Mention that this is a summary or a transcript
- Refer to "the speaker" or "the video" - just state the information directly
- Omit significant details even if they seem minor

Format your response as detailed paragraphs that fully capture the content. Use bullet points only for lists that appear in the original content.

TRANSCRIPT SECTION:
${chunk}

DETAILED SECTION SUMMARY:`;
  }
} 
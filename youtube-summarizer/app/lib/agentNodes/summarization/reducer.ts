import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';
import { IGenerativeService } from '../../interfaces/generativeService';

/**
 * Parameters for SummaryReducerNode
 */
export type SummaryReducerParams = {
  [key: string]: unknown;
};

/**
 * Node that combines chunk summaries into a coherent final summary (Reduce phase)
 */
export class SummaryReducerNode extends Node<YoutubeSharedStore, SummaryReducerParams> {
  private generativeService: IGenerativeService;
  private _maxRetries: number;
  
  /**
   * Creates a new SummaryReducerNode
   * @param generativeService Service for generating the final summary
   * @param maxRetries Maximum number of retries for failed summary generation
   */
  constructor(
    generativeService: IGenerativeService,
    maxRetries: number = 3
  ) {
    super();
    this.generativeService = generativeService;
    this._maxRetries = maxRetries;
  }
  
  /**
   * Preparation step: Get chunk summaries from shared store
   */
  async prep(shared: YoutubeSharedStore): Promise<string[] | undefined> {
    return shared.chunkSummaries;
  }

  /**
   * Execution step: Combine chunk summaries into a final summary
   */
  async exec(chunkSummaries: string[] | undefined): Promise<string> {
    if (!chunkSummaries || chunkSummaries.length === 0) {
      throw new Error("No chunk summaries available for reduction");
    }
    
    console.log(`Combining ${chunkSummaries.length} chunk summaries into a final summary`);
    
    let attemptCount = 0;
    let lastError: Error | undefined;
    
    // Retry logic for summary generation
    while (attemptCount < this._maxRetries) {
      try {
        attemptCount++;
        console.log(`Generating final summary (attempt ${attemptCount}/${this._maxRetries})...`);
        
        const prompt = this.createSummaryReducePrompt(chunkSummaries);
        const summary = await this.generativeService.generateContent(prompt, {
          model: 'gemini-2.0-flash',
          maxOutputTokens: 8192,  // Use a higher limit for comprehensive final summary
          temperature: 0.2        // Lower temperature for more consistency
        });
        
        console.log(`Final summary generated successfully (${summary.length} chars)`);
        return summary;
      } catch (error) {
        console.error(`Error generating final summary: ${error instanceof Error ? error.message : String(error)}`);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Wait before retry (exponential backoff)
        const backoffMs = Math.pow(2, attemptCount) * 1000;
        console.log(`Retrying in ${backoffMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error(`Failed to generate final summary after ${this._maxRetries} attempts`);
  }

  /**
   * Post-processing step: Store the final summary
   */
  async post(shared: YoutubeSharedStore, prepRes: string[] | undefined, execRes: string): Promise<string> {
    shared.summary = execRes;
    console.log(`Stored final summary in shared store (${execRes.length} chars)`);
    return "default";
  }
  
  /**
   * Creates a prompt for combining chunk summaries
   * @param chunkSummaries Array of chunk summaries to combine
   * @returns The prompt for the LLM
   */
  private createSummaryReducePrompt(chunkSummaries: string[]): string {
    // Add a numbering scheme that helps identify the original position to maintain flow
    const combinedSummaries = chunkSummaries.map((summary, index) => {
      // Calculate a rough percentage through the content
      const approxPercentage = Math.round((index / (chunkSummaries.length - 1)) * 100);
      // Create a position indicator for better contextual understanding
      const positionIndicator = index === 0 ? "Beginning" : 
                               index === chunkSummaries.length - 1 ? "End" :
                               `${approxPercentage}% through`;
      
      return `SECTION ${index + 1} [${positionIndicator}]:\n${summary}\n`;
    }).join('\n');

    return `You are creating a high-quality, comprehensive summary of a YouTube video from detailed summaries of different sections.

The input contains ${chunkSummaries.length} summary sections that represent different parts of the video in sequential order. Each section contains important details that should be preserved.

Your task is to combine these section summaries into a single, well-organized document that captures all significant information and presents it in a cohesive, readable format.

Guidelines:
- Create a thorough, detailed summary with proper structure and organization
- Begin with an overview of the main topics and key takeaways
- Organize information logically by topic while respecting the original flow of information
- Preserve chronological or sequential relationships between concepts where they exist
- Eliminate redundancies while preserving all important details and nuance
- Create a cohesive narrative with clear transitions between topics
- Maintain the depth and substance from all sections - the more chunks there are, the more detailed your summary should be
- Structure with clear sections, headings, and subheadings
- Be factual and objective - retain all key information, explanations, examples, and insights
- Format the final summary with Markdown for optimal readability:
  * Use ## for main headings and ### for subheadings
  * Use bullet points for lists of related items
  * Use numbered lists for sequential steps or prioritized items
  * Use **bold** for emphasis on important terms or concepts
- Do not mention that this is based on multiple summaries or sections
- Do not refer to "the video" or "the speaker" - present information directly
- Include all significant points, technical terms, proper nouns, and quantitative data

If the content covers distinct topics, create separate sections with appropriate headings.

SECTION SUMMARIES:

${combinedSummaries}

COMPREHENSIVE SUMMARY:`;
  }
} 
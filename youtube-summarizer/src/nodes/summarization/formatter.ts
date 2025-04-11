import { Node } from 'pocketflow';
import { YoutubeSharedStore } from '../../types/sharedStore';

/**
 * Parameters for SummaryFormatterNode
 */
export type SummaryFormatterParams = {
  [key: string]: unknown;
};

/**
 * Node that enhances and formats the final summary for better readability
 */
export class SummaryFormatterNode extends Node<YoutubeSharedStore, SummaryFormatterParams> {
  /**
   * Preparation step: Get the final summary from shared store
   */
  async prep(shared: YoutubeSharedStore): Promise<string | undefined> {
    return shared.summary;
  }

  /**
   * Execution step: Format the summary with improved Markdown and structure
   */
  async exec(summary: string | undefined): Promise<string> {
    if (!summary) {
      throw new Error("No summary available for formatting");
    }
    
    console.log(`Formatting summary (${summary.length} chars)`);
    
    // Add video title if available
    let formattedSummary = '';
    if (summary) {
      // Process the summary for better structure
      formattedSummary = this.enhanceSummary(summary);
    }
    
    return formattedSummary;
  }

  /**
   * Post-processing step: Store the formatted summary
   */
  async post(shared: YoutubeSharedStore, prepRes: string | undefined, execRes: string): Promise<string> {
    shared.formattedSummary = execRes;
    console.log(`Stored formatted summary in shared store (${execRes.length} chars)`);
    return "default";
  }
  
  /**
   * Enhances the summary with better formatting and structure
   * @param summary The raw summary to enhance
   * @returns The enhanced and formatted summary
   */
  private enhanceSummary(summary: string): string {
    // Add a title
    let enhanced = `# YouTube Video Summary\n\n`;
    
    // Check if the summary already has Markdown headers
    const hasHeaders = /^#+\s.+$/m.test(summary);
    
    if (!hasHeaders) {
      // If no headers, try to break it into sections
      const paragraphs = summary.split(/\n{2,}/);
      
      if (paragraphs.length > 3) {
        // Attempt to identify logical sections and add headers
        enhanced += this.addSectionsToLongSummary(paragraphs);
      } else {
        // For shorter summaries, just add a simple introduction
        enhanced += `## Summary\n\n${summary}`;
      }
    } else {
      // Summary already has good Markdown structure
      enhanced += summary;
    }
    
    // Add footer with timestamp
    enhanced += `\n\n---\n*Summary generated on ${new Date().toLocaleString()}*`;
    
    return enhanced;
  }
  
  /**
   * Adds section headers to a long summary based on paragraph structure
   * @param paragraphs Array of paragraphs from the summary
   * @returns The enhanced summary with sections
   */
  private addSectionsToLongSummary(paragraphs: string[]): string {
    // Simple heuristic: first paragraph is intro, then split remaining into sections
    let result = `## Overview\n\n${paragraphs[0]}\n\n`;
    
    // Add the main content with section headers
    const mainContent = paragraphs.slice(1, -1);
    if (mainContent.length > 0) {
      result += `## Key Points\n\n`;
      
      // Convert suitable paragraphs to bullet points if they're not already
      result += mainContent.map(para => {
        if (para.trim().startsWith('-') || para.trim().startsWith('*')) {
          return para; // Already a list
        } else if (para.length < 100) {
          return `- ${para}`; // Short paragraph to bullet point
        } else {
          return para; // Keep long paragraphs as is
        }
      }).join('\n\n');
      
      result += '\n\n';
    }
    
    // Last paragraph as conclusion if it exists
    if (paragraphs.length > 2) {
      result += `## Conclusion\n\n${paragraphs[paragraphs.length - 1]}`;
    }
    
    return result;
  }
} 
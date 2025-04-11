import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiThrottler } from './apiThrottler';

interface GeminiOptions {
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Wrapper for Gemini API that respects rate limits
 */
export class GeminiApi {
  private apiKey: string;
  private client: GoogleGenerativeAI;
  private throttler: ApiThrottler;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
    // Initialize with default rate limiting settings
    this.throttler = new ApiThrottler({
      requestsPerMinute: 15,       // 15 requests per minute
      tokensPerMinute: 1000000,    // 1,000,000 tokens per minute
      maxDailyRequests: 1500,      // 1,500 requests per day
    });
  }
  
  /**
   * Generate content with automatic rate limiting
   * @param prompt The prompt to send to the API
   * @param options Configuration options
   * @returns The generated content
   */
  async generateContent(
    prompt: string, 
    options: GeminiOptions = {}
  ): Promise<string> {
    // Default options
    const {
      model = 'gemini-2.0-flash',   // Use Gemini 2.0 Flash model
      maxOutputTokens = 2048,       // Increased to maximize usage
      temperature = 0.4
    } = options;
    
    // Estimate tokens for throttling (4 chars per token is a rough estimate)
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    const estimatedTotalTokens = estimatedPromptTokens + maxOutputTokens;
    
    // Throttle if needed before making the request
    await this.throttler.throttle(estimatedTotalTokens);
    
    try {
      console.log(`Sending request to Gemini API using model: ${model} with max ${maxOutputTokens} output tokens`);
      
      // Get the model
      const genModel = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens,
          temperature,
        },
      });
      
      // Send the request
      const result = await genModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Estimate actual tokens used
      const responseTokens = Math.ceil(text.length / 4);
      const totalTokens = estimatedPromptTokens + responseTokens;
      
      // Record the API call with token usage
      this.throttler.recordApiCall(totalTokens);
      
      console.log(`Gemini API response received (${responseTokens} estimated output tokens)`);
      
      return text;
    } catch (error) {
      console.error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Get API usage statistics (not available with new ApiThrottler)
   */
  getUsageStats() {
    return {
      requestsLastMinute: 'N/A',
      tokensLastMinute: 'N/A',
      requestsToday: 'N/A'
    };
  }
} 
import { IGenerativeService } from '../interfaces/generativeService';
import { ApiThrottler } from '../utils/apiThrottler';

/**
 * Service for interacting with Google's Gemini AI model
 * Implements IGenerativeService interface
 */
export class GeminiService implements IGenerativeService {
  private throttler: ApiThrottler;
  private client: any; // Type will be from Google's Generative AI SDK
  private apiKey: string;

  /**
   * Creates a new GeminiService instance
   * @param apiKey Gemini API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.throttler = new ApiThrottler({
      requestsPerMinute: 15,       // 15 requests per minute
      tokensPerMinute: 1000000,    // 1,000,000 tokens per minute
      maxDailyRequests: 1500,      // 1,500 requests per day
    });
    
    // Initialize the Gemini client
    this.initializeClient();
  }
  
  /**
   * Initializes the Gemini API client
   * Separated to allow for dependency injection in tests
   */
  private initializeClient() {
    try {
      // Import the Google Generative AI library
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      // Initialize the Gemini client with API key
      this.client = new GoogleGenerativeAI(this.apiKey);
    } catch (error) {
      console.error('Error initializing Gemini client:', error);
      throw new Error('Failed to initialize Gemini API client');
    }
  }

  /**
   * Generates content using the Gemini API
   * @param prompt The text prompt to send to the model
   * @param options Optional parameters
   * @returns The generated text content
   */
  async generateContent(prompt: string, options: {
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
  } = {}): Promise<string> {
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
      console.log(`Using Gemini 2.0 Flash model with max ${maxOutputTokens} output tokens`);
      
      // Get the model and send the request
      const genModel = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens,
          temperature,
        },
      });
      
      const result = await genModel.generateContent(prompt);
      const text = result.response.text();
      
      // Record the API call with token usage
      this.throttler.recordApiCall(estimatedTotalTokens);
      
      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error generating content: ${errorMessage}`);
      throw new Error(`Failed to generate content: ${errorMessage}`);
    }
  }
} 
/**
 * Interface for generative AI service
 * Defines the contract for interacting with LLM models
 */
export interface IGenerativeService {
  /**
   * Generates content from a text prompt
   * @param prompt The text prompt to send to the model
   * @param options Optional parameters like temperature, max tokens, etc.
   * @returns Promise resolving to the generated text
   */
  generateContent(prompt: string, options?: {
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<string>;
} 
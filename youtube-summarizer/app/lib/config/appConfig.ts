/**
 * Application configuration module
 */

/**
 * Sampling methods for long transcripts
 */
export type SamplingMethod = 'intelligent' | 'uniform' | 'bookend';

/**
 * Application configuration interface
 */
export interface AppConfig {
  // Video processing settings
  maxTranscriptLength: number;
  samplingMethod: SamplingMethod;
  longVideoMode: boolean;
  highQualityMode: boolean;
  
  // API settings
  apiKey?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AppConfig = {
  maxTranscriptLength: 25000,  // Approx 6250 tokens at 4 chars per token
  highQualityMode: false,
  longVideoMode: false,
  samplingMethod: 'intelligent'
};

/**
 * Parse command line arguments to create application configuration
 * For backwards compatibility with existing code
 */
export function parseCommandLineArgs(): AppConfig {
  // Start with default config
  const config = { ...DEFAULT_CONFIG };
  
  // In Next.js API context, we don't use command line args
  // but keeping the function signature for compatibility
  
  return config;
}

/**
 * Parse options for the configuration
 * @param options Configuration options
 * @returns Application configuration
 */
export function parseConfig(options: Partial<AppConfig>): AppConfig {
  // Start with default config
  const config = { ...DEFAULT_CONFIG };
  
  // Apply options
  return {
    ...config,
    ...options
  };
} 
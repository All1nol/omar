/**
 * Application configuration module
 */

/**
 * Sampling method for transcript chunking
 */
export type SamplingMethod = 'uniform' | 'bookend' | 'intelligent';

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
export const defaultConfig: AppConfig = {
  maxTranscriptLength: 300000, // Default ~75K tokens
  samplingMethod: 'intelligent',
  longVideoMode: false,
  highQualityMode: false
};

/**
 * Parses command line arguments and returns application configuration
 * @param args Command line arguments
 * @returns Configured AppConfig object
 */
export function parseCommandLineArgs(args: string[] = process.argv): AppConfig {
  const config: AppConfig = { ...defaultConfig };
  
  // Check for mode flags
  config.longVideoMode = args.includes('--long-video');
  config.highQualityMode = args.includes('--high-quality');
  
  // Adjust transcript length based on mode
  if (config.highQualityMode) {
    config.maxTranscriptLength = 500000; // High quality - process more content
  } else if (config.longVideoMode) {
    config.maxTranscriptLength = 120000; // Long video mode - process less for speed
  }
  
  // Check for sampling method flags
  if (args.includes('--sample-uniform')) {
    config.samplingMethod = 'uniform';
  } else if (args.includes('--sample-bookend')) {
    config.samplingMethod = 'bookend';
  }
  
  return config;
} 
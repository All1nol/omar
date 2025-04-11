import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { YoutubeSharedStore } from '../types/sharedStore';
import { parseCommandLineArgs } from '../config/appConfig';
import { YouTubeSummarizerFlowBuilder } from './flowBuilder';

/**
 * Main function to run the YouTube Summarizer application
 */
export async function runYouTubeSummarizer(): Promise<void> {
  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  try {
    // Parse command line arguments
    const config = parseCommandLineArgs();
    
    // Get API key from environment
    const apiKey = await getApiKey();
    
    // Print mode information
    if (config.highQualityMode) {
      console.log('\n⭐ HIGH QUALITY MODE ACTIVE ⭐');
      console.log('Will process more content for a comprehensive summary');
    } else if (config.longVideoMode) {
      console.log('\n⚠️ LONG VIDEO MODE ACTIVE ⚠️');
      console.log('Video will be processed using a representative sample for faster results');
      console.log(`Using ${config.samplingMethod} sampling method for best coverage`);
    }
    
    // Get YouTube URL from user
    const videoUrl = await new Promise<string>(resolve => {
      rl.question('Enter YouTube video URL: ', answer => {
        resolve(answer);
      });
    });
    
    // Initialize shared store
    const shared: YoutubeSharedStore = {
      apiKey,
      videoUrl
    };
    
    // Create and run the flow
    const startTime = Date.now();
    console.log('Creating YouTube summarizer flow...');
    
    const flowBuilder = new YouTubeSummarizerFlowBuilder(config, apiKey);
    const flow = flowBuilder.build();
    
    console.log('Starting YouTube video summarization process...');
    console.log('Fetching and processing transcript...');
    
    // Run the flow
    await flow.run(shared);
    
    // Print results
    handleResults(shared, startTime);
    
  } catch (error) {
    console.error('An error occurred during processing:', error);
    console.error(error instanceof Error ? error.message : String(error));
  } finally {
    // Close readline interface
    rl.close();
  }
}

/**
 * Gets an API key from environment
 * @returns Promise resolving to API key
 */
async function getApiKey(): Promise<string> {
  // Try to load API key from .env file
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match && match[1]) {
        const apiKey = match[1].trim();
        console.log('Found API key in .env file');
        
        if (apiKey.length < 10) {
          throw new Error("API key found in .env file is too short or invalid");
        }
        
        return apiKey;
      }
    }
    
    throw new Error("No API key found in .env file");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error reading API key: ${errorMessage}`);
    console.error('\nPlease create a .env file in the project root with your Gemini API key:');
    console.error('GEMINI_API_KEY=your_api_key_here\n');
    throw new Error("Missing API key in .env file");
  }
}

/**
 * Handle the results of flow execution
 * @param shared Shared store with results
 * @param startTime Start time for calculating duration
 */
function handleResults(shared: YoutubeSharedStore, startTime: number): void {
  const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
  console.log(`\nProcessing completed in ${Math.floor(elapsedTime / 60)}m ${Math.floor(elapsedTime % 60)}s`);
  
  // Check for errors
  if (shared.error) {
    console.error(`\n${shared.error}`);
    return;
  }
  
  // Display processing stats
  console.log('\n----- PROCESSING STATS -----');
  console.log(`Video ID: ${shared.videoId}`);
  
  if (shared.transcript) {
    let transcriptLength = shared.transcript.length;
    let transcriptTokens = Math.ceil(transcriptLength / 4);
    
    // If we processed only a sample, show original size too
    if (shared.longVideoMode && shared.originalTranscriptLength) {
      console.log(`Original transcript: ${shared.originalTranscriptLength} characters`);
      console.log(`Processed sample: ${transcriptLength} characters (${(100 * transcriptLength / shared.originalTranscriptLength).toFixed(1)}% of full transcript)`);
    } else {
      console.log(`Transcript length: ${transcriptLength} characters (approx. ${transcriptTokens} tokens)`);
    }
  }
  
  console.log(`Chunks processed: ${shared.chunks?.length || 0}`);
  
  // Display summary if available
  if (shared.summary) {
    console.log('\n----- SUMMARY -----');
    console.log(shared.formattedSummary || shared.summary);
    
    // Save summary to file
    if (shared.videoId) {
      const outputFile = `summary_${shared.videoId}.md`;
      fs.writeFileSync(outputFile, shared.formattedSummary || shared.summary);
      console.log(`\nSummary saved to: ${outputFile}`);
    }
  }
} 
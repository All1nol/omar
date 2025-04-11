/**
 * Configuration for API throttling
 */
export interface ApiThrottlerConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxDailyRequests: number;
}

/**
 * Utility for API rate limiting and throttling
 */
export class ApiThrottler {
  private requestsPerMinute: number;
  private tokensPerMinute: number;
  private maxDailyRequests: number;
  
  private requestQueue: number[] = [];
  private tokenQueue: number[] = [];
  private dailyRequests = 0;
  private dailyResetTime: Date;
  
  /**
   * Creates a new ApiThrottler
   * @param config Configuration options
   */
  constructor(config: ApiThrottlerConfig = {
    requestsPerMinute: 15,
    tokensPerMinute: 1000000,
    maxDailyRequests: 1500
  }) {
    this.requestsPerMinute = config.requestsPerMinute;
    this.tokensPerMinute = config.tokensPerMinute;
    this.maxDailyRequests = config.maxDailyRequests;
    
    // Set daily reset time to the next midnight
    this.dailyResetTime = new Date();
    this.dailyResetTime.setHours(24, 0, 0, 0);
  }
  
  /**
   * Throttles an API request based on rate limits
   * @param estimatedTokens Estimated tokens for this request
   * @returns Promise that resolves when it's safe to make the request
   */
  async throttle(estimatedTokens: number): Promise<void> {
    // Check and reset daily quota if needed
    this.checkDailyReset();
    
    // Check if we're at the daily limit
    if (this.dailyRequests >= this.maxDailyRequests) {
      const timeToReset = this.dailyResetTime.getTime() - Date.now();
      const minutesToReset = Math.ceil(timeToReset / (60 * 1000));
      
      console.warn(`Daily request limit reached. Reset in ${minutesToReset} minutes.`);
      
      // Wait until reset time
      await new Promise(resolve => setTimeout(resolve, timeToReset));
      
      // Reset happened during wait
      this.dailyRequests = 0;
      this.dailyResetTime = new Date();
      this.dailyResetTime.setHours(24, 0, 0, 0);
    }
    
    // Clean up old requests from the queue
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    this.requestQueue = this.requestQueue.filter(timestamp => timestamp > oneMinuteAgo);
    this.tokenQueue = this.tokenQueue.filter(timestamp => timestamp > oneMinuteAgo);
    
    // Check requests per minute limit
    if (this.requestQueue.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestQueue[0];
      const timeToWait = 60 * 1000 - (now - oldestRequest);
      
      console.log(`Rate limit approaching: ${this.requestQueue.length}/${this.requestsPerMinute} requests in the last minute.`);
      console.log(`Waiting ${Math.ceil(timeToWait / 1000)} seconds before next request.`);
      
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    // Check tokens per minute limit
    const currentTokensThisMinute = this.tokenQueue.length;
    if (currentTokensThisMinute + estimatedTokens > this.tokensPerMinute) {
      const timeToWait = 60 * 1000;
      
      console.log(`Token limit approaching: ~${currentTokensThisMinute}/${this.tokensPerMinute} tokens in the last minute.`);
      console.log(`Waiting ${Math.ceil(timeToWait / 1000)} seconds before next request.`);
      
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
  }
  
  /**
   * Records an API call for rate limiting purposes
   * @param tokenCount Number of tokens used in this call
   */
  recordApiCall(tokenCount: number): void {
    const now = Date.now();
    
    // Add timestamp for this request
    this.requestQueue.push(now);
    
    // Add tokens for this request (one timestamp per token)
    for (let i = 0; i < tokenCount; i++) {
      this.tokenQueue.push(now);
    }
    
    // Increment daily requests
    this.dailyRequests++;
  }
  
  /**
   * Checks if we need to reset the daily counter
   */
  private checkDailyReset(): void {
    const now = new Date();
    if (now >= this.dailyResetTime) {
      console.log('Daily request quota reset.');
      this.dailyRequests = 0;
      this.dailyResetTime = new Date();
      this.dailyResetTime.setHours(24, 0, 0, 0);
    }
  }
} 
/**
 * Video Detection Service
 * 
 * This service is responsible for detecting new videos uploaded to subscribed channels.
 * It uses the YouTube Data API to check for updates and triggers the summarization process.
 */

import axios from 'axios';
import { ChannelSubscription } from '../subscription/models';
import { MongoSubscriptionRepository } from '../subscription/subscriptionRepository';
import { VideoSummarizationService } from '../summarization/videoSummarizationService';

// Define interface for video data
export interface VideoData {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description?: string;
  publishedAt: Date;
  thumbnailUrl?: string;
  duration?: string;
  isShort: boolean;
}

/**
 * Service for detecting new videos from subscribed channels
 */
export class VideoDetectionService {
  private apiKey: string;
  private subscriptionRepository: MongoSubscriptionRepository;
  private summarizationService: VideoSummarizationService;
  private checkIntervalMs: number;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new VideoDetectionService
   * @param apiKey YouTube Data API key
   * @param subscriptionRepository Repository for subscriptions
   * @param summarizationService Service for video summarization
   * @param checkIntervalMs How often to check for new videos (in milliseconds)
   */
  constructor(
    apiKey: string,
    subscriptionRepository: MongoSubscriptionRepository,
    summarizationService: VideoSummarizationService,
    checkIntervalMs: number = 3600000 // Default: 1 hour
  ) {
    this.apiKey = apiKey;
    this.subscriptionRepository = subscriptionRepository;
    this.summarizationService = summarizationService;
    this.checkIntervalMs = checkIntervalMs;
  }
  
  /**
   * Gets the running status of the service
   * @returns True if the service is running, false otherwise
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Start the periodic checking for new videos
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Video detection service is already running');
      return;
    }
    
    console.log('Starting video detection service');
    this.isRunning = true;
    
    // Run immediately once
    this.checkForNewVideos();
    
    // Then set interval for future checks
    this.checkInterval = setInterval(() => {
      this.checkForNewVideos();
    }, this.checkIntervalMs);
  }
  
  /**
   * Stop the periodic checking
   */
  public stop(): void {
    if (!this.isRunning || !this.checkInterval) {
      console.log('Video detection service is not running');
      return;
    }
    
    console.log('Stopping video detection service');
    clearInterval(this.checkInterval);
    this.isRunning = false;
    this.checkInterval = null;
  }
  
  /**
   * Check for new videos from all subscribed channels
   */
  private async checkForNewVideos(): Promise<void> {
    try {
      console.log('======== VIDEO DETECTION: Starting new video check ========');
      
      // Get all unique channelIds from active subscriptions
      const allSubscriptions = await this.getAllActiveSubscriptions();
      const channelIds = [...new Set(allSubscriptions.map(sub => sub.channelId))];
      
      console.log(`DEBUG: Found ${allSubscriptions.length} active subscriptions for ${channelIds.length} unique channels`);
      console.log(`DEBUG: Channel IDs to check: ${JSON.stringify(channelIds)}`);
      
      if (channelIds.length === 0) {
        console.log('DEBUG: No subscribed channels found');
        return;
      }
      
      // Check each channel for new videos
      for (const channelId of channelIds) {
        console.log(`\nDEBUG: Checking channel ID: ${channelId}`);
        
        // Find subscribers for this channel
        const subscribers = allSubscriptions
          .filter(sub => sub.channelId === channelId)
          .map(sub => sub.userId);
        
        console.log(`DEBUG: Channel has ${subscribers.length} subscribers: ${JSON.stringify(subscribers)}`);
        
        // Get recent videos
        const videos = await this.getRecentVideosForChannel(channelId);
        
        if (videos.length === 0) {
          console.log(`DEBUG: No videos found for channel: ${channelId}`);
          continue;
        }
        
        console.log(`DEBUG: Found ${videos.length} videos for channel: ${channelId}`);
        
        // For each video, trigger summarization if needed
        for (const video of videos) {
          // Check if video was recently published (within configured time window)
          const isNewVideo = this.isRecentlyPublished(video.publishedAt);
          const publishedTime = video.publishedAt.toISOString();
          
          console.log(`\nDEBUG: Video details:
- ID: ${video.videoId}
- Title: ${video.title}
- Published: ${publishedTime}
- Is recent: ${isNewVideo}
- Is Short: ${video.isShort ? 'Yes' : 'No'}`);
          
          if (isNewVideo && !video.isShort) {
            console.log(`DEBUG: --> New video detected! Title: "${video.title}" (ID: ${video.videoId})`);
            console.log(`DEBUG: Queuing video for summarization for ${subscribers.length} subscribers`);
            
            // Trigger summarization
            await this.summarizationService.queueVideoForSummarization(video, subscribers);
            console.log(`DEBUG: Video successfully queued for summarization`);
          } else if (video.isShort) {
            console.log(`DEBUG: Skipping YouTube Short: "${video.title}" (${video.videoId})`);
          } else {
            console.log(`DEBUG: Skipping older video (outside time window): "${video.title}" (${video.videoId})`);
          }
        }
      }
      
      console.log('\n======== VIDEO DETECTION: Finished checking for new videos ========');
    } catch (error) {
      console.error('ERROR in checkForNewVideos:', error);
    }
  }
  
  /**
   * Get all active subscriptions
   * @returns Array of active subscriptions
   */
  private async getAllActiveSubscriptions(): Promise<ChannelSubscription[]> {
    // This is a simplification - in practice you'd need to paginate for large datasets
    const users = await this.getUniqueSubscribedUsers();
    
    let allSubscriptions: ChannelSubscription[] = [];
    for (const userId of users) {
      const userSubscriptions = await this.subscriptionRepository.findByUserId(userId);
      allSubscriptions = [...allSubscriptions, ...userSubscriptions];
    }
    
    return allSubscriptions;
  }
  
  /**
   * Get all unique users who have active subscriptions
   * @returns Array of user IDs
   */
  private async getUniqueSubscribedUsers(): Promise<string[]> {
    // Find all active subscriptions
    const subscriptions = await this.subscriptionRepository.findAllActive();
    // Extract unique user IDs
    return [...new Set(subscriptions.map(sub => sub.userId))];
  }
  
  /**
   * Get recent videos uploaded to a channel
   * @param channelId YouTube channel ID
   * @returns Array of video data
   */
  private async getRecentVideosForChannel(channelId: string): Promise<VideoData[]> {
    try {
      // Get Channel Title first (might be useful)
      let channelTitle = 'Unknown Channel';
      try {
        const channelDetailsResponse = await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          {
            params: {
              part: 'snippet',
              id: channelId,
              key: this.apiKey
            }
          }
        );
        if (channelDetailsResponse.data.items && channelDetailsResponse.data.items.length > 0) {
          channelTitle = channelDetailsResponse.data.items[0]?.snippet?.title || channelTitle;
        }
      } catch (channelError) {
        console.warn(`Could not fetch channel title for ${channelId}:`, channelError);
      }

      // Fetch the last 10 videos using search.list
      console.log(`Fetching last 10 videos for channel ${channelId} using search.list`);
      const searchResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            part: 'snippet',
            channelId: channelId,
            maxResults: 10, // Get last 10 videos
            order: 'date',   // Order by date
            type: 'video',   // Only get videos
            key: this.apiKey
          }
        }
      );

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        console.log(`No videos found for the channel ${channelId} via search`);
        return [];
      }

      // Get video details to check duration and identify Shorts
      const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(',');

      if (!videoIds) {
        console.log(`Could not extract video IDs from search results for channel ${channelId}`);
        return [];
      }

      console.log(`Fetching details for video IDs: ${videoIds}`);
      const videoDetailsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'contentDetails,snippet', // Need snippet for description/tags, contentDetails for duration
            id: videoIds,
            key: this.apiKey
          }
        }
      );

      if (!videoDetailsResponse.data.items) {
        console.log(`Could not fetch details for videos from channel ${channelId}`);
        return [];
      }

      // Process videos: combine search results and details
      const videos: VideoData[] = [];
      for (const item of searchResponse.data.items) {
        const videoId = item.id.videoId;
        const details = videoDetailsResponse.data.items.find((detail: any) => detail.id === videoId);
        const snippet = item.snippet; // Snippet from search result

        if (details && snippet) {
          // Parse duration
          const duration = details.contentDetails.duration;
          const totalSeconds = this.parseIsoDuration(duration); // Use existing helper

          // Check for #shorts tag in title or description (use details snippet for description)
          const videoTitle = snippet.title || '';
          const videoDescription = details.snippet.description || ''; // Use description from video details
          const shortsTag =
            (videoTitle.toLowerCase().includes('#short')) ||
            (videoDescription.toLowerCase().includes('#short'));

          // YouTube Shorts are typically <= 60 seconds
          const isShortDuration = totalSeconds <= 60;

          // Create video object
          const video: VideoData = {
            videoId,
            channelId,
            channelTitle, // Include channel title
            title: videoTitle,
            description: videoDescription, // Use full description
            publishedAt: new Date(snippet.publishedAt),
            thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
            duration: this.formatDuration(duration), // Use existing helper
            // Consider a video a short if duration is <= 60s OR it has the #short tag
            isShort: isShortDuration || shortsTag
          };

          videos.push(video);
        } else {
          console.warn(`Could not find details or snippet for video ID: ${videoId} in channel ${channelId}`);
        }
      }

      console.log(`Processed ${videos.length} videos found via search for channel ${channelId}`);
      return videos;

    } catch (error) {
      console.error(`Error fetching videos for channel ${channelId}:`, error);
      return [];
    }
  }
  
  /**
   * Parses ISO 8601 duration string to total seconds
   * @param isoDuration Duration string (e.g., PT1M30S)
   * @returns Total duration in seconds
   */
  private parseIsoDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  /**
   * Formats ISO 8601 duration string into HH:MM:SS or MM:SS format
   * @param isoDuration Duration string (e.g., PT1M30S)
   * @returns Formatted duration string
   */
  private formatDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  /**
   * Checks if a video was published recently (within the check interval)
   * @param publishedAt The date the video was published
   * @returns True if the video is considered recent, false otherwise
   */
  private isRecentlyPublished(publishedAt: Date): boolean {
    const now = new Date();
    const threshold = new Date(now.getTime() - this.checkIntervalMs);
    return publishedAt >= threshold;
  }

  /**
   * Force an immediate check for new videos
   * @returns Promise that resolves when the check is complete
   */
  public async forceCheckForNewVideos(): Promise<void> {
    console.log('======== VIDEO DETECTION: Manually triggering video check ========');
    await this.checkForNewVideos();
    console.log('======== VIDEO DETECTION: Manual video check finished ========');
  }
} 
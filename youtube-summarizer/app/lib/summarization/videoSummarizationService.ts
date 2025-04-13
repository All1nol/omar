/**
 * Video Summarization Service
 * 
 * This service is responsible for generating summaries of YouTube videos.
 * It uses the existing summarization functionality and manages the queue of videos to summarize.
 */

import mongoose, { Document, Schema } from 'mongoose';
import { runYouTubeSummarizerHeadless, SummarizerResult } from '../core/runner';
import { VideoData } from '../videoDetection/videoDetectionService';
import { NotificationService } from '../notification/notificationService';
import { ChannelSubscription, ChannelSubscriptionModel } from '../subscription/models';

// Define interface for video summary document
export interface VideoSummary extends Document {
  videoId: string;
  channelId: string;
  title: string;
  thumbnailUrl?: string;
  summary: string;
  createdAt: Date;
  originalVideoUrl: string;
  duration?: string;
  isShort?: boolean;
}

// Define Mongoose schema for video summaries
const videoSummarySchema = new Schema<VideoSummary>({
  videoId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  thumbnailUrl: { type: String },
  summary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  originalVideoUrl: { type: String, required: true },
  duration: { type: String },
  isShort: { type: Boolean }
}, {
  timestamps: true
});

// Create MongoDB model for video summaries
export const VideoSummaryModel = mongoose.models.VideoSummary || 
  mongoose.model<VideoSummary>('VideoSummary', videoSummarySchema);

// Define interface for queued video document
export interface QueuedVideo extends Document {
  videoId: string;
  channelId: string;
  title: string;
  description?: string;
  publishedAt: Date;
  thumbnailUrl?: string;
  subscribers: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
  duration?: string;
  isShort?: boolean;
}

// Define Mongoose schema for queued videos
const queuedVideoSchema = new Schema<QueuedVideo>({
  videoId: { type: String, required: true, index: true, unique: true },
  channelId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  publishedAt: { type: Date, required: true },
  thumbnailUrl: { type: String },
  subscribers: { type: [String], required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  error: { type: String },
  duration: { type: String },
  isShort: { type: Boolean }
}, {
  timestamps: true
});

// Create MongoDB model for queued videos
export const QueuedVideoModel = mongoose.models.QueuedVideo || 
  mongoose.model<QueuedVideo>('QueuedVideo', queuedVideoSchema);

/**
 * Service for managing video summarization
 */
export class VideoSummarizationService {
  private apiKey: string;
  private notificationService: NotificationService;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new VideoSummarizationService
   * @param apiKey API key for summarization service
   * @param notificationService Service for sending notifications
   */
  constructor(
    apiKey: string,
    notificationService: NotificationService
  ) {
    this.apiKey = apiKey;
    this.notificationService = notificationService;
  }
  
  /**
   * Gets the processing status of the service
   * @returns True if the service is processing videos, false otherwise
   */
  public isRunning(): boolean {
    return this.isProcessing;
  }
  
  /**
   * Start processing the queue of videos
   * @param intervalMs How often to check for videos to process (in milliseconds)
   */
  public startProcessing(intervalMs: number = 60000): void {
    if (this.isProcessing) {
      console.log('Video processing is already running');
      return;
    }
    
    console.log('Starting video summarization processing');
    this.isProcessing = true;
    
    // Run immediately once
    this.processNextVideo();
    
    // Then set interval for future processing
    this.processingInterval = setInterval(() => {
      this.processNextVideo();
    }, intervalMs);
  }
  
  /**
   * Stop processing the queue
   */
  public stopProcessing(): void {
    if (!this.isProcessing || !this.processingInterval) {
      console.log('Video processing is not running');
      return;
    }
    
    console.log('Stopping video summarization processing');
    clearInterval(this.processingInterval);
    this.isProcessing = false;
    this.processingInterval = null;
  }
  
  /**
   * Queue a video for summarization
   * @param video Video data
   * @param subscribers Array of user IDs subscribed to the channel
   */
  public async queueVideoForSummarization(video: VideoData, subscribers: string[]): Promise<void> {
    try {
      console.log(`\n======== SUMMARIZATION: Queuing video (ID: ${video.videoId}) ========`);
      console.log(`DEBUG: Checking if video "${video.title}" is already in queue`);
      
      // Check if video is already queued
      const existingVideo = await QueuedVideoModel.findOne({ videoId: video.videoId }).exec();
      
      if (existingVideo) {
        console.log(`DEBUG: Video is already in queue with status: ${existingVideo.status}`);
        
        // If already queued, update subscribers list (add any new subscribers)
        const newSubscribers = subscribers.filter(id => !existingVideo.subscribers.includes(id));
        
        if (newSubscribers.length > 0) {
          console.log(`DEBUG: Adding ${newSubscribers.length} new subscribers to existing queue item`);
          existingVideo.subscribers = [...existingVideo.subscribers, ...newSubscribers];
          await existingVideo.save();
          console.log(`DEBUG: Updated subscribers for queued video: ${video.videoId}`);
        } else {
          console.log(`DEBUG: No new subscribers to add`);
        }
        
        return;
      }
      
      // Create new queued video
      console.log(`DEBUG: Creating new queue item for video: ${video.videoId}`);
      const queuedVideo = new QueuedVideoModel({
        ...video,
        subscribers,
        status: 'pending'
      });
      
      await queuedVideo.save();
      console.log(`DEBUG: Successfully queued video for summarization: ${video.title} (${video.videoId})`);
      console.log(`DEBUG: Current queue status:`);
      
      // Log current queue status
      const pendingCount = await QueuedVideoModel.countDocuments({ status: 'pending' });
      const processingCount = await QueuedVideoModel.countDocuments({ status: 'processing' });
      const completedCount = await QueuedVideoModel.countDocuments({ status: 'completed' });
      const failedCount = await QueuedVideoModel.countDocuments({ status: 'failed' });
      
      console.log(`- Pending: ${pendingCount}`);
      console.log(`- Processing: ${processingCount}`);
      console.log(`- Completed: ${completedCount}`);
      console.log(`- Failed: ${failedCount}`);
      console.log(`======== SUMMARIZATION: Queuing complete ========\n`);
    } catch (error) {
      console.error('ERROR in queueVideoForSummarization:', error);
    }
  }
  
  /**
   * Process the next video in the queue
   */
  private async processNextVideo(): Promise<void> {
    try {
      console.log('\n======== SUMMARIZATION: Processing next video ========');
      
      // Find a pending video to process
      const video = await QueuedVideoModel.findOne({ status: 'pending' })
        .sort({ createdAt: 1 }) // Oldest first
        .exec();
      
      if (!video) {
        console.log('DEBUG: No pending videos in queue to process');
        return; // No videos to process
      }
      
      console.log(`DEBUG: Found pending video to process:`);
      console.log(`- ID: ${video.videoId}`);
      console.log(`- Title: ${video.title}`);
      console.log(`- Channel: ${video.channelId}`);
      console.log(`- Subscribers: ${video.subscribers.length}`);
      
      // Mark as processing
      video.status = 'processing';
      await video.save();
      console.log(`DEBUG: Video marked as processing`);
      
      try {
        // Generate summary
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        console.log(`DEBUG: Starting summarization of ${videoUrl}`);
        
        const startTime = Date.now();
        const result = await this.summarizeVideo(videoUrl);
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        
        console.log(`DEBUG: Summarization completed in ${elapsedSeconds.toFixed(1)}s`);
        console.log(`DEBUG: Summary length: ${result.summary.length} characters`);
        
        // Save summary
        console.log(`DEBUG: Saving summary to database`);
        const summary = new VideoSummaryModel({
          videoId: video.videoId,
          channelId: video.channelId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          summary: result.summary,
          originalVideoUrl: videoUrl,
          duration: video.duration,
          isShort: video.isShort
        });
        
        await summary.save();
        console.log(`DEBUG: Summary saved with ID: ${summary._id}`);
        
        // Mark as completed
        video.status = 'completed';
        video.processedAt = new Date();
        await video.save();
        
        console.log(`DEBUG: Successfully summarized video: ${video.videoId}`);
        
        // Notify subscribers
        console.log(`DEBUG: Notifying ${video.subscribers.length} subscribers`);
        await this.notifySubscribers(summary, video.subscribers);
        
        console.log('======== SUMMARIZATION: Processing complete ========\n');
      } catch (error) {
        console.error(`ERROR in summarizing video ${video.videoId}:`, error);
        
        // Mark as failed
        video.status = 'failed';
        video.error = error instanceof Error ? error.message : String(error);
        await video.save();
        console.log(`DEBUG: Video marked as failed due to error`);
      }
    } catch (error) {
      console.error('ERROR in processNextVideo:', error);
    }
  }
  
  /**
   * Generate a summary for a YouTube video
   * @param videoUrl YouTube video URL
   * @returns Promise resolving to summarizer result
   */
  private async summarizeVideo(videoUrl: string): Promise<SummarizerResult> {
    return runYouTubeSummarizerHeadless(videoUrl, {
      apiKey: this.apiKey,
      highQualityMode: true
    });
  }
  
  /**
   * Notify subscribers about a new summary
   * @param summary Video summary
   * @param subscribers Array of user IDs to notify
   */
  private async notifySubscribers(summary: VideoSummary, subscribers: string[]): Promise<void> {
    try {
      // Create notification content
      const notificationContent = {
        title: `New Summary: ${summary.title}`,
        message: summary.summary.substring(0, 200) + '...',
        videoUrl: summary.originalVideoUrl,
        summaryUrl: `/summaries/${summary._id}`
      };
      
      // Send notifications to all subscribers
      for (const userId of subscribers) {
        await this.notificationService.sendNotification(userId, notificationContent);
      }
      
      console.log(`Sent notifications to ${subscribers.length} subscribers for video: ${summary.videoId}`);
    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }
  
  /**
   * Get summaries for a user (from channels they're subscribed to)
   * @param userId User ID
   * @param limit Maximum number of summaries to return
   * @param skip Number of summaries to skip (for pagination)
   * @returns Promise resolving to array of summaries
   */
  public async getSummariesForUser(
    userId: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<VideoSummary[]> {
    try {
      // Get all channel IDs the user is subscribed to
      const subscriptions = await ChannelSubscriptionModel.find({ userId, isActive: true })
        .exec();
      
      const channelIds = subscriptions.map(sub => sub.channelId);
      
      if (channelIds.length === 0) {
        return [];
      }
      
      // Get summaries for those channels
      return VideoSummaryModel.find({ channelId: { $in: channelIds } })
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .exec();
    } catch (error) {
      console.error('Error getting summaries for user:', error);
      return [];
    }
  }
  
  /**
   * Get a specific summary by ID
   * @param summaryId Summary ID
   * @returns Promise resolving to summary or null if not found
   */
  public async getSummaryById(summaryId: string): Promise<VideoSummary | null> {
    try {
      return VideoSummaryModel.findById(summaryId).exec();
    } catch (error) {
      console.error('Error getting summary by ID:', error);
      return null;
    }
  }
} 
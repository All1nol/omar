/**
 * Subscription Service
 * 
 * This file contains the service for managing channel subscriptions.
 * It implements the SOLID principles with a focus on Single Responsibility and Open/Closed principles.
 */

import { ChannelSubscription, ChannelSubscriptionModel, SubscriptionRequest, SubscriptionResult } from './models';
import { extractChannelId, getChannelInfo } from '../utils/youtubeUtils';

/**
 * Interface defining operations for a subscription repository
 */
export interface ISubscriptionRepository {
  create(subscription: Partial<ChannelSubscription>): Promise<ChannelSubscription>;
  findByUserId(userId: string): Promise<ChannelSubscription[]>;
  findByChannelId(channelId: string): Promise<ChannelSubscription[]>;
  update(subscription: ChannelSubscription): Promise<ChannelSubscription>;
  delete(id: string): Promise<boolean>;
}

/**
 * Service for managing subscriptions to YouTube channels
 */
export class SubscriptionService {
  private repository: ISubscriptionRepository;
  private apiKey?: string;
  
  /**
   * Creates a new SubscriptionService instance
   * @param repository Repository for data storage operations
   * @param apiKey YouTube API key for fetching channel information
   */
  constructor(repository: ISubscriptionRepository, apiKey?: string) {
    this.repository = repository;
    this.apiKey = apiKey;
  }
  
  /**
   * Subscribe to a YouTube channel
   * @param request Subscription request containing channel URL and user ID
   * @returns Promise resolving to subscription result
   */
  async subscribeToChannel(request: SubscriptionRequest): Promise<SubscriptionResult> {
    try {
      const { channelUrl, userId } = request;
      
      // Extract channel ID from URL
      const channelId = await extractChannelId(channelUrl);
      
      if (!channelId) {
        return {
          success: false,
          message: 'Invalid YouTube channel URL. Could not extract channel ID.',
        };
      }
      
      // Check if subscription already exists - improved to check both userId and channelId
      const existingSubscriptions = await this.repository.findByUserId(userId);
      const existingActiveSubscription = existingSubscriptions.find(
        sub => sub.channelId === channelId && sub.isActive === true
      );
      
      if (existingActiveSubscription) {
        return {
          success: false,
          message: 'You are already subscribed to this channel.',
          subscription: existingActiveSubscription,
        };
      }
      
      // Check for inactive subscription (previously unsubscribed) and reactivate it
      const inactiveSubscription = await ChannelSubscriptionModel.findOne({
        userId,
        channelId,
        isActive: false
      }).exec();
      
      if (inactiveSubscription) {
        console.log(`Reactivating existing subscription for user ${userId} to channel ${channelId}`);
        inactiveSubscription.isActive = true;
        inactiveSubscription.createdAt = new Date();
        const updatedSubscription = await inactiveSubscription.save();
        
        // Trigger immediate video check for this channel
        try {
          this.triggerVideoCheck(channelId);
        } catch (checkError) {
          console.error('Error triggering video check after subscription reactivation:', checkError);
        }
        
        return {
          success: true,
          message: 'Successfully resubscribed to channel.',
          subscription: updatedSubscription,
        };
      }
      
      // Get channel information if API key is available
      let channelTitle: string | undefined = undefined;
      if (this.apiKey) {
        const channelInfo = await getChannelInfo(channelId, this.apiKey);
        if (channelInfo && channelInfo.snippet) {
          channelTitle = channelInfo.snippet.title;
        }
      }
      
      // Create new subscription
      const subscriptionData: Partial<ChannelSubscription> = {
        userId,
        channelId,
        channelUrl,
        channelTitle,
        createdAt: new Date(),
        isActive: true,
      };
      
      try {
        const createdSubscription = await this.repository.create(subscriptionData);
        
        // Trigger immediate video check for this channel
        try {
          this.triggerVideoCheck(channelId);
        } catch (checkError) {
          // Log but don't fail the subscription if the check fails
          console.error('Error triggering video check after subscription:', checkError);
        }
        
        return {
          success: true,
          message: 'Successfully subscribed to channel.',
          subscription: createdSubscription,
        };
      } catch (createError: any) {
        // Check for MongoDB duplicate key error
        if (createError.name === 'MongoServerError' && createError.code === 11000) {
          // This is a duplicate key error - the subscription already exists
          return {
            success: false,
            message: 'You are already subscribed to this channel.',
            error: createError,
          };
        }
        
        // Re-throw other errors to be caught by the outer catch
        throw createError;
      }
    } catch (error) {
      console.error('Error subscribing to channel:', error);
      return {
        success: false,
        message: 'Failed to subscribe to channel.',
        error,
      };
    }
  }
  
  /**
   * Helper to trigger video check after subscription
   * @param channelId Channel ID to check for videos
   */
  private async triggerVideoCheck(channelId: string): Promise<void> {
    const { getServiceManager } = require('../serviceInitializer');
    const serviceManager = getServiceManager();
    const videoDetectionService = serviceManager.getVideoDetectionService();
    
    // If the service is not running, start it
    if (!videoDetectionService.getIsRunning()) {
      videoDetectionService.start();
    }
    
    // Force an immediate check for this specific channel
    console.log(`Triggering immediate video check for channel: ${channelId}`);
    
    // Use the forceCheckForNewVideos method if available
    if (typeof videoDetectionService.forceCheckForNewVideos === 'function') {
      await videoDetectionService.forceCheckForNewVideos();
    }
  }
  
  /**
   * Unsubscribe from a YouTube channel
   * @param userId User ID
   * @param subscriptionId Subscription ID
   * @returns Promise resolving to subscription result
   */
  async unsubscribeFromChannel(userId: string, subscriptionId: string): Promise<SubscriptionResult> {
    try {
      // Find subscription by ID and user ID for security
      const subscription = await ChannelSubscriptionModel.findOne({
        _id: subscriptionId,
        userId,
        isActive: true
      }).exec();
      
      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found.',
        };
      }
      
      const channelId = subscription.channelId;
      
      // Delete subscription (soft delete)
      const deleted = await this.repository.delete(subscriptionId);
      
      if (deleted) {
        // Clean up related data
        await this.cleanupAfterUnsubscribe(userId, channelId);
        
        return {
          success: true,
          message: 'Successfully unsubscribed from channel.',
          subscription,
        };
      } else {
        return {
          success: false,
          message: 'Failed to unsubscribe from channel.',
        };
      }
    } catch (error) {
      console.error('Error unsubscribing from channel:', error);
      return {
        success: false,
        message: 'Failed to unsubscribe from channel.',
        error,
      };
    }
  }
  
  /**
   * Clean up data after a user unsubscribes from a channel
   * @param userId User ID that unsubscribed
   * @param channelId Channel ID that was unsubscribed from
   */
  private async cleanupAfterUnsubscribe(userId: string, channelId: string): Promise<void> {
    try {
      // Import models from other services
      const { QueuedVideoModel } = require('../summarization/videoSummarizationService');
      
      // Check if any other users are still subscribed to this channel
      const otherSubscriptions = await ChannelSubscriptionModel.find({
        channelId,
        userId: { $ne: userId },
        isActive: true
      }).exec();
      
      // Update any pending videos in the queue to remove this user from subscribers
      const pendingVideos = await QueuedVideoModel.find({
        channelId,
        status: { $in: ['pending', 'processing'] },
        subscribers: userId
      }).exec();
      
      console.log(`Removing user ${userId} from ${pendingVideos.length} queued videos for channel ${channelId}`);
      
      for (const video of pendingVideos) {
        // Remove this user from subscribers list
        video.subscribers = video.subscribers.filter((id: string) => id !== userId);
        
        // If no subscribers left and this was the last subscription to this channel, remove the video from queue
        if (video.subscribers.length === 0 && otherSubscriptions.length === 0) {
          console.log(`Removing queued video ${video.videoId} as it has no subscribers left`);
          await video.remove();
        } else {
          await video.save();
        }
      }
      
      console.log(`Cleanup after unsubscribe completed for user ${userId} from channel ${channelId}`);
    } catch (error) {
      console.error('Error during post-unsubscribe cleanup:', error);
      // Don't throw the error to avoid failing the unsubscribe operation
    }
  }
  
  /**
   * Get all subscriptions for a user
   * @param userId User ID
   * @returns Promise resolving to array of subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<ChannelSubscription[]> {
    return this.repository.findByUserId(userId);
  }
} 
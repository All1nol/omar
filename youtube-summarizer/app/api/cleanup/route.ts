import { NextRequest, NextResponse } from 'next/server';
import { MongoService } from '../../lib/services/mongoService';
import { VideoSummaryModel, QueuedVideoModel } from '../../lib/summarization/videoSummarizationService';
import { ChannelSubscriptionModel } from '../../lib/subscription/models';
import { getServiceManager } from '../../lib/serviceInitializer';
import { SubscriptionService } from '../../lib/subscription/subscriptionService';
import { MongoSubscriptionRepository } from '../../lib/subscription/subscriptionRepository';

// Ensure MongoDB is connected
const mongoService = MongoService.getInstance();
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in cleanup API route:', error);
});

/**
 * API endpoint to clean up user data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId = 'demo-user-123', removeAll = false } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Starting data cleanup for user: ${userId}, removeAll: ${removeAll}`);
    
    // Get all active subscriptions for this user
    const activeSubscriptions = await ChannelSubscriptionModel.find({
      userId,
      isActive: true
    }).exec();
    
    // Get channel IDs the user is still subscribed to
    const subscribedChannelIds = activeSubscriptions.map(sub => sub.channelId);
    
    console.log(`User is subscribed to ${subscribedChannelIds.length} channels`);
    
    // Results tracking
    const results = {
      removedFromQueued: 0,
      unsubscribedChannels: 0,
      deletedSubscriptions: 0
    };
    
    // If removeAll is true, unsubscribe from all channels
    if (removeAll) {
      console.log(`Removing all subscriptions for user ${userId}`);
      
      // Get API key from environment
      const apiKey = process.env.YOUTUBE_API_KEY || '';
      
      // Create repository and subscription service
      const repository = new MongoSubscriptionRepository();
      const subscriptionService = new SubscriptionService(repository, apiKey);
      
      // Unsubscribe from each channel
      for (const subscription of activeSubscriptions) {
        console.log(`Unsubscribing user ${userId} from channel ${subscription.channelId}`);
        await subscriptionService.unsubscribeFromChannel(userId, subscription._id.toString());
        results.unsubscribedChannels++;
      }
      
      // Also delete any inactive subscriptions
      const inactiveSubscriptions = await ChannelSubscriptionModel.find({
        userId,
        isActive: false
      }).exec();
      
      for (const subscription of inactiveSubscriptions) {
        await subscription.remove();
        results.deletedSubscriptions++;
      }
      
      console.log(`Removed ${results.unsubscribedChannels} active and ${results.deletedSubscriptions} inactive subscriptions`);
    } else {
      // Just clean up queued videos
      const queuedVideos = await QueuedVideoModel.find({
        status: { $in: ['pending', 'processing'] },
        subscribers: userId
      }).exec();
      
      console.log(`Found ${queuedVideos.length} queued videos with user ${userId} as subscriber`);
      
      for (const video of queuedVideos) {
        // Remove this user from subscribers list
        video.subscribers = video.subscribers.filter((id: string) => id !== userId);
        
        // If no subscribers left, remove the video from queue
        if (video.subscribers.length === 0) {
          console.log(`Removing queued video ${video.videoId} as it has no subscribers left`);
          await video.remove();
        } else {
          await video.save();
        }
        
        results.removedFromQueued++;
      }
    }
    
    // Return the cleanup results
    return NextResponse.json({
      success: true,
      message: removeAll 
        ? 'All user data has been removed successfully' 
        : 'Data cleanup completed successfully',
      results
    });
  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clean up data', error: String(error) },
      { status: 500 }
    );
  }
} 
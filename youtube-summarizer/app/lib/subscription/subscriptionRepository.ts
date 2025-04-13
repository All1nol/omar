/**
 * Subscription Repository
 * 
 * This file contains the repository implementation for managing channel subscriptions.
 * It implements the ISubscriptionRepository interface defined in the subscription service.
 * This implementation uses Mongoose for MongoDB integration.
 */

import { ChannelSubscription, ChannelSubscriptionModel } from './models';
import { ISubscriptionRepository } from './subscriptionService';
import { MongoService } from '../services/mongoService';

/**
 * Repository for managing channel subscriptions using MongoDB
 */
export class MongoSubscriptionRepository implements ISubscriptionRepository {
  /**
   * Creates a new MongoSubscriptionRepository instance
   */
  constructor() {
    // Ensure MongoDB connection is established
    const mongoService = MongoService.getInstance();
    mongoService.connect().catch(error => {
      console.error('Error connecting to MongoDB:', error);
    });
  }
  
  /**
   * Creates a new subscription
   * @param subscription Subscription to create
   * @returns Promise resolving to created subscription
   */
  async create(subscription: Partial<ChannelSubscription>): Promise<ChannelSubscription> {
    try {
      // Check if a subscription with the same userId and channelId already exists
      if (subscription.userId && subscription.channelId) {
        const existingSubscription = await ChannelSubscriptionModel.findOne({
          userId: subscription.userId,
          channelId: subscription.channelId,
          isActive: true
        }).exec();
        
        if (existingSubscription) {
          console.log(`Subscription already exists for user ${subscription.userId} and channel ${subscription.channelId}`);
          return existingSubscription;
        }
      }
      
      // Create new subscription
      const newSubscription = new ChannelSubscriptionModel(subscription);
      await newSubscription.save();
      console.log(`Created new subscription for user ${subscription.userId} and channel ${subscription.channelId}`);
      return newSubscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      // Re-throw the error to be handled by the service
      throw error;
    }
  }
  
  /**
   * Finds subscriptions by user ID
   * @param userId User ID
   * @returns Promise resolving to array of subscriptions
   */
  async findByUserId(userId: string): Promise<ChannelSubscription[]> {
    return ChannelSubscriptionModel.find({ userId, isActive: true }).exec();
  }
  
  /**
   * Finds subscriptions by channel ID
   * @param channelId Channel ID
   * @returns Promise resolving to array of subscriptions
   */
  async findByChannelId(channelId: string): Promise<ChannelSubscription[]> {
    return ChannelSubscriptionModel.find({ channelId, isActive: true }).exec();
  }
  
  /**
   * Updates an existing subscription
   * @param subscription Subscription to update
   * @returns Promise resolving to updated subscription
   */
  async update(subscription: ChannelSubscription): Promise<ChannelSubscription> {
    const updatedSubscription = await ChannelSubscriptionModel.findByIdAndUpdate(
      subscription._id,
      subscription,
      { new: true }
    ).exec();
    
    if (!updatedSubscription) {
      throw new Error(`Subscription with ID ${subscription._id} not found`);
    }
    
    return updatedSubscription;
  }
  
  /**
   * Deletes a subscription (soft delete by setting isActive to false)
   * @param id Subscription ID
   * @returns Promise resolving to true if deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    const result = await ChannelSubscriptionModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).exec();
    
    return result !== null;
  }
  
  /**
   * Permanently deletes a subscription from the database
   * @param id Subscription ID
   * @returns Promise resolving to true if deleted, false otherwise
   */
  async permanentDelete(id: string): Promise<boolean> {
    const result = await ChannelSubscriptionModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Finds all active subscriptions
   * @returns Promise resolving to array of active subscriptions
   */
  async findAllActive(): Promise<ChannelSubscription[]> {
    return ChannelSubscriptionModel.find({ isActive: true }).exec();
  }
} 
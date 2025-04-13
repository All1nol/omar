/**
 * Notification Service
 * 
 * This service is responsible for sending notifications to users.
 * It supports multiple notification channels: email, Telegram, Discord, and Slack.
 */

import mongoose, { Document, Schema } from 'mongoose';

// Define notification content interface
export interface NotificationContent {
  title: string;
  message: string;
  videoUrl: string;
  summaryUrl: string;
}

// Define user notification preferences interface
export interface NotificationPreferences extends Document {
  userId: string;
  email?: {
    enabled: boolean;
    address: string;
  };
  telegram?: {
    enabled: boolean;
    chatId: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Define Mongoose schema for notification preferences
const notificationPreferencesSchema = new Schema<NotificationPreferences>({
  userId: { type: String, required: true, index: true, unique: true },
  email: {
    enabled: { type: Boolean, default: false },
    address: { type: String }
  },
  telegram: {
    enabled: { type: Boolean, default: false },
    chatId: { type: String }
  },
  discord: {
    enabled: { type: Boolean, default: false },
    webhookUrl: { type: String }
  },
  slack: {
    enabled: { type: Boolean, default: false },
    webhookUrl: { type: String }
  }
}, {
  timestamps: true
});

// Create MongoDB model for notification preferences
export const NotificationPreferencesModel = mongoose.models.NotificationPreferences || 
  mongoose.model<NotificationPreferences>('NotificationPreferences', notificationPreferencesSchema);

// Define notification interface for storing sent notifications
export interface Notification extends Document {
  userId: string;
  title: string;
  message: string;
  videoUrl: string;
  summaryUrl: string;
  read: boolean;
  channels: {
    email?: boolean;
    telegram?: boolean;
    discord?: boolean;
    slack?: boolean;
  };
  createdAt: Date;
}

// Define Mongoose schema for notifications
const notificationSchema = new Schema<Notification>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  videoUrl: { type: String, required: true },
  summaryUrl: { type: String, required: true },
  read: { type: Boolean, default: false },
  channels: {
    email: { type: Boolean },
    telegram: { type: Boolean },
    discord: { type: Boolean },
    slack: { type: Boolean }
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create MongoDB model for notifications
export const NotificationModel = mongoose.models.Notification || 
  mongoose.model<Notification>('Notification', notificationSchema);

/**
 * Service for sending notifications to users
 */
export class NotificationService {
  /**
   * Send a notification to a user
   * @param userId User ID
   * @param content Notification content
   * @returns Promise resolving to boolean indicating success
   */
  public async sendNotification(userId: string, content: NotificationContent): Promise<boolean> {
    try {
      // Create notification record
      const notification = new NotificationModel({
        userId,
        title: content.title,
        message: content.message,
        videoUrl: content.videoUrl,
        summaryUrl: content.summaryUrl,
        channels: {}
      });
      
      // Get user's notification preferences
      const preferences = await this.getUserNotificationPreferences(userId);
      
      // No preferences found, just save the notification for web display
      if (!preferences) {
        await notification.save();
        return true;
      }
      
      // Send to each enabled channel
      let success = false;
      
      if (preferences.email?.enabled && preferences.email.address) {
        const emailSent = await this.sendEmailNotification(preferences.email.address, content);
        notification.channels.email = emailSent;
        success = success || emailSent;
      }
      
      if (preferences.telegram?.enabled && preferences.telegram.chatId) {
        const telegramSent = await this.sendTelegramNotification(preferences.telegram.chatId, content);
        notification.channels.telegram = telegramSent;
        success = success || telegramSent;
      }
      
      if (preferences.discord?.enabled && preferences.discord.webhookUrl) {
        const discordSent = await this.sendDiscordNotification(preferences.discord.webhookUrl, content);
        notification.channels.discord = discordSent;
        success = success || discordSent;
      }
      
      if (preferences.slack?.enabled && preferences.slack.webhookUrl) {
        const slackSent = await this.sendSlackNotification(preferences.slack.webhookUrl, content);
        notification.channels.slack = slackSent;
        success = success || slackSent;
      }
      
      // Save the notification record
      await notification.save();
      
      return success;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }
  
  /**
   * Get a user's notification preferences
   * @param userId User ID
   * @returns Promise resolving to notification preferences or null if not found
   */
  public async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      return NotificationPreferencesModel.findOne({ userId }).exec();
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Update a user's notification preferences
   * @param userId User ID
   * @param preferences Notification preferences
   * @returns Promise resolving to updated preferences
   */
  public async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      // Remove userId from preferences to avoid changing it
      const { userId: _, ...prefsToUpdate } = preferences as any;
      
      // Find and update, or create if not exists
      return NotificationPreferencesModel.findOneAndUpdate(
        { userId },
        { $set: prefsToUpdate },
        { 
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      ).exec();
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Get unread notifications for a user
   * @param userId User ID
   * @param limit Maximum number of notifications to return
   * @returns Promise resolving to array of notifications
   */
  public async getUnreadNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      return NotificationModel.find({ userId, read: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }
  
  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   * @returns Promise resolving to boolean indicating success
   */
  public async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const result = await NotificationModel.updateOne(
        { _id: notificationId },
        { $set: { read: true } }
      ).exec();
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  /**
   * Send a notification via email
   * @param emailAddress Email address
   * @param content Notification content
   * @returns Promise resolving to boolean indicating success
   */
  private async sendEmailNotification(
    emailAddress: string,
    content: NotificationContent
  ): Promise<boolean> {
    // In a real implementation, this would use a proper email service
    console.log(`[EMAIL] To: ${emailAddress}, Subject: ${content.title}`);
    console.log(`[EMAIL] Message: ${content.message}`);
    console.log(`[EMAIL] Links: ${content.videoUrl}, ${content.summaryUrl}`);
    
    // For demonstration purposes, we'll pretend it worked
    return true;
  }
  
  /**
   * Send a notification via Telegram
   * @param chatId Telegram chat ID
   * @param content Notification content
   * @returns Promise resolving to boolean indicating success
   */
  private async sendTelegramNotification(
    chatId: string,
    content: NotificationContent
  ): Promise<boolean> {
    // In a real implementation, this would use the Telegram Bot API
    console.log(`[TELEGRAM] To: ${chatId}, Title: ${content.title}`);
    console.log(`[TELEGRAM] Message: ${content.message}`);
    console.log(`[TELEGRAM] Links: ${content.videoUrl}, ${content.summaryUrl}`);
    
    // For demonstration purposes, we'll pretend it worked
    return true;
  }
  
  /**
   * Send a notification via Discord
   * @param webhookUrl Discord webhook URL
   * @param content Notification content
   * @returns Promise resolving to boolean indicating success
   */
  private async sendDiscordNotification(
    webhookUrl: string,
    content: NotificationContent
  ): Promise<boolean> {
    // In a real implementation, this would use Discord's webhook API
    console.log(`[DISCORD] To: ${webhookUrl}, Title: ${content.title}`);
    console.log(`[DISCORD] Message: ${content.message}`);
    console.log(`[DISCORD] Links: ${content.videoUrl}, ${content.summaryUrl}`);
    
    // For demonstration purposes, we'll pretend it worked
    return true;
  }
  
  /**
   * Send a notification via Slack
   * @param webhookUrl Slack webhook URL
   * @param content Notification content
   * @returns Promise resolving to boolean indicating success
   */
  private async sendSlackNotification(
    webhookUrl: string,
    content: NotificationContent
  ): Promise<boolean> {
    // In a real implementation, this would use Slack's webhook API
    console.log(`[SLACK] To: ${webhookUrl}, Title: ${content.title}`);
    console.log(`[SLACK] Message: ${content.message}`);
    console.log(`[SLACK] Links: ${content.videoUrl}, ${content.summaryUrl}`);
    
    // For demonstration purposes, we'll pretend it worked
    return true;
  }
} 
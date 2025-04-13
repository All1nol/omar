/**
 * Subscription Models
 * 
 * This file defines the data models related to channel subscriptions.
 * It uses Mongoose for MongoDB integration.
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface representing a YouTube channel subscription document
 */
export interface ChannelSubscription extends Document {
  userId: string;
  channelId: string;
  channelTitle?: string;
  channelUrl?: string;
  createdAt: Date;
  lastChecked?: Date;
  isActive: boolean;
}

/**
 * Mongoose schema for channel subscriptions
 */
const channelSubscriptionSchema = new Schema<ChannelSubscription>({
  userId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  channelTitle: { type: String },
  channelUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastChecked: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Create a compound index for userId and channelId to ensure unique subscriptions
channelSubscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true });

/**
 * Mongoose model for channel subscriptions
 */
export const ChannelSubscriptionModel = mongoose.models.ChannelSubscription || 
  mongoose.model<ChannelSubscription>('ChannelSubscription', channelSubscriptionSchema);

/**
 * Represents the request to subscribe to a channel
 */
export interface SubscriptionRequest {
  channelUrl: string;
  userId: string;
}

/**
 * Represents the result of a subscription operation
 */
export interface SubscriptionResult {
  success: boolean;
  message: string;
  subscription?: ChannelSubscription;
  error?: any;
} 
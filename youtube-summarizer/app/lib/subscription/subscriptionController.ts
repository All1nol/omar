/**
 * Subscription Controller
 * 
 * This file contains the controller for handling subscription-related API requests.
 * It follows the SOLID principles by separating the API logic from the business logic.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { SubscriptionRequest } from './models';
import { SubscriptionService } from './subscriptionService';
import { MongoSubscriptionRepository } from './subscriptionRepository';

// Instantiate repository and service
const repository = new MongoSubscriptionRepository();
const subscriptionService = new SubscriptionService(repository, process.env.YOUTUBE_API_KEY);

/**
 * Handles subscription API requests
 * @param req Next.js API request
 * @param res Next.js API response
 */
export async function handleSubscriptionRequest(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        await handleGetSubscriptions(req, res);
        break;
      case 'POST':
        await handleCreateSubscription(req, res);
        break;
      case 'DELETE':
        await handleDeleteSubscription(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling subscription request:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

/**
 * Handles GET requests for subscriptions
 * @param req Next.js API request
 * @param res Next.js API response
 */
async function handleGetSubscriptions(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    const { userId } = req.query;
    
    if (!userId || Array.isArray(userId)) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }
    
    const subscriptions = await subscriptionService.getUserSubscriptions(userId);
    res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscriptions' });
  }
}

/**
 * Handles POST requests for creating subscriptions
 * @param req Next.js API request
 * @param res Next.js API response
 */
async function handleCreateSubscription(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    const { channelUrl, userId } = req.body;
    
    if (!channelUrl || !userId) {
      res.status(400).json({ success: false, message: 'Channel URL and User ID are required' });
      return;
    }
    
    const subscriptionRequest: SubscriptionRequest = { channelUrl, userId };
    const result = await subscriptionService.subscribeToChannel(subscriptionRequest);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to create subscription' });
  }
}

/**
 * Handles DELETE requests for removing subscriptions
 * @param req Next.js API request
 * @param res Next.js API response
 */
async function handleDeleteSubscription(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    const { userId, subscriptionId } = req.query;
    
    if (!userId || !subscriptionId || Array.isArray(userId) || Array.isArray(subscriptionId)) {
      res.status(400).json({ success: false, message: 'User ID and Subscription ID are required' });
      return;
    }
    
    const result = await subscriptionService.unsubscribeFromChannel(userId, subscriptionId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to delete subscription' });
  }
} 
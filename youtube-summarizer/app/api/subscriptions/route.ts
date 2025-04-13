/**
 * Subscription API Route
 * 
 * This file handles API requests for managing channel subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MongoService } from '../../lib/services/mongoService';
import { MongoSubscriptionRepository } from '../../lib/subscription/subscriptionRepository';
import { SubscriptionService } from '../../lib/subscription/subscriptionService';
import { SubscriptionRequest } from '../../lib/subscription/models';

// Initialize services
const mongoService = MongoService.getInstance();
const repository = new MongoSubscriptionRepository();
const subscriptionService = new SubscriptionService(repository, process.env.YOUTUBE_API_KEY);

// Connect to MongoDB
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in API route:', error);
});

/**
 * GET handler for retrieving subscriptions
 * @param request Next.js request object
 * @returns Next.js response object
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const subscriptions = await subscriptionService.getUserSubscriptions(userId);
    return NextResponse.json({ success: true, subscriptions });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating subscriptions
 * @param request Next.js request object
 * @returns Next.js response object
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { channelUrl, userId } = body;

    if (!channelUrl || !userId) {
      return NextResponse.json(
        { success: false, message: 'Channel URL and User ID are required' },
        { status: 400 }
      );
    }

    const subscriptionRequest: SubscriptionRequest = { channelUrl, userId };
    const result = await subscriptionService.subscribeToChannel(subscriptionRequest);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing subscriptions
 * @param request Next.js request object
 * @returns Next.js response object
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const subscriptionId = searchParams.get('subscriptionId');

    if (!userId || !subscriptionId) {
      return NextResponse.json(
        { success: false, message: 'User ID and Subscription ID are required' },
        { status: 400 }
      );
    }

    const result = await subscriptionService.unsubscribeFromChannel(userId, subscriptionId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
} 
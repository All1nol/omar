/**
 * Summaries API Route
 * 
 * This file handles API requests for video summaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MongoService } from '../../lib/services/mongoService';
import { VideoSummarizationService } from '../../lib/summarization/videoSummarizationService';
import { NotificationService } from '../../lib/notification/notificationService';

// Initialize services
const mongoService = MongoService.getInstance();
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in summaries API route:', error);
});

// Create summarization service (will only be used for fetching summaries, not processing)
const notificationService = new NotificationService();
const videoSummarizationService = new VideoSummarizationService(
  process.env.GEMINI_API_KEY || '',
  notificationService
);

/**
 * GET handler for retrieving summaries
 * @param request Next.js request object
 * @returns Next.js response object
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const summaryId = searchParams.get('summaryId');
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');

    // If no userId provided, return error
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // If summaryId is provided, return specific summary
    if (summaryId) {
      const summary = await videoSummarizationService.getSummaryById(summaryId);

      if (!summary) {
        return NextResponse.json(
          { success: false, message: 'Summary not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, summary });
    }

    // Parse pagination parameters
    const page = pageStr ? parseInt(pageStr, 10) : 0;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const skip = page * limit;

    // Get summaries for user
    const summaries = await videoSummarizationService.getSummariesForUser(userId, limit, skip);

    return NextResponse.json({ success: true, summaries });
  } catch (error) {
    console.error('Error getting summaries:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get summaries' },
      { status: 500 }
    );
  }
} 
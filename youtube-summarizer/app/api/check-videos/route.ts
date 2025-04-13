import { NextRequest, NextResponse } from 'next/server';
import { getServiceManager } from '../../lib/serviceInitializer';

export async function POST(request: NextRequest) {
  try {
    const serviceManager = getServiceManager();
    
    // Initialize services if not already running
    if (!serviceManager.getStatus().initialized) {
      await serviceManager.initialize();
    }
    
    // Get the video detection service
    const videoDetectionService = serviceManager.getVideoDetectionService();
    
    // Force check for new videos
    await videoDetectionService.forceCheckForNewVideos();
    
    return NextResponse.json({
      success: true,
      message: 'Manual check for new videos triggered'
    });
  } catch (error) {
    console.error('Error triggering check for new videos:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to trigger check for new videos' },
      { status: 500 }
    );
  }
} 
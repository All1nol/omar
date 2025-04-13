import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { MongoService } from '../../lib/services/mongoService';

// Make sure MongoDB is connected
const mongoService = MongoService.getInstance();
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in queue-status API route:', error);
});

export async function GET(request: NextRequest) {
  try {
    // Define models if they're not already defined
    const QueuedVideoModel = mongoose.models.QueuedVideo || 
      mongoose.model('QueuedVideo', new mongoose.Schema({}, { strict: false }));
    
    const VideoSummaryModel = mongoose.models.VideoSummary || 
      mongoose.model('VideoSummary', new mongoose.Schema({}, { strict: false }));

    // Get counts for different queue statuses
    const pendingCount = await QueuedVideoModel.countDocuments({ status: 'pending' });
    const processingCount = await QueuedVideoModel.countDocuments({ status: 'processing' });
    const completedCount = await QueuedVideoModel.countDocuments({ status: 'completed' });
    const failedCount = await QueuedVideoModel.countDocuments({ status: 'failed' });
    
    // Get the most recent videos in each status
    const pendingVideos = await QueuedVideoModel.find({ status: 'pending' })
      .sort({ createdAt: -1 }).limit(5).lean();
    
    const processingVideos = await QueuedVideoModel.find({ status: 'processing' })
      .sort({ createdAt: -1 }).limit(5).lean();
    
    const completedVideos = await QueuedVideoModel.find({ status: 'completed' })
      .sort({ processedAt: -1 }).limit(5).lean();
    
    const failedVideos = await QueuedVideoModel.find({ status: 'failed' })
      .sort({ createdAt: -1 }).limit(5).lean();
    
    // Get count of total summaries
    const summaryCount = await VideoSummaryModel.countDocuments({});
    const recentSummaries = await VideoSummaryModel.find({})
      .sort({ createdAt: -1 }).limit(5).lean();

    return NextResponse.json({
      counts: {
        pending: pendingCount,
        processing: processingCount,
        completed: completedCount,
        failed: failedCount,
        summaries: summaryCount
      },
      pendingVideos,
      processingVideos,
      completedVideos,
      failedVideos,
      recentSummaries
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServiceManager } from '../../lib/serviceInitializer';
import { extractChannelId } from '../../lib/utils/youtubeUtils';
import { MongoService } from '../../lib/services/mongoService';

// Ensure MongoDB is connected
const mongoService = MongoService.getInstance();
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in force-summarize API route:', error);
});

export async function POST(request: NextRequest) {
  try {
    const { channelUrl, userId = 'demo-user-123' } = await request.json();
    
    if (!channelUrl) {
      return NextResponse.json(
        { success: false, message: 'Channel URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`Force summarizing latest video from channel: ${channelUrl}`);
    
    // Extract channel ID from URL
    const channelId = await extractChannelId(channelUrl);
    
    if (!channelId) {
      return NextResponse.json(
        { success: false, message: 'Could not extract channel ID from URL' },
        { status: 400 }
      );
    }
    
    console.log(`Extracted channel ID: ${channelId}`);
    
    // Initialize services if not already running
    const serviceManager = getServiceManager();
    
    if (!serviceManager.getStatus().initialized) {
      await serviceManager.initialize();
    }
    
    // Get API key
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'YouTube API key not found in environment variables' },
        { status: 500 }
      );
    }
    
    // Get the uploads playlist ID for the channel
    const channelResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          part: 'contentDetails',
          id: channelId,
          key: apiKey
        }
      }
    );
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return NextResponse.json(
        { success: false, message: `No channel found with ID: ${channelId}` },
        { status: 404 }
      );
    }
    
    const uploadsPlaylistId = channelResponse.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { success: false, message: `No uploads playlist found for channel: ${channelId}` },
        { status: 404 }
      );
    }
    
    // Get the most recent video
    const playlistResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/playlistItems',
      {
        params: {
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: 1, // Just get the most recent video
          key: apiKey
        }
      }
    );
    
    if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No videos found in the channel' },
        { status: 404 }
      );
    }
    
    // Extract video data
    const latestVideo = playlistResponse.data.items[0];
    const video = {
      videoId: latestVideo.snippet.resourceId.videoId,
      channelId: latestVideo.snippet.channelId,
      title: latestVideo.snippet.title,
      description: latestVideo.snippet.description,
      publishedAt: new Date(latestVideo.snippet.publishedAt),
      thumbnailUrl: latestVideo.snippet.thumbnails?.high?.url || latestVideo.snippet.thumbnails?.default?.url
    };
    
    // Get summarization service
    const videoSummarizationService = serviceManager.getVideoSummarizationService();
    
    // Queue video for summarization
    await videoSummarizationService.queueVideoForSummarization(video, [userId]);
    
    // Start the summarization process if not already running
    if (!videoSummarizationService.isRunning()) {
      videoSummarizationService.startProcessing(10000); // Check every 10 seconds
    }
    
    return NextResponse.json({
      success: true,
      message: 'Video queued for summarization',
      video: {
        videoId: video.videoId,
        title: video.title,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl
      }
    });
  } catch (error) {
    console.error('Error in force-summarize API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to force summarize video', error: String(error) },
      { status: 500 }
    );
  }
} 
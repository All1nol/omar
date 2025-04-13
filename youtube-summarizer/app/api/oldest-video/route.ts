import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServiceManager } from '../../lib/serviceInitializer';
import { extractChannelId } from '../../lib/utils/youtubeUtils';
import { MongoService } from '../../lib/services/mongoService';
import { QueuedVideoModel } from '../../lib/summarization/videoSummarizationService';

// Ensure MongoDB is connected
const mongoService = MongoService.getInstance();
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in oldest-video API route:', error);
});

export async function POST(request: NextRequest) {
  try {
    const { channelUrl, userId = 'demo-user-123', maxResults = 20 } = await request.json();
    
    if (!channelUrl) {
      return NextResponse.json(
        { success: false, message: 'Channel URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`Searching for videos (up to ${maxResults}) on channel: ${channelUrl}`);
    
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
          part: 'contentDetails,snippet',
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
    const channelTitle = channelResponse.data.items[0]?.snippet?.title || 'Unknown Channel';
    
    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { success: false, message: `No uploads playlist found for channel: ${channelId}` },
        { status: 404 }
      );
    }
    
    // Get videos from the channel (requesting more to catch more recent videos)
    const playlistResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/playlistItems',
      {
        params: {
          part: 'snippet,contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(maxResults, 50), // YouTube API limit is 50
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
    
    console.log(`Found ${playlistResponse.data.items.length} videos in the channel`);
    
    // Get video details to check duration and identify Shorts
    const videoIds = playlistResponse.data.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
    const videoDetailsResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'contentDetails,snippet',
          id: videoIds,
          key: apiKey
        }
      }
    );
    
    // Process all videos
    const videos = [];
    for (const item of playlistResponse.data.items) {
      const videoId = item.snippet.resourceId.videoId;
      const details = videoDetailsResponse.data.items.find((detail: any) => detail.id === videoId);
      
      if (details) {
        // Parse duration
        const duration = details.contentDetails.duration;
        const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(durationMatch?.[1] || '0', 10);
        const minutes = parseInt(durationMatch?.[2] || '0', 10);
        const seconds = parseInt(durationMatch?.[3] || '0', 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        // Check for #shorts tag
        const shortsTag = 
          (item.snippet.title && item.snippet.title.toLowerCase().includes('#short')) ||
          (item.snippet.description && item.snippet.description.toLowerCase().includes('#short'));
          
        // YouTube Shorts are typically <= 60 seconds
        const isShortDuration = totalSeconds <= 60;
        
        // Format duration string
        let durationStr = '';
        if (hours > 0) {
          durationStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Create video object
        const video = {
          videoId,
          channelId,
          channelTitle,
          title: item.snippet.title,
          description: item.snippet.description,
          publishedAt: new Date(item.snippet.publishedAt),
          thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          duration: durationStr,
          isShort: (isShortDuration && (shortsTag || false)) || shortsTag
        };
        
        videos.push(video);
      }
    }
    
    // Log full date information for debugging
    const now = new Date();
    console.log(`Current system date/time: ${now.toISOString()} (${now})`);
    
    // Filter out shorts
    const regularVideos = videos.filter(video => !video.isShort);
    
    if (regularVideos.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No regular videos found, only Shorts' },
        { status: 404 }
      );
    }
    
    console.log(`Found ${regularVideos.length} regular videos (non-Shorts)`);
    
    // Sort by publish date (oldest first instead of newest first)
    regularVideos.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    
    // Log all video dates for debugging
    regularVideos.forEach((video, index) => {
      console.log(`Video ${index + 1}: "${video.title}" published at ${video.publishedAt.toISOString()}`);
    });
    
    // Choose the oldest video
    const targetVideo = regularVideos[0];
    
    console.log(`Selected oldest video: "${targetVideo.title}" (${targetVideo.videoId})`);
    console.log(`Published at: ${targetVideo.publishedAt.toISOString()}`);
    console.log(`Processing this oldest video regardless of when it was published`);
    
    // Get summarization service
    const videoSummarizationService = serviceManager.getVideoSummarizationService();
    
    // Check if this video is already in the queue or has been processed
    const existingVideo = await QueuedVideoModel.findOne({ videoId: targetVideo.videoId }).exec();
    
    if (existingVideo) {
      console.log(`Video ${targetVideo.videoId} is already in queue with status: ${existingVideo.status}`);
      
      if (existingVideo.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: 'Video has already been processed',
          video: {
            videoId: targetVideo.videoId,
            title: targetVideo.title,
            publishedAt: targetVideo.publishedAt,
            status: existingVideo.status
          }
        });
      }
      
      // If not completed, add this user to subscribers if not already there
      if (!existingVideo.subscribers.includes(userId)) {
        existingVideo.subscribers.push(userId);
        await existingVideo.save();
      }
      
      return NextResponse.json({
        success: true,
        message: `Video is already in queue with status: ${existingVideo.status}`,
        video: {
          videoId: targetVideo.videoId,
          title: targetVideo.title,
          publishedAt: targetVideo.publishedAt,
          status: existingVideo.status
        }
      });
    }
    
    // Queue video for summarization
    await videoSummarizationService.queueVideoForSummarization(targetVideo, [userId]);
    
    // Start the summarization process if not already running
    if (!videoSummarizationService.isRunning()) {
      videoSummarizationService.startProcessing(10000); // Check every 10 seconds
    }
    
    return NextResponse.json({
      success: true,
      message: 'Video queued for summarization',
      video: {
        videoId: targetVideo.videoId,
        title: targetVideo.title,
        publishedAt: targetVideo.publishedAt,
        thumbnailUrl: targetVideo.thumbnailUrl
      }
    });
  } catch (error) {
    console.error('Error in oldest-video API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process videos', error: String(error) },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServiceManager } from '../../lib/serviceInitializer';
import { extractChannelId } from '../../lib/utils/youtubeUtils';
import { MongoService } from '../../lib/services/mongoService';
import { QueuedVideoModel } from '../../lib/summarization/videoSummarizationService';

// Ensure MongoDB is connected
const mongoService = MongoService.getInstance();
mongoService.connect().catch(error => {
  console.error('Error connecting to MongoDB in force-check API route:', error);
});

// Define the structure for video data we handle internally
interface ProcessableVideo {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl?: string;
  duration: string;
  isShort: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Default ignoreTimeWindow to FALSE for this specific route
    const { channelUrl, userId = 'demo-user-123', ignoreTimeWindow = false } = await request.json();
    
    if (!channelUrl) {
      return NextResponse.json(
        { success: false, message: 'Channel URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`Force checking channel for videos: ${channelUrl} (ignoring time window: ${ignoreTimeWindow})`);
    
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
    
    // Get Channel Title (Keep this part)
    const channelResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          part: 'snippet', // Only need snippet for title now
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

    const channelTitle = channelResponse.data.items[0]?.snippet?.title || 'Unknown Channel';


    // Fetch the last 10 videos using search.list
    console.log(`Fetching last 10 videos for channel ${channelId} using search.list`);
    const searchResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          channelId: channelId,
          maxResults: 10, // Get last 10 videos
          order: 'date',   // Order by date
          type: 'video',   // Only get videos
          key: apiKey
        }
      }
    );

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No videos found for the channel via search' },
        { status: 404 }
      );
    }

    // Get video details to check duration and identify Shorts
    const videoIds = searchResponse.data.items.map((item: any) => item.id.videoId).join(',');
    
    if (!videoIds) {
         return NextResponse.json(
            { success: false, message: 'Could not extract video IDs from search results' },
            { status: 500 }
         );
    }
    
    console.log(`Fetching details for video IDs: ${videoIds}`);
    const videoDetailsResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'contentDetails,snippet', // Need snippet for description/tags, contentDetails for duration
          id: videoIds,
          key: apiKey
        }
      }
    );

    if (!videoDetailsResponse.data.items) {
        return NextResponse.json(
            { success: false, message: 'Could not fetch details for found videos' },
            { status: 500 }
        );
    }

    // Process videos: combine search results and details
    const videos: ProcessableVideo[] = [];
    for (const item of searchResponse.data.items) {
      const videoId = item.id.videoId;
      const details = videoDetailsResponse.data.items.find((detail: any) => detail.id === videoId);
      const snippet = item.snippet; // Snippet from search result

      if (details && snippet) {
        // Parse duration
        const duration = details.contentDetails.duration;
        const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(durationMatch?.[1] || '0', 10);
        const minutes = parseInt(durationMatch?.[2] || '0', 10);
        const seconds = parseInt(durationMatch?.[3] || '0', 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        // Check for #shorts tag in title or description (use details snippet for description)
        const videoTitle = snippet.title || '';
        const videoDescription = details.snippet.description || ''; // Use description from video details
        const shortsTag =
          (videoTitle.toLowerCase().includes('#short')) ||
          (videoDescription.toLowerCase().includes('#short'));

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
        const video: ProcessableVideo = {
          videoId,
          channelId,
          channelTitle,
          title: videoTitle,
          description: videoDescription, // Use full description
          publishedAt: new Date(snippet.publishedAt),
          thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
          duration: durationStr,
          // Consider a video a short if duration is <= 60s OR it has the #short tag
          isShort: isShortDuration || shortsTag
        };

        videos.push(video);
      } else {
         console.warn(`Could not find details or snippet for video ID: ${videoId}`);
      }
    }

    console.log(`Found ${videos.length} videos initially.`);

    // Filter out shorts
    let regularVideos = videos.filter(video => !video.isShort);
    console.log(`Found ${regularVideos.length} non-short videos.`);

    // Conditionally filter by time window if ignoreTimeWindow is false
    console.log(`Checking time window. ignoreTimeWindow flag is set to: ${ignoreTimeWindow}`); // Log the flag value
    if (!ignoreTimeWindow) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`Applying 24-hour filter: Keeping videos published after ${twentyFourHoursAgo.toISOString()}`);
        regularVideos = regularVideos.filter(video => video.publishedAt >= twentyFourHoursAgo);
        console.log(`${regularVideos.length} videos remain after time window filter.`);
    } else {
        console.log(`Skipping 24-hour time window filter (ignoreTimeWindow is true).`);
    }


    if (regularVideos.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No eligible videos found to process (either none recent, all shorts, or none found matching criteria)', videos_processed: [], videos_existing: [] },
        { status: 200 } // Success, just no videos to process
      );
    }

    // Sort by publish date (newest first) - useful for clarity, though processing order might not strictly matter
    regularVideos.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    console.log(`Processing ${regularVideos.length} eligible videos...`);

    // Get summarization service
    const videoSummarizationService = serviceManager.getVideoSummarizationService();

    const results = {
        processed: [] as any[],
        existing: [] as any[],
        failed_to_queue: [] as any[]
    };

    // Process each eligible video
    for (const video of regularVideos) {
      try {
        console.log(`Checking video: "${video.title}" (${video.videoId})`);
        console.log(`Published at: ${video.publishedAt.toISOString()}`);

        // Check if this video is already in the queue or has been processed
        const existingVideo = await QueuedVideoModel.findOne({ videoId: video.videoId }).exec();

        if (existingVideo) {
          console.log(`Video ${video.videoId} is already tracked with status: ${existingVideo.status}`);
          const videoInfo = {
            videoId: video.videoId,
            title: video.title,
            publishedAt: video.publishedAt,
            status: existingVideo.status
          };
          results.existing.push(videoInfo);

          // If not completed, add this user to subscribers if not already there
          // Note: In force-check, we might always want to add the user? Or only if not completed?
          // For now, adding if not already present, regardless of status.
          if (!existingVideo.subscribers.includes(userId)) {
            existingVideo.subscribers.push(userId);
            await existingVideo.save();
            console.log(`Added user ${userId} to subscribers for existing video ${video.videoId}`);
          }
        } else {
          // Queue video for summarization
          console.log(`Queueing video ${video.videoId} for summarization.`);
          await videoSummarizationService.queueVideoForSummarization(video, [userId]);
          results.processed.push({
            videoId: video.videoId,
            title: video.title,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl
          });
        }
      } catch (queueError) {
          console.error(`Error processing or queueing video ${video.videoId}:`, queueError);
          results.failed_to_queue.push({
              videoId: video.videoId,
              title: video.title,
              error: String(queueError)
          });
      }
    }

    // Start the summarization process if not already running and videos were queued
    if (results.processed.length > 0 && !videoSummarizationService.isRunning()) {
      console.log("Starting summarization process as new videos were queued.");
      videoSummarizationService.startProcessing(10000); // Check every 10 seconds
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${regularVideos.length} videos. Queued: ${results.processed.length}. Already existing/tracked: ${results.existing.length}. Failed: ${results.failed_to_queue.length}.`,
      videos_processed: results.processed,
      videos_existing: results.existing,
      videos_failed: results.failed_to_queue
    });

  } catch (error) {
    console.error('Error in force-check API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to force check for videos', error: String(error) },
      { status: 500 }
    );
  }
} 
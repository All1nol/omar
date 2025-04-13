/**
 * Script to force summarize the latest video from a channel
 * 
 * This script bypasses the normal time window check and forces
 * summarization of the latest video from a specified channel.
 */

// First, load the environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const axios = require('axios');
const { getServiceManager } = require('../app/lib/serviceInitializer');
const { extractChannelId } = require('../app/lib/utils/youtubeUtils');

// Usage information
if (process.argv.length < 3) {
  console.log('Usage: node force-summarize.js <channel-url> [userId]');
  console.log('Example: node force-summarize.js https://www.youtube.com/@hexdump1337 demo-user-123');
  process.exit(1);
}

const channelUrl = process.argv[2];
const userId = process.argv[3] || 'demo-user-123'; // Default user ID if not provided

async function run() {
    try {
        console.log(`Starting force summarize for ${channelUrl}`);
        
        // Get channel ID
        const channelId = await extractChannelId(channelUrl);
        console.log(`Channel ID: ${channelId}`);
        
        if (!channelId) {
            console.error('Could not extract channel ID');
            process.exit(1);
        }
        
        // Initialize services
        const serviceManager = getServiceManager();
        await serviceManager.initialize();

        const apiKey = process.env.YOUTUBE_API_KEY;
        
        // Get channel info
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
            console.error(`No channel found with ID: ${channelId}`);
            process.exit(1);
        }
        
        const uploadsPlaylistId = channelResponse.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
        console.log(`Uploads playlist: ${uploadsPlaylistId}`);
        
        // Get latest video
        const playlistResponse = await axios.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            {
                params: {
                    part: 'snippet',
                    playlistId: uploadsPlaylistId,
                    maxResults: 1,
                    key: apiKey
                }
            }
        );
        
        if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
            console.error('No videos found');
            process.exit(1);
        }
        
        const item = playlistResponse.data.items[0];
        const video = {
            videoId: item.snippet.resourceId.videoId,
            channelId: item.snippet.channelId,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: new Date(item.snippet.publishedAt),
            thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
        };
        
        console.log(`Found video: ${video.title} (${video.videoId})`);
        
        // Queue video for summarization
        const videoSummarizationService = serviceManager.getVideoSummarizationService();
        await videoSummarizationService.queueVideoForSummarization(video, [userId]);
        
        // Start processing if not already running
        if (!videoSummarizationService.isRunning()) {
            console.log('Starting summarization service');
            videoSummarizationService.startProcessing(5000);
        }
        
        console.log('Video queued for summarization');
        console.log('Check the summaries page in a few minutes to view the result');
        
        // Wait for processing to start
        setTimeout(() => {
            process.exit(0);
        }, 10000);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

run(); 
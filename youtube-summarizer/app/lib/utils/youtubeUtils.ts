/**
 * YouTube Utility Functions
 * 
 * This file contains utility functions for working with YouTube data,
 * including URL parsing and API interactions.
 */

import axios from 'axios';

/**
 * Extracts the channel ID from a YouTube channel URL
 * @param channelUrl YouTube channel URL
 * @returns Promise resolving to channel ID or undefined if not found
 */
export async function extractChannelId(channelUrl: string): Promise<string | undefined> {
  try {
    // Handle different YouTube URL formats
    
    // Format: https://www.youtube.com/channel/CHANNEL_ID
    const channelMatch = channelUrl.match(/youtube\.com\/channel\/([^\/\?&]+)/);
    if (channelMatch && channelMatch[1]) {
      return channelMatch[1];
    }
    
    // Format: https://www.youtube.com/c/CUSTOM_URL
    const customUrlMatch = channelUrl.match(/youtube\.com\/c\/([^\/\?&]+)/);
    if (customUrlMatch && customUrlMatch[1]) {
      // Custom URLs require an API call to get the actual channel ID
      // This would require the YouTube Data API
      // For now, we'll return the custom URL as a placeholder
      return await resolveCustomUrlToChannelId(customUrlMatch[1]);
    }
    
    // Format: https://www.youtube.com/user/USERNAME
    const userMatch = channelUrl.match(/youtube\.com\/user\/([^\/\?&]+)/);
    if (userMatch && userMatch[1]) {
      // User URLs also require an API call
      return await resolveUsernameToChannelId(userMatch[1]);
    }
    
    // Format: https://www.youtube.com/@HANDLE
    const handleMatch = channelUrl.match(/youtube\.com\/@([^\/\?&]+)/);
    if (handleMatch && handleMatch[1]) {
      return await resolveHandleToChannelId(handleMatch[1]);
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting channel ID:', error);
    return undefined;
  }
}

/**
 * Resolves a custom URL to a channel ID using the YouTube Data API
 * @param customUrl Custom URL
 * @returns Promise resolving to channel ID or undefined if not found
 */
async function resolveCustomUrlToChannelId(customUrl: string): Promise<string | undefined> {
  console.log(`Resolving custom URL: ${customUrl} using YouTube API`);
  
  try {
    // Use the YouTube API to search for the channel by custom URL
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('No YouTube API key available for custom URL resolution');
      return undefined;
    }
    
    // Use search API to find channel
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: customUrl,
        type: 'channel',
        maxResults: 1,
        key: apiKey
      }
    });
    
    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const channelId = searchResponse.data.items[0].snippet.channelId;
      console.log(`Resolved custom URL ${customUrl} to channel ID: ${channelId}`);
      return channelId;
    }
    
    console.log(`Could not resolve custom URL ${customUrl} to a channel ID`);
    return undefined;
  } catch (error) {
    console.error(`Error resolving custom URL ${customUrl}:`, error);
    return undefined;
  }
}

/**
 * Resolves a username to a channel ID using the YouTube Data API
 * @param username Username
 * @returns Promise resolving to channel ID or undefined if not found
 */
async function resolveUsernameToChannelId(username: string): Promise<string | undefined> {
  console.log(`Resolving username: ${username} using YouTube API`);
  
  try {
    // Use the YouTube API to search for the channel by username
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('No YouTube API key available for username resolution');
      return undefined;
    }
    
    // First try direct lookup with channels API
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'id',
        forUsername: username,
        key: apiKey
      }
    });
    
    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channelId = channelResponse.data.items[0].id;
      console.log(`Resolved username ${username} to channel ID: ${channelId}`);
      return channelId;
    }
    
    // Fall back to search API
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: username,
        type: 'channel',
        maxResults: 1,
        key: apiKey
      }
    });
    
    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const channelId = searchResponse.data.items[0].snippet.channelId;
      console.log(`Resolved username ${username} to channel ID via search: ${channelId}`);
      return channelId;
    }
    
    console.log(`Could not resolve username ${username} to a channel ID`);
    return undefined;
  } catch (error) {
    console.error(`Error resolving username ${username}:`, error);
    return undefined;
  }
}

/**
 * Resolves a handle to a channel ID using the YouTube Data API
 * @param handle Handle
 * @returns Promise resolving to channel ID or undefined if not found
 */
async function resolveHandleToChannelId(handle: string): Promise<string | undefined> {
  console.log(`Resolving handle: ${handle} using YouTube API`);
  
  try {
    // Use the YouTube API to search for the channel by handle
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('No YouTube API key available for handle resolution');
      return undefined;
    }
    
    // First try using search API to find channel
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `@${handle}`,
        type: 'channel',
        maxResults: 1,
        key: apiKey
      }
    });
    
    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const channelId = searchResponse.data.items[0].snippet.channelId;
      console.log(`Resolved handle @${handle} to channel ID: ${channelId}`);
      return channelId;
    }
    
    console.log(`Could not resolve handle @${handle} via search API`);
    
    // Alternative: try direct resolution with channels API
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'id',
        forHandle: handle,
        key: apiKey
      }
    });
    
    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channelId = channelResponse.data.items[0].id;
      console.log(`Resolved handle @${handle} to channel ID: ${channelId}`);
      return channelId;
    }
    
    console.log(`Could not resolve handle @${handle} to a channel ID`);
    return undefined;
  } catch (error) {
    console.error(`Error resolving handle @${handle}:`, error);
    return undefined;
  }
}

/**
 * Gets channel information using the YouTube Data API
 * @param channelId Channel ID
 * @param apiKey YouTube Data API key
 * @returns Promise resolving to channel information
 */
export async function getChannelInfo(channelId: string, apiKey: string): Promise<any> {
  try {
    console.log(`Fetching channel info for ID: ${channelId}`);
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet',
        id: channelId,
        key: apiKey
      }
    });
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log(`Successfully retrieved channel info for: ${response.data.items[0]?.snippet?.title || channelId}`);
      return response.data.items[0];
    }
    
    console.log(`No channel found with ID: ${channelId}`);
    return null;
  } catch (error: any) {
    // Handle API errors more specifically
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx range
      console.error(`API error fetching channel info for ${channelId}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      // Log more specific error message for quota issues
      if (error.response.status === 403 && error.response.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        console.error('YouTube API quota exceeded. Please try again later or use a different API key.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`Network error fetching channel info for ${channelId}:`, error.message);
    } else {
      // Something happened in setting up the request
      console.error(`Error fetching channel info for ${channelId}:`, error.message);
    }
    return null;
  }
} 
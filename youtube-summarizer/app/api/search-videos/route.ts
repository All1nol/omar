import { extractChannelId } from "@/app/lib/utils";
import { VideoDetail } from "@/app/lib/types/youtubeTypes";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { connectToDatabase } from "@/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { 
      channelUrl, 
      maxResults = 50, 
      sortOrder = "newest", // "newest" or "oldest"
      startDate,
      endDate
    } = await req.json();
    
    if (!channelUrl) {
      return NextResponse.json({ error: "Channel URL is required" }, { status: 400 });
    }
    
    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      return NextResponse.json({ error: "Invalid channel URL" }, { status: 400 });
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error("YouTube API key not found");
      return NextResponse.json({ error: "YouTube API key not found" }, { status: 500 });
    }

    const youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });
    
    // Get channel uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: ["contentDetails"],
      id: [channelId],
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    
    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return NextResponse.json({ error: "Uploads playlist not found" }, { status: 404 });
    }
    
    // Get video list from playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ["snippet,contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: maxResults,
    });
    
    if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
      return NextResponse.json({ error: "No videos found in channel" }, { status: 404 });
    }
    
    // Get video IDs
    const videoIds = playlistResponse.data.items.map(
      (item) => item.contentDetails?.videoId || ""
    ).filter(id => id !== "");
    
    // Get video details
    const videosResponse = await youtube.videos.list({
      part: ["snippet,contentDetails,statistics"],
      id: videoIds,
    });
    
    if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
      return NextResponse.json({ error: "No video details found" }, { status: 404 });
    }
    
    // Process videos
    const videos: VideoDetail[] = videosResponse.data.items.map((video) => {
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;
      
      return {
        videoId: video.id || "",
        title: snippet?.title || "",
        description: snippet?.description || "",
        channelId: snippet?.channelId || "",
        channelTitle: snippet?.channelTitle || "",
        publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : new Date(),
        duration: contentDetails?.duration || "",
        viewCount: parseInt(video.statistics?.viewCount || "0", 10),
        thumbnails: snippet?.thumbnails || {},
      };
    });
    
    // Filter out shorts (videos less than 1 minute)
    const regularVideos = videos.filter((video) => {
      const durationMatch = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!durationMatch) return true;
      
      const hours = parseInt(durationMatch[1] || "0", 10);
      const minutes = parseInt(durationMatch[2] || "0", 10);
      const seconds = parseInt(durationMatch[3] || "0", 10);
      
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return totalSeconds >= 60; // Filter out videos less than 1 minute
    });
    
    console.log(`Found ${regularVideos.length} regular videos (non-Shorts)`);
    
    // Filter by date range if provided
    let filteredVideos = [...regularVideos];
    
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      filteredVideos = filteredVideos.filter(video => 
        video.publishedAt.getTime() >= startDateTime
      );
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate).getTime();
      filteredVideos = filteredVideos.filter(video => 
        video.publishedAt.getTime() <= endDateTime
      );
    }
    
    // Sort by publish date based on sortOrder parameter
    if (sortOrder === "newest") {
      filteredVideos.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    } else {
      filteredVideos.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    }
    
    return NextResponse.json({ 
      videos: filteredVideos,
      total: filteredVideos.length,
      channelId,
      channelTitle: filteredVideos[0]?.channelTitle || ""
    });
    
  } catch (error: any) {
    console.error("Error searching videos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search videos" },
      { status: 500 }
    );
  }
} 
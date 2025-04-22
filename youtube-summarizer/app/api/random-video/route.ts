import { NextResponse } from 'next/server';

// This would typically interact with a database to fetch videos from user's subscriptions
// For demo purposes, we're returning mock data
export async function GET() {
  try {
    // Mock data - in a real implementation, this would fetch from a database
    const mockVideos = [
      {
        id: "dQw4w9WgXcQ",
        title: "Never Gonna Give You Up",
        channelTitle: "Rick Astley",
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        publishedAt: "2009-10-25T06:57:33Z"
      },
      {
        id: "9bZkp7q19f0",
        title: "PSY - GANGNAM STYLE(강남스타일)",
        channelTitle: "officialpsy",
        thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
        publishedAt: "2012-07-15T07:46:32Z"
      },
      {
        id: "kJQP7kiw5Fk",
        title: "Luis Fonsi - Despacito ft. Daddy Yankee",
        channelTitle: "Luis Fonsi",
        thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
        publishedAt: "2017-01-12T15:04:14Z"
      },
      {
        id: "OPf0YbXqDm0",
        title: "Mark Ronson - Uptown Funk ft. Bruno Mars",
        channelTitle: "Mark Ronson",
        thumbnailUrl: "https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg",
        publishedAt: "2014-11-19T14:00:01Z"
      },
      {
        id: "YQHsXMglC9A",
        title: "Adele - Hello",
        channelTitle: "Adele",
        thumbnailUrl: "https://i.ytimg.com/vi/YQHsXMglC9A/hqdefault.jpg",
        publishedAt: "2015-10-22T15:00:02Z"
      }
    ];

    // Select a random video from the mock data
    const randomIndex = Math.floor(Math.random() * mockVideos.length);
    const randomVideo = mockVideos[randomIndex];

    return NextResponse.json(randomVideo);
  } catch (error) {
    console.error('Error fetching random video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch random video' },
      { status: 500 }
    );
  }
} 
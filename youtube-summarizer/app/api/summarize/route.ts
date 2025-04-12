import { NextRequest, NextResponse } from 'next/server';
import { runYouTubeSummarizerHeadless } from '../../lib/core/runner';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, strategy = 'intelligent', highQualityMode = false } = await request.json();

    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: videoUrl is required' },
        { status: 400 }
      );
    }

    // Call our summarizer with the video URL and options
    const result = await runYouTubeSummarizerHeadless(videoUrl, {
      chunkingStrategy: strategy,
      highQualityMode: highQualityMode
    });

    // Return the summary
    return NextResponse.json({ 
      summary: result.summary,
      videoId: result.videoId,
      processingStats: {
        transcriptLength: result.transcriptLength,
        chunksProcessed: result.chunksProcessed,
        processingTimeSeconds: result.processingTimeSeconds,
        strategy: strategy
      }
    });
  } catch (error) {
    console.error('Error in summarize API:', error);
    return NextResponse.json(
      { error: 'Failed to summarize video' },
      { status: 500 }
    );
  }
} 
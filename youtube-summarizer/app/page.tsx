'use client';

import React, { useState } from 'react';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [strategy, setStrategy] = useState('intelligent');
  const [highQuality, setHighQuality] = useState(false);
  const [processingStats, setProcessingStats] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl.trim() || !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');
    setProcessingStats(null);

    try {
      // Here we'll call our API to summarize the video with options
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoUrl,
          strategy,
          highQualityMode: highQuality
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to summarize video');
      }

      const data = await response.json();
      setSummary(data.summary);
      setProcessingStats(data.processingStats);
    } catch (err) {
      setError('Error summarizing video. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 mt-8">YouTube Video Summarizer</h1>
      
      <form onSubmit={handleSubmit} className="w-full mb-8">
        <div className="flex flex-col mb-4">
          <label htmlFor="videoUrl" className="mb-2 font-medium">
            Enter YouTube Video URL:
          </label>
          <input
            type="text"
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="p-2 border rounded"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="strategy" className="block mb-2 font-medium">
              Chunking Strategy:
            </label>
            <select
              id="strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="intelligent">Intelligent (Best Overall)</option>
              <option value="uniform">Uniform (Even Distribution)</option>
              <option value="bookend">Bookend (Start & End Focus)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How to divide and process the video transcript
            </p>
          </div>
          
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              id="highQuality"
              checked={highQuality}
              onChange={(e) => setHighQuality(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="highQuality" className="font-medium">
              High Quality Mode
            </label>
            <p className="text-xs text-gray-500 ml-2">
              (Slower but more detailed)
            </p>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? 'Summarizing...' : 'Summarize Video'}
        </button>
        
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>

      {isLoading && (
        <div className="w-full p-4 border rounded mb-4 text-center">
          <p>Generating summary... This may take a few moments.</p>
          <p className="text-sm text-gray-500 mt-1">
            Longer videos may take several minutes to process.
          </p>
        </div>
      )}

      {summary && (
        <div className="w-full">
          <h2 className="text-xl font-bold mb-2">Summary</h2>
          <div className="p-4 border rounded whitespace-pre-wrap mb-4">{summary}</div>
          
          {processingStats && (
            <div className="text-sm text-gray-600 border-t pt-2">
              <p>Video ID: {processingStats.videoId}</p>
              <p>Transcript length: {processingStats.transcriptLength} characters</p>
              <p>Chunks processed: {processingStats.chunksProcessed}</p>
              <p>Processing time: {Math.floor(processingStats.processingTimeSeconds / 60)}m {Math.floor(processingStats.processingTimeSeconds % 60)}s</p>
              <p>Strategy used: {processingStats.strategy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
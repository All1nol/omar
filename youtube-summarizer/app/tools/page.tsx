'use client';

import React, { useState } from 'react';

export default function ToolsPage() {
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@hexdump1337');
  const [userId, setUserId] = useState('demo-user-123');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleForceSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/force-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to force summarize');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Admin Tools</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Force Summarize Latest Video</h2>
        
        <form onSubmit={handleForceSummarize} className="space-y-4">
          <div>
            <label htmlFor="channelUrl" className="block text-sm font-medium mb-1">
              Channel URL
            </label>
            <input
              type="text"
              id="channelUrl"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="https://www.youtube.com/@channelname"
            />
          </div>
          
          <div>
            <label htmlFor="userId" className="block text-sm font-medium mb-1">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="user-123"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? 'Processing...' : 'Force Summarize Latest Video'}
          </button>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
            <p>{result.message}</p>
            {result.video && (
              <div className="mt-2">
                <p><strong>Video ID:</strong> {result.video.videoId}</p>
                <p><strong>Title:</strong> {result.video.title}</p>
                <p><strong>Published:</strong> {new Date(result.video.publishedAt).toLocaleString()}</p>
                <p>The video should appear in your summaries page shortly.</p>
                <a 
                  href="/summaries" 
                  className="inline-block mt-2 text-blue-600 hover:underline"
                >
                  Go to Summaries Page
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>This tool forces the summarization of the latest video from a YouTube channel.</p>
        <p>Use it when you want to summarize a video regardless of when it was published.</p>
      </div>
    </div>
  );
} 
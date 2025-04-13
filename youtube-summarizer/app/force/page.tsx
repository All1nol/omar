'use client';

import { useState } from 'react';

export default function ForcePage() {
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@cosdensolutions/videos');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDate] = useState(new Date().toLocaleDateString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call our force-check API
      const response = await fetch('/api/force-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelUrl,
          userId: 'demo-user-123',
          ignoreTimeWindow: true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Force Summarize Latest Video</h1>
      <p className="mb-4 text-sm text-gray-600">
        Use this tool to force summarize the latest video from a channel, ignoring time window restrictions.
        Works regardless of system date (currently showing: {currentDate}).
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="channelUrl" className="block mb-1 font-medium">
            YouTube Channel URL
          </label>
          <input
            type="text"
            id="channelUrl"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="https://www.youtube.com/@channelname"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Example: https://www.youtube.com/@cosdensolutions/videos
          </p>
        </div>
        
        <button
          type="submit"
          className={`w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Force Summarize Latest Video'}
        </button>
      </form>
      
      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">
          <h2 className="font-bold mb-2">Success!</h2>
          <p><strong>Message:</strong> {result.message}</p>
          <p><strong>Video:</strong> {result.video.title}</p>
          <p><strong>Video ID:</strong> {result.video.videoId}</p>
          <p><strong>Published:</strong> {new Date(result.video.publishedAt).toLocaleString()}</p>
          <div className="mt-4">
            <a 
              href={`/summaries`} 
              className="text-blue-500 hover:underline"
            >
              Go to summaries page to see result (processing may take a few minutes)
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 
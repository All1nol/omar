'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Summary {
  _id: string;
  videoId: string;
  channelId: string;
  title: string;
  thumbnailUrl?: string;
  summary: string;
  createdAt: string;
  originalVideoUrl: string;
}

/**
 * Summary Detail Page
 * 
 * This page displays a specific video summary.
 */
export default function SummaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const summaryId = params.id as string;
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary on component mount
  useEffect(() => {
    fetchSummary();
  }, [summaryId]);

  /**
   * Fetches a specific summary
   */
  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For demo purposes, we'll use a fixed user ID
      // In a real app, this would come from authentication
      const userId = 'demo-user-123';
      
      const response = await fetch(`/api/summaries?userId=${userId}&summaryId=${summaryId}`);
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.message || 'Failed to fetch summary');
      }
    } catch (error) {
      setError('Error fetching summary');
      console.error('Error fetching summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate back to summaries list
   */
  const handleBackClick = () => {
    router.push('/summaries');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-gray-500">Loading summary...</div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error || 'Summary not found'}
        </div>
        <button
          onClick={handleBackClick}
          className="text-blue-600 hover:underline"
        >
          Back to summaries
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <button
        onClick={handleBackClick}
        className="text-blue-600 hover:underline mb-4 flex items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back to summaries
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {summary.thumbnailUrl && (
          <div className="w-full h-64 relative">
            <img
              src={summary.thumbnailUrl}
              alt={summary.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{summary.title}</h1>
          
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-500">
              {new Date(summary.createdAt).toLocaleString()}
            </div>
            
            <a
              href={summary.originalVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Watch on YouTube
            </a>
          </div>
          
          <div className="prose prose-lg max-w-none">
            {summary.summary.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
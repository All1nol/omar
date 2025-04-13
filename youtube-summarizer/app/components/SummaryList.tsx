'use client';

import { useState, useEffect } from 'react';
import { VideoSummary } from '../lib/summarization/videoSummarizationService';
import Link from 'next/link';

interface SummaryListProps {
  userId: string;
}

// Extended interface to include proper typing for MongoDB _id
interface SummaryWithId extends Omit<VideoSummary, '_id'> {
  _id: {
    toString(): string;
  };
  // Adding optional properties that might be in the data but aren't in the base type
  duration?: string;
  channelTitle?: string;
}

/**
 * Component for displaying a list of video summaries
 */
export default function SummaryList({ userId }: SummaryListProps) {
  const [summaries, setSummaries] = useState<SummaryWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'small'>('small'); // Default to small list view
  const limit = 10;

  // Fetch summaries on component mount and when page changes
  useEffect(() => {
    fetchSummaries();
  }, [userId, page]);

  /**
   * Fetches summaries for the current user
   */
  const fetchSummaries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/summaries?userId=${userId}&page=${page}&limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        setSummaries(data.summaries);
      } else {
        setError(data.message || 'Failed to fetch summaries');
      }
    } catch (error) {
      setError('Error fetching summaries');
      console.error('Error fetching summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle pagination
   */
  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    setPage(page + 1);
  };

  /**
   * Toggle between view modes
   */
  const cycleViewMode = () => {
    if (viewMode === 'grid') setViewMode('list');
    else if (viewMode === 'list') setViewMode('small');
    else setViewMode('grid');
  };

  // Format date to show relative time like YouTube
  const formatRelativeTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else if (days < 30) {
      return `${Math.floor(days / 7)} weeks ago`;
    } else if (days < 365) {
      return `${Math.floor(days / 30)} months ago`;
    } else {
      return `${Math.floor(days / 365)} years ago`;
    }
  };

  return (
    <div className="summary-list">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Your Video Summaries</h2>
        <button 
          onClick={cycleViewMode} 
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-sm flex items-center"
        >
          {viewMode === 'grid' ? (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List View
            </>
          ) : viewMode === 'list' ? (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
              </svg>
              Small View
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid View
            </>
          )}
        </button>
      </div>
      
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-gray-500">Loading summaries...</div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {!isLoading && summaries.length === 0 && (
        <div className="p-6 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No video summaries available yet.</p>
          <p className="mt-2 text-gray-400 text-sm">
            Summaries will appear here once videos from your subscribed channels are processed.
          </p>
        </div>
      )}
      
      {summaries.length > 0 && (
        <div>
          {viewMode === 'grid' ? (
            // Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaries.map((summary) => (
                <div
                  key={summary._id.toString()}
                  className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white flex flex-col"
                >
                  {/* Thumbnail - taking more vertical space */}
                  <Link href={`/summaries/${summary._id}`}>
                    <div className="relative pb-[56.25%] bg-black">
                      {summary.thumbnailUrl ? (
                        <img
                          src={summary.thumbnailUrl}
                          alt={summary.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Optional: Video duration overlay */}
                      {summary.duration && (
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 rounded">
                          {summary.duration}
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="p-3">
                    {/* Title */}
                    <Link href={`/summaries/${summary._id}`}>
                      <h3 className="text-sm font-medium line-clamp-2 mb-1 hover:text-blue-600">
                        {summary.title}
                      </h3>
                    </Link>
                    
                    {/* Channel info and metadata */}
                    <div className="flex items-start mt-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 mr-2 overflow-hidden">
                        {/* This would ideally be the channel icon */}
                        <svg className="w-full h-full text-gray-400 p-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-xs text-gray-700 truncate">
                          {summary.channelTitle || "YouTube Channel"}
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1">
                          {formatRelativeTime(summary.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex justify-between mt-3 pt-2">
                      <Link
                        href={`/summaries/${summary._id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Read summary
                      </Link>
                      
                      <a
                        href={summary.originalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Watch video
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            // List view
            <div className="border rounded-lg divide-y">
              {summaries.map((summary) => (
                <div
                  key={summary._id.toString()}
                  className="p-3 hover:bg-gray-50 flex gap-3"
                >
                  {/* Thumbnail */}
                  <Link href={`/summaries/${summary._id}`} className="flex-shrink-0">
                    <div className="relative w-32 h-20 bg-black">
                      {summary.thumbnailUrl ? (
                        <img
                          src={summary.thumbnailUrl}
                          alt={summary.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Optional: Video duration overlay */}
                      {summary.duration && (
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 rounded">
                          {summary.duration}
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <Link href={`/summaries/${summary._id}`}>
                      <h3 className="text-sm font-medium line-clamp-2 mb-1 hover:text-blue-600">
                        {summary.title}
                      </h3>
                    </Link>
                    
                    {/* Channel name and date */}
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <span className="truncate">{summary.channelTitle || "YouTube Channel"}</span>
                      <span className="mx-1">•</span>
                      <span className="whitespace-nowrap">{formatRelativeTime(summary.createdAt)}</span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-4 mt-2">
                      <Link
                        href={`/summaries/${summary._id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Read summary
                      </Link>
                      
                      <a
                        href={summary.originalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Watch video
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Small list view - more compact with less information
            <div className="border rounded-lg divide-y">
              {summaries.map((summary) => (
                <div
                  key={summary._id.toString()}
                  className="px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  {/* Small thumbnail */}
                  <Link href={`/summaries/${summary._id}`} className="flex-shrink-0">
                    <div className="relative w-16 h-9 bg-black">
                      {summary.thumbnailUrl ? (
                        <img
                          src={summary.thumbnailUrl}
                          alt={summary.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center">
                    {/* Title */}
                    <Link href={`/summaries/${summary._id}`} className="flex-1">
                      <h3 className="text-xs font-medium truncate hover:text-blue-600">
                        {summary.title}
                      </h3>
                    </Link>
                    
                    {/* Meta info and actions in a row for larger screens */}
                    <div className="flex items-center text-xxs text-gray-500 mt-1 md:mt-0 md:ml-2 space-x-2">
                      <span className="whitespace-nowrap">{formatRelativeTime(summary.createdAt)}</span>
                      <Link
                        href={`/summaries/${summary._id}`}
                        className="text-blue-600 hover:underline hidden md:inline-block"
                      >
                        Read
                      </Link>
                      <a
                        href={summary.originalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline hidden md:inline-block"
                      >
                        Watch
                      </a>
                    </div>
                  </div>
                  
                  {/* Action buttons for small screens */}
                  <div className="flex-shrink-0 md:hidden flex gap-2">
                    <Link
                      href={`/summaries/${summary._id}`}
                      className="text-blue-600 text-xxs"
                      aria-label="Read summary"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <a
                      href={summary.originalVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xxs"
                      aria-label="Watch video"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrevPage}
              disabled={page === 0}
              className={`px-4 py-2 rounded ${
                page === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Previous
            </button>
            
            <button
              onClick={handleNextPage}
              disabled={summaries.length < limit}
              className={`px-4 py-2 rounded ${
                summaries.length < limit
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
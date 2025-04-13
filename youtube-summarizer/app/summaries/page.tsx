'use client';

import { useState } from 'react';
import SummaryList from '../components/SummaryList';

/**
 * Summaries Page
 * 
 * This page displays a list of video summaries for the user.
 */
export default function SummariesPage() {
  // For demo purposes, we'll use a fixed user ID
  // In a real app, this would come from authentication
  const [userId] = useState('demo-user-123');

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Video Summaries</h1>
      <div className="bg-gray-50 p-4 rounded-lg">
        <SummaryList userId={userId} />
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import SubscriptionManager from '../components/SubscriptionManager';

/**
 * Subscriptions Page
 * 
 * This page allows users to manage their YouTube channel subscriptions.
 */
export default function SubscriptionsPage() {
  // For demo purposes, we'll use a fixed user ID
  // In a real app, this would come from authentication
  const [userId] = useState('demo-user-123');

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Manage Your Channel Subscriptions</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <SubscriptionManager userId={userId} />
      </div>
    </div>
  );
} 
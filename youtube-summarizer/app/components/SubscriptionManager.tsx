'use client';

import { useState, useEffect } from 'react';
import { ChannelSubscription } from '../lib/subscription/models';

interface SubscriptionManagerProps {
  userId: string;
}

// Extended interface to include proper typing for MongoDB _id
interface SubscriptionWithId extends Omit<ChannelSubscription, '_id'> {
  _id: {
    toString(): string;
  };
}

/**
 * Component for managing YouTube channel subscriptions
 */
export default function SubscriptionManager({ userId }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithId[]>([]);
  const [channelUrl, setChannelUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch subscriptions on component mount
  useEffect(() => {
    fetchSubscriptions();
  }, [userId]);

  /**
   * Fetches subscriptions for the current user
   */
  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/subscriptions?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setSubscriptions(data.subscriptions);
      } else {
        setError(data.message || 'Failed to fetch subscriptions');
      }
    } catch (error) {
      setError('Error fetching subscriptions');
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles form submission for adding a subscription
   */
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelUrl) {
      setError('Please enter a YouTube channel URL');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelUrl, userId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Successfully subscribed to channel');
        setChannelUrl('');
        fetchSubscriptions();
      } else {
        setError(data.message || 'Failed to subscribe to channel');
      }
    } catch (error) {
      setError('Error subscribing to channel');
      console.error('Error subscribing to channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles unsubscribing from a channel
   */
  const handleUnsubscribe = async (subscriptionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch(`/api/subscriptions?userId=${userId}&subscriptionId=${subscriptionId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Successfully unsubscribed from channel');
        fetchSubscriptions();
      } else {
        setError(data.message || 'Failed to unsubscribe from channel');
      }
    } catch (error) {
      setError('Error unsubscribing from channel');
      console.error('Error unsubscribing from channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="subscription-manager">
      <h2 className="text-2xl font-bold mb-4">Channel Subscriptions</h2>
      
      {/* Subscription Form */}
      <form onSubmit={handleSubscribe} className="mb-6 space-y-4">
        <div>
          <label htmlFor="channelUrl" className="block text-sm font-medium mb-1">
            YouTube Channel URL
          </label>
          <input
            type="text"
            id="channelUrl"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="https://www.youtube.com/channel/..."
            className="w-full p-2 border rounded"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          disabled={isLoading}
        >
          {isLoading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {/* Subscriptions List */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Your Subscriptions</h3>
        {isLoading && <p>Loading subscriptions...</p>}
        {!isLoading && subscriptions.length === 0 && (
          <p className="text-gray-500">You haven't subscribed to any channels yet.</p>
        )}
        <ul className="space-y-3">
          {subscriptions.map((subscription) => (
            <li
              key={subscription._id.toString()}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <p className="font-medium">
                  {subscription.channelTitle || subscription.channelId}
                </p>
                <p className="text-sm text-gray-500">{subscription.channelUrl}</p>
              </div>
              <button
                onClick={() => handleUnsubscribe(subscription._id.toString())}
                className="text-red-500 hover:text-red-700 transition"
                disabled={isLoading}
              >
                Unsubscribe
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 
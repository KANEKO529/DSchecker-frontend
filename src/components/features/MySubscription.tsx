'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getMySubscription } from '@/src/api/v1/subscription';

type Subscription = {
  stripePriceId: string;
  status: string;
  isActive: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endedAt?: string;
} | null;

const MySubscription = () => {
  const { getToken, isSignedIn } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        if (!isSignedIn) {
          setSubscription(null);
          throw new Error('token not found');
        }
        const token = await getToken({ skipCache: true })
        console.log('token:', token);
        console.log('parts:', token?.split('.').length);
        
        if (!token) {
          throw new Error('token not found');
        }
        
        const res = await getMySubscription(token);
        console.log('data:', res);
        setSubscription(res.data.subscription);
      } catch (err) {
        console.error('Failed to fetch subscription', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [getToken, isSignedIn]);

  if (loading) return <div>Loading...</div>;

  if (!subscription) {
    return <div>無料プラン</div>;
  }

  if (subscription.isActive) {
    return (
      <div className='text-gray-900'>
        <p>有料プラン</p>
        <p>ステータス: {subscription.status}</p>
        <p>有効期限: {subscription.currentPeriodEnd}</p>
        {subscription.cancelAtPeriodEnd && (
          <p>※解約予定（期間終了後に停止）</p>
        )}
      </div>
    );
  }

  return <div className='text-gray-900'>サブスク無効（支払い失敗など）</div>;
};

export default MySubscription;
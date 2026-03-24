// src/components/features/MySubscription.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AxiosError } from 'axios';
import { getMySubscription, cancelMySubscription, resumeMySubscription } from '@/src/api/v1/subscription';
import { createCheckoutSession } from '@/src/api/v1/billing';

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
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [processing, setProcessing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isLoaded) return;

      try {
        setError(null);

        if (!isSignedIn) {
          setSubscription(null);
          setLoading(false);
          return;
        }

        const token = await getToken({ skipCache: true });

        if (!token) {
          throw new Error('token not found');
        }

        const res = await getMySubscription(token);
        setSubscription(res.data.subscription);
      } catch (err) {
        console.error('Failed to fetch subscription', err);
        setError(err instanceof Error ? err.message : 'subscription fetch error');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [getToken, isSignedIn, isLoaded]);

  const handleSubscribe = async () => {
    try {
      setError(null);

      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('トークンを取得できませんでした');
      }

      const data = await createCheckoutSession(token);

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error('checkout_url が返ってきませんでした');
    } catch (err) {
      console.error('failed to create checkout session:', err);

      if (err instanceof AxiosError) {
        if (err.response?.status === 409) {
          setError('すでにサブスクリプション登録済みです');
          return;
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください');
          return;
        }

        setError('チェックアウトセッションの作成に失敗しました');
        return;
      }

      setError(err instanceof Error ? err.message : 'checkout session error');
    }
  };

  const handleCancelSubscribe = async () => {
    try {
      setError(null);
      setProcessing(true);

      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('トークンを取得できませんでした');
      }

      await cancelMySubscription(token);

      setSubscription((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cancelAtPeriodEnd: true,
        };
      });
    } catch (err) {
      console.error('failed to cancel subscription:', err);

      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          setError('サブスクリプションが見つかりません');
          return;
        }

        if (err.response?.status === 409) {
          setError('このサブスクリプションは解約できません');
          return;
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください');
          return;
        }

        setError('サブスクリプションの解約に失敗しました');
        return;
      }

      setError(err instanceof Error ? err.message : 'cancel subscription error');
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeSubscribe = async () => {
    try {
      setError(null);
      setProcessing(true);

      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('トークンを取得できませんでした');
      }

      await resumeMySubscription(token);

      setSubscription((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cancelAtPeriodEnd: false,
        };
      });
    } catch (err) {
      console.error('failed to resume subscription:', err);

      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          setError('サブスクリプションが見つかりません');
          return;
        }

        if (err.response?.status === 409) {
          setError('このサブスクリプションは解約取り消しできません');
          return;
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください');
          return;
        }

        setError('サブスクリプションの解約取り消しに失敗しました');
        return;
      }

      setError(err instanceof Error ? err.message : 'reseume subscription error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReSubscribe = async () => {
    await handleSubscribe();
  };

  const isCanceledSubscription =
  !!subscription &&
  !subscription.isActive &&
  (subscription.status === 'canceled' || !!subscription.endedAt || !!subscription.canceledAt);

  if (!isLoaded || loading) {
    return <div className="text-gray-900">Loading...</div>;
  }
  return (
    <div className="mt-6 text-gray-900">
      <h2 className="mb-2 text-lg font-semibold">サブスクリプション</h2>
  
      {error && <p className="mb-3 text-red-600">{error}</p>}
  
      {!subscription ? (
        <div>
          <p>無料プラン</p>
          <button
            onClick={handleSubscribe}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Proプランに登録する
          </button>
        </div>
      ) : subscription.isActive ? (
        <div>
          <p>有料プラン</p>
          <p>ステータス: {subscription.status}</p>
  
          {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
            <p>※{new Date(subscription.currentPeriodEnd).toLocaleDateString()}に解約予定</p>
          )}
  
          {subscription.cancelAtPeriodEnd ? (
            <button
              onClick={handleResumeSubscribe}
              disabled={processing}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {processing ? '処理中...' : '解約を取り消す'}
            </button>
          ) : (
            <button
              onClick={handleCancelSubscribe}
              disabled={processing}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {processing ? '解約中...' : 'Proプランを解約する'}
            </button>
          )}
        </div>
      ) : isCanceledSubscription ? (
        <div>
          <p>サブスクキャンセル済み</p>
          <button
            onClick={handleReSubscribe}
            disabled={processing}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {processing ? '処理中...' : 'Proプランに再契約する'}
          </button>
        </div>
      ) : (
        <div>
          <p>サブスク無効（支払い失敗・期限切れなど）</p>
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {processing ? '処理中...' : 'Proプランに登録する'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MySubscription;
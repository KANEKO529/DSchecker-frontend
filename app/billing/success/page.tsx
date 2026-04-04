'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getMySubscription } from '@/src/api/v1/subscription';

type PageStatus = 'loading' | 'active' | 'pending' | 'error';

export default function BillingSuccessPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [status, setStatus] = useState<PageStatus>('loading');

  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isLoaded) return;

    let isCancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let retryCount = 0;
    const maxRetries = 5;

    const fetchStatus = async () => {
      try {
        if (!isSignedIn) {
          if (!isCancelled) setStatus('error');
          if (intervalId) clearInterval(intervalId);
          return;
        }

        const token = await getToken({ skipCache: true });
        if (!token) {
          if (!isCancelled) setStatus('error');
          if (intervalId) clearInterval(intervalId);
          return;
        }

        const res = await getMySubscription(token);

        const subscription =
          res?.subscription ??
          res?.data?.subscription ??
          null;

        const elapsed = Date.now() - startTimeRef.current;
        const minTimePassed = elapsed >= 5000;

        // ⭐ active判定
        if (subscription?.isActive) {
          if (!isCancelled) {
            if (minTimePassed) {
              setStatus('active');
              if (intervalId) clearInterval(intervalId);
            } else {
              setStatus('pending');
            }
          }
          return;
        }

        retryCount += 1;

        if (!isCancelled) {
          // 最初はloading → 3秒後からpendingに
          setStatus(minTimePassed ? 'pending' : 'loading');
        }

        if (retryCount >= maxRetries && intervalId) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('failed to fetch subscription status:', error);
        if (!isCancelled) {
          setStatus('error');
        }
        if (intervalId) clearInterval(intervalId);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">確認中です</h1>
            <p className="mt-4 text-sm text-gray-600">
              お支払い状況を確認しています。少々お待ちください。
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              決済は完了しました
            </h1>
            <p className="mt-4 text-sm text-gray-600">
              契約情報の反映を確認しています。
            </p>
          </>
        )}

        {status === 'active' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              登録が完了しました
            </h1>
            <p className="mt-4 text-sm text-gray-600">
              DSChecker Pro のご利用を開始できます。
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              状態の確認に失敗しました
            </h1>
            <p className="mt-4 text-sm text-gray-600">
              マイページでご確認ください。
            </p>
          </>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/mypage"
            className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          >
            マイページに戻る
          </Link>

          {status !== 'active' && (
            <Link
              href="/"
              className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              ホームに戻る
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
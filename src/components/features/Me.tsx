'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { getMe } from '@/src/api/v1/me';
import AccountDeleter from './account/AccountDeleter';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MeResponse = {
  status: string;
  data?: {
    user: {
      userName: string | null;
      email: string | null;
    };
  };
  error?: string;
};

const Me = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [result, setResult] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        setError('ログインしてください');
        setLoading(false);
        return;
      }

      try {
        let lastError: unknown = null;

        for (let i = 0; i < 3; i++) {
          try {
            const token = await getToken({ skipCache: true });

            if (!token) {
              throw new Error('トークンを取得できませんでした');
            }

            const data = await getMe(token);
            setResult(data);

            if (data.status !== 'success') {
              throw new Error(data.error || 'ユーザー情報の取得に失敗しました');
            }

            setError(null);
            setLoading(false);
            return;
          } catch (err) {
            lastError = err;
            await sleep(800);
          }
        }

        throw lastError;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return <div className="text-gray-900">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="mt-6 rounded bg-gray-100 p-4 text-sm text-gray-900">
      {result?.data?.user && (
        <div className="mt-3 space-y-1">
          <p>
          {user
            ? `${user.lastName ?? ''}${user.firstName ?? ''}`
            : result.data.user.userName ?? 'なし'}
          </p>          
          <p>メール: {result.data.user.email ?? 'なし'}</p>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/mypage/subscription')}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          サブスクリプションを管理
        </button>

        <button
          type="button"
          onClick={() => router.push('/mypage/edit')}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          プロフィールを編集
        </button>
      </div>

      <div className="mt-8 border-t border-gray-300 pt-6">
        <AccountDeleter />
      </div>
    </div>
  );
};

export default Me;
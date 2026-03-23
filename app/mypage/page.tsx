'use client'

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { AxiosError } from 'axios'
import { getMe } from '@/src/api/v1/me'
import { createCheckoutSession } from '@/src/api/v1/billing'
import MySubscription from '@/src/components/features/MySubscription'

type MeResponse = {
  status: string
  data?: {
    user: {
      id: number
      clerkUserId: string
      role: string
      userName: string | null
      email: string | null
      status: string
      createdAt: string
      updatedAt: string
      deletedAt: string | null
    }
  }
  error?: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function MyPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMe = async () => {
      if (!isLoaded) return

      if (!isSignedIn) {
        setError('ログインしてください')
        setLoading(false)
        return
      }

      try {
        let lastError: unknown = null

        for (let i = 0; i < 3; i++) {
          try {
            const token = await getToken({ skipCache: true })

            if (!token) {
              throw new Error('トークンを取得できませんでした')
            }

            const data = await getMe(token)
            setResult(data)

            if (data.status !== 'success') {
              throw new Error(data.error || 'ユーザー情報の取得に失敗しました')
            }

            setError(null)
            setLoading(false)
            return
          } catch (err) {
            lastError = err
            await sleep(800)
          }
        }

        throw lastError
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMe()
  }, [isLoaded, isSignedIn, getToken])

  const handleSubscribe = async () => {
    try {
      setError(null)

      const token = await getToken({ skipCache: true })
      if (!token) {
        throw new Error('トークンを取得できませんでした')
      }

      const data = await createCheckoutSession(token)

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      throw new Error('checkout_url が返ってきませんでした')
    } catch (err) {
      console.error('failed to create checkout session:', err)

      if (err instanceof AxiosError) {
        if (err.response?.status === 409) {
          setError('すでにサブスクリプション登録済みです')
          return
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください')
          return
        }

        setError('チェックアウトセッションの作成に失敗しました')
        return
      }

      setError(err instanceof Error ? err.message : 'checkout session error')
    }
  }

  if (loading) {
    return <main className="p-6 text-white">読み込み中...</main>
  }

  if (error) {
    return (
      <main className="p-6 text-white">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">マイページ</h1>
        <p className="text-red-400">エラー: {error}</p>

        <div className="mt-6 rounded bg-gray-900 p-4 text-sm">
          <p>Clerk User ID: {user?.id ?? 'なし'}</p>
          <pre className="mt-3 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">マイページ</h1>

      <div className="rounded bg-gray-900 p-4 space-y-2">
        <p>Clerk User ID: {user?.id ?? 'なし'}</p>
        <p>Go側 clerk_user_id: {result?.data?.user?.clerkUserId ?? 'なし'}</p>
      </div>

      <pre className="mt-6 rounded bg-gray-900 p-4 text-sm whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>

      <button
        onClick={handleSubscribe}
        className="mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Proプランに登録する
      </button>

      <MySubscription />
    </main>
  )
}
// app/mypage/subscription/page.tsx
'use client'

import MySubscription from '@/src/components/features/MySubscription';
import { useUser } from '@clerk/nextjs';

export default function ProfileEdit() {

  return (
    <main className="p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">サブスクリプション　ページ</h1>
      <MySubscription />
    </main>
  )
}
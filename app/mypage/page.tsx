// app/mypage/page.tsx
'use client'

import MySubscription from '@/src/components/features/MySubscription'
import Me from '@/src/components/features/Me'

export default function MyPage() {

  return (
    <main className="p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">マイページ</h1>
      <Me />
      <MySubscription />
    </main>
  )
}
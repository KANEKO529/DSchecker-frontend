// app/mypage//edit/page.tsx
'use client'

import ProfileEditor from '@/src/components/features/ProfileEditor';
import { useUser } from '@clerk/nextjs';

export default function ProfileEdit() {

  const { user } = useUser();

  return (
    <main className="p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold text-gray-800">プロフィール 変更ページ</h1>
      <div className="mt-4">
        <ProfileEditor
            initialFirstName={user?.firstName ?? ''}
            initialLastName={user?.lastName ?? ''}
        />
      </div>
    </main>
  )
}
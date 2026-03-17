// app/auth/sign-in/page.tsx
'use client'

import { SignIn } from '@clerk/nextjs'
import { ClerkLoading, ClerkLoaded } from '@clerk/nextjs'
import HeaderForAuth from '@/src/components/layouts/HeaderForAuth'


export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <HeaderForAuth />
      <div className="text-2xl font-bold text-gray-800 mb-8">
        DSchecker ログイン
      </div>
      
      <ClerkLoading>
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-600">認証システムを読み込み中...</p>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors',
              card: 'shadow-none bg-transparent',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            }
          }}
        />
      </ClerkLoaded>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { updateMyProfile } from '@/src/api/v1/me'
import { useRouter } from 'next/navigation';


type Props = {
  initialFirstName: string
  initialLastName: string
}

export default function ProfileEditor({ initialFirstName, initialLastName}: Props) {
  const { getToken } = useAuth()

  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)

  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter();


  useEffect(() => {
    setFirstName(initialFirstName)
    setLastName(initialLastName)
  }, [initialFirstName, initialLastName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')
  
    try {
      const token = await getToken({ skipCache: true })
      if (!token) {
        setErrorMessage('認証情報を取得できませんでした')
        return
      }

      console.log('submit payload', { firstName, lastName })
  
      await updateMyProfile(token, {
        firstName,
        lastName,
      })
  
      setSuccessMessage('プロフィールを更新しました')
    } catch (error) {
      console.error(error)
      setErrorMessage('プロフィールの更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4 bg-white text-gray-900">
      <div>
        <label className="mb-1 block text-sm font-medium">姓</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">名</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存する'}
      </button>

      <button
          type="button"
          onClick={() => router.push('/mypage/')}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          マイページへ戻る
        </button>


      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </form>
  )
}
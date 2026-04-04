'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { updateMyProfile } from '@/src/api/v1/me'

type Props = {
  initialUsername: string
  onUpdated?: (newUsername: string) => void
}

export default function ProfileEditor({ initialUsername, onUpdated }: Props) {
  const { getToken } = useAuth()

  const [username, setUsername] = useState(initialUsername)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setUsername(initialUsername)
  }, [initialUsername])

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

      await updateMyProfile(token, username)

      setSuccessMessage('プロフィールを更新しました')
      onUpdated?.(username)
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
        <label className="mb-1 block text-sm font-medium">ユーザー名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded border px-3 py-2"
          minLength={3}
          maxLength={50}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存する'}
      </button>

      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </form>
  )
}
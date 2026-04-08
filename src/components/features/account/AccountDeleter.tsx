'use client'

import { useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { deleteMyAccount } from '@/src/api/v1/me'

export default function AccountDeleter() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const ok = window.confirm('本当にアカウントを削除しますか？')
    if (!ok) return

    try {
      setLoading(true)
      const token = await getToken()
      if (!token) return

      await deleteMyAccount(token)
      await signOut({ redirectUrl: '/' })
    } catch (e) {
      alert('削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded bg-red-600 px-4 py-2 text-white"
    >
      {loading ? '削除中...' : 'アカウント削除'}
    </button>
  )
}
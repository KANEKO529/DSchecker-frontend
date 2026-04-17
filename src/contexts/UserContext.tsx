// src/contexts/UserContext.tsx

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from '@clerk/nextjs'
import { getMySubscription } from '@/src/api/v1/subscription'

type PlanStatus = 'guest' | 'free' | 'pro'

type UserContextType = {
  planStatus: PlanStatus
  isProUser: boolean
  loading: boolean
  refreshMe: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const [planStatus, setPlanStatus] = useState<PlanStatus>('guest')
  const [loading, setLoading] = useState(true)

  const fetchMe = async () => {
    if (!isLoaded) return
  
    if (!isSignedIn) {
      setPlanStatus('guest')
      setLoading(false)
      return
    }
  
    try {
      setLoading(true)
  
      const token = await getToken({ skipCache: true })
      const sub = await getMySubscription(token)
  
      let nextPlanStatus: 'free' | 'pro' = 'free'
  
      if (sub?.data?.subscription?.isActive) {
        nextPlanStatus = 'pro'
      } else {
        nextPlanStatus = 'free'
      }
  
      console.log('sub:', sub)
  
      setPlanStatus(nextPlanStatus)
    } catch (error) {
      console.error('subscription取得に失敗しました', error)
      setPlanStatus('free')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchMe()
  }, [isLoaded, isSignedIn])

  const value = useMemo(
    () => ({
      planStatus,
      isProUser: planStatus === 'pro',
      loading,
      refreshMe: fetchMe,
    }),
    [planStatus, loading]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserContext() {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUserContext must be used within UserProvider')
  }

  return context
}
// src/components/layouts/SidebarContext.tsx

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  menuOpen: boolean
  filterOpen: boolean
  toggleMenu: () => void
  toggleFilter: () => void
  closeAll: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const toggleMenu = () => {
    setMenuOpen(prev => {
      const next = !prev
      if (next) setFilterOpen(false) // メニュー優先
      return next
    })
  }

  const toggleFilter = () => {
    setFilterOpen(prev => {
      const next = !prev
      if (next) setMenuOpen(false)
      return next
    })
  }

  const closeAll = () => {
    setMenuOpen(false)
    setFilterOpen(false)
  }

  // スクロールロック（どちらか開いてたら body固定）
  useEffect(() => {
    document.body.style.overflow = menuOpen || filterOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen, filterOpen])

  return (
    <SidebarContext.Provider
      value={{ menuOpen, filterOpen, toggleMenu, toggleFilter, closeAll }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}

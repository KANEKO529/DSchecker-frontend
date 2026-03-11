// src/components/layouts/header/Header.tsx
'use client'

import { Menu } from 'lucide-react'

import { useSidebar } from './SidebarContext'

const Header = () => {
  const { toggleMenu } = useSidebar()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b shadow-md bg-[#f9fafb]">
      <div className="lg:hidden flex items-center justify-between h-[64px] px-4">

        {/* メニューボタン */}
        <button
          onClick={toggleMenu}
          className="p-2 rounded-md hover:bg-yellow-400 transition-colors"
          aria-label="メニューを開く"
        >
          <Menu className="h-6 w-6 text-gray-900" />
        </button>

        {/* タイトル */}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          DSchecker
        </h1>

        {/* 右側スペース（バランス用） */}
        <div className="w-10" />

      </div>
    </header>
  )
}

export default Header
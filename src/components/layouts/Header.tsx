// src/components/layouts/header/Header.tsx
'use client'

import Link from 'next/link'
import { X, TrendingUp, Search, Menu } from 'lucide-react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import { useSidebar } from './SidebarContext'

const Header = () => {
  const { toggleMenu } = useSidebar()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 shadow-md border-b bg-[rgb(253,205,0)]">
      {/* モバイル用レイアウト */}
      <div className="lg:hidden h-[64px]">
        <div className="h-4 flex items-center justify-center">
          <span className="text-[8px] text-gray-800 font-medium">
            高騰商品データベース
          </span>
        </div>
        
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMenu}
              className="text-white hover:bg-gray-800 p-2 rounded-md transition-colors duration-200"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5 text-gray-900" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
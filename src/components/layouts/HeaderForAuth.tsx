// src/components/layouts/header/Header.tsx
'use client'

import { Menu } from 'lucide-react'

const HeaderForAuth = () => {

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b shadow-md bg-[#f9fafb]">
      <div className="lg:hidden flex items-center justify-between h-[64px] px-4">

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

export default HeaderForAuth
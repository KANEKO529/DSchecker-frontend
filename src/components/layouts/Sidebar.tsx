// src/components/layouts/sidebar/Sidebar.tsx
'use client'

import { useSidebar } from './SidebarContext'
import Link from 'next/link'
import Image from 'next/image'
import {
  Home,
  Menu,
} from 'lucide-react'

const SideBar = () => {
  const { menuOpen, toggleMenu, closeAll } = useSidebar()

  const menuItems = [
    { icon: Home, label: 'ホーム', href: '/' },
  ]

  return (
    <>
      {/* オーバーレイ（背景透過） */}
      <div
        className={`
          fixed inset-0 z-40 bg-black transition-opacity duration-300
          ${menuOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={closeAll}
      />

      {/* サイドバー本体 */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 md:w-80 bg-white shadow-xl z-50
          flex flex-col 
          transform transition-transform duration-300 ease-in-out
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* サイドバー上部：メニュー */}
        <div>
          {/* ヘッダー部分 */}
          <div className="flex items-center justify-between p-4 border-b bg-[#f9fafb] h-16">
            <div className="flex items-center gap-2">
              <button onClick={closeAll} className="p-1">
                <Menu className="h-5 w-5 text-gray-900" />
              </button>
              <span className="font-bold text-gray-900">DSchecker</span>
            </div>
          </div>

          {/* メニューリスト */}
          <nav className="p-4">
            <ul className="space-y-3">
              {menuItems.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 768) closeAll()
                    }}
                    className="flex items-center gap-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 group"
                  >
                    <item.icon className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
                    <span className="font-medium text-xs md:text-base">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* サイドバー下部：SNS & コピーライト */}
        <div className="border-t mt-2 py-4 px-4 flex flex-col items-center gap-2 text-center">

          このサイトの作り方
          <p className="text-sm font-medium text-gray-600">SNSアカウント</p>

          {/* SNSアイコン */}
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://x.com/used_koto"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black rounded-full hover:opacity-80 transition-opacity duration-200"
            >
              <Image
                src="/X.png"
                alt="Xのロゴ"
                width={20}
                height={20}
                className="object-contain"
                unoptimized
              />
            </a>
          </div>

          {/* サイト名 */}
          <span className="text-xs text-gray-500 mt-1">DSchecker</span>
        </div>
      </aside>
    </>
  )
}

export default SideBar

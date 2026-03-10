// src/components/layouts/clientwrapper.tsx
'use client'

import { SidebarProvider } from './SidebarContext'
import Header from './Header'
import SideBar from './Sidebar'

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="relative min-h-screen bg-gray-50 overflow-x-hidden">
        <Header />                     {/* ✅ Providerの中にHeaderを配置 */}
        <SideBar />  {/* Sidebarも同スコープ */}
        <main className="pt-[64px] md:pt-[64px]">{children}</main>
      </div>
    </SidebarProvider>
  )
}

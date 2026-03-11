'use client'

import packageJson from '@/package.json'

const Footer = () => {
  const version = packageJson.version

  return (
    <>
      <footer className="lg:hidden h-25 border-t border-[#111827] bg-white mt-auto bg-[#f9fafb]">
        {/* コピーライト */}
        <div className="mt-10 mb-10 sm:mt-5 text-center text-[10px] text-gray-500 dark:text-gray-400">
          © 2026 DSソフト相場価格チェッカー All Rights Reserved.
          <span className="ml-1 text-gray-400">v{version}</span>
        </div>
      </footer>
    </>
  )
}

export default Footer
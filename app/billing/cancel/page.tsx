'use client';

import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          お支払い手続きはキャンセルされました
        </h1>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          サブスクリプションの登録は完了していません。
          必要な場合は、マイページからいつでも再度お申し込みいただけます。
        </p>

        <div className="mt-8">
          <Link
            href="/mypage"
            className="inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            マイページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
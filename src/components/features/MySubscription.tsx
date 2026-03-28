// src/components/features/MySubscription.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AxiosError } from 'axios';
import { getMySubscription, cancelMySubscription, resumeMySubscription } from '@/src/api/v1/subscription';
import { createCheckoutSession, getMyPaymentMethods, getMyInvoices, createCustomerPortalSession } from '@/src/api/v1/billing';

type Subscription = {
  stripePriceId: string;
  status: string;
  isActive: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endedAt?: string;
} | null;

type PaymentMethodItem = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  billingDetails: {
    name: string
    email: string
    phone: string
    address: {
      country: string
      postalCode: string
      state: string
      city: string
      line1: string
      line2: string
    }
  }
}

export type InvoiceListItem = {
  invoiceId: string;
  invoiceNumber: string;
  billedAt: string;
  amountPaid: number;
  currency: string;
  status: string;
  statusLabel: string;
  subscriptionName: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
};

const MySubscription = () => {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  const [subscription, setSubscription] = useState<Subscription>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);

  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isLoaded) return;

      try {
        setError(null);

        if (!isSignedIn) {
          setSubscription(null);
          setLoading(false);
          return;
        }

        const token = await getToken({ skipCache: true });

        if (!token) {
          throw new Error('token not found');
        }

        const res = await getMySubscription(token);
        setSubscription(res.data.subscription);
      } catch (err) {
        console.error('Failed to fetch subscription', err);
        setError(err instanceof Error ? err.message : 'subscription fetch error');
      } finally {
        setLoading(false);
      }
    };

    const fetchPaymentMethods = async () => {
      if (!isLoaded) return;
    
      try {
        if (!isSignedIn) {
          setPaymentMethods([]);
          return;
        }
    
        const token = await getToken({ skipCache: true });
        if (!token) {
          throw new Error('token not found');
        }
    
        const res = await getMyPaymentMethods(token);
        console.log("res:", res)

        const pms = res.data.paymentMethods || [];

        console.log("pms:", pms)
    
        if (!pms) {
          setPaymentMethods([]);
          return;
        }

        setPaymentMethods(pms);
      } catch (err) {
        console.error('Failed to fetch payment method', err);
      }
    };

    const fetchInvoices = async () => {
      try {
        if (!isSignedIn) {
          setInvoices([]);
          return;
        }

        const token = await getToken({ skipCache: true });
        if (!token) throw new Error('token not found');

        const data = await getMyInvoices(token);
        console.log("invoices data:", invoices)
        setInvoices(data.invoices ?? []);
      } catch (e) {
        setError('請求履歴の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
    fetchPaymentMethods();
    fetchInvoices();
  }, [getToken, isSignedIn, isLoaded]);

  const handleSubscribe = async () => {
    try {
      setError(null);

      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('トークンを取得できませんでした');
      }

      const data = await createCheckoutSession(token);

      console.log("data:", data)
      const checkoutUrl = data?.data.checkoutUrl;

      console.log("checkoutUrl:", checkoutUrl)

      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      
      throw new Error('checkout_url が返ってきませんでした');
    } catch (err) {
      console.error('failed to create checkout session:', err);

      if (err instanceof AxiosError) {
        if (err.response?.status === 409) {
          setError('すでにサブスクリプション登録済みです');
          return;
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください');
          return;
        }

        setError('チェックアウトセッションの作成に失敗しました');
        return;
      }

      setError(err instanceof Error ? err.message : 'checkout session error');
    }
  };

  const handleCancelSubscribe = async () => {
    try {
      setError(null);
      setProcessing(true);

      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('トークンを取得できませんでした');
      }

      await cancelMySubscription(token);

      setSubscription((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cancelAtPeriodEnd: true,
        };
      });
    } catch (err) {
      console.error('failed to cancel subscription:', err);

      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          setError('サブスクリプションが見つかりません');
          return;
        }

        if (err.response?.status === 409) {
          setError('このサブスクリプションは解約できません');
          return;
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください');
          return;
        }

        setError('サブスクリプションの解約に失敗しました');
        return;
      }

      setError(err instanceof Error ? err.message : 'cancel subscription error');
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeSubscribe = async () => {
    try {
      setError(null);
      setProcessing(true);

      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('トークンを取得できませんでした');
      }

      await resumeMySubscription(token);

      setSubscription((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cancelAtPeriodEnd: false,
        };
      });
    } catch (err) {
      console.error('failed to resume subscription:', err);

      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          setError('サブスクリプションが見つかりません');
          return;
        }

        if (err.response?.status === 409) {
          setError('このサブスクリプションは解約取り消しできません');
          return;
        }

        if (err.response?.status === 401) {
          setError('ログイン状態を確認してください');
          return;
        }

        setError('サブスクリプションの解約取り消しに失敗しました');
        return;
      }

      setError(err instanceof Error ? err.message : 'reseume subscription error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReSubscribe = async () => {
    await handleSubscribe();
  };

  const handleOpenCustomerPortal = async () => {
    try {
      const token = await getToken({ skipCache: true })
      if (!token) throw new Error('token not found')
  
      const data = await createCustomerPortalSession(token)
      console.log("url:", data)
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      alert('カスタマーポータルを開けませんでした')
    }
  }

  const isCanceledSubscription =
  !!subscription &&
  !subscription.isActive &&
  (subscription.status === 'canceled' || !!subscription.endedAt || !!subscription.canceledAt);



  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '有効';
      case 'trialing':
        return 'トライアル中';
      case 'canceled':
        return '解約済み';
      case 'past_due':
        return '支払い未完了';
      case 'unpaid':
        return '未払い';
      default:
        return status;
    }
  };

  const currentPaymentMethod = paymentMethods.find(pm => pm.isDefault) ?? null;

  const formatPrice = (amount: number, currency: string) => {
    if (currency.toLowerCase() === 'jpy') {
      return `¥${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
  };

  const formatPostalCode = (code?: string) => {
    if (!code) return null;
    return code.includes('-')
      ? code
      : `${code.slice(0, 3)}-${code.slice(3)}`;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ja-JP");
  };


  if (!isLoaded || loading) {
    return <div className="text-gray-900">Loading...</div>;
  }

  return (
    <div className="mt-6 text-gray-900">
      <h2 className="mb-2 text-lg font-semibold">サブスクリプション</h2>
  
      {error && <p className="mb-3 text-red-600">{error}</p>}
  
      {!subscription ? (
        <div>
          <p>無料プラン</p>
          <button
            onClick={handleSubscribe}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Proプランに登録する
          </button>
        </div>
      ) : subscription.isActive ? (
        <div>
          {subscription.cancelAtPeriodEnd ? (
            <div>
              <p>Proプラン利用中</p>
              <p>ステータス: 解約予定</p>
              <p>解約申請日: {formatDate(subscription.canceledAt)}</p>
              <p>解約予定日: {formatDate(subscription.currentPeriodEnd)}</p>
              <button
                onClick={handleResumeSubscribe}
                disabled={processing}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {processing ? '処理中...' : '解約を取り消す'}
              </button>
            </div>
          ) : (
            <div>
              <p>Proプラン利用中</p>
              <p>ステータス: {getStatusLabel(subscription.status)}</p>

              {/* 現在の支払い方法 */}
              {currentPaymentMethod ? (
                <div className="mt-4">
                  <p className="font-semibold">支払い方法</p>
                  <p>
                    {currentPaymentMethod.brand.toUpperCase()} **** {currentPaymentMethod.last4}
                  </p>
                  <p>
                    有効期限: {currentPaymentMethod.expMonth}/{currentPaymentMethod.expYear}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <p>支払い方法は未登録です</p>
                </div>
              )}

              {/* 請求情報 */}
              {currentPaymentMethod && (
                <div className="mt-4">
                  <p className="font-semibold">請求情報</p>
                  <p>
                    名前: {currentPaymentMethod.billingDetails?.name ?? '未設定'}
                  </p>

                  {/* 郵便番号 */}
                  <p>
                    {currentPaymentMethod.billingDetails?.address?.postalCode
                      ? `〒${formatPostalCode(currentPaymentMethod.billingDetails.address.postalCode)}`
                      : '未設定'}
                  </p>

                  {/* 住所 */}
                  <p>
                    {[
                      currentPaymentMethod.billingDetails?.address?.state,
                      currentPaymentMethod.billingDetails?.address?.city,
                      currentPaymentMethod.billingDetails?.address?.line1,
                      currentPaymentMethod.billingDetails?.address?.line2,
                    ]
                      .filter(Boolean)
                      .join(' ') || '未設定'}
                  </p>
                </div>
              )}

              {/* 支払い方法一覧 */}
              {paymentMethods.length > 0 ? (
                <div className="mt-4">
                  <p className="font-semibold mb-2">決済手段一覧</p>

                  {paymentMethods.map((pm) => (
                    <div key={pm.id} className="mb-2 rounded border p-2">
                      <p>
                        {pm.brand.toUpperCase()} **** {pm.last4}
                        {pm.isDefault && (
                          <span className="ml-2 text-blue-500">(デフォルト)</span>
                        )}
                      </p>
                      <p>
                        有効期限: {pm.expMonth}/{pm.expYear}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <p>支払い方法は未登録です</p>
                </div>
              )}

              <p>次回請求日: {formatDate(subscription.currentPeriodEnd)}</p>

              <button
                onClick={handleOpenCustomerPortal}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                支払い方法・請求情報を変更
              </button>

              <button
                onClick={handleCancelSubscribe}
                disabled={processing}
                className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {processing ? '解約中...' : 'Proプランを解約する'}
              </button>
            </div>
          )}
        </div>
      ) : isCanceledSubscription ? (
        <div>
          <p>サブスクキャンセル済み</p>
          <p>契約終了日: {formatDate(subscription.endedAt)}</p>
          <button
            onClick={handleReSubscribe}
            disabled={processing}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {processing ? '処理中...' : 'Proプランに再契約する'}
          </button>
        </div>
      ) : (
        <div>
          <p>サブスク無効（支払い失敗・期限切れなど）</p>
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {processing ? '処理中...' : 'Proプランに登録する'}
          </button>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">請求履歴</h2>

        {invoices.length === 0 ? (
          <p className="text-sm text-gray-600">請求履歴はありません</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-4 py-3">日付</th>
                  <th className="px-4 py-3">金額</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">プラン名</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.invoiceId} className="border-t">
                    <td className="px-4 py-3 text-gray-900">
                      {formatDate(invoice.billedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatPrice(invoice.amountPaid, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {invoice.statusLabel}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {invoice.subscriptionName}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          詳細を見る
                        </a>
                      ) : (
                        <span className="text-gray-400">詳細なし</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubscription;
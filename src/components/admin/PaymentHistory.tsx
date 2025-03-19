// src/components/admin/PaymentHistory.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import RefundModal from './RefundModal';

// 決済履歴の型定義
type PaymentRecord = {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  type: 'promotion' | 'premium';
  // 関連データ
  user?: {
    display_name: string;
    email: string;
  };
  promotion_slot?: {
    name: string;
  };
  refunded?: boolean;
  refund_reason?: string;
  refund_date?: string;
};

// フィルターの型定義
type FilterState = {
  dateFrom: string;
  dateTo: string;
  status: string;
  type: string;
  searchTerm: string;
  minAmount: string;
  maxAmount: string;
};

const PaymentHistory: React.FC = () => {
  // State管理
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalPremium, setTotalPremium] = useState<number>(0);
  const [totalPromotion, setTotalPromotion] = useState<number>(0);

  // 返金モーダル関連の状態
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // ページネーション管理
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // フィルター管理
  const [filter, setFilter] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: '',
    type: '',
    searchTerm: '',
    minAmount: '',
    maxAmount: ''
  });

  // フィルター適用中のフラグ
  const [isFilterActive, setIsFilterActive] = useState<boolean>(false);

  // 決済データの取得
  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // プレミアム決済を取得
      let premiumPaymentsPromise = supabase
        .from('premium_payments')
        .select(`
          id, 
          user_id,
          amount,
          payment_method,
          status,
          created_at,
          plan,
          expires_at,
          subscription_id
        `)
        .order('created_at', { ascending: false });

      // スロット予約を取得
      let slotBookingsPromise = supabase
        .from('slot_bookings')
        .select(`
          id, 
          user_id,
          slot_id,
          status,
          amount_paid,
          created_at,
          refunded,
          refund_reason,
          refund_date
        `)
        .order('created_at', { ascending: false });

      // フィルターの適用
      if (filter.dateFrom) {
        premiumPaymentsPromise = premiumPaymentsPromise.gte('created_at', `${filter.dateFrom}T00:00:00`);
        slotBookingsPromise = slotBookingsPromise.gte('created_at', `${filter.dateFrom}T00:00:00`);
      }

      if (filter.dateTo) {
        premiumPaymentsPromise = premiumPaymentsPromise.lte('created_at', `${filter.dateTo}T23:59:59`);
        slotBookingsPromise = slotBookingsPromise.lte('created_at', `${filter.dateTo}T23:59:59`);
      }

      if (filter.status) {
        premiumPaymentsPromise = premiumPaymentsPromise.eq('status', filter.status);
        slotBookingsPromise = slotBookingsPromise.eq('status', filter.status);
      }

      if (filter.minAmount) {
        const minAmount = parseFloat(filter.minAmount);
        if (!isNaN(minAmount)) {
          premiumPaymentsPromise = premiumPaymentsPromise.gte('amount', minAmount);
          slotBookingsPromise = slotBookingsPromise.gte('amount_paid', minAmount);
        }
      }

      if (filter.maxAmount) {
        const maxAmount = parseFloat(filter.maxAmount);
        if (!isNaN(maxAmount)) {
          premiumPaymentsPromise = premiumPaymentsPromise.lte('amount', maxAmount);
          slotBookingsPromise = slotBookingsPromise.lte('amount_paid', maxAmount);
        }
      }

      // 並行してデータを取得
      const [premiumResult, slotResult] = await Promise.all([
        premiumPaymentsPromise,
        slotBookingsPromise
      ]);

      if (premiumResult.error) throw premiumResult.error;
      if (slotResult.error) throw slotResult.error;

      // ユーザーIDを収集
      const userIds = [
        ...(premiumResult.data || []).map(p => p.user_id),
        ...(slotResult.data || []).map(s => s.user_id)
      ].filter((id, index, self) => self.indexOf(id) === index); // 重複を除去

      // ユーザー情報を取得
      let profilesData: any[] = [];

      if (userIds.length > 0) {
        const profileResult = await supabase
          .from('profiles')
          .select('id, username')  // emailはないのでusernameだけを取得
          .in('id', userIds);

        if (profileResult.error) throw profileResult.error;
        profilesData = profileResult.data || [];
      } else {
        profilesData = [];
      }

      // スロットIDを収集
      const slotIds = (slotResult.data || [])
        .map(s => s.slot_id)
        .filter((id, index, self) => self.indexOf(id) === index);  // 重複を除去

      // プロモーションスロット情報を取得
      let promotionSlotsData: any[] = [];

      if (slotIds.length > 0) {
        const slotResult = await supabase
          .from('promotion_slots')
          .select('id, name')
          .in('id', slotIds);

        if (slotResult.error) throw slotResult.error;
        promotionSlotsData = slotResult.data || [];
      } else {
        promotionSlotsData = [];
      }

      // スロットマップを作成
      const slotsMap = promotionSlotsData.reduce((map, slot) => {
        map[slot.id] = slot;
        return map;
      }, {} as Record<string, any>);

      // プロフィールマップを作成
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);

      // 支払いデータを加工
      const premiumPayments: PaymentRecord[] = (premiumResult.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        amount: item.amount,
        payment_method: item.payment_method || '',
        status: item.status,
        created_at: item.created_at,
        type: 'premium',
        user: profilesMap[item.user_id] ? {
          display_name: profilesMap[item.user_id].username || '名前なし',
          email: ''  // emailカラムがないので空文字を設定
        } : undefined,
        // 返金関連フィールドはデフォルト値を設定
        refunded: false,
        refund_reason: undefined,
        refund_date: undefined
      }));

      const promotionPayments: PaymentRecord[] = (slotResult.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        amount: item.amount_paid || 0,
        payment_method: '',
        status: item.refunded ? 'refunded' : (item.status || 'unknown'),
        created_at: item.created_at,
        type: 'promotion',
        user: profilesMap[item.user_id] ? {
          display_name: profilesMap[item.user_id].username || '名前なし',
          email: ''  // emailカラムがないので空文字を設定
        } : undefined,
        promotion_slot: item.slot_id && slotsMap[item.slot_id] ? {
          name: slotsMap[item.slot_id].name || '名称不明'
        } : undefined,
        refunded: item.refunded || false,
        refund_reason: item.refund_reason,
        refund_date: item.refund_date
      }));

      // 全決済データをマージ
      let allPayments = [...premiumPayments, ...promotionPayments];

      // 検索語でフィルタリング
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        allPayments = allPayments.filter(payment =>
          payment.user?.display_name?.toLowerCase().includes(searchLower) ||
          payment.user?.email?.toLowerCase().includes(searchLower) ||
          payment.promotion_slot?.name?.toLowerCase().includes(searchLower) ||
          payment.id.toLowerCase().includes(searchLower)
        );
      }

      // タイプでフィルタリング
      if (filter.type) {
        allPayments = allPayments.filter(payment => payment.type === filter.type);
      }

      // 日付順にソート
      allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // 合計金額の計算
      const total = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const premiumTotal = allPayments
        .filter(p => p.type === 'premium')
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const promotionTotal = allPayments
        .filter(p => p.type === 'promotion')
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);

      // ページネーション
      setTotalItems(allPayments.length);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedPayments = allPayments.slice(startIndex, startIndex + itemsPerPage);

      // Stateの更新
      setPayments(paginatedPayments);
      setTotalAmount(total);
      setTotalPremium(premiumTotal);
      setTotalPromotion(promotionTotal);

      // フィルターのアクティブ状態を確認
      setIsFilterActive(
        !!filter.dateFrom ||
        !!filter.dateTo ||
        !!filter.status ||
        !!filter.type ||
        !!filter.searchTerm ||
        !!filter.minAmount ||
        !!filter.maxAmount
      );

    } catch (err: any) {
      console.error('決済履歴の取得エラー:', err);
      setError(`決済履歴の取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // フィルター変更ハンドラ
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  // フィルターリセットハンドラ
  const handleResetFilter = () => {
    setFilter({
      dateFrom: '',
      dateTo: '',
      status: '',
      type: '',
      searchTerm: '',
      minAmount: '',
      maxAmount: ''
    });
    setCurrentPage(1);
  };

  // フィルター適用ハンドラ
  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPaymentHistory();
  };

  // ページ変更ハンドラ
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 決済状態の表示用フォーマッタ
  const formatStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">完了</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">処理中</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">失敗</span>;
      case 'refunded':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">返金済</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  // 決済タイプの表示用フォーマッタ
  const formatType = (type: string) => {
    switch (type) {
      case 'premium':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">プレミアム会員</span>;
      case 'promotion':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">有料掲載枠</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{type}</span>;
    }
  };

  // 日付フォーマッタ
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'yyyy年M月d日 HH:mm', { locale: ja });
  };

  // 金額フォーマッタ
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString('ja-JP')}`;
  };

  // 返金モーダルを開く
  const openRefundModal = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setIsRefundModalOpen(true);
  };

  // 返金モーダルを閉じる
  const closeRefundModal = () => {
    setIsRefundModalOpen(false);
    setSelectedPayment(null);
  };

  // 詳細表示ハンドラ
  const handleShowDetails = (payment: PaymentRecord) => {
    // 詳細情報をモーダルで表示するなどの実装
    alert(`
      決済ID: ${payment.id}
      ユーザー: ${payment.user?.display_name || '不明'} (${payment.user?.email || '不明'})
      タイプ: ${payment.type === 'premium' ? 'プレミアム会員' : '有料掲載枠'}
      金額: ${formatAmount(payment.amount || 0)}
      ステータス: ${payment.status}
      日時: ${formatDate(payment.created_at)}
      ${payment.refunded ? `返金理由: ${payment.refund_reason || '不明'}\n返金日時: ${payment.refund_date ? formatDate(payment.refund_date) : '不明'}` : ''}
    `);
  };

  // コンポーネント初期化時にデータを取得
  useEffect(() => {
    fetchPaymentHistory();
  }, [currentPage, itemsPerPage]);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">決済履歴</h2>
        
        {/* 売上サマリー */}
        <div className="flex gap-4">
          <div className="bg-blue-50 px-4 py-2 rounded-md">
            <p className="text-sm text-gray-500">合計売上</p>
            <p className="text-xl font-bold text-blue-600">{formatAmount(totalAmount)}</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-md">
            <p className="text-sm text-gray-500">プレミアム会員</p>
            <p className="text-xl font-bold text-indigo-600">{formatAmount(totalPremium)}</p>
          </div>
          <div className="bg-purple-50 px-4 py-2 rounded-md">
            <p className="text-sm text-gray-500">有料掲載枠</p>
            <p className="text-xl font-bold text-purple-600">{formatAmount(totalPromotion)}</p>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* フィルターパネル */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <form onSubmit={handleApplyFilter}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期間（開始）</label>
              <input
                type="date"
                name="dateFrom"
                value={filter.dateFrom}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期間（終了）</label>
              <input
                type="date"
                name="dateTo"
                value={filter.dateTo}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="">すべて</option>
                <option value="completed">完了</option>
                <option value="pending">処理中</option>
                <option value="failed">失敗</option>
                <option value="refunded">返金済</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決済タイプ</label>
              <select
                name="type"
                value={filter.type}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="">すべて</option>
                <option value="premium">プレミアム会員</option>
                <option value="promotion">有料掲載枠</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額（最小）</label>
              <input
                type="number"
                name="minAmount"
                value={filter.minAmount}
                onChange={handleFilterChange}
                placeholder="例: 1000"
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額（最大）</label>
              <input
                type="number"
                name="maxAmount"
                value={filter.maxAmount}
                onChange={handleFilterChange}
                placeholder="例: 10000"
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
            <input
              type="text"
              name="searchTerm"
              value={filter.searchTerm}
              onChange={handleFilterChange}
              placeholder="ユーザー名、メールアドレス、掲載枠名で検索"
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              リセット
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              フィルター適用
            </button>
          </div>
        </form>
      </div>

      {/* アクティブフィルターの表示 */}
      {isFilterActive && (
        <div className="mb-4 p-2 bg-blue-50 rounded-md text-sm">
          <p className="flex items-center">
            <span className="font-medium mr-2">適用中のフィルター:</span>
            {filter.dateFrom && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                開始日: {filter.dateFrom}
              </span>
            )}
            {filter.dateTo && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                終了日: {filter.dateTo}
              </span>
            )}
            {filter.status && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                ステータス: {filter.status}
              </span>
            )}
            {filter.type && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                タイプ: {filter.type === 'premium' ? 'プレミアム会員' : '有料掲載枠'}
              </span>
            )}
            {filter.minAmount && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                最小金額: {filter.minAmount}円
              </span>
            )}
            {filter.maxAmount && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                最大金額: {filter.maxAmount}円
              </span>
            )}
            {filter.searchTerm && (
              <span className="mr-2 bg-blue-100 px-2 py-1 rounded">
                検索: "{filter.searchTerm}"
              </span>
            )}
          </p>
        </div>
      )}

      {/* 決済履歴テーブル */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left font-medium text-gray-500 tracking-wider">ID</th>
                <th className="p-3 text-left font-medium text-gray-500 tracking-wider">ユーザー</th>
                <th className="p-3 text-left font-medium text-gray-500 tracking-wider">タイプ</th>
                <th className="p-3 text-left font-medium text-gray-500 tracking-wider">詳細</th>
                <th className="p-3 text-right font-medium text-gray-500 tracking-wider">金額</th>
                <th className="p-3 text-center font-medium text-gray-500 tracking-wider">ステータス</th>
                <th className="p-3 text-left font-medium text-gray-500 tracking-wider">日時</th>
                <th className="p-3 text-center font-medium text-gray-500 tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm">
                    <span className="font-mono text-xs">{payment.id.substring(0, 8)}...</span>
                  </td>
                  <td className="p-3">
                    <div className="text-sm font-medium">{payment.user?.display_name || '不明'}</div>
                    <div className="text-xs text-gray-500">{payment.user?.email || '不明'}</div>
                  </td>
                  <td className="p-3">
                    {formatType(payment.type)}
                  </td>
                  <td className="p-3">
                    {payment.type === 'promotion' && payment.promotion_slot ? (
                      <div className="text-sm">{payment.promotion_slot.name}</div>
                    ) : (
                      <div className="text-sm">プレミアム会員</div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-medium">{formatAmount(payment.amount || 0)}</span>
                  </td>
                  <td className="p-3 text-center">
                    {formatStatus(payment.status)}
                  </td>
                  <td className="p-3">
                    <div className="text-sm">{formatDate(payment.created_at)}</div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleShowDetails(payment)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        詳細
                      </button>
                      {payment.status === 'completed' && !payment.refunded && (
                        <button
                          onClick={() => openRefundModal(payment)}
                          className="text-red-600 hover:text-red-800"
                        >
                          返金
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">
          決済履歴がありません
        </div>
      )}

      {/* ページネーション */}
      {totalItems > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            全 {totalItems} 件中 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} 件を表示
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              &laquo;
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              &lt;
            </button>

            {/* ページ番号ボタン */}
            {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1)
              .filter(page => (
                page === 1 ||
                page === Math.ceil(totalItems / itemsPerPage) ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ))
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-3 py-1">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}

<button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
              className={`px-3 py-1 rounded ${
                currentPage === Math.ceil(totalItems / itemsPerPage)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              &gt;
            </button>
            <button
              onClick={() => handlePageChange(Math.ceil(totalItems / itemsPerPage))}
              disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
              className={`px-3 py-1 rounded ${
                currentPage === Math.ceil(totalItems / itemsPerPage)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              &raquo;
            </button>
          </div>
          
          <div>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-2 border rounded-md"
            >
              <option value={10}>10件/ページ</option>
              <option value={20}>20件/ページ</option>
              <option value={50}>50件/ページ</option>
              <option value={100}>100件/ページ</option>
            </select>
          </div>
        </div>
      )}

      {/* 返金モーダル */}
      {isRefundModalOpen && selectedPayment && (
        <RefundModal
          show={isRefundModalOpen}
          onHide={closeRefundModal}
          paymentId={selectedPayment.id}
          paymentType={selectedPayment.type}
          originalAmount={selectedPayment.amount}
          stripePaymentIntentId={selectedPayment.payment_method || undefined}
          onRefundComplete={fetchPaymentHistory}
        />
      )}
    </div>
  );
};

export default PaymentHistory;
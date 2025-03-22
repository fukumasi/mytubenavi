// src/components/admin/PromotionPaymentManagement.tsx

import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import RefundModal from './RefundModal';
import { AdminContext } from './Dashboard';

// 決済データの型定義
type PromotionPayment = {
  id: string;
  user_id: string;
  slot_id: string;
  amount_paid: number;
  status: string;
  created_at: string;
  refunded: boolean;
  refund_reason?: string;
  refund_date?: string;
  payment_intent_id?: string;
  
  // 関連データ
  user?: {
    username: string;
    email?: string;
  };
  slot?: {
    name: string;
    type: string;
    price: number;
  };
};

// 課金プランの型定義
type PromotionPlan = {
  id: string;
  name: string;
  type: string;
  price: number;
  max_videos: number;
  description?: string;
  created_at: string;
  updated_at: string;
};

// フィルター状態の型定義
type FilterState = {
  dateFrom: string;
  dateTo: string;
  status: string;
  slotType: string;
  searchTerm: string;
  minAmount: string;
  maxAmount: string;
};

// レポート種別の型定義
type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';

// レポートデータの型定義
interface ReportSummary {
  totalPayments: number;
  totalAmount: number;
  refundedAmount: number;
  netAmount: number;
}

interface ReportDataItem {
  count: number;
  amount: number;
}

interface DailyTrend {
  date: string;
  count: number;
  amount: number;
}

interface ReportData {
  period: {
    start: string;
    end: string;
  };
  summary: ReportSummary;
  byStatus: Record<string, ReportDataItem>;
  bySlotType: Record<string, ReportDataItem>;
  dailyTrends: DailyTrend[];
}

const PromotionPaymentManagement: React.FC = () => {
  // AdminContextからデータを取得
  const { activeTab } = useContext(AdminContext);

  // 決済データの状態
  const [payments, setPayments] = useState<PromotionPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PromotionPayment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 課金プランの状態
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [editPlan, setEditPlan] = useState<PromotionPlan | null>(null);
  const [showPlanForm, setShowPlanForm] = useState<boolean>(false);

  // フィルター状態
  const [filter, setFilter] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: '',
    slotType: '',
    searchTerm: '',
    minAmount: '',
    maxAmount: ''
  });

  // 返金モーダル状態
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  
  // ページネーション状態
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  
  // タブ管理
  const [activeLocalTab, setActiveLocalTab] = useState<'payments' | 'plans' | 'reports'>('payments');
  
  // レポート状態
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [reportDateFrom, setReportDateFrom] = useState<string>('');
  const [reportDateTo, setReportDateTo] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  
  // 成功通知状態
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 詳細表示状態
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // 決済データの取得
  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // slot_bookingsテーブルからデータを取得
      let query = supabase
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
          refund_date,
          payment_intent_id
        `)
        .order('created_at', { ascending: false });
      
      // フィルター適用
      if (filter.dateFrom) {
        query = query.gte('created_at', `${filter.dateFrom}T00:00:00`);
      }
      
      if (filter.dateTo) {
        query = query.lte('created_at', `${filter.dateTo}T23:59:59`);
      }
      
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      
      if (filter.minAmount) {
        const minAmount = parseFloat(filter.minAmount);
        if (!isNaN(minAmount)) {
          query = query.gte('amount_paid', minAmount);
        }
      }
      
      if (filter.maxAmount) {
        const maxAmount = parseFloat(filter.maxAmount);
        if (!isNaN(maxAmount)) {
          query = query.lte('amount_paid', maxAmount);
        }
      }
      
      // ページネーション用のカウント取得
      const { data: countData } = await query.select('id');
      const count = countData ? countData.length : 0;
      setTotalItems(count);

      // ページネーション適用
      const { data, error: queryError } = await query
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (queryError) throw queryError;

      // 関連データ（ユーザー情報とスロット情報）を取得
      const paymentData = data || [];
      
      if (paymentData.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }
      
      // ユーザーIDとスロットIDの一覧を作成
      const userIds = paymentData.map(p => p.user_id).filter((v, i, a) => a.indexOf(v) === i);
      const slotIds = paymentData.map(p => p.slot_id).filter((v, i, a) => a.indexOf(v) === i);

      // ユーザー情報を取得
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      if (userError) throw userError;
      
      // スロット情報を取得
      const { data: slotData, error: slotError } = await supabase
        .from('promotion_slots')
        .select('id, name, type, price')
        .in('id', slotIds);
      
      if (slotError) throw slotError;
      
      // ユーザーとスロットのマップを作成
      const userMap: Record<string, any> = {};
      userData?.forEach(user => {
        userMap[user.id] = user;
      });
      
      const slotMap: Record<string, any> = {};
      slotData?.forEach(slot => {
        slotMap[slot.id] = slot;
      });
      
      // 結合データを作成
      const enrichedPayments = paymentData.map(payment => ({
        ...payment,
        user: userMap[payment.user_id] ? {
          username: userMap[payment.user_id].username || '不明なユーザー',
          email: userMap[payment.user_id].email
        } : undefined,
        slot: slotMap[payment.slot_id] ? {
          name: slotMap[payment.slot_id].name || '不明な掲載枠',
          type: slotMap[payment.slot_id].type || 'unknown',
          price: slotMap[payment.slot_id].price || 0
        } : undefined
      }));
      
      // スロットタイプでフィルタリング（関連データを取得した後に実行）
      let filteredPayments = enrichedPayments;
      if (filter.slotType) {
        filteredPayments = enrichedPayments.filter(
          p => p.slot?.type === filter.slotType
        );
      }
      
      // テキスト検索
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        filteredPayments = filteredPayments.filter(p => 
          p.user?.username?.toLowerCase().includes(term) ||
          p.user?.email?.toLowerCase().includes(term) ||
          p.slot?.name?.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term)
        );
      }
      
      setPayments(filteredPayments);
    } catch (err: any) {
      console.error('決済データの取得エラー:', err);
      setError(`決済データの取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 課金プランの取得
  const fetchPromotionPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('promotion_slots')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      
      setPlans(data || []);
    } catch (err: any) {
      console.error('課金プラン取得エラー:', err);
      setError(`課金プランの取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // プランの保存（新規または更新）
  const savePlan = async (plan: Partial<PromotionPlan>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editPlan?.id) {
        // 既存プランの更新
        const { error } = await supabase
          .from('promotion_slots')
          .update({
            name: plan.name,
            type: plan.type,
            price: plan.price,
            max_videos: plan.max_videos,
            description: plan.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editPlan.id);
        
        if (error) throw error;
        
        setSuccessMessage('プランが正常に更新されました');
      } else {
        // 新規プラン作成
        const { error } = await supabase
          .from('promotion_slots')
          .insert({
            name: plan.name,
            type: plan.type,
            price: plan.price,
            max_videos: plan.max_videos,
            description: plan.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        setSuccessMessage('新しいプランが正常に作成されました');
      }
      
      // プラン一覧を再取得
      fetchPromotionPlans();
      
      // フォームをリセット
      setEditPlan(null);
      setShowPlanForm(false);
    } catch (err: any) {
      console.error('プラン保存エラー:', err);
      setError(`プランの保存に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // プランの削除
  const deletePlan = async (planId: string) => {
    // 削除前の確認
    if (!window.confirm('このプランを削除してもよろしいですか？関連する予約がある場合は削除できません。')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 関連予約の件数を確認
      const { data } = await supabase
        .from('slot_bookings')
        .select('id')
        .eq('slot_id', planId);
      
      // データの長さでカウント
      const bookingCount = data ? data.length : 0;
      
      if (bookingCount > 0) {
        setError(`このプランには${bookingCount}件の予約があるため削除できません。`);
        return;
      }
      
      // 関連予約がなければ削除
      const { error } = await supabase
        .from('promotion_slots')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
      
      setSuccessMessage('プランが正常に削除されました');
      
      // プラン一覧を再取得
      fetchPromotionPlans();
    } catch (err: any) {
      console.error('プラン削除エラー:', err);
      setError(`プランの削除に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // レポート生成
  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      setError(null);
      
      let startDate: Date, endDate: Date;
      
      // レポート期間の設定
      switch (reportType) {
        case 'daily':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'weekly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - startDate.getDay());
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
          endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'monthly':
          startDate = new Date();
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        
        case 'custom':
          if (!reportDateFrom || !reportDateTo) {
            setError('カスタム期間を選択してください');
            setGeneratingReport(false);
            return;
          }
          
          startDate = new Date(reportDateFrom);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(reportDateTo);
          endDate.setHours(23, 59, 59, 999);
          break;
        
        default:
          throw new Error('不明なレポートタイプ');
      }
      
      // 決済データの取得
      const { data: paymentData, error: paymentError } = await supabase
        .from('slot_bookings')
        .select(`
          id, 
          user_id,
          slot_id,
          status,
          amount_paid,
          created_at,
          refunded
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (paymentError) throw paymentError;
      
      // スロット情報の取得
      const { data: slotData, error: slotError } = await supabase
        .from('promotion_slots')
        .select('id, name, type, price');
      
      if (slotError) throw slotError;
      
      // スロットマップの作成
      const slotMap: Record<string, any> = {};
      slotData?.forEach(slot => {
        slotMap[slot.id] = slot;
      });
      
      // レポートデータの集計
      const reportResult: ReportData = {
        period: {
          start: format(startDate, 'yyyy年MM月dd日', { locale: ja }),
          end: format(endDate, 'yyyy年MM月dd日', { locale: ja })
        },
        summary: {
          totalPayments: paymentData?.length || 0,
          totalAmount: 0,
          refundedAmount: 0,
          netAmount: 0
        },
        byStatus: {},
        bySlotType: {},
        dailyTrends: []
      };
      
      // 日別データの初期化
      const dailyData: Record<string, { count: number, amount: number }> = {};
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        dailyData[dateKey] = { count: 0, amount: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // データの集計
      paymentData?.forEach(payment => {
        // 合計金額の集計
        const amount = payment.amount_paid || 0;
        reportResult.summary.totalAmount += amount;
        
        if (payment.refunded) {
          reportResult.summary.refundedAmount += amount;
        } else {
          reportResult.summary.netAmount += amount;
        }
        
        // ステータス別集計
        const status = payment.refunded ? 'refunded' : (payment.status || 'unknown');
        if (!reportResult.byStatus[status]) {
          reportResult.byStatus[status] = { count: 0, amount: 0 };
        }
        reportResult.byStatus[status].count += 1;
        reportResult.byStatus[status].amount += amount;
        
        // スロットタイプ別集計
        const slotType = slotMap[payment.slot_id]?.type || 'unknown';
        if (!reportResult.bySlotType[slotType]) {
          reportResult.bySlotType[slotType] = { count: 0, amount: 0 };
        }
        reportResult.bySlotType[slotType].count += 1;
        reportResult.bySlotType[slotType].amount += amount;
        
        // 日別集計
        const dateKey = format(new Date(payment.created_at), 'yyyy-MM-dd');
        if (dailyData[dateKey]) {
          dailyData[dateKey].count += 1;
          dailyData[dateKey].amount += amount;
        }
      });
      
      // 日別データを配列に変換
      reportResult.dailyTrends = Object.entries(dailyData).map(([date, data]) => ({
        date: format(new Date(date), 'MM/dd', { locale: ja }),
        count: data.count,
        amount: data.amount
      }));
      
      // レポートデータを設定
      setReportData(reportResult);
      setSuccessMessage('レポートが正常に生成されました');
    } catch (err: any) {
      console.error('レポート生成エラー:', err);
      setError(`レポート生成に失敗しました: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // 返金モーダルを開く
  const openRefundModal = (payment: PromotionPayment) => {
    setSelectedPayment(payment);
    setIsRefundModalOpen(true);
  };

  // 返金モーダルを閉じる
  const closeRefundModal = () => {
    setSelectedPayment(null);
    setIsRefundModalOpen(false);
  };

  // 詳細表示ハンドラ
  const showPaymentDetails = (payment: PromotionPayment) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  // 詳細モーダルを閉じる
  const closeDetailsModal = () => {
    setSelectedPayment(null);
    setShowDetails(false);
  };

  // フィルターの変更ハンドラ
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  // フィルターのリセットハンドラ
  const resetFilter = () => {
    setFilter({
      dateFrom: '',
      dateTo: '',
      status: '',
      slotType: '',
      searchTerm: '',
      minAmount: '',
      maxAmount: ''
    });
    setCurrentPage(1);
  };

  // フィルターの適用ハンドラ
  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPaymentData();
  };

  // ページ変更ハンドラ
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // フォーマット関数
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', { locale: ja });
    } catch (err) {
      console.error('日付フォーマットエラー:', err);
      return '無効な日付';
    }
  };
  
  const formatAmount = (amount: number): string => {
    return `¥${amount.toLocaleString('ja-JP')}`;
  };
  
  const formatStatus = (status: string, refunded: boolean) => {
    if (refunded) {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">返金済み</span>;
    }
    
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">完了</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">処理中</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">失敗</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };
  
  const formatSlotType = (type: string) => {
    switch (type) {
      case 'premium':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">プレミアム</span>;
      case 'sidebar':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">サイドバー</span>;
      case 'genre':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">ジャンル</span>;
      case 'related':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">関連動画</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{type || '不明'}</span>;
    }
  };

  // PromotionSlotsからの遷移を検出するための処理
  useEffect(() => {
    // AdminContextのactiveTabが'payments'の場合にデータを取得
    if (activeTab === 'payments') {
      // 初期通知を表示
      setSuccessMessage('決済管理画面に切り替わりました');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      fetchPaymentData();
    }
  }, [activeTab]);

  // 初回マウント時とlocal tabの変更時にデータを取得
  useEffect(() => {
    if (activeLocalTab === 'payments') {
      fetchPaymentData();
    } else if (activeLocalTab === 'plans') {
      fetchPromotionPlans();
    }
  }, [activeLocalTab, currentPage, itemsPerPage]);
  
  // 成功メッセージのクリア
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">掲載枠決済管理</h1>
      
      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-700 hover:text-red-900"
            aria-label="エラーメッセージを閉じる"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* 成功メッセージ表示 */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-700 hover:text-green-900"
            aria-label="成功メッセージを閉じる"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex" aria-label="決済管理ナビゲーション">
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeLocalTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveLocalTab('payments')}
            aria-current={activeLocalTab === 'payments' ? 'page' : undefined}
          >
            決済履歴
          </button>
          <button
            className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
              activeLocalTab === 'plans'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveLocalTab('plans')}
            aria-current={activeLocalTab === 'plans' ? 'page' : undefined}
          >
            課金プラン管理
          </button>
          <button
            className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
              activeLocalTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveLocalTab('reports')}
            aria-current={activeLocalTab === 'reports' ? 'page' : undefined}
          >
            決済レポート
          </button>
        </nav>
      </div>

      {/* 決済履歴タブ */}
      {activeLocalTab === 'payments' && (
        <div>
          {/* フィルターパネル */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <form onSubmit={applyFilter} aria-label="決済フィルター">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                    期間（開始）
                  </label>
                  <input
                    type="date"
                    id="dateFrom"
                    name="dateFrom"
                    value={filter.dateFrom}
                    onChange={handleFilterChange}
                    className="w-full p-2 border rounded-md"
                    aria-label="フィルター期間開始日"
                  />
                </div>
                
                <div>
                  <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                    期間（終了）
                  </label>
                  <input
                    type="date"
                    id="dateTo"
                    name="dateTo"
                    value={filter.dateTo}
                    onChange={handleFilterChange}
                    className="w-full p-2 border rounded-md"
                    aria-label="フィルター期間終了日"
                  />
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={filter.status}
                    onChange={handleFilterChange}
                    className="w-full p-2 border rounded-md"
                    aria-label="決済ステータスフィルター"
                  >
                    <option value="">すべて</option>
                    <option value="completed">完了</option>
                    <option value="pending">処理中</option>
                    <option value="failed">失敗</option>
                    <option value="refunded">返金済み</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="slotType" className="block text-sm font-medium text-gray-700 mb-1">
                    掲載枠タイプ
                  </label>
                  <select
                    id="slotType"
                    name="slotType"
                    value={filter.slotType}
                    onChange={handleFilterChange}
                    className="w-full p-2 border rounded-md"
                    aria-label="掲載枠タイプフィルター"
                  >
                    <option value="">すべて</option>
                    <option value="premium">プレミアム</option>
                    <option value="sidebar">サイドバー</option>
                    <option value="genre">ジャンル</option>
                    <option value="related">関連動画</option>
                  </select>
                </div>
               
                <div>
                  <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    金額（最小）
                  </label>
                  <input
                    type="number"
                    id="minAmount"
                    name="minAmount"
                    value={filter.minAmount}
                    onChange={handleFilterChange}
                    placeholder="例: 1000"
                    className="w-full p-2 border rounded-md"
                    aria-label="最小金額フィルター"
                  />
                </div>
               
                <div>
                  <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    金額（最大）
                  </label>
                  <input
                    type="number"
                    id="maxAmount"
                    name="maxAmount"
                    value={filter.maxAmount}
                    onChange={handleFilterChange}
                    placeholder="例: 10000"
                    className="w-full p-2 border rounded-md"
                    aria-label="最大金額フィルター"
                  />
                </div>
              </div>
             
              <div className="mb-4">
                <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                  検索
                </label>
                <input
                  type="text"
                  id="searchTerm"
                  name="searchTerm"
                  value={filter.searchTerm}
                  onChange={handleFilterChange}
                  placeholder="ユーザー名、メールアドレス、掲載枠名、IDで検索"
                  className="w-full p-2 border rounded-md"
                  aria-label="キーワード検索"
                />
              </div>
             
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetFilter}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="フィルターをリセット"
                >
                  リセット
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="フィルターを適用"
                >
                  フィルター適用
                </button>
              </div>
            </form>
          </div>
         
          {/* 決済一覧テーブル */}
          {loading ? (
            <div className="flex justify-center items-center py-12" aria-live="polite" aria-busy="true">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="sr-only">読み込み中...</span>
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200" aria-label="決済履歴一覧">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">ID</th>
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">ユーザー</th>
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">掲載枠</th>
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">タイプ</th>
                    <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">金額</th>
                    <th scope="col" className="p-3 text-center font-medium text-gray-500 tracking-wider">ステータス</th>
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">日時</th>
                    <th scope="col" className="p-3 text-center font-medium text-gray-500 tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        <span className="font-mono text-xs">{payment.id.substring(0, 8)}...</span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {payment.user?.username || '不明'}
                          {payment.user?.email && (
                            <div className="text-xs text-gray-500 mt-1">{payment.user.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{payment.slot?.name || '不明'}</div>
                      </td>
                      <td className="p-3">
                        {payment.slot?.type ? formatSlotType(payment.slot.type) : '不明'}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-medium">{formatAmount(payment.amount_paid || 0)}</span>
                      </td>
                      <td className="p-3 text-center">
                        {formatStatus(payment.status, payment.refunded || false)}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{formatDate(payment.created_at)}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => showPaymentDetails(payment)}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                            aria-label={`${payment.user?.username || '不明なユーザー'}の決済詳細を表示`}
                          >
                            詳細
                          </button>
                          {payment.status === 'completed' && !payment.refunded && (
                            <button
                              onClick={() => openRefundModal(payment)}
                              className="text-red-600 hover:text-red-800 focus:outline-none focus:underline"
                              aria-label={`${payment.user?.username || '不明なユーザー'}への返金処理を開始`}
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
            <div className="py-12 text-center text-gray-500" aria-live="polite">
              決済データがありません
            </div>
          )}
         
          {/* ページネーション */}
          {totalItems > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
              <div className="text-sm text-gray-500 mb-2 sm:mb-0">
                全 {totalItems} 件中 {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} 件を表示
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="最初のページへ"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="前のページへ"
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
                        className={`px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        aria-label={`${page}ページ目へ`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
               
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                  className={`px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    currentPage === Math.ceil(totalItems / itemsPerPage)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="次のページへ"
                >
                  &gt;
                </button>
                <button
                  onClick={() => handlePageChange(Math.ceil(totalItems / itemsPerPage))}
                  disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                  className={`px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    currentPage === Math.ceil(totalItems / itemsPerPage)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="最後のページへ"
                >
                  &raquo;
                </button>
              </div>
             
              <div>
                <label htmlFor="itemsPerPage" className="sr-only">表示件数</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="ページごとの表示件数"
                >
                  <option value={10}>10件/ページ</option>
                  <option value={20}>20件/ページ</option>
                  <option value={50}>50件/ページ</option>
                  <option value={100}>100件/ページ</option>
                </select>
              </div>
            </div>
          )}
          
          {/* 決済詳細モーダル */}
          {showDetails && selectedPayment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">決済詳細</h3>
                  <button
                    onClick={closeDetailsModal}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="閉じる"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">決済ID</p>
                    <p className="font-mono">{selectedPayment.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">ユーザー</p>
                    <p>{selectedPayment.user?.username || '不明'}</p>
                    {selectedPayment.user?.email && (
                      <p className="text-sm text-gray-500">{selectedPayment.user.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">掲載枠</p>
                    <p>{selectedPayment.slot?.name || '不明'}</p>
                    <p className="text-sm text-gray-500">
                      {selectedPayment.slot?.type && formatSlotType(selectedPayment.slot.type)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">金額</p>
                    <p className="font-medium">{formatAmount(selectedPayment.amount_paid || 0)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">ステータス</p>
                    <p>{formatStatus(selectedPayment.status, selectedPayment.refunded || false)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">決済日時</p>
                    <p>{formatDate(selectedPayment.created_at)}</p>
                  </div>
                  
                  {selectedPayment.payment_intent_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Intent ID</p>
                      <p className="font-mono text-sm break-all">{selectedPayment.payment_intent_id}</p>
                    </div>
                  )}
                  
                  {selectedPayment.refunded && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">返金理由</p>
                      <p>{selectedPayment.refund_reason || '理由なし'}</p>
                      {selectedPayment.refund_date && (
                        <p className="text-sm text-gray-500">返金日: {formatDate(selectedPayment.refund_date)}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeDetailsModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    閉じる
                  </button>
                  {selectedPayment.status === 'completed' && !selectedPayment.refunded && (
                    <button
                      onClick={() => {
                        closeDetailsModal();
                        openRefundModal(selectedPayment);
                      }}
                      className="ml-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      返金処理
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
     
      {/* 課金プラン管理タブ */}
      {activeLocalTab === 'plans' && (
        <div>
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold">課金プラン一覧</h2>
            <button
              onClick={() => {
                setEditPlan(null);
                setShowPlanForm(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              aria-label="新規プラン追加"
            >
              新規プラン追加
            </button>
          </div>
         
          {/* プラン一覧テーブル */}
          {loading ? (
            <div className="flex justify-center items-center py-12" aria-live="polite" aria-busy="true">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="sr-only">読み込み中...</span>
            </div>
          ) : plans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200" aria-label="課金プラン一覧">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">プラン名</th>
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">タイプ</th>
                    <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">価格</th>
                    <th scope="col" className="p-3 text-center font-medium text-gray-500 tracking-wider">最大動画数</th>
                    <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">説明</th>
                    <th scope="col" className="p-3 text-center font-medium text-gray-500 tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="text-sm font-medium">{plan.name}</div>
                      </td>
                      <td className="p-3">
                        {formatSlotType(plan.type)}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-medium">{formatAmount(plan.price || 0)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span>{plan.max_videos || 1}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{plan.description || '-'}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditPlan(plan);
                              setShowPlanForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                            aria-label={`${plan.name}プランを編集`}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deletePlan(plan.id)}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus:underline"
                            aria-label={`${plan.name}プランを削除`}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500" aria-live="polite">
              課金プランがありません
            </div>
          )}
         
          {/* プラン編集/作成フォーム */}
          {showPlanForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">
                    {editPlan ? 'プランを編集' : '新規プラン作成'}
                  </h3>
                  <button
                    onClick={() => setShowPlanForm(false)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="閉じる"
                  >
                    ✕
                  </button>
                </div>
               
                <form onSubmit={(e) => {
                  e.preventDefault();
                 
                  // フォームデータの取得
                  const formData = new FormData(e.currentTarget);
                  const planData = {
                    name: formData.get('name') as string,
                    type: formData.get('type') as string,
                    price: parseFloat(formData.get('price') as string),
                    max_videos: parseInt(formData.get('max_videos') as string, 10),
                    description: formData.get('description') as string
                  };
                 
                  // バリデーション
                  if (!planData.name || !planData.type || isNaN(planData.price) || isNaN(planData.max_videos)) {
                    setError('必須項目を入力してください');
                    return;
                  }
                 
                  // プラン保存
                  savePlan(planData);
                }}>
                  <div className="mb-4">
                    <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700 mb-1">
                      プラン名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="plan-name"
                      name="name"
                      defaultValue={editPlan?.name || ''}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                 
                  <div className="mb-4">
                    <label htmlFor="plan-type" className="block text-sm font-medium text-gray-700 mb-1">
                      タイプ <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="plan-type"
                      name="type"
                      defaultValue={editPlan?.type || ''}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">選択してください</option>
                      <option value="premium">プレミアム</option>
                      <option value="sidebar">サイドバー</option>
                      <option value="genre">ジャンル</option>
                      <option value="related">関連動画</option>
                    </select>
                  </div>
                 
                  <div className="mb-4">
                    <label htmlFor="plan-price" className="block text-sm font-medium text-gray-700 mb-1">
                      価格 (円) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="plan-price"
                      name="price"
                      defaultValue={editPlan?.price || ''}
                      min="0"
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                 
                  <div className="mb-4">
                    <label htmlFor="plan-max-videos" className="block text-sm font-medium text-gray-700 mb-1">
                      最大動画数 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="plan-max-videos"
                      name="max_videos"
                      defaultValue={editPlan?.max_videos || 1}
                      min="1"
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                 
                  <div className="mb-4">
                    <label htmlFor="plan-description" className="block text-sm font-medium text-gray-700 mb-1">
                      説明
                    </label>
                    <textarea
                      id="plan-description"
                      name="description"
                      defaultValue={editPlan?.description || ''}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                 
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPlanForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {editPlan ? '更新する' : '作成する'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
     
      {/* 決済レポートタブ */}
      {activeLocalTab === 'reports' && (
        <div>
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">決済レポート生成</h2>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
                  レポート期間
                </label>
                <select
                  id="report-type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="レポート期間タイプ"
                >
                  <option value="daily">日次（今日）</option>
                  <option value="weekly">週次（今週）</option>
                  <option value="monthly">月次（今月）</option>
                  <option value="custom">カスタム期間</option>
                </select>
              </div>
             
              {reportType === 'custom' && (
                <>
                  <div>
                    <label htmlFor="report-date-from" className="block text-sm font-medium text-gray-700 mb-1">
                      開始日
                    </label>
                    <input
                      type="date"
                      id="report-date-from"
                      value={reportDateFrom}
                      onChange={(e) => setReportDateFrom(e.target.value)}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="レポート開始日"
                    />
                  </div>
                 
                  <div>
                    <label htmlFor="report-date-to" className="block text-sm font-medium text-gray-700 mb-1">
                      終了日
                    </label>
                    <input
                      type="date"
                      id="report-date-to"
                      value={reportDateTo}
                      onChange={(e) => setReportDateTo(e.target.value)}
                      className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="レポート終了日"
                    />
                  </div>
                </>
              )}
            </div>
           
            <div className="flex justify-end">
              <button
                onClick={generateReport}
                disabled={generatingReport}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  generatingReport
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                aria-busy={generatingReport}
              >
                {generatingReport ? 'レポート生成中...' : 'レポート生成'}
              </button>
            </div>
          </div>
         
          {reportData && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">
                {reportType === 'daily' ? '日次レポート' :
                 reportType === 'weekly' ? '週次レポート' :
                 reportType === 'monthly' ? '月次レポート' : 'カスタムレポート'}
              </h3>
              <p className="text-gray-500 mb-6">
                期間: {reportData.period.start} 〜 {reportData.period.end}
              </p>
             
              {/* サマリー */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">合計決済数</p>
                  <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalPayments}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">合計金額</p>
                  <p className="text-2xl font-bold text-green-600">{formatAmount(reportData.summary.totalAmount)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">返金額</p>
                  <p className="text-2xl font-bold text-purple-600">{formatAmount(reportData.summary.refundedAmount)}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">純売上</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatAmount(reportData.summary.netAmount)}</p>
                </div>
              </div>
             
              {/* ステータス別集計 */}
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-3">ステータス別集計</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200" aria-label="ステータス別決済集計">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">ステータス</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">件数</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">金額</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">割合</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(reportData.byStatus).map(([status, data]) => (
                        <tr key={status} className="hover:bg-gray-50">
                          <td className="p-3">
                            {status === 'completed' ? '完了' :
                             status === 'pending' ? '処理中' :
                             status === 'failed' ? '失敗' :
                             status === 'refunded' ? '返金済み' : status}
                          </td>
                          <td className="p-3 text-right">{data.count}件</td>
                          <td className="p-3 text-right">{formatAmount(data.amount)}</td>
                          <td className="p-3 text-right">
                            {reportData.summary.totalAmount > 0
                              ? `${(data.amount / reportData.summary.totalAmount * 100).toFixed(1)}%`
                              : '0%'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             
              {/* スロットタイプ別集計 */}
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-3">掲載枠タイプ別集計</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200" aria-label="掲載枠タイプ別決済集計">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">タイプ</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">件数</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">金額</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">割合</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(reportData.bySlotType).map(([type, data]) => (
                        <tr key={type} className="hover:bg-gray-50">
                          <td className="p-3">
                            {type === 'premium' ? 'プレミアム' :
                             type === 'sidebar' ? 'サイドバー' :
                             type === 'genre' ? 'ジャンル' :
                             type === 'related' ? '関連動画' : type}
                          </td>
                          <td className="p-3 text-right">{data.count}件</td>
                          <td className="p-3 text-right">{formatAmount(data.amount)}</td>
                          <td className="p-3 text-right">
                            {reportData.summary.totalAmount > 0
                              ? `${(data.amount / reportData.summary.totalAmount * 100).toFixed(1)}%`
                              : '0%'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             
              {/* 日別推移 */}
              <div>
                <h4 className="text-lg font-medium mb-3">日別推移</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200" aria-label="日別決済推移">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="p-3 text-left font-medium text-gray-500 tracking-wider">日付</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">件数</th>
                        <th scope="col" className="p-3 text-right font-medium text-gray-500 tracking-wider">金額</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.dailyTrends.map((day) => (
                        <tr key={day.date} className="hover:bg-gray-50">
                          <td className="p-3">{day.date}</td>
                          <td className="p-3 text-right">{day.count}件</td>
                          <td className="p-3 text-right">{formatAmount(day.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* レポート印刷ボタン */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 print:hidden"
                  aria-label="レポートを印刷"
                >
                  印刷
                </button>
                <button
                  onClick={() => {
                    // レポートデータをCSV形式に変換する関数をここに実装
                    const csvData = [
                      ['レポート期間', `${reportData.period.start} 〜 ${reportData.period.end}`],
                      [''],
                      ['合計決済数', reportData.summary.totalPayments],
                      ['合計金額', reportData.summary.totalAmount],
                      ['返金額', reportData.summary.refundedAmount],
                      ['純売上', reportData.summary.netAmount],
                      [''],
                      ['ステータス別集計'],
                      ['ステータス', '件数', '金額', '割合'],
                      ...Object.entries(reportData.byStatus).map(([status, data]) => [
                        status === 'completed' ? '完了' :
                        status === 'pending' ? '処理中' :
                        status === 'failed' ? '失敗' :
                        status === 'refunded' ? '返金済み' : status,
                        data.count,
                        data.amount,
                        reportData.summary.totalAmount > 0
                          ? `${(data.amount / reportData.summary.totalAmount * 100).toFixed(1)}%`
                          : '0%'
                      ]),
                      [''],
                      ['掲載枠タイプ別集計'],
                      ['タイプ', '件数', '金額', '割合'],
                      ...Object.entries(reportData.bySlotType).map(([type, data]) => [
                        type === 'premium' ? 'プレミアム' :
                        type === 'sidebar' ? 'サイドバー' :
                        type === 'genre' ? 'ジャンル' :
                        type === 'related' ? '関連動画' : type,
                        data.count,
                        data.amount,
                        reportData.summary.totalAmount > 0
                          ? `${(data.amount / reportData.summary.totalAmount * 100).toFixed(1)}%`
                          : '0%'
                      ]),
                      [''],
                      ['日別推移'],
                      ['日付', '件数', '金額'],
                      ...reportData.dailyTrends.map(day => [
                        day.date,
                        day.count,
                        day.amount
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    // CSVをダウンロードさせる
                    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `決済レポート_${reportData.period.start.replace(/[年月日]/g, '')}_${reportData.period.end.replace(/[年月日]/g, '')}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 print:hidden"
                  aria-label="CSVでダウンロード"
                >
                  CSVダウンロード
                </button>
              </div>
            </div>
          )}
        </div>
      )}
     
      {/* 返金モーダル */}
      {isRefundModalOpen && selectedPayment && (
        <RefundModal
          show={isRefundModalOpen}
          onHide={closeRefundModal}
          paymentId={selectedPayment.id}
          paymentType="promotion"
          originalAmount={selectedPayment.amount_paid}
          stripePaymentIntentId={selectedPayment.payment_intent_id}
          onRefundComplete={() => {
            fetchPaymentData();
            closeRefundModal();
            setSuccessMessage('返金処理が完了しました');
          }}
        />
      )}
    </div>
  );
};

export default PromotionPaymentManagement;
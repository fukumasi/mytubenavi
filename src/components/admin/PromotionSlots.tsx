// src/components/admin/PromotionSlots.tsx

import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus, faSync, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CreateSlotModal from './CreateSlotModal';
import EditSlotModal from './EditSlotModal';
import { PromotionSlot } from '@/types/promotion';
import { AdminContext } from './Dashboard';

const PromotionSlots: React.FC = () => {
  const [slots, setSlots] = useState<PromotionSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [currentSlot, setCurrentSlot] = useState<PromotionSlot | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  
  // AdminContextからの状態とメソッドを取得
  const { handleTabChange } = useContext(AdminContext);

  useEffect(() => {
    fetchPromotionSlots();
  }, [refreshKey]);

  const fetchPromotionSlots = async () => {
    try {
      setLoading(true);
      
      // ダミーフィールドを削除し、通常のクエリに戻す
      const { data, error } = await supabase
        .from('promotion_slots')
        .select('*')
        .order('name', { ascending: true })
        .limit(100);
      
      if (error) {
        console.error('Supabaseクエリでエラーが発生:', error);
        setMessageText(`エラー: ${error.message}`);
        setMessageType('error');
        return;
      }

      console.log('取得したデータ:', data);
      setSlots(data || []);
    } catch (error) {
      console.error('掲載枠の取得中にエラーが発生しました:', error);
      setMessageText('データ取得中にエラーが発生しました');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (slot: PromotionSlot) => {
    console.log('編集する掲載枠:', slot);
    // ディープコピーを作成して、参照の問題を回避
    setCurrentSlot(JSON.parse(JSON.stringify(slot)));
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmSlot === id) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('promotion_slots')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('掲載枠の削除に失敗しました:', error);
          setMessageText(`削除エラー: ${error.message}`);
          setMessageType('error');
          return;
        }

        // 成功した場合、リストを更新
        setMessageText('掲載枠が削除されました');
        setMessageType('success');
        
        // リフレッシュキーを更新して再読み込み
        setRefreshKey(prev => prev + 1);
        setDeleteConfirmSlot(null);
      } catch (error) {
        console.error('掲載枠の削除中にエラーが発生しました:', error);
        setMessageText('削除中にエラーが発生しました');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    } else {
      // 初回クリック時は確認を表示
      setDeleteConfirmSlot(id);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setMessageText('新しい掲載枠が作成されました');
    setMessageType('success');
    
    // リフレッシュキーを更新して再読み込み
    setRefreshKey(prev => prev + 1);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setCurrentSlot(null);
    setMessageText('掲載枠が更新されました');
    setMessageType('success');
    
    // 直接URLのパラメータを使ってリロード
    window.location.href = window.location.pathname + '?updated=' + Date.now();
  };

  const refreshDataLocal = () => {
    setMessageText('データを再読み込み中...');
    setMessageType('info');
    
    // リフレッシュキーを更新して再読み込み
    setRefreshKey(prev => prev + 1);
  };

  // 決済管理タブに切り替える関数
  const goToPaymentManagement = () => {
    // handleTabChangeがあれば呼び出す
    if (handleTabChange) {
      // 決済管理タブのインデックスを指定（必要に応じて調整）
      handleTabChange(2); // 仮定: 決済管理タブのインデックスが2
      setMessageText('決済管理タブに切り替えました');
      setMessageType('success');
    } else {
      console.error('handleTabChange関数が提供されていません');
      setMessageText('決済管理タブへの切り替えに失敗しました');
      setMessageType('error');
    }
  };

  const getPriceDisplay = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'premium':
        return 'プレミアム';
      case 'sidebar':
        return 'サイドバー';
      case 'genre':
        return 'ジャンル';
      case 'related':
        return '関連動画';
      default:
        return type;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">掲載枠管理</h2>
        <div className="flex space-x-2">
          <button
            onClick={refreshDataLocal}
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center"
            disabled={loading}
          >
            <FontAwesomeIcon icon={faSync} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            リストを更新
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center"
            disabled={loading}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            新規作成
          </button>
        </div>
      </div>

      {/* 決済管理セクション（改善済み） */}
      <div className="bg-blue-50 border border-blue-200 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-800 mb-4">決済管理</h2>
        <div className="mb-4">
          <p className="mb-4 text-gray-700">掲載枠に関連する決済の管理や返金処理を行えます。「決済管理」タブに切り替えて詳細を確認してください。</p>
          <button
            onClick={goToPaymentManagement}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out transform hover:scale-105"
          >
            <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
            決済管理タブに切り替える
          </button>
        </div>
      </div>

      {messageText && (
        <div className={`mb-4 p-3 rounded flex items-center ${
          messageType === 'success' ? 'bg-green-100 text-green-700' :
          messageType === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          <span className="font-medium">{messageText}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  価格
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最大動画数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  作成日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slots.length > 0 ? (
                slots.map((slot: PromotionSlot, index: number) => (
                  <tr key={`slot_${slot.id}_${index}_${refreshKey}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{slot.name}</div>
                      {slot.description && (
                        <div className="text-sm text-gray-500">{slot.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getTypeLabel(slot.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPriceDisplay(slot.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.max_videos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(slot.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(slot)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className={`${
                          deleteConfirmSlot === slot.id
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      {deleteConfirmSlot === slot.id && (
                        <span className="ml-2 text-xs text-red-600">確認: もう一度クリック</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    掲載枠が見つかりません。「新規作成」ボタンから作成してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateSlotModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showEditModal && currentSlot && (
        <EditSlotModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setCurrentSlot(null);
          }}
          slotData={currentSlot}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default PromotionSlots;
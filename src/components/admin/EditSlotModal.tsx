// src/components/admin/EditSlotModal.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { PromotionSlot } from '@/types/promotion';

interface EditSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData: PromotionSlot;
  onSuccess: () => void;
}

const EditSlotModal: React.FC<EditSlotModalProps> = ({ isOpen, onClose, slotData, onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [maxVideos, setMaxVideos] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slotData) {
      setName(slotData.name || '');
      setType(slotData.type || '');
      setPrice(slotData.price?.toString() || '');
      setMaxVideos(slotData.max_videos?.toString() || '');
      setDescription(slotData.description || '');
    }
  }, [slotData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 基本的なバリデーション
    if (!name) {
      setError('名前を入力してください');
      return;
    }

    if (!type) {
      setError('タイプを選択してください');
      return;
    }

    // 価格のバリデーション
    const priceValue = parseInt(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('有効な価格を入力してください');
      return;
    }

    // 最大動画数のバリデーション
    const maxVideosValue = parseInt(maxVideos);
    if (isNaN(maxVideosValue) || maxVideosValue <= 0) {
      setError('有効な最大動画数を入力してください');
      return;
    }
  
    try {
      setLoading(true);
      
      // 更新用のデータオブジェクトを準備
      const updateData = {
        name,
        type,
        price: priceValue,
        max_videos: maxVideosValue,
        description: description || null,
        updated_at: new Date().toISOString()
      };
      
      console.log('更新データ:', updateData);
      
      // Supabaseのリクエストにカスタムヘッダーを追加
      const { data, error: updateError } = await supabase
        .from('promotion_slots')
        .update(updateData)
        .eq('id', slotData.id)
        .select(); // データを返してもらう
  
      if (updateError) {
        console.error('掲載枠の更新に失敗しました:', updateError);
        setError('掲載枠の更新に失敗しました。詳細: ' + updateError.message);
        return;
      }
  
      // 成功した場合
      console.log('掲載枠が正常に更新されました:', data);
      
      // 少し遅延させて親コンポーネントに通知
      setTimeout(() => {
        onSuccess();
      }, 300);
    } catch (err) {
      console.error('掲載枠の更新中にエラーが発生しました:', err);
      setError('予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900" id="modal-headline">
              掲載枠の編集
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4">
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  掲載枠名 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="掲載枠名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  タイプ <span className="text-red-600">*</span>
                </label>
                <select
                  id="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="">タイプを選択してください</option>
                  <option value="premium">プレミアム</option>
                  <option value="sidebar">サイドバー</option>
                  <option value="genre">ジャンル</option>
                  <option value="related">関連動画</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  価格（円） <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="価格"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="maxVideos" className="block text-sm font-medium text-gray-700 mb-1">
                  最大動画数 <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  id="maxVideos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="最大動画数"
                  value={maxVideos}
                  onChange={(e) => setMaxVideos(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="掲載枠の説明（任意）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 text-right">
              <button
                type="button"
                className="py-2 px-4 mr-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? '更新中...' : '更新する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSlotModal;
// src/components/youtuber/PromotionSlotForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PromotionSlot } from '@/types';

interface PromotionSlotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slot?: PromotionSlot; // 編集時に使用
}

export default function PromotionSlotForm({
  isOpen,
  onClose,
  onSuccess,
  slot,
}: PromotionSlotFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 1000,
    type: 'sidebar', // デフォルトタイプ
    image: null as File | null,
    imageUrl: '',
  });
  
  // 編集モードの場合、既存のデータを読み込む
  useEffect(() => {
    if (slot) {
      setFormData({
        name: slot.name || '',
        description: slot.description || '',
        price: slot.price || 1000,
        type: slot.type || 'sidebar',
        image: null,
        imageUrl: slot.image_url || '',
      });
    }
  }, [slot]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value,
    }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MBを超える場合
        setError('画像のサイズは5MB以下にしてください');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file,
        imageUrl: URL.createObjectURL(file),
      }));
      setError(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let image_url = formData.imageUrl;
      
      // 新しい画像がアップロードされた場合
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `promotion_slots/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, formData.image);
          
        if (uploadError) throw uploadError;
        
        // 画像URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        image_url = publicUrl;
      }
      
      const slotData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        type: formData.type,
        image_url,
        youtuber_id: user.id,
        status: 'active',
      };
      
      if (slot) {
        // 編集モード
        const { error: updateError } = await supabase
          .from('promotion_slots')
          .update(slotData)
          .eq('id', slot.id);
          
        if (updateError) throw updateError;
      } else {
        // 新規作成モード
        const { error: insertError } = await supabase
          .from('promotion_slots')
          .insert([slotData]);
          
        if (insertError) throw insertError;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving promotion slot:', err);
      setError('掲載枠の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {slot ? '掲載枠の編集' : '新規掲載枠の作成'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                掲載枠名 *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="例: トップページプレミアム枠"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="この掲載枠の特徴や表示場所などを記入してください"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイプ *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="premium">プレミアム</option>
                  <option value="sidebar">サイドバー</option>
                  <option value="genre">ジャンルページ</option>
                  <option value="related">関連動画</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  1日あたりの価格 (円) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min={100}
                  step={100}
                  className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サムネイル画像
              </label>
              <div className="mt-1 flex items-center">
                {formData.imageUrl ? (
                  <div className="relative">
                    <img
                      src={formData.imageUrl}
                      alt="掲載枠サムネイル"
                      className="h-32 w-48 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: null, imageUrl: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex justify-center items-center border-2 border-dashed border-gray-300 rounded-md h-32 w-48 cursor-pointer hover:border-indigo-500">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-6 w-6 text-gray-400" />
                      <div className="text-xs text-gray-500">
                        <span>画像をアップロード</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                推奨サイズ: 640×360px (16:9)、最大5MB
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '保存中...' : (slot ? '更新する' : '作成する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
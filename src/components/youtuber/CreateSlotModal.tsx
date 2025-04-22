// src/components/youtuber/CreateSlotModal.tsx
import { promotionService } from '@/services/promotionService';
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Youtube, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PromotionSlot } from '@/types';


interface CreateSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slot?: PromotionSlot; // 編集時に使用
}

// YouTube URLからビデオIDを抽出するヘルパー関数
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // 標準的なYouTube URL
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11) ? match[2] : null;
}

// 各掲載タイプの推奨価格を定義
const RECOMMENDED_PRICES = {
  premium: { min: 1000, max: 5000, default: 0 },
  sidebar: { min: 500, max: 2000, default: 0 },
  genre: { min: 300, max: 1500, default: 0 },
  related: { min: 200, max: 1000, default: 0 }
};

export default function CreateSlotModal({
  isOpen,
  onClose,
  onSuccess,
  slot,
}: CreateSlotModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtuberProfileId, setYoutuberProfileId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    type: 'sidebar', // デフォルトタイプ
    youtubeUrl: '',
    youtube_id: '',
  });

  // ユーザーのYouTuberプロファイルIDを取得
  useEffect(() => {
    const fetchYoutuberProfile = async () => {
      if (!user) return;
      
      try {
        // user.idがyoutuber_profilesテーブルのidカラムに対応していると仮定
        const { data, error } = await supabase
          .from('youtuber_profiles')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching youtuber profile:', error);
          setError('YouTuberプロファイルの取得に失敗しました');
          return;
        }
        
        if (data) {
          setYoutuberProfileId(data.id);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('プロフィール情報の取得中にエラーが発生しました');
      }
    };
    
    fetchYoutuberProfile();
  }, [user]);
  
  // 編集モードの場合、既存のデータを読み込む
  useEffect(() => {
    if (slot) {
      setFormData({
        name: slot.name || '',
        description: slot.description || '',
        price: slot.price || RECOMMENDED_PRICES.sidebar.default,
        type: slot.type || 'sidebar',
        youtubeUrl: slot.youtube_id ? `https://www.youtube.com/watch?v=${slot.youtube_id}` : '',
        youtube_id: slot.youtube_id || '',
      });
    } else {
      // 新規作成モードの場合はフォームをリセット
      setFormData({
        name: '',
        description: '',
        price: RECOMMENDED_PRICES.sidebar.default,
        type: 'sidebar',
        youtubeUrl: '',
        youtube_id: '',
      });
    }
  }, [slot, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'type' && !slot) {
      // タイプが変更された場合、推奨価格を設定
      const slotType = value as keyof typeof RECOMMENDED_PRICES;
      setFormData(prev => ({
        ...prev,
        [name]: value,
        price: RECOMMENDED_PRICES[slotType].default,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'price' ? Number(value) : value,
      }));
    }
  };
  
  const handleYouTubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({
      ...prev,
      youtubeUrl: url,
      youtube_id: extractYouTubeId(url) || '',
    }));
    
    if (url && !extractYouTubeId(url)) {
      setError('有効なYouTube URLを入力してください');
    } else {
      setError(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // YouTube IDが入力されているか確認
    if (!formData.youtube_id) {
      setError('有効なYouTube URLを入力してください');
      return;
    }
    
    // YouTuberプロファイルIDがあるか確認
    if (!youtuberProfileId && !slot) {
      setError('YouTuberプロファイルが見つかりません');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // formData.typeの型を明示的に指定する
      const slotType = formData.type as "premium" | "sidebar" | "genre" | "related";
  
      // データベーススキーマに合わせてデータを整形
      const slotData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        type: slotType, // 型キャストしたものを使用
        youtube_id: formData.youtube_id,
        max_videos: 1, // デフォルト値
        is_active: true // アクティブ状態を明示的に設定
      };
      
      if (slot) {
        // 編集モード
        const { error: updateError } = await supabase
          .from('promotion_slots')
          .update(slotData)
          .eq('id', slot.id);
          
        if (updateError) throw updateError;
      } else {
        // 新規作成モード - 掲載枠の上限をチェック
        const activeSlotCount = await promotionService.countActiveSlots();
        if (activeSlotCount >= 5) {
          throw new Error('掲載枠の最大数（5）に達しています。新しい掲載枠を作成する前に、既存の掲載枠を削除してください。');
        }
        
        // promotionServiceを使用して掲載枠を作成
        const newSlot = await promotionService.createPromotionSlot(slotData);
        if (!newSlot) {
          throw new Error('掲載枠の作成に失敗しました');
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving promotion slot:', err);
      setError(err instanceof Error ? err.message : '掲載枠の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  // サムネイルプレビューURL
  const thumbnailUrl = formData.youtube_id 
    ? `https://img.youtube.com/vi/${formData.youtube_id}/mqdefault.jpg`
    : '';
  
  // 現在選択されているタイプの推奨価格範囲
  const currentTypePrice = RECOMMENDED_PRICES[formData.type as keyof typeof RECOMMENDED_PRICES];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-surface rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
            {slot ? '掲載枠の編集' : '新規掲載枠の作成'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 dark:text-red-300 mr-2" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                掲載枠名 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 dark:border-dark-border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-surface dark:text-dark-text-primary"
                placeholder="管理用の名前（例: 春の新作PR用トップページ枠）"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                あなたの管理用に覚えやすい名前をつけてください。この名前はダッシュボードでの識別用です。
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                説明
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-dark-border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-surface dark:text-dark-text-primary"
                placeholder="この掲載枠の特徴や表示場所などを記入してください"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                  タイプ <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-dark-border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-surface dark:text-dark-text-primary"
                >
                  <option value="premium">プレミアム</option>
                  <option value="sidebar">サイドバー</option>
                  <option value="genre">ジャンルページ</option>
                  <option value="related">関連動画</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                  掲載位置により表示効果や露出度が異なります
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                  1日あたりの価格 (円) <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min={0}
                  step={100}
                  className="w-full rounded-md border border-gray-300 dark:border-dark-border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-surface dark:text-dark-text-primary"
                />
                <div className="mt-1 flex items-start">
                  <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-1 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    推奨価格帯: {currentTypePrice.min}円〜{currentTypePrice.max}円
                    {formData.price === 0 && " (無料掲載も可能ですが、有料掲載の方が優先表示されます)"}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                YouTube URL <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="flex items-center">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Youtube className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="youtubeUrl"
                    value={formData.youtubeUrl}
                    onChange={handleYouTubeUrlChange}
                    required
                    className="w-full rounded-md border border-gray-300 dark:border-dark-border pl-10 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-dark-surface dark:text-dark-text-primary"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                YouTubeの動画URLを入力してください。サムネイルは自動的に取得されます。
              </p>
            </div>
            
            {/* サムネイルプレビュー */}
            {formData.youtube_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                  サムネイルプレビュー
                </label>
                <div className="mt-1">
                  <img
                    src={thumbnailUrl}
                    alt="YouTube サムネイル"
                    className="h-32 object-cover rounded-md"
                  />
                </div>
              </div>
            )}
            
            {/* 価格設定に関する説明 */}
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">価格設定のガイドライン</h3>
              <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-disc pl-4">
                <li>掲載価格は0円から設定可能ですが、有料掲載の方が優先的に表示されます</li>
                <li>掲載位置によって推奨価格が異なります（プレミアム枠が最も露出度が高く、効果的です）</li>
                <li>初期は低価格から始めて、効果を見ながら調整することをお勧めします</li>
                <li>アクセス数や掲載効果は「分析」タブで確認できます</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm font-medium text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.youtube_id}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50"
            >
              {loading ? '保存中...' : (slot ? '更新する' : '作成する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
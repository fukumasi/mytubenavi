// src/components/youtuber/YoutubeSyncButton.tsx

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useYoutuberSync } from '@/hooks/useYoutuberSync';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface YoutubeSyncButtonProps {
  onSyncComplete?: () => void;
  className?: string;
  buttonText?: string;
  showStatus?: boolean;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const YoutubeSyncButton: React.FC<YoutubeSyncButtonProps> = ({
  onSyncComplete,
  className = '',
  buttonText = 'YouTube同期',
  showStatus = true
}) => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { syncChannel } = useYoutuberSync(); // useYoutuberSyncフックを使用

  const handleSync = async () => {
    try {
      setStatus('syncing');
      setStatusMessage('YouTubeデータを同期中...');
      
      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      // ユーザーに紐づくYouTuberプロファイルを取得
      const { data: youtuberProfile, error: profileError } = await supabase
        .from('youtubers')
        .select('id, channel_url')
        .eq('user_id', user.id)
        .single();

      if (profileError || !youtuberProfile) {
        throw new Error('YouTuberプロファイルが見つかりません');
      }

      // YouTubeチャンネルURL（API連携用）
      const channelUrl = youtuberProfile.channel_url;
      if (!channelUrl) {
        throw new Error('チャンネルURLが設定されていません');
      }

      // syncChannelメソッドを使用して同期を実行
      const syncResult = await syncChannel(channelUrl);
      
      setStatus('success');
      setStatusMessage(`同期完了: ${syncResult.syncedVideosCount}件の動画を同期しました`);
      
      // 完了コールバックを呼び出し
      if (onSyncComplete) {
        onSyncComplete();
      }
      
      // 一定時間後にステータスをリセット
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 5000);
      
    } catch (error: any) {
      console.error('YouTube同期エラー:', error);
      setStatus('error');
      setStatusMessage(error.message || 'YouTube同期に失敗しました');
      
      // エラーの場合も一定時間後にリセット
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 5000);
    }
  };

  // ステータスアイコンの表示
  const renderStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <LoadingSpinner size="sm" className="mr-2" />;
      case 'success':
        return <FontAwesomeIcon icon={faCheck} className="mr-2 text-green-500" />;
      case 'error':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-yellow-500" />;
      default:
        return <FontAwesomeIcon icon={faSync} className="mr-2" />;
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case 'syncing':
        return 'bg-blue-400 hover:bg-blue-400 cursor-not-allowed';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleSync}
        disabled={status === 'syncing'}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${getButtonColor()} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
        aria-label="YouTube動画を同期する"
      >
        {renderStatusIcon()}
        {buttonText}
      </button>
      
      {showStatus && statusMessage && (
        <div 
          className={`mt-2 text-xs ${
            status === 'success' ? 'text-green-600' : 
            status === 'error' ? 'text-red-600' : 'text-blue-600'
          }`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default YoutubeSyncButton;
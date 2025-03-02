import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FixYoutubeIds() {
  const [status, setStatus] = useState('準備完了');
  const [count, setCount] = useState(0);
  
  const extractYoutubeIdFromThumbnail = async () => {
    setStatus('処理中...');
    
    try {
      // サムネイルURLを持ち、YouTube IDが空の動画を取得
      const { data, error } = await supabase
        .from('videos')
        .select('id, thumbnail')
        .is('youtube_id', null)
        .like('thumbnail', '%ytimg.com/vi/%')
        .gt('review_count', 0);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setStatus('更新対象のデータがありません');
        return;
      }
      
      setStatus(`${data.length}件の処理を開始します...`);
      
      let updatedCount = 0;
      
      for (const video of data) {
        const match = video.thumbnail.match(/\/vi\/([^\/]+)\//);
        if (match && match[1]) {
          const youtubeId = match[1];
          
          // YouTube IDを更新
          const { error: updateError } = await supabase
            .from('videos')
            .update({ youtube_id: youtubeId })
            .eq('id', video.id);
          
          if (!updateError) {
            updatedCount++;
            setCount(updatedCount);
          }
        }
      }
      
      setStatus(`処理完了: ${updatedCount}件更新しました`);
    } catch (err) {
      console.error('エラー:', err);
      setStatus(`エラーが発生しました: ${err}`);
    }
  };
  
  return (
    <div className="p-8 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">YouTube ID修正ツール</h2>
      <div className="mb-4">
        <p className="mb-2">ステータス: {status}</p>
        {count > 0 && <p>更新件数: {count}</p>}
      </div>
      <button 
        onClick={extractYoutubeIdFromThumbnail}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        サムネイルからYouTube IDを抽出して更新
      </button>
    </div>
  );
}
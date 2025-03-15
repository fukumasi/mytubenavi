import { useState, useEffect } from 'react';

interface YouTubeThumbnailProps {
  youtubeId: string;
  className?: string;
  height?: string | number;
  alt?: string;
}

export default function YouTubeThumbnail({ 
  youtubeId, 
  className = "", 
  height = "120px",
  alt = "YouTube サムネイル" 
}: YouTubeThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 複数のサムネイルURLを試す
  const thumbnailUrls = [
    `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${youtubeId}/default.jpg`,
    `https://img.youtube.com/vi/${youtubeId}/0.jpg`,
    `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
    // バックアップとしてプレースホルダー画像を使用
    '/placeholder.jpg'
  ];

  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [displayUrl, setDisplayUrl] = useState(thumbnailUrls[0]);

  useEffect(() => {
    console.log(`YouTubeThumbnail コンポーネントがマウント: ID=${youtubeId}`);
    setCurrentUrlIndex(0);
    setDisplayUrl(thumbnailUrls[0]);
    setIsLoaded(false);
    setError(false);
  }, [youtubeId]);

  const handleImageError = () => {
    console.log(`画像読み込みエラー: ${displayUrl}`);
    setError(true);
    
    // 次のURLを試す
    if (currentUrlIndex < thumbnailUrls.length - 1) {
      const nextIndex = currentUrlIndex + 1;
      setCurrentUrlIndex(nextIndex);
      setDisplayUrl(thumbnailUrls[nextIndex]);
    }
  };

  const handleImageLoad = () => {
    console.log(`画像読み込み成功: ${displayUrl}`);
    setIsLoaded(true);
    setError(false);
  };

  return (
    <div className="youtube-thumbnail">
      {/* YouTubeIDが存在する場合のみ表示 */}
      {youtubeId && (
        <>
          <img
            src={displayUrl}
            alt={alt}
            className={`${className} ${isLoaded ? 'block' : 'hidden'}`}
            style={{ height: height }}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          {/* ローディング中表示 */}
          {!isLoaded && !error && (
            <div 
              className="flex items-center justify-center bg-gray-100" 
              style={{ height }}
            >
              <span className="text-sm text-gray-500">サムネイル読み込み中...</span>
            </div>
          )}
        </>
      )}
      
      {/* YouTubeIDがない場合 */}
      {!youtubeId && (
        <div 
          className="flex items-center justify-center bg-gray-100" 
          style={{ height }}
        >
          <span className="text-sm text-gray-500">サムネイルがありません</span>
        </div>
      )}
    </div>
  );
}
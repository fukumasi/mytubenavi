// src/components/shared/PromotionCard.tsx（修正版）
import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Info, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnalyticsTracker from './AnalyticsTracker';

interface PromotionCardProps {
  bookingId: string;
  videoId: string;
  youtubeId?: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  position: 'sidebar' | 'top' | 'related' | 'genre' | 'featured';
  className?: string;
  promoted?: boolean;
  description?: string;
  viewCount?: number;
  duration?: string;
}

export default function PromotionCard({
  bookingId,
  videoId,
  youtubeId,
  title,
  channelName,
  thumbnailUrl,
  position,
  className = '',
  promoted = true,
  description,
  viewCount,
  duration
}: PromotionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 再生時間をフォーマット
  const formatDuration = (duration?: string) => {
    if (!duration) return '';
    
    // ISO 8601形式の期間をパース (PT1H30M15S形式)
    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return '';
    
    const hours = matches[1] ? parseInt(matches[1], 10) : 0;
    const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
    const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // 視聴回数をフォーマット
  const formatViewCount = (count?: number) => {
    if (!count) return '';
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M回視聴`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K回視聴`;
    } else {
      return `${count}回視聴`;
    }
  };

  // コンポーネントの可視性を監視
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const isIntersecting = entry.isIntersecting;
          setIsVisible(isIntersecting);
          
          if (isIntersecting && !hasBeenVisible) {
            setHasBeenVisible(true);
          }
        });
      },
      { 
        threshold: 0.1, // 10%以上表示された場合に可視とみなす
        rootMargin: '0px' // ビューポートの端から0pxの位置から観測
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [hasBeenVisible]);

  // 広告スタイルは配置場所によって異なる
  const getCardStyle = () => {
    switch (position) {
      case 'sidebar':
        return 'flex flex-col w-full mb-4 rounded-lg overflow-hidden shadow-sm hover:shadow-md';
      case 'top':
        return 'flex md:flex-row flex-col md:items-center w-full mb-6 p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg shadow-sm hover:shadow-md';
      case 'related':
        return 'flex flex-row items-start mb-3 p-2 hover:bg-gray-50 rounded-lg';
      case 'genre':
        return 'flex flex-col w-full mb-4 rounded-lg overflow-hidden shadow-sm hover:shadow-md';
      case 'featured':
        return 'flex flex-col w-full mb-4 rounded-lg overflow-hidden shadow-md hover:shadow-lg border border-blue-100';
      default:
        return 'flex flex-col w-full mb-4 rounded-lg overflow-hidden shadow-sm hover:shadow-md';
    }
  };

  const getThumbnailStyle = () => {
    switch (position) {
      case 'sidebar':
        return 'w-full aspect-video object-cover rounded-t-lg';
      case 'top':
        return 'md:w-40 w-full md:h-24 aspect-video object-cover rounded-lg md:mr-4 mb-2 md:mb-0';
      case 'related':
        return 'w-24 h-16 object-cover rounded-lg mr-3 flex-shrink-0';
      case 'genre':
        return 'w-full aspect-video object-cover rounded-t-lg';
      case 'featured':
        return 'w-full aspect-video object-cover rounded-t-lg';
      default:
        return 'w-full aspect-video object-cover rounded-t-lg';
    }
  };

  const getContentStyle = () => {
    switch (position) {
      case 'sidebar':
      case 'genre':
      case 'featured':
        return 'p-2 flex-grow';
      case 'top':
        return 'flex-grow overflow-hidden';
      case 'related':
        return 'flex-grow overflow-hidden';
      default:
        return 'p-2 flex-grow';
    }
  };

  // 内部ビデオページへのリンク（YouTube IDを無視）
  const videoUrl = `/video/${videoId}`;

  const cardClasses = `${getCardStyle()} ${className} relative transition-all duration-200 ${
    isHovered ? 'transform-gpu scale-[1.02]' : ''
  }`;

  return (
    <AnalyticsTracker bookingId={bookingId} isVisible={isVisible && hasBeenVisible}>
      <div
        id={`promotion-${bookingId}`}
        ref={cardRef}
        className={cardClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* プロモーションラベル */}
        {promoted && (
          <div className="absolute top-2 right-2 bg-blue-600 bg-opacity-90 text-white text-xs px-1.5 py-0.5 rounded-md z-10 flex items-center shadow-sm backdrop-blur-sm">
            <Info className="w-3 h-3 mr-1" />
            <span>PR</span>
          </div>
        )}

        {/* サムネイル部分 */}
        <div className="relative overflow-hidden">
          <Link 
            to={videoUrl} 
            className="block"
          >
            <img
              src={thumbnailUrl || '/placeholder.jpg'}
              alt={title}
              className={`${getThumbnailStyle()} transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
              loading="lazy"
            />
            
            {/* 再生時間表示 */}
            {duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                {formatDuration(duration)}
              </div>
            )}
            
            {/* ホバー時のオーバーレイ */}
            <div className={`absolute inset-0 bg-black transition-opacity duration-300 flex items-center justify-center ${
              isHovered ? 'bg-opacity-30 opacity-100' : 'bg-opacity-0 opacity-0'
            }`}>
              <div className="bg-white bg-opacity-80 rounded-full p-2 shadow-lg transform transition-transform duration-300 scale-90 hover:scale-100">
                <Play className="text-red-600 w-6 h-6 fill-current" />
              </div>
            </div>
          </Link>
        </div>

        {/* コンテンツ部分 */}
        <div className={getContentStyle()}>
          <Link 
            to={videoUrl}
            className="block"
          >
            <h3 className={`font-medium text-gray-900 ${
              position === 'featured' ? 'text-base' : 
              (position === 'sidebar' || position === 'genre') ? 'text-sm' : 'text-xs'
            } line-clamp-2 hover:text-blue-600 transition-colors`}>
              {title}
            </h3>
          </Link>
          
          <div className="flex items-center mt-1">
            <p className="text-xs text-gray-600 truncate flex-grow">{channelName}</p>
            {viewCount && position !== 'related' && (
              <span className="text-xs text-gray-500 ml-2">{formatViewCount(viewCount)}</span>
            )}
          </div>
          
          {/* 説明文（フィーチャード広告の場合のみ表示） */}
          {description && position === 'featured' && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
          )}
          
          {/* YouTubeへのリンクボタン（オプション） */}
          {youtubeId && position !== 'related' && (
            <a 
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center mt-1 text-xs text-gray-500 hover:text-blue-600`}
              onClick={(e) => e.stopPropagation()} // メインのクリックイベントを阻止
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              <span>YouTube で見る</span>
            </a>
          )}
        </div>
      </div>
    </AnalyticsTracker>
  );
}
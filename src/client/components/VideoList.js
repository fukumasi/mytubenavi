import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const VideoListItem = React.memo(({ video }) => (
  <tr className="hover:bg-gray-100">
    <td className="p-2">
      <Link to={`/video/${video.id}`} className="block">
        <img src={video.thumbnail} alt={`${video.title}のサムネイル`} className="w-24 h-auto" loading="lazy" />
      </Link>
    </td>
    <td className="p-2">
      <Link to={`/video/${video.id}`} className="text-blue-600 hover:underline">
        {video.title}
      </Link>
    </td>
    <td className="p-2">{video.channel}</td>
    <td className="p-2">{video.views.toLocaleString()}回</td>
    <td className="p-2">{video.rating}/5.0</td>
    <td className="p-2">{video.uploadDate}</td>
  </tr>
));

const LoadingPlaceholder = () => (
  <tr className="animate-pulse">
    <td className="p-2"><div className="bg-gray-300 w-24 h-16"></div></td>
    <td className="p-2"><div className="bg-gray-300 h-4 w-3/4"></div></td>
    <td className="p-2"><div className="bg-gray-300 h-4 w-1/2"></div></td>
    <td className="p-2"><div className="bg-gray-300 h-4 w-1/4"></div></td>
    <td className="p-2"><div className="bg-gray-300 h-4 w-1/4"></div></td>
    <td className="p-2"><div className="bg-gray-300 h-4 w-1/2"></div></td>
  </tr>
);

const VideoList = ({ videos, loading, error }) => {
  const [displayCount, setDisplayCount] = useState(20);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      >= document.documentElement.offsetHeight - 100
    ) {
      setDisplayCount(prevCount => Math.min(prevCount + 20, videos.length));
    }
  }, [videos.length]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" aria-busy="true" aria-label="動画一覧を読み込み中">
          <thead>
            <tr>
              <th className="p-2 text-left bg-gray-200">サムネイル</th>
              <th className="p-2 text-left bg-gray-200">タイトル</th>
              <th className="p-2 text-left bg-gray-200">チャンネル</th>
              <th className="p-2 text-left bg-gray-200">再生回数</th>
              <th className="p-2 text-left bg-gray-200">評価</th>
              <th className="p-2 text-left bg-gray-200">投稿日</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <LoadingPlaceholder key={index} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4" role="alert">
        動画の読み込み中にエラーが発生しました。後でもう一度お試しください。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" aria-label="動画一覧">
        <thead>
          <tr>
            <th className="p-2 text-left bg-gray-200">サムネイル</th>
            <th className="p-2 text-left bg-gray-200">タイトル</th>
            <th className="p-2 text-left bg-gray-200">チャンネル</th>
            <th className="p-2 text-left bg-gray-200">再生回数</th>
            <th className="p-2 text-left bg-gray-200">評価</th>
            <th className="p-2 text-left bg-gray-200">投稿日</th>
          </tr>
        </thead>
        <tbody>
          {videos.slice(0, displayCount).map(video => (
            <VideoListItem key={video.id} video={video} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(VideoList);
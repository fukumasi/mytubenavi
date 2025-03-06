// src/components/home/AdsSection.tsx

import './AdsSection.css';

interface AdProps {
  id: string;
  title: string;
  imageUrl: string;
  link: string;
  channelName: string;
  views: string;
}

const adsData: AdProps[] = [
  {
    id: "ads-1",
    title: '有料掲載動画1',
    imageUrl: '/placeholder.jpg',
    link: '#',
    channelName: 'チャンネル名1',
    views: '10.2万回視聴'
  },
  {
    id: "ads-2",
    title: '有料掲載動画2',
    imageUrl: '/placeholder.jpg',
    link: '#',
    channelName: 'チャンネル名2',
    views: '8.5万回視聴'
  }
];

const adFrameStyle = {
  width: '100%',
  height: '150px',
  backgroundColor: '#f0f0f0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '14px',
  color: '#777',
  borderRadius: '0.375rem',
  boxShadow: '0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px 0 rgba(0,0,0,.06)',
};

const mobileAdFrameStyle = {
  width: '100%',
  height: '100px',
  backgroundColor: '#f0f0f0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '12px',
  color: '#777',
  borderRadius: '0.375rem',
  boxShadow: '0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px 0 rgba(0,0,0,.06)',
};

export default function AdsSection() {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 有料掲載枠 */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
        <h2 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">有料掲載動画</h2>
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {adsData.map((ad) => (
              <a
                key={ad.id}
                href={ad.link}
                className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex flex-row sm:block">
                  <div className="w-2/5 sm:w-full aspect-video relative">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black bg-opacity-70 text-white text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded">
                      {ad.views}
                    </div>
                  </div>
                  <div className="w-3/5 sm:w-full p-2 sm:p-3">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                      {ad.title}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {ad.channelName}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 広告枠 */}
      <div className="bg-gray-100 p-3 sm:p-4 rounded-lg shadow-md">
        <h2 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">広告枠</h2>
        {/* モバイル用広告フレーム */}
        <div className="block sm:hidden" style={mobileAdFrameStyle}>
          広告表示
        </div>
        {/* デスクトップ用広告フレーム */}
        <div className="hidden sm:block" style={adFrameStyle}>
          広告表示
        </div>
      </div>
    </div>
  );
}
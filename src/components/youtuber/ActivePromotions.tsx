import  {  } from 'react';
import { Eye, Clock, ExternalLink } from 'lucide-react';

interface Promotion {
  id: string;
  title: string;
  thumbnail: string;
  slotType: string;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
}

interface ActivePromotionsProps {
  promotions: Promotion[];
}

export default function ActivePromotions({ promotions }: ActivePromotionsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">掲載中の動画</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {promotions.map((promo) => (
          <div key={promo.id} className="p-6 flex items-start space-x-4">
            <div className="relative flex-shrink-0 w-48">
              <img
                src={promo.thumbnail}
                alt={promo.title}
                className="w-full h-27 object-cover rounded-lg"
              />
              <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                掲載中
              </span>
            </div>

            <div className="flex-grow">
              <h3 className="text-sm font-medium text-gray-900">{promo.title}</h3>
              
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>
                    {promo.startDate} 〜 {promo.endDate}
                  </span>
                </div>
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {promo.impressions.toLocaleString()} 回表示
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-3">
                <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  プレビュー
                </button>
                <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  詳細レポート
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {promo.slotType}
              </span>
              <div className="mt-2 text-sm text-gray-500">
                CTR: {((promo.clicks / promo.impressions) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
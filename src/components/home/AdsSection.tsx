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

export default function AdsSection() {
 return (
   <div className="bg-gray-100 rounded-lg p-4 mb-8">
     <h2 className="text-lg font-semibold text-gray-900 mb-4">有料掲載動画</h2>
     <div className="relative">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         {adsData.map((ad) => (
           <a 
             key={ad.id}
             href={ad.link}
             className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
           >
             <div className="aspect-video relative">
               <img 
                 src={ad.imageUrl} 
                 alt={ad.title} 
                 className="w-full h-full object-cover"
               />
               <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                 {ad.views}
               </div>
             </div>
             <div className="p-3">
               <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                 {ad.title}
               </h3>
               <p className="text-xs text-gray-600">
                 {ad.channelName}
               </p>
             </div>
           </a>
         ))}
       </div>
     </div>
   </div>
 );
}
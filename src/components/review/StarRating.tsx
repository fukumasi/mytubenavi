import { useState } from 'react';
import { Star } from 'lucide-react';
import type { RatingValue } from '@/types';

interface StarRatingProps {
 rating: number;
 onRatingChange?: (rating: RatingValue) => void;
 readOnly?: boolean;
 size?: 'sm' | 'md' | 'lg';
 showNumber?: boolean;
 className?: string;
}

export function StarRating({
 rating,
 onRatingChange,
 readOnly = false,
 size = 'md',
 showNumber = true,
 className = ''
}: StarRatingProps) {
 const [hoverRating, setHoverRating] = useState(0);

 const getStarSize = (size: 'sm' | 'md' | 'lg'): number => {
   switch (size) {
     case 'sm': return 14;
     case 'lg': return 24;
     default: return 18;
   }
 };

 const getStarGap = (size: 'sm' | 'md' | 'lg'): string => {
   switch (size) {
     case 'sm': return 'gap-0.5';
     case 'lg': return 'gap-2';
     default: return 'gap-1';
   }
 };

 const getFontSize = (size: 'sm' | 'md' | 'lg'): string => {
   switch (size) {
     case 'sm': return 'text-xs';
     case 'lg': return 'text-base';
     default: return 'text-sm';
   }
 };

 const handleClick = (selectedRating: number) => {
   if (!readOnly && onRatingChange) {
     onRatingChange(selectedRating as RatingValue);
   }
 };

 const handleMouseEnter = (value: number) => {
   if (!readOnly) {
     setHoverRating(value);
   }
 };

 const handleMouseLeave = () => {
   if (!readOnly) {
     setHoverRating(0);
   }
 };

 const renderStars = () => {
   return [...Array(5)].map((_, index) => {
     const starValue = index + 1;
     const isActive = starValue <= (hoverRating || rating);
     const fillPercentage = 
       starValue <= Math.floor(rating) ? 100 :
       starValue - 1 < rating ? Math.floor((rating % 1) * 100) : 0;
     
     return (
       <button
         key={starValue}
         type="button"
         onClick={() => handleClick(starValue)}
         onMouseEnter={() => handleMouseEnter(starValue)}
         className={`
           ${!readOnly ? 'cursor-pointer group' : 'cursor-default'}
           relative inline-flex items-center justify-center
           ${!readOnly && 'hover:scale-110'}
           transition-transform duration-200 ease-out
           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
           disabled:opacity-50
         `}
         disabled={readOnly}
         title={`${starValue}点`}
         aria-label={`${starValue}点${isActive ? '（選択中）' : ''}`}
       >
         <Star
           size={getStarSize(size)}
           className={`
             absolute
             ${isActive ? 'text-yellow-400' : 'text-gray-200'}
             transition-colors duration-200
           `}
           fill={isActive ? 'currentColor' : 'none'}
           strokeWidth={1.5}
         />
         <div
           className="text-yellow-400 overflow-hidden transition-all duration-200"
           style={{ 
             width: `${fillPercentage}%`,
             position: 'relative',
             height: getStarSize(size),
           }}
         >
           <Star
             size={getStarSize(size)}
             fill="currentColor"
             strokeWidth={1.5}
           />
         </div>
       </button>
     );
   });
 };

 return (
   <div 
     className={`inline-flex items-center ${getStarGap(size)} ${className}`}
     onMouseLeave={handleMouseLeave}
     role="group"
     aria-label={`星評価: ${rating}点`}
   >
     {renderStars()}
     {showNumber && (
       <span className={`${getFontSize(size)} text-gray-600 font-medium ml-1.5`}>
         {rating > 0 ? rating.toFixed(1) : readOnly ? '-' : '評価なし'}
       </span>
     )}
   </div>
 );
}

export default StarRating;
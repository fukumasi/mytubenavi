// src/components/ui/LoadingSpinner.tsx

import React from 'react';

interface LoadingSpinnerProps {
 size?: 'sm' | 'md' | 'lg';
 color?: string;
 className?: string;
 message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
 size = 'md', 
 color = 'blue', 
 className = '',
 message
}) => {
 const sizeClasses = {
   sm: 'h-4 w-4',
   md: 'h-8 w-8',
   lg: 'h-12 w-12'
 };
 
 const colorClasses = {
   blue: 'border-blue-600',
   indigo: 'border-indigo-600',
   purple: 'border-purple-600',
   red: 'border-red-600',
   green: 'border-green-600',
   gray: 'border-gray-600'
 };
 
 // 指定されたcolorがcolorClassesに存在するか確認
 const borderColorClass = colorClasses[color as keyof typeof colorClasses] || 'border-blue-600';

 return (
   <div className={`inline-flex items-center ${className}`} role="status" aria-live="polite">
     <div className={`
       animate-spin rounded-full 
       border-2 border-t-transparent
       ${borderColorClass}
       ${sizeClasses[size]}
     `} 
     aria-hidden="true"
     />
     {message && (
       <span className="ml-2 text-sm text-gray-700">{message}</span>
     )}
     {/* スクリーンリーダー用のテキスト */}
     {!message && (
       <span className="sr-only">読み込み中...</span>
     )}
   </div>
 );
};

export default LoadingSpinner;
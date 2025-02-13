// src/components/ui/LoadingSpinner.tsx

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
 }
 
 export default function LoadingSpinner({ 
  size = 'md', 
  color = 'indigo-600' 
 }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
 
  return (
    <div className="flex justify-center items-center">
      <div className={`
        animate-spin rounded-full 
        border-b-2 border-${color}
        ${sizeClasses[size]}
      `} />
    </div>
  );
 }
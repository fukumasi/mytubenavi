import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export default function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">入力エラー</h3>
          <div className="mt-1 text-sm text-red-700">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
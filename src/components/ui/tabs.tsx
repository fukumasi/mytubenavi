// src/components/ui/tabs.tsx
import React, { createContext, useContext, useState } from 'react';

// タブコンテキストの型定義
type TabsContextType = {
  activeTab: string;
  setActiveTab: (value: string) => void;
};

// タブコンテキストの作成
const TabsContext = createContext<TabsContextType | undefined>(undefined);

// タブコンテキストを使用するためのカスタムフック
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs component');
  }
  return context;
};

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  defaultValue,
  value,
  onValueChange,
  className,
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState<string>(defaultValue || '');
  
  // 制御されたコンポーネントか非制御されたコンポーネントかを判断
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalValue;
  
  const setActiveTab = (newValue: string) => {
    // 非制御の場合は内部状態を更新
    if (!isControlled) {
      setInternalValue(newValue);
    }
    // コールバックが提供されている場合は呼び出し
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList: React.FC<TabsListProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <div 
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className || ""}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  children, 
  value,
  className,
  ...props 
}) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;
  
  return (
    <button 
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all 
        ${isActive 
          ? 'bg-white text-gray-950 shadow-sm' 
          : 'hover:bg-gray-50'} 
        ${className || ""}`}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
  children, 
  value,
  className,
  ...props 
}) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;
  
  if (!isActive) return null;
  
  return (
    <div 
      className={`mt-2 ${className || ""}`} 
      {...props}
    >
      {children}
    </div>
  );
};
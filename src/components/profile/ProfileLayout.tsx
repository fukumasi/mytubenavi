import React, { ReactNode } from 'react';

interface ProfileLayoutProps {
  children: ReactNode;
}

const ProfileLayout: React.FC<ProfileLayoutProps> = ({ children }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* メインコンテンツ - サイドバーを削除 */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
};

export default ProfileLayout;
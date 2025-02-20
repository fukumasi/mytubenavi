// src/components/profile/ProfileAvatar.tsx
import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProfileAvatarProps {
  url?: string | null;
  onUpload: (url: string) => void;
  size?: number;
}

export function ProfileAvatar({ url, onUpload, size = 150 }: ProfileAvatarProps) {
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('画像を選択してください');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onUpload(data.publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('画像のアップロードに失敗しました。');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img
        src={url || '/default-avatar.jpg'}
        alt="プロフィール画像"
        className="rounded-full object-cover w-full h-full"
        style={{ width: size, height: size }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity">
        <label className="cursor-pointer">
          <Upload className="w-6 h-6 text-white" />
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </label>
      </div>
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}
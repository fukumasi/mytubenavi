// src/components/youtuber/ThumbnailTest.tsx
import React from 'react';

const ThumbnailTest: React.FC = () => {
  const youtubeIds = ['2EFzDIHPvCE']; // テスト用のID
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', margin: '20px 0' }}>
      <h2 style={{ marginBottom: '10px' }}>サムネイルテスト</h2>
      <div>
        {youtubeIds.map(id => (
          <div key={id} style={{ marginBottom: '10px' }}>
            <p>ID: {id}</p>
            <img 
              src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
              alt="サムネイル"
              style={{ width: '320px', height: 'auto', border: '1px solid #ccc' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThumbnailTest;
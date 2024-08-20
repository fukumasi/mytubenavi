import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useDropzone } from 'react-dropzone';

// ... (既存のスタイルコンポーネント)

const ImageUploader = ({ onImageUpload }) => {
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setError(null);
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください。');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onImageUpload(file);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: false
  });

  return (
    <div>
      <UploadContainer {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>ここにファイルをドロップしてください...</p>
        ) : (
          <p>クリックまたはドラッグ＆ドロップで画像をアップロード</p>
        )}
      </UploadContainer>
      {preview && <Preview src={preview} alt="プレビュー" />}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
};

export default ImageUploader;
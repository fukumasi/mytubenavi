import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const DropzoneContainer = styled.div`
  border: 2px dashed #cccccc;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
`;

const UploadedImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  margin-top: 20px;
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
`;

const ImageUploader = ({ onImageUpload }) => {
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) {
      setError('ファイルがアップロードされませんでした。');
      return;
    }

    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const storageRef = ref(storage, `images/${fileName}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setUploadedImageUrl(downloadURL);
      onImageUpload(downloadURL);
      setError(null);
    } catch (err) {
      setError('画像のアップロードに失敗しました。もう一度お試しください。');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div>
      <DropzoneContainer {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>ここにファイルをドロップしてください...</p>
        ) : (
          <p>ここをクリックするか、ファイルをドラッグ＆ドロップしてください</p>
        )}
      </DropzoneContainer>
      {uploadedImageUrl && <UploadedImage src={uploadedImageUrl} alt="Uploaded" />}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
};

export default ImageUploader;
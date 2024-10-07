import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const DropzoneContainer = styled.div`
  border: 2px dashed #cccccc;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  transition: border-color 0.3s ease;

  &:hover {
    border-color: #007bff;
  }
`;

const UploadedImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  margin-top: 20px;
  border-radius: 50%;
  object-fit: cover;
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 10px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-top: 10px;
`;

const ProgressFill = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  background-color: #007bff;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
`;

const ImageUploader = ({ onImageUpload }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) {
      setError(t('fileUploadError'));
      return;
    }

    try {
      setError(null);
      setUploadProgress(0);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const storageRef = ref(storage, `profileImages/${currentUser.uid}/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          setError(t('imageUploadError') + ': ' + error.message);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Download URL:', downloadURL); // For debugging
            setUploadedImageUrl(downloadURL);
            onImageUpload(file, downloadURL);
            setUploadProgress(100);
          } catch (error) {
            console.error('Error getting download URL:', error);
            setError(t('imageUrlError') + ': ' + error.message);
          }
        }
      );
    } catch (err) {
      console.error('Unexpected error during image upload:', err);
      setError(t('unexpectedError') + ': ' + err.message);
    }
  }, [onImageUpload, t, currentUser]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: false
  });

  return (
    <div>
      <DropzoneContainer {...getRootProps()}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>{t('dropFileHere')}</p>
        ) : (
          <p>{t('dragDropOrClick')}</p>
        )}
      </DropzoneContainer>
      {previewUrl && <UploadedImage src={previewUrl} alt={t('uploadPreview')} />}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <ProgressBar>
          <ProgressFill progress={uploadProgress} />
        </ProgressBar>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {uploadedImageUrl && <p>Uploaded image URL: {uploadedImageUrl}</p>} {/* For debugging */}
    </div>
  );
};

export default ImageUploader;
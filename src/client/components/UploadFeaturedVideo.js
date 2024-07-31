import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 500px;
  margin: 0 auto;
`;

const Input = styled.input`
  padding: 10px;
`;

const TextArea = styled.textarea`
  padding: 10px;
`;

const Button = styled.button`
  padding: 10px;
  background-color: #0066cc;
  color: white;
  border: none;
  cursor: pointer;
`;

const UploadFeaturedVideo = () => {
  const [videoData, setVideoData] = useState({
    videoId: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    startDate: '',
    endDate: ''
  });

  const handleChange = (e) => {
    setVideoData({ ...videoData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/featured-videos', videoData);
      alert('動画が正常にアップロードされました。');
      setVideoData({
        videoId: '',
        title: '',
        description: '',
        thumbnailUrl: '',
        startDate: '',
        endDate: ''
      });
    } catch (error) {
      alert('動画のアップロード中にエラーが発生しました。');
    }
  };

  return (
    <UploadForm onSubmit={handleSubmit}>
      <h2>有料掲載動画をアップロード</h2>
      <Input
        type="text"
        name="videoId"
        value={videoData.videoId}
        onChange={handleChange}
        placeholder="YouTube Video ID"
        required
      />
      <Input
        type="text"
        name="title"
        value={videoData.title}
        onChange={handleChange}
        placeholder="タイトル"
        required
      />
      <TextArea
        name="description"
        value={videoData.description}
        onChange={handleChange}
        placeholder="説明"
        rows="4"
      />
      <Input
        type="url"
        name="thumbnailUrl"
        value={videoData.thumbnailUrl}
        onChange={handleChange}
        placeholder="サムネイルURL"
      />
      <Input
        type="date"
        name="startDate"
        value={videoData.startDate}
        onChange={handleChange}
        required
      />
      <Input
        type="date"
        name="endDate"
        value={videoData.endDate}
        onChange={handleChange}
        required
      />
      <Button type="submit">アップロード</Button>
    </UploadForm>
  );
};

export default UploadFeaturedVideo;
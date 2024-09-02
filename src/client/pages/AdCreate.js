import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.input`
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  min-height: 100px;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-weight: bold;
`;

const SuccessMessage = styled.p`
  color: green;
  font-weight: bold;
`;

const Preview = styled.div`
  margin-top: 20px;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
`;

const VideoContainer = styled.div`
  position: relative;
  padding-bottom: 56.25%; /* 16:9 アスペクト比 */
  height: 0;
  overflow: hidden;
  margin-bottom: 15px;
`;

const VideoFrame = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
`;

const TagInput = styled.input`
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const TagButton = styled.button`
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #218838;
  }
`;

const TagList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
`;

const Tag = styled.li`
  background-color: #f0f0f0;
  padding: 5px 10px;
  margin: 5px;
  border-radius: 20px;
  display: flex;
  align-items: center;
`;

const RemoveTagButton = styled.button`
  background: none;
  border: none;
  color: #ff0000;
  cursor: pointer;
  margin-left: 5px;
`;

const AdCreate = () => {
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    displayDateStart: '',
    displayDateEnd: '',
    price: '',
    description: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const youtubeIdMatch = formData.youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (youtubeIdMatch) {
      setVideoId(youtubeIdMatch[1]);
    } else {
      setVideoId('');
    }
  }, [formData.youtubeUrl]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await axios.post('/api/ad-videos', { ...formData, tags });
      setSuccess('広告が正常に作成されました。');
      setTimeout(() => navigate('/ad-management'), 2000);
    } catch (err) {
      setError('広告の作成に失敗しました。');
      console.error('Error creating ad:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Container>
      <Title>新規広告作成</Title>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      <Form onSubmit={handleSubmit}>
        <Label htmlFor="youtubeUrl">YouTube URL:</Label>
        <Input
          type="url"
          id="youtubeUrl"
          name="youtubeUrl"
          value={formData.youtubeUrl}
          onChange={handleChange}
          required
        />

        <Label htmlFor="displayDateStart">表示開始日:</Label>
        <Input
          type="date"
          id="displayDateStart"
          name="displayDateStart"
          value={formData.displayDateStart}
          onChange={handleChange}
          required
        />

        <Label htmlFor="displayDateEnd">表示終了日:</Label>
        <Input
          type="date"
          id="displayDateEnd"
          name="displayDateEnd"
          value={formData.displayDateEnd}
          onChange={handleChange}
          required
        />

        <Label htmlFor="price">価格:</Label>
        <Input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          required
          min="0"
        />

        <Label htmlFor="description">説明:</Label>
        <TextArea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <Label>タグ:</Label>
        <div>
          <TagInput
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="新しいタグを入力"
          />
          <TagButton type="button" onClick={handleAddTag}>追加</TagButton>
        </div>
        <TagList>
          {tags.map((tag, index) => (
            <Tag key={index}>
              {tag}
              <RemoveTagButton onClick={() => handleRemoveTag(tag)}>&times;</RemoveTagButton>
            </Tag>
          ))}
        </TagList>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? '作成中...' : '広告を作成'}
        </Button>
      </Form>

      {videoId && (
        <Preview>
          <h3>プレビュー</h3>
          <VideoContainer>
            <VideoFrame
              src={`https://www.youtube.com/embed/${videoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </VideoContainer>
        </Preview>
      )}
    </Container>
  );
};

export default AdCreate;

// TODO: 広告のターゲティング設定の追加（年齢層、性別、地域など）
// TODO: 広告予算の設定と管理機能の追加
// TODO: 広告のスケジュール設定（時間帯、曜日指定など）
// TODO: 広告クリエイティブの複数バージョン管理
// TODO: 広告の自動最適化設定（パフォーマンスに基づく調整）
// TODO: 類似広告のサジェスト機能
// TODO: 広告のABテスト設定
// TODO: 広告の承認ワークフローの実装
// TODO: 広告のパフォーマンス予測機能
// TODO: 広告のコンプライアンスチェック機能
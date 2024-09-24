import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

// Styled components remain unchanged...

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
  const { db } = useFirebase();
  const { user } = useAuth();

  useEffect(() => {
    const youtubeIdMatch = formData.youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    setVideoId(youtubeIdMatch ? youtubeIdMatch[1] : '');
  }, [formData.youtubeUrl]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const adData = {
        ...formData,
        tags,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'ad-videos'), adData);
      setSuccess('広告が正常に作成されました。');
      setTimeout(() => navigate('/ad-management'), 2000);
    } catch (err) {
      setError('広告の作成に失敗しました。');
      console.error('Error creating ad:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = useCallback(() => {
    if (newTag && !tags.includes(newTag)) {
      setTags(prevTags => [...prevTags, newTag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setTags(prevTags => prevTags.filter(tag => tag !== tagToRemove));
  }, []);

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
          <TagButton type="button" onClick={handleAddTag}>
            <FaPlus /> 追加
          </TagButton>
        </div>
        <TagList>
          {tags.map((tag, index) => (
            <Tag key={index}>
              {tag}
              <RemoveTagButton onClick={() => handleRemoveTag(tag)}>
                <FaTimes />
              </RemoveTagButton>
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
              title="広告プレビュー"
            />
          </VideoContainer>
        </Preview>
      )}
    </Container>
  );
};

export default React.memo(AdCreate);

// TODO: エラーハンドリングの改善
// TODO: フォームのバリデーション強化
// TODO: ユーザーフィードバックの改善（例：トースト通知）
// TODO: 広告のプレビュー機能の拡張
// TODO: タグ入力のオートコンプリート機能
// TODO: 広告作成のキャンセル機能
// TODO: 下書き保存機能
// TODO: 広告のカテゴリ選択機能
// TODO: 広告の公開/非公開設定
// TODO: 広告のターゲティング設定（年齢層、地域など）
// TODO: 支払い情報の入力と決済処理の統合
// TODO: 広告のパフォーマンス予測機能
// TODO: 類似広告の提案機能
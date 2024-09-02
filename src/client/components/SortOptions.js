import React from 'react';
import styled from 'styled-components';

const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SortSelect = styled.select`
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const DirectionButton = styled.button`
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: ${props => props.$isActive ? '#007bff' : '#fff'};
  color: ${props => props.$isActive ? '#fff' : '#000'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.$isActive ? '#0056b3' : '#e9ecef'};
  }
`;

const SortOptions = ({ sortConfig, onSort }) => {
  const handleSortChange = (e) => {
    onSort({ key: e.target.value, direction: sortConfig.direction });
  };

  const handleDirectionChange = (newDirection) => {
    onSort({ key: sortConfig.key, direction: newDirection });
  };

  return (
    <SortContainer>
      <span>並び替え:</span>
      <SortSelect
        value={sortConfig.key}
        onChange={handleSortChange}
        aria-label="並び替えの基準を選択"
      >
        <option value="relevance">関連度</option>
        <option value="date">アップロード日</option>
        <option value="viewCount">視聴回数</option>
        <option value="rating">評価</option>
        <option value="category">カテゴリー</option>
        <option value="duration">動画の長さ</option>
      </SortSelect>
      <DirectionButton
        onClick={() => handleDirectionChange('ascending')}
        $isActive={sortConfig.direction === 'ascending'}
        aria-label="昇順に並び替え"
      >
        昇順
      </DirectionButton>
      <DirectionButton
        onClick={() => handleDirectionChange('descending')}
        $isActive={sortConfig.direction === 'descending'}
        aria-label="降順に並び替え"
      >
        降順
      </DirectionButton>
    </SortContainer>
  );
};

export default SortOptions;
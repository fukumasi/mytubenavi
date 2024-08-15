import React from 'react';
import styled from 'styled-components';

const SortContainer = styled.div`
  display: flex;
  align-items: center;
`;

const SortSelect = styled.select`
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-left: 10px;
`;

const SortOptions = ({ sortConfig, onSort }) => {
  return (
    <SortContainer>
      <span>並び替え:</span>
      <SortSelect
        value={sortConfig.key}
        onChange={(e) => onSort(e.target.value)}
      >
        <option value="relevance">関連度</option>
        <option value="date">アップロード日</option>
        <option value="viewCount">視聴回数</option>
        <option value="rating">評価</option>
      </SortSelect>
    </SortContainer>
  );
};

export default SortOptions;
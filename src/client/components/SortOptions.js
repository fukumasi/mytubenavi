import React, { useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const SortContainer = styled.div`
  display: flex;
  flex-direction: column;
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
  background-color: ${props => props.$isActive ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.$isActive ? props.theme.colors.background : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.$isActive ? props.theme.colors.primaryDark : props.theme.colors.backgroundLight};
  }
`;

const DirectionContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const AdditionalOptionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const sortOptions = [
  { value: 'relevance', label: '関連度', group: '関連性' },
  { value: 'title', label: 'タイトル', group: '関連性' },
  { value: 'viewCount', label: '視聴回数', group: '統計' },
  { value: 'likeCount', label: '高評価数', group: '統計' },
  { value: 'commentCount', label: 'コメント数', group: '統計' },
  { value: 'date', label: 'アップロード日', group: '時間' },
  { value: 'duration', label: '動画の長さ', group: '時間' },
  { value: 'rating', label: '評価', group: '評価' },
  { value: 'category', label: 'カテゴリー', group: 'その他' },
];

const SortOptions = ({ sortConfig, onSort, additionalOptions, onAdditionalOptionChange }) => {
  const handleSortChange = (e) => {
    onSort({ ...sortConfig, key: e.target.value });
  };

  const handleDirectionChange = (newDirection) => {
    onSort({ ...sortConfig, direction: newDirection });
  };

  const groupedOptions = useMemo(() => {
    return sortOptions.reduce((acc, option) => {
      if (!acc[option.group]) {
        acc[option.group] = [];
      }
      acc[option.group].push(option);
      return acc;
    }, {});
  }, []);

  return (
    <SortContainer>
      <label htmlFor="sort-select">並び替え:</label>
      <SortSelect
        id="sort-select"
        value={sortConfig.key}
        onChange={handleSortChange}
        aria-label="並び替えの基準を選択"
      >
        {Object.entries(groupedOptions).map(([group, options]) => (
          <optgroup key={group} label={group}>
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </optgroup>
        ))}
      </SortSelect>
      <DirectionContainer>
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
      </DirectionContainer>
      {additionalOptions && (
        <AdditionalOptionsContainer>
          {Object.entries(additionalOptions).map(([key, value]) => (
            <CheckboxLabel key={key}>
              <input
                type="checkbox"
                checked={value}
                onChange={() => onAdditionalOptionChange(key)}
                id={`additional-option-${key}`}
              />
              <span>{key}</span>
            </CheckboxLabel>
          ))}
        </AdditionalOptionsContainer>
      )}
    </SortContainer>
  );
};

SortOptions.propTypes = {
  sortConfig: PropTypes.shape({
    key: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['ascending', 'descending']).isRequired,
  }).isRequired,
  onSort: PropTypes.func.isRequired,
  additionalOptions: PropTypes.object,
  onAdditionalOptionChange: PropTypes.func,
};

export default SortOptions;
// src\client\components\FilterOptions.js
import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const FilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FilterGroup = styled.fieldset`
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
`;

const FilterLegend = styled.legend`
  font-weight: bold;
`;

const FilterSelect = styled.select`
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
  width: 100%;
`;

const FilterLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const FilterInput = styled.input`
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const FilterCheckbox = styled.input`
  margin-right: 5px;
`;

const FilterOptions = ({ filters, onFilterChange }) => {
  const handleFilterChange = (filterType, value) => {
    onFilterChange({ ...filters, [filterType]: value });
  };

  return (
    <FilterContainer>
      <FilterGroup>
        <FilterLegend>検索設定</FilterLegend>
        <FilterLabel htmlFor="keyword">
          キーワード
          <FilterInput
            id="keyword"
            type="text"
            value={filters.keyword || ''}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            placeholder="検索キーワード"
          />
        </FilterLabel>
      </FilterGroup>

      <FilterGroup>
        <FilterLegend>時間</FilterLegend>
        <FilterLabel htmlFor="date">
          アップロード日
          <FilterSelect
            id="date"
            value={filters.date || 'any'}
            onChange={(e) => handleFilterChange('date', e.target.value)}
          >
            <option value="any">すべて</option>
            <option value="hour">1時間以内</option>
            <option value="today">今日</option>
            <option value="this_week">今週</option>
            <option value="this_month">今月</option>
            <option value="this_year">今年</option>
          </FilterSelect>
        </FilterLabel>
        <FilterLabel htmlFor="duration">
          動画の長さ
          <FilterSelect
            id="duration"
            value={filters.duration || 'any'}
            onChange={(e) => handleFilterChange('duration', e.target.value)}
          >
            <option value="any">すべて</option>
            <option value="short">4分以下</option>
            <option value="medium">4〜20分</option>
            <option value="long">20分以上</option>
          </FilterSelect>
        </FilterLabel>
      </FilterGroup>

      <FilterGroup>
        <FilterLegend>コンテンツ</FilterLegend>
        <FilterLabel htmlFor="category">
          カテゴリー
          <FilterSelect
            id="category"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">すべて</option>
            <option value="music">音楽</option>
            <option value="sports">スポーツ</option>
            <option value="gaming">ゲーム</option>
            <option value="education">教育</option>
            <option value="entertainment">エンターテイメント</option>
            <option value="news">ニュース</option>
            <option value="other">その他</option>
          </FilterSelect>
        </FilterLabel>
        <FilterLabel htmlFor="caption">
          字幕
          <FilterSelect
            id="caption"
            value={filters.caption || 'any'}
            onChange={(e) => handleFilterChange('caption', e.target.value)}
          >
            <option value="any">すべて</option>
            <option value="closedCaption">クローズドキャプション</option>
            <option value="subtitles">字幕</option>
          </FilterSelect>
        </FilterLabel>
      </FilterGroup>

      <FilterGroup>
        <FilterLegend>その他</FilterLegend>
        <FilterLabel htmlFor="liveContent">
          ライブ配信
          <FilterSelect
            id="liveContent"
            value={filters.liveContent || 'any'}
            onChange={(e) => handleFilterChange('liveContent', e.target.value)}
          >
            <option value="any">すべて</option>
            <option value="live">ライブ中</option>
            <option value="completed">終了済み</option>
            <option value="upcoming">予定</option>
          </FilterSelect>
        </FilterLabel>
        <FilterLabel>
          <FilterCheckbox
            type="checkbox"
            checked={filters.highDefinition || false}
            onChange={(e) => handleFilterChange('highDefinition', e.target.checked)}
          />
          高画質のみ
        </FilterLabel>
        <FilterLabel>
          <FilterCheckbox
            type="checkbox"
            checked={filters.creativeCommons || false}
            onChange={(e) => handleFilterChange('creativeCommons', e.target.checked)}
          />
          クリエイティブ・コモンズ
        </FilterLabel>
      </FilterGroup>
    </FilterContainer>
  );
};

FilterOptions.propTypes = {
  filters: PropTypes.shape({
    keyword: PropTypes.string,
    date: PropTypes.string,
    duration: PropTypes.string,
    category: PropTypes.string,
    caption: PropTypes.string,
    liveContent: PropTypes.string,
    highDefinition: PropTypes.bool,
    creativeCommons: PropTypes.bool,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default FilterOptions;
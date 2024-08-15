import React from 'react';
import styled from 'styled-components';

const FilterContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const FilterSelect = styled.select`
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const FilterOptions = ({ dateFilter, durationFilter, onFilterChange }) => {
  return (
    <FilterContainer>
      <FilterSelect
        value={dateFilter}
        onChange={(e) => onFilterChange('date', e.target.value)}
      >
        <option value="any">アップロード日: すべて</option>
        <option value="today">今日</option>
        <option value="this_week">今週</option>
        <option value="this_month">今月</option>
        <option value="this_year">今年</option>
      </FilterSelect>
      <FilterSelect
        value={durationFilter}
        onChange={(e) => onFilterChange('duration', e.target.value)}
      >
        <option value="any">動画の長さ: すべて</option>
        <option value="short">4分以下</option>
        <option value="medium">4〜20分</option>
        <option value="long">20分以上</option>
      </FilterSelect>
    </FilterContainer>
  );
};

export default FilterOptions;
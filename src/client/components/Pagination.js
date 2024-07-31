import React from 'react';
import styled from 'styled-components';

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const PageButton = styled.button`
  margin: 0 5px;
  padding: 5px 10px;
  background-color: ${props => props.active ? '#1a73e8' : '#f0f0f0'};
  color: ${props => props.active ? 'white' : 'black'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <PaginationContainer>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <PageButton
          key={page}
          onClick={() => onPageChange(page)}
          disabled={page === currentPage}
          active={page === currentPage}
        >
          {page}
        </PageButton>
      ))}
    </PaginationContainer>
  );
};

export default Pagination;
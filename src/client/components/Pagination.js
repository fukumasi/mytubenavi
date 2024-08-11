import React from 'react';
import styled from 'styled-components';

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
`;

const PageButton = styled.button`
  margin: 0 5px;
  padding: 5px 10px;
  border: 1px solid #ccc;
  background-color: ${props => props.$active ? '#007bff' : 'white'};
  color: ${props => props.$active ? 'white' : 'black'};
  cursor: pointer;

  &:hover {
    background-color: ${props => props.$active ? '#007bff' : '#e9ecef'};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const Ellipsis = styled.span`
  margin: 0 5px;
`;

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pageNumbers.push(1);

    if (currentPage > 3) {
      pageNumbers.push('...');
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pageNumbers.push(i);
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }

    pageNumbers.push(totalPages);

    return pageNumbers;
  };

  return (
    <PaginationContainer>
      <PageButton 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
      >
        前へ
      </PageButton>
      {getPageNumbers().map((number, index) => (
        number === '...' ? (
          <Ellipsis key={`ellipsis-${index}`}>...</Ellipsis>
        ) : (
          <PageButton
            key={number}
            onClick={() => onPageChange(number)}
            $active={currentPage === number}
          >
            {number}
          </PageButton>
        )
      ))}
      <PageButton 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
      >
        次へ
      </PageButton>
    </PaginationContainer>
  );
};

export default Pagination;
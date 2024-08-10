import React from 'react';
import styled from 'styled-components';

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  margin: 0 5px;
  padding: 5px 10px;
  border: 1px solid #ccc;
  background-color: ${props => props.active ? '#007bff' : 'white'};
  color: ${props => props.active ? 'white' : 'black'};
  cursor: pointer;
  
  &:hover {
    background-color: #e9ecef;
  }
`;

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = [];
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      pageNumbers.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }
  }

  return (
    <PaginationContainer>
      {pageNumbers.map((number, index) => (
        <PageButton
          key={index}
          onClick={() => number !== '...' && onPageChange(number)}
          active={currentPage === number}
          disabled={number === '...'}
        >
          {number}
        </PageButton>
      ))}
    </PaginationContainer>
  );
};

export default Pagination;
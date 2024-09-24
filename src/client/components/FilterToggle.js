// src\client\components\FilterToggle.js
import styled from "styled-components";

const FilterToggle = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.small};
  cursor: pointer;
  margin-bottom: ${({ theme }) => theme.spacing.medium};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

export default FilterToggle;
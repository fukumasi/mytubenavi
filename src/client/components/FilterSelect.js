import styled from 'styled-components';

const FilterSelect = styled.select`
  padding: ${({ theme }) => theme.spacing.small};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
`;

export default FilterSelect;

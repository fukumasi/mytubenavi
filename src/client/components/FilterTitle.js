import styled from "styled-components";

const FilterTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing.small};
  font-size: ${({ theme }) => theme.fontSizes.large};
  color: ${({ theme }) => theme.colors.primary};
`;

export default FilterTitle;

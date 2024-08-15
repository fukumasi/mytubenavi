import styled from "styled-components";

const FilterContainerResponsive = styled.div`
  display: ${({ isVisible }) => (isVisible ? "block" : "none")};
  @media (min-width: 768px) {
    display: block;
  }
  background-color: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.medium};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  box-shadow: ${({ theme }) => theme.boxShadow.medium};
`;

export default FilterContainerResponsive;

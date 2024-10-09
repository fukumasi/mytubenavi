import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const ThreeColumnLayoutWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 15px;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
`;

const Column = styled.div`
  padding: 15px;
  width: 100%;
`;

const LeftColumn = styled(Column)`
  flex: 0 0 180px;
  min-width: 180px;

  @media (min-width: 1025px) {
    order: 1;
  }

  @media (max-width: 1024px) {
    order: 2;
  }
`;

const MainColumn = styled(Column)`
  flex: 1;
  min-width: 500px;

  @media (min-width: 1025px) {
    order: 2;
  }

  @media (max-width: 1024px) {
    order: 1;
  }
`;

const RightColumn = styled(Column)`
  flex: 0 0 180px;
  min-width: 180px;

  @media (min-width: 1025px) {
    order: 3;
  }

  @media (max-width: 1024px) {
    order: 3;
  }
`;

const ThreeColumnLayout = ({ children, leftColumn, mainColumn, rightColumn }) => (
  <ThreeColumnLayoutWrapper>
    <LeftColumn>{leftColumn}</LeftColumn>
    <MainColumn>{mainColumn}</MainColumn>
    <RightColumn>{rightColumn}</RightColumn>
    {children}
  </ThreeColumnLayoutWrapper>
);

ThreeColumnLayout.propTypes = {
  children: PropTypes.node,
  leftColumn: PropTypes.node,
  mainColumn: PropTypes.node,
  rightColumn: PropTypes.node,
};

export default ThreeColumnLayout;
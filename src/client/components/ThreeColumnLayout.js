import React from 'react';
import styled from 'styled-components';

const ThreeColumnLayout = styled.div`
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

ThreeColumnLayout.LeftColumn = styled(Column)`
  flex: 1;
  min-width: 200px;

  @media (min-width: 1025px) {
    order: 1;
  }

  @media (max-width: 1024px) {
    order: 2;
  }
`;

ThreeColumnLayout.MainColumn = styled(Column)`
  flex: 2;
  min-width: 300px;

  @media (min-width: 1025px) {
    order: 2;
  }

  @media (max-width: 1024px) {
    order: 1;
  }
`;

ThreeColumnLayout.RightColumn = styled(Column)`
  flex: 1;
  min-width: 200px;

  @media (min-width: 1025px) {
    order: 3;
  }

  @media (max-width: 1024px) {
    order: 3;
  }
`;

export default ThreeColumnLayout;
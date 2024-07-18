import React from 'react';
import styled from 'styled-components';

const AdContainer = styled.div`
  background-color: #ffd700;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
`;

const AdSpace = ({ text }) => {
  return (
    <AdContainer>
      {text}
    </AdContainer>
  );
};

export default AdSpace;
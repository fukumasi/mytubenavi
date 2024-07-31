import React from 'react';
import styled from 'styled-components';

const AdContainer = styled.div`
  background-color: #ffd700;
  padding: 20px;
  text-align: center;
  font-weight: bold;
  border-radius: 4px;
`;

const AdSpace = ({ text }) => {
  return (
    <AdContainer>
      {text}
    </AdContainer>
  );
};

export default AdSpace;
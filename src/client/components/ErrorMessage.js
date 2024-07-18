import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  background-color: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 4px;
  margin: 16px 0;
  text-align: center;
`;

const ErrorMessage = ({ message }) => (
  <ErrorContainer>
    <p>{message}</p>
  </ErrorContainer>
);

export default ErrorMessage;
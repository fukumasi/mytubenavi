import React from "react";
import styled from "styled-components";

const ErrorContainer = styled.div`
  background-color: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 4px;
  margin: 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ErrorText = styled.p`
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #c62828;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  margin-left: 16px;
`;

const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <ErrorContainer>
      <ErrorText>{message}</ErrorText>
      {onClose && (
        <CloseButton onClick={onClose} aria-label="Close error message">
          &times;
        </CloseButton>
      )}
    </ErrorContainer>
  );
};

export default ErrorMessage;
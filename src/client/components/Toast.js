import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ToastContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 4px;
  animation: ${fadeIn} 0.3s ease-out;
  color: white;
  background-color: ${props => 
    props.type === 'success' ? '#4caf50' : 
    props.type === 'error' ? '#f44336' : 
    props.type === 'info' ? '#2196f3' : '#ff9800'
  };
`;

const Toast = ({ message, type = 'info' }) => {
  return (
    <ToastContainer type={type}>
      {message}
    </ToastContainer>
  );
};

export default Toast;
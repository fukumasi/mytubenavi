// src\client\components\ErrorBoundary.js
import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  padding: 20px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin: 20px 0;
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // ここでエラーログを送信するロジックを追加できます
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <h1>Something went wrong.</h1>
          <p>We're sorry for the inconvenience. Please try refreshing the page or contact support if the problem persists.</p>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
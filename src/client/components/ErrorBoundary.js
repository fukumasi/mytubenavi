import React from "react";
import styled from "styled-components";

const ErrorContainer = styled.div`
  padding: 20px;
  margin: 20px;
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  color: #b71c1c;
`;

const ErrorTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 10px;
`;

const ErrorMessage = styled.p`
  font-size: 16px;
  margin-bottom: 15px;
`;

const ReloadButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #1976d2;
  }
`;

const ErrorDetails = styled.details`
  margin-top: 20px;
  
  summary {
    cursor: pointer;
    color: #2196f3;
  }
  
  pre {
    margin-top: 10px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    overflow-x: auto;
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
    // ここでエラーログサービスにエラーを送信できます
    // 例: logErrorToMyService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>エラーが発生しました</ErrorTitle>
          <ErrorMessage>
            申し訳ありません。予期せぬエラーが発生しました。問題が解決しない場合は、サポートまでお問い合わせください。
          </ErrorMessage>
          <ReloadButton onClick={this.handleReload}>
            ページを再読み込み
          </ReloadButton>
          {process.env.NODE_ENV === 'development' && (
            <ErrorDetails>
              <summary>エラーの詳細（開発モードのみ）</summary>
              <pre>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
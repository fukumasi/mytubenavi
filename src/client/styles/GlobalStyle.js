import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  :root {
    --font-size-small: 0.8rem;
    --font-size-medium: 1rem;
    --font-size-large: 1.2rem;
    --font-size-xlarge: 1.5rem;
    --spacing-small: 0.5rem;
    --spacing-medium: 1rem;
    --spacing-large: 1.5rem;
    --border-radius: 4px;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    transition: all 0.3s ease-in-out;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: var(--spacing-medium);
    line-height: 1.2;
  }

  p {
    margin-bottom: var(--spacing-medium);
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: color 0.2s ease-in-out;
    
    &:hover {
      color: ${({ theme }) => theme.colors.primaryDark};
      text-decoration: underline;
    }
  }

  button {
    cursor: pointer;
    font-size: var(--font-size-medium);
    padding: var(--spacing-small) var(--spacing-medium);
    border: none;
    border-radius: var(--border-radius);
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: ${({ theme }) => theme.colors.primaryDark};
    }

    &:disabled {
      background-color: ${({ theme }) => theme.colors.disabled};
      cursor: not-allowed;
    }
  }

  input, textarea, select {
    font-size: var(--font-size-medium);
    padding: var(--spacing-small);
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: var(--border-radius);
    background-color: ${({ theme }) => theme.colors.inputBackground};
    color: ${({ theme }) => theme.colors.text};

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }

  img {
    max-width: 100%;
    height: auto;
  }

  @media (max-width: 768px) {
    html {
      font-size: 14px;
    }

    h1 {
      font-size: var(--font-size-xlarge);
    }

    h2 {
      font-size: var(--font-size-large);
    }
  }

  @media (max-width: 480px) {
    html {
      font-size: 12px;
    }
  }
`;

export default GlobalStyle;
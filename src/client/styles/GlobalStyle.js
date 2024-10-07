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
    --color-primary: #4285F4;
    --color-secondary: #34A853;
    --color-accent1: #FBBC05;
    --color-accent2: #EA4335;
    --color-background: #F8F9FA;
    --color-text: #202124;
    --color-text-light: #5F6368;
    --color-border: #DADCE0;
    --color-hover: #E8F0FE;
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
    font-family: 'Roboto', Arial, sans-serif;
    line-height: 1.6;
    background-color: var(--color-background);
    color: var(--color-text);
    margin: 0;
    padding: 0;
  }

  .container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    max-width: 1440px;
    margin: 0 auto;
    padding: 20px;
  }

  .left-column,
  .right-column {
    width: 250px;
  }

  .main-content {
    flex-grow: 1;
    min-width: 500px;
    margin: 0 20px;
  }

  a {
    color: var(--color-primary);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .genre-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 30px;
  }

  .genre-item {
    background-color: var(--color-primary);
    color: white;
    padding: 15px;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.3s ease;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .genre-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .genre-icon {
    font-size: 24px;
    margin-bottom: 10px;
  }

  .sub-genre-list ul {
    list-style-type: none;
    padding: 0;
  }

  .sub-genre-list li {
    margin-bottom: 10px;
  }

  .video-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }

  .video-card {
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }

  .video-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  .video-thumbnail {
    width: 100%;
    height: 0;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    position: relative;
    overflow: hidden;
  }

  .video-thumbnail img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-info {
    padding: 15px;
  }

  .video-title {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 5px;
  }

  .video-channel {
    font-size: 14px;
    color: var(--color-text-light);
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  .pagination button {
    margin: 0 5px;
    padding: 8px 12px;
    background-color: #ffffff;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .pagination button:hover {
    background-color: var(--color-hover);
  }

  .pagination button.active {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .ad-space {
    background-color: var(--color-accent1);
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    text-align: center;
    color: var(--color-text);
  }

  .search-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .search-form {
    display: flex;
    margin-bottom: 20px;
  }

  .search-form input {
    flex-grow: 1;
    padding: 12px;
    font-size: 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px 0 0 4px;
  }

  .search-form button {
    padding: 12px 24px;
    font-size: 16px;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .search-form button:hover {
    background-color: #3367d6;
  }

  .error-message {
    color: var(--color-accent2);
    margin-bottom: 20px;
    padding: 10px;
    background-color: #ffebee;
    border-radius: 4px;
  }

  .video-detail {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .video-container {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .video-info {
    margin-bottom: 20px;
  }

  .video-description {
    background-color: #ffffff;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 1200px) {
    .container {
      flex-direction: column;
    }

    .left-column,
    .right-column,
    .main-content {
      width: 100%;
      margin: 0;
    }

    .main-content {
      min-width: auto;
    }

    .genre-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 992px) {
    .genre-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .video-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .search-form {
      flex-direction: column;
    }

    .search-form input,
    .search-form button {
      width: 100%;
      border-radius: 4px;
    }

    .search-form button {
      margin-top: 10px;
    }

    .genre-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .video-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }

  @media (max-width: 576px) {
    .genre-grid {
      grid-template-columns: 1fr;
    }

    .video-grid {
      grid-template-columns: 1fr;
    }

    .pagination button {
      padding: 6px 10px;
      font-size: 14px;
    }
  }
`;

export default GlobalStyle;
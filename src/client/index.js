import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles/index.css';  // このパスを修正

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
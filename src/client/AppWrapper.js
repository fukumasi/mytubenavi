// AppWrapper.js
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom'; // この行を削除

const AppWrapper = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  );
};

export default AppWrapper;

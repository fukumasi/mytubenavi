import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import Search from './components/Search';
// 他のコンポーネントも同様に更新

const App = () => {
  return (
    <Router>
      <div>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          {/* 他のルートも必要に応じて追加 */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
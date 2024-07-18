import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from '../../src/client/components/Header';

test('renders header with navigation links', () => {
  render(
    <Router>
      <Header />
    </Router>
  );
  
  expect(screen.getByText(/MyTubeNavi/i)).toBeInTheDocument();
  expect(screen.getByText(/Home/i)).toBeInTheDocument();
  expect(screen.getByText(/Search/i)).toBeInTheDocument();
});
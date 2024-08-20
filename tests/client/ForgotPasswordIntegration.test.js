import React from 'react'; // Reactをインポート
import { render } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom'; // Routerをインポート
import ForgotPassword from '../../src/client/pages/ForgotPassword';
import { ThemeProvider } from 'styled-components';
import theme from '../../src/client/styles/theme';

describe('ForgotPassword Component', () => {
  it('renders ForgotPassword component', () => {
    const { getByText } = render(
      <ThemeProvider theme={theme.light}>
        <Router> {/* Routerでラップ */}
          <ForgotPassword />
        </Router>
      </ThemeProvider>
    );
    // 他のアサーション
  });
});

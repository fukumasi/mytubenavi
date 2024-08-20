import React from 'react';  // Reactをインポート
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import theme from '../../src/client/styles/theme';
import Register from '../../src/client/pages/Register';

describe('Register Integration', () => {
  it('successfully registers a new user', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme.light}>
          <Register />
        </ThemeProvider>
      </MemoryRouter>
    );
    // 他のアサーション
  });
});

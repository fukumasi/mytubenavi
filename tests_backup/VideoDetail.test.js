import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route } from 'react-router-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import VideoDetail from '../../src/client/pages/VideoDetail';

const server = setupServer(
  rest.get('/api/videos/:id', (req, res, ctx) => {
    return res(ctx.json({
      id: '123',
      title: 'Test Video',
      description: 'Test Description',
      views: 1000,
      uploadDate: '2021-01-01',
      channelName: 'Test Channel',
      channelThumbnail: 'test-thumbnail.jpg'
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui, { route = '/video/123' } = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Route path="/video/:id">
          {ui}
        </Route>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('VideoDetail', () => {
  it('renders video details', async () => {
    renderWithProviders(<VideoDetail />);

    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('1,000 回視聴')).toBeInTheDocument();
      expect(screen.getByText('2021/1/1')).toBeInTheDocument();
      expect(screen.getByText('Test Channel')).toBeInTheDocument();
    });
  });

  it('allows adding a comment', async () => {
    renderWithProviders(<VideoDetail />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('コメントを追加...')).toBeInTheDocument();
    });

    // コメント追加のテストをここに追加
  });

  it('displays error message when video details fetch fails', async () => {
    server.use(
      rest.get('/api/videos/:id', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'サーバーエラー' }));
      })
    );

    renderWithProviders(<VideoDetail />);

    await waitFor(() => {
      expect(screen.getByText(/動画の詳細を取得できませんでした。エラー:/)).toBeInTheDocument();
    });
  });
});
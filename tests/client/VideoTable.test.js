import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import VideoTable from '../../src/client/components/VideoTable';
import { defaultTheme } from '../../src/client/styles/theme';

const mockVideos = [
  {
    id: '1',
    title: 'Test Video 1',
    channelTitle: 'Test Channel 1',
    thumbnails: { medium: { url: 'http://example.com/thumbnail1.jpg' } },
    statistics: { viewCount: '1000' },
    publishedAt: '2023-01-01T00:00:00Z',
    contentDetails: { duration: 'PT1H30M' }
  },
  {
    id: '2',
    title: 'Test Video 2',
    channelTitle: 'Test Channel 2',
    thumbnails: { medium: { url: 'http://example.com/thumbnail2.jpg' } },
    statistics: { viewCount: '2000' },
    publishedAt: '2023-01-02T00:00:00Z',
    contentDetails: { duration: 'PT45M' }
  }
];

const mockOnSort = jest.fn();
const mockSortConfig = { key: 'title', direction: 'ascending' };

const renderVideoTable = (props = {}) => {
  return render(
    <Router>
      <ThemeProvider theme={defaultTheme}>
        <VideoTable
          videos={mockVideos}
          onSort={mockOnSort}
          sortConfig={mockSortConfig}
          {...props}
        />
      </ThemeProvider>
    </Router>
  );
};

// テストの前にconsole.logでthemeオブジェクトの内容を確認
beforeAll(() => {
  console.log('Default theme object:', defaultTheme);
});

describe('VideoTable Component', () => {
  test('renders video table with correct number of rows', () => {
    renderVideoTable();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(mockVideos.length + 1); // +1 for the header row
  });

  test('displays correct video information', () => {
    renderVideoTable();
    expect(screen.getByText('Test Video 1')).toBeInTheDocument();
    expect(screen.getByText('Test Channel 1')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('2023/1/1')).toBeInTheDocument();
    expect(screen.getByText('1:30:00')).toBeInTheDocument();
  });

  test('renders "No videos found" message when no videos are provided', () => {
    renderVideoTable({ videos: [] });
    expect(screen.getByText('動画が見つかりません')).toBeInTheDocument();
  });

  test('renders sort indicators correctly', () => {
    renderVideoTable();
    const titleHeader = screen.getByText('タイトル ▲');
    expect(titleHeader).toBeInTheDocument();
  });

  test('renders thumbnail images', () => {
    renderVideoTable();
    const thumbnails = screen.getAllByRole('img');
    expect(thumbnails).toHaveLength(mockVideos.length);
    expect(thumbnails[0]).toHaveAttribute('src', 'http://example.com/thumbnail1.jpg');
  });
});
import { sortVideos } from '../../utils/sortVideos';

describe('sortVideos', () => {
  const mockVideos = [
    { title: 'B Video', views: 100 },
    { title: 'A Video', views: 200 },
    { title: 'C Video', views: 150 },
  ];

  it('sorts videos by title ascending', () => {
    const sorted = sortVideos(mockVideos, { key: 'title', direction: 'ascending' });
    expect(sorted.map(v => v.title)).toEqual(['A Video', 'B Video', 'C Video']);
  });

  it('sorts videos by views descending', () => {
    const sorted = sortVideos(mockVideos, { key: 'views', direction: 'descending' });
    expect(sorted.map(v => v.views)).toEqual([200, 150, 100]);
  });
});
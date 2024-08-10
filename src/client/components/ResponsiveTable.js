import styled from 'styled-components';

const ResponsiveTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }
`;

const TableCell = styled.td`
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.small};
  text-align: left;
`;

const SortableTableHeader = styled.th`
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.small};
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.backgroundLight};
  }
`;

const SortIcon = styled.span`
  margin-left: ${({ theme }) => theme.spacing.xsmall};
`;

const ThumbnailImage = styled.img`
  width: 100px;
  height: auto;
`;

const VideoTitle = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

export { ResponsiveTable, Table, TableRow, TableCell, SortableTableHeader, SortIcon, ThumbnailImage, VideoTitle };

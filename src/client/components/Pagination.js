// src\client\components\Pagination.js
import React, { useMemo, useCallback } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useTranslation } from 'react-i18next';
import theme from "../styles/theme";

const PaginationContainer = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
`;

const PageButton = styled.button`
  margin: 0 5px;
  padding: 5px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${(props) => (props.$active ? theme.colors.primary : theme.colors.background)};
  color: ${(props) => (props.$active ? theme.colors.white : theme.colors.text)};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};

  &:hover {
    background-color: ${(props) => (props.$active ? theme.colors.primaryDark : theme.colors.backgroundLight)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

const Ellipsis = styled.span`
  margin: 0 5px;
`;

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useTranslation();

  const getPageNumbers = useCallback(() => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pageNumbers.push(1);

    if (currentPage > 3) {
      pageNumbers.push("...");
    }

    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pageNumbers.push(i);
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push("...");
    }

    pageNumbers.push(totalPages);

    return pageNumbers;
  }, [currentPage, totalPages]);

  const pageNumbers = useMemo(() => getPageNumbers(), [getPageNumbers]);

  return (
    <ThemeProvider theme={theme}>
      <PaginationContainer aria-label={t('pagination.label')}>
        <PageButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t('pagination.previous')}
        >
          {t('pagination.previousShort')}
        </PageButton>
        {pageNumbers.map((number, index) =>
          number === "..." ? (
            <Ellipsis key={`ellipsis-${index}`} aria-hidden="true">...</Ellipsis>
          ) : (
            <PageButton
              key={number}
              onClick={() => onPageChange(number)}
              $active={currentPage === number}
              aria-label={t('pagination.page', { page: number })}
              aria-current={currentPage === number ? 'page' : undefined}
            >
              {number}
            </PageButton>
          ),
        )}
        <PageButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={t('pagination.next')}
        >
          {t('pagination.nextShort')}
        </PageButton>
      </PaginationContainer>
    </ThemeProvider>
  );
};

export default React.memo(Pagination);

// TODO: ページサイズの選択機能の追加
// TODO: ジャンプ to ページ 機能の実装
// TODO: モバイルデバイス向けのレスポンシブデザインの改善
// TODO: キーボードナビゲーションのサポート強化
// TODO: スクリーンリーダー用のより詳細な説明の追加
// TODO: ページネーションの状態をURLに反映させる機能の追加
// TODO: アニメーション効果の追加
// TODO: パフォーマンス最適化（例：ページ数が多い場合の仮想化）
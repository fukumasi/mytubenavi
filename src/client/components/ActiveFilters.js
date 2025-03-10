// src\client\components\ActiveFilters.js
import React from "react";
import styled from "styled-components";
import { X } from "lucide-react";

const ActiveFiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing.medium};
`;

const ActiveFilter = styled.div`
  background: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: ${({ theme }) => theme.radius.small};
  display: flex;
  align-items: center;
  margin: ${({ theme }) => theme.spacing.xsmall};
  padding: ${({ theme }) => theme.spacing.xsmall}
    ${({ theme }) => theme.spacing.small};
`;

const RemoveFilterButton = styled.button`
  background: none;
  border: none;
  margin-left: ${({ theme }) => theme.spacing.xsmall};
  cursor: pointer;
  padding: 0; // ボタンのデフォルトパディングを削除
  display: flex; // アイコンを中央に配置
  align-items: center;
  justify-content: center;
`;

const ActiveFilters = ({ children }) => {
  return <ActiveFiltersContainer>{children}</ActiveFiltersContainer>;
};

const RemoveFilterIcon = () => (
  <X size={16} aria-hidden="true" />
);

export { ActiveFilters, ActiveFilter, RemoveFilterButton, RemoveFilterIcon };
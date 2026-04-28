import React from 'react';
import { localizeText, useLanguage } from '../../i18n/language';
import { PAGINATION_UI } from '../data/dashboardData';

interface PaginationBarProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (nextPage: number) => void;
  onPerPageChange: (nextPerPage: number) => void;
}

const perPageOptions = [6, 10, 20];

export const PaginationBar = React.memo(({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationBarProps) => {
  const { language } = useLanguage();
  
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <footer className="dashboard-pagination">
      <div className="dashboard-pagination-summary">
        <span>{localizeText(language, PAGINATION_UI.total)} {total}</span>
        <span>
          {localizeText(language, PAGINATION_UI.page)} {currentPage} {localizeText(language, PAGINATION_UI.of)} {totalPages}
        </span>
      </div>

      <div className="dashboard-pagination-actions">
        <label className="dashboard-select">
          <span>{localizeText(language, PAGINATION_UI.perPage)}</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            aria-label="Items per page"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        
        <button 
          type="button" 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={!canGoPrev}
        >
          {localizeText(language, PAGINATION_UI.prev)}
        </button>
        
        <button 
          type="button" 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={!canGoNext}
        >
          {localizeText(language, PAGINATION_UI.next)}
        </button>
      </div>
    </footer>
  );
});

PaginationBar.displayName = 'PaginationBar';

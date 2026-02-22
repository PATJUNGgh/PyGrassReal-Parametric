interface PaginationBarProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (nextPage: number) => void;
  onPerPageChange: (nextPerPage: number) => void;
}

const perPageOptions = [6, 10, 20];

export function PaginationBar({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <footer className="dashboard-pagination">
      <div className="dashboard-pagination-summary">
        <span>Total {total}</span>
        <span>
          Page {Math.min(page, totalPages)} of {totalPages}
        </span>
      </div>

      <div className="dashboard-pagination-actions">
        <label className="dashboard-select">
          <span>Per page</span>
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            aria-label="Items per page"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrev}>
          Previous
        </button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}>
          Next
        </button>
      </div>
    </footer>
  );
}

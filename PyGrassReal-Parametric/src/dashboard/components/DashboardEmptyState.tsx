interface DashboardEmptyStateProps {
  onCreateClick: () => void;
}

export function DashboardEmptyState({ onCreateClick }: DashboardEmptyStateProps) {
  return (
    <section className="dashboard-empty-state">
      <div className="dashboard-empty-copy">
        <h2>No workflows yet</h2>
        <p>Create your first workflow and start building node logic.</p>
      </div>
      <button 
        type="button" 
        className="dashboard-primary-button" 
        onClick={onCreateClick}
      >
        Create workflow
      </button>
    </section>
  );
}

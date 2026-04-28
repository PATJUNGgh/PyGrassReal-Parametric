import React from 'react';

export const WorkflowCardSkeleton = React.memo(() => {
  return (
    <div className="workflow-card workflow-card-skeleton" aria-hidden="true" />
  );
});

WorkflowCardSkeleton.displayName = 'WorkflowCardSkeleton';

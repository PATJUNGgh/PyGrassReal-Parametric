import React from 'react';
import type { Workflow, WorkflowStatus } from '../types/workflow.types';
import { WorkflowCard } from './WorkflowCard';
import { WorkflowCardSkeleton } from './WorkflowCardSkeleton';

interface WorkflowListProps {
  workflows: Workflow[];
  loading: boolean;
  onOpen: (workflow: Workflow) => void;
  onUpdateName: (workflow: Workflow, nextName: string) => Promise<void>;
  onDuplicate: (workflow: Workflow) => void;
  onDeleteRequest: (workflow: Workflow) => void;
}

const skeletonKeys = ['s1', 's2', 's3', 's4'];

export const WorkflowList = React.memo(({
  workflows,
  loading,
  onOpen,
  onUpdateName,
  onDuplicate,
  onDeleteRequest,
}: WorkflowListProps) => {
  if (loading) {
    return (
      <section className="workflow-list">
        {skeletonKeys.map((key) => (
          <WorkflowCardSkeleton key={key} />
        ))}
      </section>
    );
  }

  return (
    <section className="workflow-list">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          onOpen={onOpen}
          onUpdateName={onUpdateName}
          onDuplicate={onDuplicate}
          onDeleteRequest={onDeleteRequest}
        />
      ))}
    </section>
  );
});

WorkflowList.displayName = 'WorkflowList';

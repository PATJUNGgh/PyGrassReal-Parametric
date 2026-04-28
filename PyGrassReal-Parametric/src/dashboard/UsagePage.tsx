import { SubscriptionTab } from './api-management/SubscriptionTab';
import './api-management/api-management.css';

export function UsagePage() {
  return (
    <div className="api-management-page">
      <section className="api-management-content">
        <SubscriptionTab forcedSubTab="usage" />
      </section>
    </div>
  );
}

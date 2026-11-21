import { FileSearch } from 'lucide-react';
import type { ReactNode } from 'react';

export default function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="dashboard-empty-state">
      <span className="dashboard-empty-art" aria-hidden="true"><FileSearch size={26} strokeWidth={1.75} /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
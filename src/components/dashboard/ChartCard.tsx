import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export default function ChartCard({ title, subtitle, icon: Icon, action, className = '', children }: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`dashboard-card chart-card ${className}`}>
      <header className="chart-card-heading">
        <div className="chart-card-tools">
          {Icon && <span className="kpi-icon-tile" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>}
          <div><h2 className="chart-card-title">{title}</h2>{subtitle && <p className="chart-card-subtitle">{subtitle}</p>}</div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
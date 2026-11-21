import type { CSSProperties } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  change?: string;
  direction?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  accent?: string;
  series?: number[];
  hint?: string;
};

function Sparkline({ values }: { values: number[] }) {
  const width = 82;
  const height = 32;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return <svg className="kpi-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><polyline points={points} fill="none" stroke="var(--card-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function KpiCard({ label, value, change, direction = 'neutral', icon: Icon, accent = 'var(--accent-finance)', series, hint }: Props) {
  const style = { '--card-accent': accent } as CSSProperties;
  const Trend = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  return (
    <article className="dashboard-card kpi-card" style={style}>
      <div className="kpi-card-top">
        <div className="kpi-icon-tile" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></div>
        {change && <span className={`kpi-trend ${direction}`}><Trend size={13} strokeWidth={2} />{change}</span>}
      </div>
      <div className="kpi-card-bottom">
        <div><span className="kpi-card-label">{label}</span><p className="kpi-card-value">{value}</p>{hint && <span className="kpi-card-hint">{hint}</span>}</div>
        {series && <Sparkline values={series} />}
      </div>
    </article>
  );
}
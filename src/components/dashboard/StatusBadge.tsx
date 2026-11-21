import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

export default function StatusBadge({ status, language = 'en' }: { status: string; language?: 'en' | 'ar' }) {
  const posted = status === 'submitted' || status === 'approved' || status === 'paid';
  const cancelled = status === 'cancelled' || status === 'rejected';
  const label = language === 'ar'
    ? posted ? 'مرحّل' : cancelled ? 'ملغي' : 'مسودة'
    : posted ? 'Posted' : cancelled ? 'Cancelled' : 'Draft';
  const Icon = posted ? CheckCircle2 : cancelled ? XCircle : Clock3;
  return <span className={`status-badge ${posted ? 'success' : cancelled ? 'danger' : 'warning'}`}><Icon size={14} aria-hidden="true" />{label}</span>;
}
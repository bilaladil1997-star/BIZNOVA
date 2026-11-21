cd /workspaces/BIZNOVAimport { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, BookOpen, CircleDollarSign, Landmark, Plus, ReceiptText, TrendingUp, Wallet } from 'lucide-react';
import { ApiError, fetchAccounts, fetchJournalEntries, fetchTrialBalance, type AccountRecord, type AppUser, type JournalEntryRecord, type TrialBalanceReport } from '../../api';
import { financeDashboardMock, USE_MOCK_DATA } from '../../data/homeDashboard';
import KpiCard from './KpiCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

type Language = 'en' | 'ar';

const copy = {
  en: {
    eyebrow: 'FINANCE / OVERVIEW',
    title: 'Financial overview',
    subtitle: 'A clear view of cash, performance, and recent accounting activity.',
    newEntry: 'New journal entry',
    chartAccounts: 'Chart of accounts',
    cash: 'Cash position',
    revenue: 'Revenue',
    expenses: 'Expenses',
    netIncome: 'Net income',
    vsLastMonth: 'vs last month',
    revenueExpenses: 'Revenue vs expenses',
    monthlyTrend: 'Monthly trend',
    cashSplit: 'Cash position',
    cashSplitHint: 'Share of balances in 11xx accounts',
    budgetActual: 'Budget vs actual',
    budgetHint: 'Department spend against plan',
    recentEntries: 'Recent entries',
    recentHint: 'Latest posted and draft journal entries',
    viewAll: 'All entries',
    mock: 'Sample trend data',
    noCash: 'No active cash or bank balances yet.',
    noEntries: 'No journal entries yet.',
    loading: 'Loading finance data…',
    error: 'Could not load live accounting data.',
    retry: 'Retry',
    debit: 'Debit',
    credit: 'Credit',
    type: 'Type',
    entry: 'Entry',
    description: 'Description',
    status: 'Status',
    amount: 'Amount',
  },
  ar: {
    eyebrow: 'المالية / النظرة العامة',
    title: 'النظرة المالية',
    subtitle: 'نظرة واضحة على النقد والأداء وآخر النشاط المحاسبي.',
    newEntry: 'قيد يومي جديد',
    chartAccounts: 'دليل الحسابات',
    cash: 'المركز النقدي',
    revenue: 'الإيرادات',
    expenses: 'المصروفات',
    netIncome: 'صافي الدخل',
    vsLastMonth: 'مقارنة بالشهر السابق',
    revenueExpenses: 'الإيرادات والمصروفات',
    monthlyTrend: 'الاتجاه الشهري',
    cashSplit: 'المركز النقدي',
    cashSplitHint: 'توزيع أرصدة الحسابات 11xx',
    budgetActual: 'الميزانية مقابل الفعلي',
    budgetHint: 'إنفاق الأقسام مقارنة بالخطة',
    recentEntries: 'القيود الأخيرة',
    recentHint: 'أحدث القيود المرحلة والمسودات',
    viewAll: 'كل القيود',
    mock: 'بيانات اتجاهات تجريبية',
    noCash: 'لا توجد أرصدة نقدية أو بنكية نشطة بعد.',
    noEntries: 'لا توجد قيود محاسبية بعد.',
    loading: 'جارٍ تحميل البيانات المالية…',
    error: 'تعذر تحميل بيانات الحسابات الفعلية.',
    retry: 'إعادة المحاولة',
    debit: 'مدين',
    credit: 'دائن',
    type: 'النوع',
    entry: 'القيد',
    description: 'البيان',
    status: 'الحالة',
    amount: 'المبلغ',
  },
} as const;

function amount(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(value);
}

function useFinanceData(user: AppUser) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [trial, setTrial] = useState<TrialBalanceReport | null>(null);
  const [entries, setEntries] = useState<JournalEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [accountResult, trialResult, entryResult] = await Promise.all([
          fetchAccounts(),
          fetchTrialBalance(new Date().toISOString().slice(0, 10)),
          fetchJournalEntries(),
        ]);
        if (active) {
          setAccounts(accountResult.accounts);
          setTrial(trialResult);
          setEntries(entryResult.entries);
        }
      } catch (reason) {
        if (active) setError(reason instanceof ApiError);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (user.role === 'GM' || user.role === 'Accountant') load();
    else setLoading(false);
    return () => { active = false; };
  }, [retry, user.role]);

  return { accounts, trial, entries, loading, error, retry: () => setRetry((value) => value + 1) };
}

function RevenueArea({ language }: { language: Language }) {
  const data = financeDashboardMock.revenueExpenses;
  const width = 620;
  const height = 220;
  const padX = 28;
  const padY = 22;
  const max = Math.max(...data.flatMap((row) => [row.revenue, row.expenses])) * 1.12;
  const x = (index: number) => padX + (index * (width - padX * 2)) / (data.length - 1);
  const y = (value: number) => height - padY - (value / max) * (height - padY * 2);
  const line = (key: 'revenue' | 'expenses') => data.map((row, index) => `${x(index)},${y(row[key])}`).join(' ');
  const area = (key: 'revenue' | 'expenses') => `${padX},${height - padY} ${line(key)} ${width - padX},${height - padY}`;
  return (
    <>
      <div className="chart-legend">
        <span className="chart-legend-item"><i className="chart-legend-swatch" style={{ background: 'var(--accent-finance)' }} />{copy[language].revenue}</span>
        <span className="chart-legend-item"><i className="chart-legend-swatch" style={{ background: '#8b5cf6' }} />{copy[language].expenses}</span>
      </div>
      <svg className="finance-area-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={copy[language].revenueExpenses}>
        <defs>
          <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent-finance)" stopOpacity=".27" /><stop offset="1" stopColor="var(--accent-finance)" stopOpacity="0" /></linearGradient>
          <linearGradient id="expense-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".18" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 1, 2, 3].map((row) => <line key={row} x1={padX} x2={width - padX} y1={padY + row * ((height - padY * 2) / 3)} y2={padY + row * ((height - padY * 2) / 3)} stroke="var(--border)" strokeDasharray="4 6" />)}
        <polygon points={area('revenue')} fill="url(#revenue-area)" />
        <polygon points={area('expenses')} fill="url(#expense-area)" />
        <polyline points={line('revenue')} fill="none" stroke="var(--accent-finance)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={line('expenses')} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((row, index) => <text key={row.month} x={x(index)} y={height - 2} textAnchor="middle" fill="var(--text-soft)" fontSize="11">{language === 'ar' ? row.monthAr : row.month}</text>)}
      </svg>
    </>
  );
}

function CashDonut({ accounts, language }: { accounts: AccountRecord[]; language: Language }) {
  const cash = accounts.filter((account) => account.isActive && !account.isGroup && account.type === 'asset' && account.code.startsWith('11'));
  const values = cash.map((account) => ({
    name: language === 'ar' ? account.nameAr : account.nameEn,
    amount: Math.max(account.openingBalance, 0),
  })).filter((item) => item.amount > 0);
  const rows: { name: string; amount: number; color?: string }[] = values.length
    ? values
    : USE_MOCK_DATA
      ? financeDashboardMock.cashAccounts.map((item) => ({ name: language === 'ar' ? item.labelAr : item.label, amount: item.amount, color: item.color }))
      : [];
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  let offset = 0;
  const colors = ['#14b8a6', '#3b82f6', '#f5b544', '#8b5cf6'];
  if (!total) return <EmptyState title={copy[language].noCash} />;
  return (
    <div className="cash-donut-layout">
      <svg className="cash-donut" viewBox="0 0 160 160" role="img" aria-label={copy[language].cashSplit}>
        <circle cx="80" cy="80" r="58" fill="none" stroke="var(--bg-soft)" strokeWidth="18" />
        {rows.map((row, index) => {
          const length = (row.amount / total) * 364.42;
          const segment = <circle key={row.name} cx="80" cy="80" r="58" fill="none" stroke={row.color ?? colors[index % colors.length]} strokeWidth="18" strokeDasharray={`${length} ${364.42 - length}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" />;
          offset += length;
          return segment;
        })}
        <text className="cash-donut-center" x="80" y="78">{amount(total, language)}</text>
        <text className="cash-donut-caption" x="80" y="94">AED</text>
      </svg>
      <div className="cash-account-list">
        {rows.map((row, index) => <div className="cash-account-row" key={row.name}><i className="cash-account-dot" style={{ background: row.color ?? colors[index % colors.length] }} /><span>{row.name}</span><strong>{amount(row.amount, language)}</strong></div>)}
      </div>
    </div>
  );
}

function BudgetBars({ language }: { language: Language }) {
  return <div className="budget-bars">{financeDashboardMock.budgetActual.map((row) => {
    const percent = Math.min(120, Math.round((row.actual / row.budget) * 100));
    return <div className="budget-row" key={row.department}>
      <div className="budget-row-heading"><span>{language === 'ar' ? row.departmentAr : row.department}</span><strong>{amount(row.actual, language)} / {amount(row.budget, language)}</strong></div>
      <div className="budget-track"><span className={percent > 100 ? 'over' : ''} style={{ width: `${Math.min(percent, 100)}%` }} /></div>
    </div>;
  })}</div>;
}

export default function FinanceDashboard({ language, user }: { language: Language; user: AppUser }) {
  const labels = copy[language];
  const { accounts, trial, entries, loading, error, retry } = useFinanceData(user);
  const permitted = user.role === 'GM' || user.role === 'Accountant';
  const balances = trial?.rows ?? [];
  const cash = balances.filter((row) => row.type === 'asset' && row.code.startsWith('11')).reduce((sum, row) => sum + row.debit - row.credit, 0);
  const revenue = balances.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.credit - row.debit, 0);
  const expenses = balances.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.debit - row.credit, 0);
  const recent: { id: string; number?: string; entryNumber?: string; memo: string; memoAr?: string; amount: number; totalDebit?: number; status: string }[] = entries.length
    ? entries.slice(0, 5).map((entry) => ({ id: entry.id, entryNumber: entry.entryNumber, memo: entry.memo, amount: entry.totalDebit, status: entry.status }))
    : USE_MOCK_DATA ? financeDashboardMock.recentEntries.map((entry) => ({ ...entry, id: entry.number })) : [];
  const mockSeries = [18, 24, 21, 28, 32, 38];
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));

  if (!permitted) return <section className="page"><EmptyState title={labels.error} description={labels.error} /></section>;

  return (
    <section className="page finance-dashboard" data-accent="finance" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="dashboard-page-heading">
        <div><p className="dashboard-kicker">{labels.eyebrow}</p><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
        <div className="dashboard-actions"><span className="dashboard-date-label">{formatDate(new Date().toISOString().slice(0, 10))}</span><NavLink className="secondary-button" to="/accounts/chart-of-accounts"><BookOpen size={17} />{labels.chartAccounts}</NavLink><NavLink className="primary-button" to="/accounts/journal-entries"><Plus size={18} />{labels.newEntry}</NavLink></div>
      </header>
      {USE_MOCK_DATA && <span className="sample-data-label">{labels.mock}</span>}
      {error && <div className="inline-alert" role="alert">{labels.error}<button className="text-button" onClick={retry} type="button">{labels.retry}</button></div>}
      {loading ? <div className="dashboard-bento"><div className="dashboard-card kpi-card" /><div className="dashboard-card chart-card" /></div> : <div className="dashboard-bento">
        <div className="finance-kpis">
          <KpiCard label={labels.cash} value={amount(cash, language)} change={USE_MOCK_DATA ? '+4.8%' : undefined} direction="up" icon={Wallet} series={USE_MOCK_DATA ? mockSeries : undefined} />
          <KpiCard label={labels.revenue} value={amount(revenue, language)} change={USE_MOCK_DATA ? '+12.4%' : undefined} direction="up" icon={TrendingUp} accent="#3b82f6" series={USE_MOCK_DATA ? [17, 19, 22, 21, 29, 34] : undefined} />
          <KpiCard label={labels.expenses} value={amount(expenses, language)} change={USE_MOCK_DATA ? '+2.1%' : undefined} direction="down" icon={ReceiptText} accent="#8b5cf6" series={USE_MOCK_DATA ? [15, 17, 19, 18, 20, 23] : undefined} />
          <KpiCard label={labels.netIncome} value={amount(revenue - expenses, language)} change={USE_MOCK_DATA ? '+8.3%' : undefined} direction="up" icon={BadgeDollarSign} accent="#16a34a" series={USE_MOCK_DATA ? [12, 14, 14, 17, 22, 27] : undefined} />
        </div>
        <ChartCard title={labels.revenueExpenses} subtitle={labels.monthlyTrend} icon={TrendingUp} className="finance-revenue">
          {USE_MOCK_DATA ? <RevenueArea language={language} /> : <EmptyState title={labels.noEntries} description={labels.monthlyTrend} />}
        </ChartCard>
        <ChartCard title={labels.cashSplit} subtitle={labels.cashSplitHint} icon={CircleDollarSign} className="finance-cash">
          <CashDonut accounts={accounts} language={language} />
        </ChartCard>
        <ChartCard title={labels.budgetActual} subtitle={labels.budgetHint} icon={ArrowUpRight} className="finance-budget">
          {USE_MOCK_DATA ? <BudgetBars language={language} /> : <EmptyState title={labels.noEntries} description={labels.budgetHint} />}
        </ChartCard>
        <ChartCard title={labels.recentEntries} subtitle={labels.recentHint} icon={Landmark} className="finance-recent" action={<NavLink className="dashboard-link" to="/accounts/journal-entries">{labels.viewAll}</NavLink>}>
          {recent.length ? <div className="recent-entry-list">
            <div className="recent-entry-head"><span>{labels.entry}</span><span>{labels.description}</span><span>{labels.amount}</span><span>{labels.status}</span></div>
            {recent.map((entry) => <div className="recent-entry-row" key={entry.id ?? entry.number}>
              <span className="journal-number">{entry.entryNumber ?? entry.number}</span>
              <span className="recent-entry-description">{language === 'ar' ? entry.memoAr ?? entry.memo : entry.memo}</span>
              <strong>{amount(entry.totalDebit ?? entry.amount, language)}</strong>
              <StatusBadge status={entry.status} language={language} />
            </div>)}
          </div> : <EmptyState title={labels.noEntries} action={<NavLink className="dashboard-link" to="/accounts/journal-entries">{labels.newEntry}</NavLink>} />}
        </ChartCard>
      </div>}
    </section>
  );
}
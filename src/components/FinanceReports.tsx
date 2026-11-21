import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ApiError, fetchAccounts, fetchGeneralLedger, fetchTrialBalance, type AccountRecord, type AppUser, type GeneralLedgerReport, type TrialBalanceReport } from '../api';

type Language = 'en' | 'ar';
export type FinanceReportMode = 'overview' | 'trial-balance' | 'general-ledger';

const currentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const copy = {
  en: {
    eyebrow: 'Financial reporting',
    overviewTitle: 'Financial overview',
    trialTitle: 'Trial balance',
    ledgerTitle: 'General ledger',
    overviewHint: 'Balances include opening balances and posted journal activity only.',
    trialHint: 'Debit and credit balances by posting account as of the selected date.',
    ledgerHint: 'Chronological debit and credit activity with a running account balance.',
    asOf: 'As of',
    from: 'From',
    to: 'To',
    account: 'Account',
    chooseAccount: 'Choose a posting account',
    assets: 'Assets',
    liabilities: 'Liabilities',
    equity: 'Equity',
    revenue: 'Revenue',
    expenses: 'Expenses',
    netIncome: 'Net income',
    debit: 'Debit',
    credit: 'Credit',
    net: 'Net balance',
    code: 'Code',
    name: 'Account',
    type: 'Type',
    date: 'Date',
    entry: 'Entry',
    memo: 'Description',
    reference: 'Reference',
    balance: 'Balance',
    opening: 'Opening balance',
    ending: 'Closing balance',
    noRows: 'No report rows are available for this period.',
    noAccess: 'Finance access is restricted to the General Manager and Accountant roles.',
    loadError: 'The financial report could not be loaded. Check your filters and connection.',
    loading: 'Loading financial data…',
    retry: 'Retry',
    entriesLink: 'Journal entries',
    types: { asset: 'Asset', liability: 'Liability', equity: 'Equity', income: 'Income', expense: 'Expense' },
  },
  ar: {
    eyebrow: 'التقارير المالية',
    overviewTitle: 'النظرة المالية',
    trialTitle: 'ميزان المراجعة',
    ledgerTitle: 'دفتر الأستاذ العام',
    overviewHint: 'تشمل الأرصدة الأرصدة الافتتاحية وحركة القيود المرحلة فقط.',
    trialHint: 'أرصدة المدين والدائن حسب حساب الترحيل حتى التاريخ المحدد.',
    ledgerHint: 'حركة الحساب حسب التاريخ مع احتساب الرصيد الجاري.',
    asOf: 'حتى تاريخ',
    from: 'من',
    to: 'إلى',
    account: 'الحساب',
    chooseAccount: 'اختر حساب ترحيل',
    assets: 'الأصول',
    liabilities: 'الالتزامات',
    equity: 'حقوق الملكية',
    revenue: 'الإيرادات',
    expenses: 'المصروفات',
    netIncome: 'صافي الدخل',
    debit: 'مدين',
    credit: 'دائن',
    net: 'الرصيد الصافي',
    code: 'الرمز',
    name: 'الحساب',
    type: 'النوع',
    date: 'التاريخ',
    entry: 'القيد',
    memo: 'البيان',
    reference: 'المرجع',
    balance: 'الرصيد',
    opening: 'الرصيد الافتتاحي',
    ending: 'الرصيد الختامي',
    noRows: 'لا توجد بيانات تقرير لهذه الفترة.',
    noAccess: 'الوصول المالي متاح للمدير العام والمحاسب فقط.',
    loadError: 'تعذر تحميل التقرير المالي. تحقق من عوامل التصفية والاتصال.',
    loading: 'جارٍ تحميل البيانات المالية…',
    retry: 'إعادة المحاولة',
    entriesLink: 'القيود المحاسبية',
    types: { asset: 'أصل', liability: 'التزام', equity: 'حقوق ملكية', income: 'إيراد', expense: 'مصروف' },
  },
} as const;

export default function FinanceReports({ language, user, mode }: { language: Language; user: AppUser; mode: FinanceReportMode }) {
  const labels = copy[language];
  const canAccess = user.role === 'GM' || user.role === 'Accountant';
  const today = currentDate();
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountId, setAccountId] = useState('');
  const [asOf, setAsOf] = useState(today);
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [trial, setTrial] = useState<TrialBalanceReport | null>(null);
  const [ledger, setLedger] = useState<GeneralLedgerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (!canAccess) return () => { active = false; };
    fetchAccounts().then((result) => {
      if (active) setAccounts(result.accounts.filter((account) => account.isActive && !account.isGroup));
    }).catch(() => {
      if (active) setError(labels.loadError);
    });
    return () => { active = false; };
  }, [canAccess, labels.loadError, reload]);

  useEffect(() => {
    if (mode === 'general-ledger' && !accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accountId, accounts, mode]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        if (mode === 'general-ledger') {
          if (!accountId) {
            setLedger(null);
            return;
          }
          const result = await fetchGeneralLedger(accountId, from, to);
          if (active) setLedger(result);
        } else {
          const result = await fetchTrialBalance(asOf);
          if (active) setTrial(result);
        }
      } catch (reason) {
        if (active) setError(reason instanceof ApiError && reason.code === 'permission_denied' ? labels.noAccess : labels.loadError);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (canAccess) load();
    else setLoading(false);
    return () => { active = false; };
  }, [accountId, asOf, canAccess, from, labels.loadError, labels.noAccess, mode, reload, to]);

  const title = mode === 'general-ledger' ? labels.ledgerTitle : mode === 'trial-balance' ? labels.trialTitle : labels.overviewTitle;
  const formatAmount = (value: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const summary = useMemo(() => {
    const rows = trial?.rows ?? [];
    const balanceFor = (type: 'asset' | 'liability' | 'equity' | 'income' | 'expense') => rows
      .filter((row) => row.type === type)
      .reduce((sum, row) => sum + (type === 'liability' || type === 'equity' || type === 'income' ? row.credit - row.debit : row.debit - row.credit), 0);
    const revenue = balanceFor('income');
    const expenses = balanceFor('expense');
    return [
      { label: labels.assets, value: balanceFor('asset') },
      { label: labels.liabilities, value: balanceFor('liability') },
      { label: labels.equity, value: balanceFor('equity') },
      { label: labels.revenue, value: revenue },
      { label: labels.expenses, value: expenses },
      { label: labels.netIncome, value: revenue - expenses },
    ];
  }, [labels.assets, labels.equity, labels.expenses, labels.liabilities, labels.netIncome, labels.revenue, trial]);

  if (!canAccess) return <section className="page" dir={language === 'ar' ? 'rtl' : 'ltr'}><div className="inline-alert" role="alert">{labels.noAccess}</div></section>;

  return (
    <section className="page finance-report-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="section-heading">
        <div><p className="eyebrow">{labels.eyebrow}</p><h2>{title}</h2><p className="subtext">{mode === 'general-ledger' ? labels.ledgerHint : mode === 'trial-balance' ? labels.trialHint : labels.overviewHint}</p></div>
        <NavLink className="ghost-button" to="/accounts/journal-entries">{labels.entriesLink}</NavLink>
      </div>

      <div className="finance-report-filters">
        {mode === 'general-ledger' ? <>
          <label className="field"><span>{labels.account}</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">{labels.chooseAccount}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {language === 'ar' ? account.nameAr : account.nameEn}</option>)}</select></label>
          <label className="field"><span>{labels.from}</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="field"><span>{labels.to}</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </> : <label className="field"><span>{labels.asOf}</span><input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} /></label>}
      </div>

      {error && <div className="inline-alert" role="alert">{error}</div>}
      {error && <button className="ghost-button" onClick={() => setReload((value) => value + 1)} type="button">{labels.retry}</button>}
      {loading && <div className="panel finance-report-empty" role="status">{labels.loading}</div>}

      {!loading && mode === 'overview' && (
        <>
          <div className="section-metrics finance-summary-grid">
            {summary.map((item) => <div className="metric-panel panel" key={item.label}><span>{item.label}</span><strong>{formatAmount(item.value)}</strong></div>)}
          </div>
          <TrialTable report={trial} labels={labels} formatAmount={formatAmount} />
        </>
      )}

      {!loading && mode === 'trial-balance' && <TrialTable report={trial} labels={labels} formatAmount={formatAmount} />}

      {!loading && mode === 'general-ledger' && ledger && (
        <div className="directory-panel panel">
          <div className="directory-toolbar"><div><h3>{ledger.account.code} · {language === 'ar' ? ledger.account.nameAr : ledger.account.nameEn}</h3><span className="directory-count">{labels.opening}: {formatAmount(ledger.openingBalance)}</span></div><strong>{labels.ending}: {formatAmount(ledger.endingBalance)}</strong></div>
          <div className="employee-table-wrap">
            <table className="employee-table ledger-table">
              <thead><tr><th>{labels.date}</th><th>{labels.entry}</th><th>{labels.memo}</th><th>{labels.reference}</th><th>{labels.debit}</th><th>{labels.credit}</th><th>{labels.balance}</th></tr></thead>
              <tbody>
                {ledger.lines.map((line) => <tr key={line.id}><td>{line.date}</td><td className="journal-number">{line.entryNumber}</td><td>{line.description || line.memo || '—'}</td><td>{line.reference || '—'}</td><td className="journal-amount">{line.debit ? formatAmount(line.debit) : '—'}</td><td className="journal-amount">{line.credit ? formatAmount(line.credit) : '—'}</td><td className="journal-amount">{formatAmount(line.balance)}</td></tr>)}
                {ledger.lines.length === 0 && <tr><td className="empty-state" colSpan={7}>{labels.noRows}</td></tr>}
              </tbody>
              <tfoot><tr><td colSpan={6}>{labels.ending}</td><td className="journal-amount">{formatAmount(ledger.endingBalance)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function TrialTable({ report, labels, formatAmount }: {
  report: TrialBalanceReport | null;
  labels: typeof copy.en | typeof copy.ar;
  formatAmount: (value: number) => string;
}) {
  return (
    <div className="directory-panel panel">
      <div className="directory-toolbar"><div><h3>{labels.trialTitle}</h3><span className="directory-count">{report?.asOf ?? '—'}</span></div><div className="trial-total-pair"><span>{labels.debit}: <strong>{formatAmount(report?.totals.debit ?? 0)}</strong></span><span>{labels.credit}: <strong>{formatAmount(report?.totals.credit ?? 0)}</strong></span></div></div>
      <div className="employee-table-wrap">
        <table className="employee-table trial-table">
          <thead><tr><th>{labels.code}</th><th>{labels.name}</th><th>{labels.type}</th><th>{labels.debit}</th><th>{labels.credit}</th></tr></thead>
          <tbody>
            {report?.rows.map((row) => <tr key={row.accountId}><td className="journal-number">{row.code}</td><td>{labels.name === 'Account' ? row.nameEn || row.nameAr : row.nameAr}</td><td>{labels.types[row.type]}</td><td className="journal-amount">{row.debit ? formatAmount(row.debit) : '—'}</td><td className="journal-amount">{row.credit ? formatAmount(row.credit) : '—'}</td></tr>)}
            {report?.rows.length === 0 && <tr><td className="empty-state" colSpan={5}>{labels.noRows}</td></tr>}
          </tbody>
          <tfoot><tr><td colSpan={3}>{labels.net}</td><td className="journal-amount">{formatAmount(report?.totals.debit ?? 0)}</td><td className="journal-amount">{formatAmount(report?.totals.credit ?? 0)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
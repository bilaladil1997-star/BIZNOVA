import { useEffect, useMemo, useState } from 'react';
import { ApiError, createJournalEntry, fetchAccounts, fetchJournalEntries, fetchJournalEntry, postJournalEntry, updateJournalEntry, type AccountRecord, type JournalEntryInput, type JournalEntryRecord, type JournalEntryType, type JournalLineInput, type JournalStatus, type AppUser } from '../api';

type Language = 'en' | 'ar';

const entryTypes: JournalEntryType[] = ['journal', 'receipt', 'payment', 'sales', 'purchase'];

const copy = {
  en: {
    eyebrow: 'Accounting operations',
    title: 'Journal entries',
    subtitle: 'Prepare balanced entries and post them to the general ledger.',
    newEntry: 'New journal entry',
    search: 'Search entry number, memo, or reference',
    allStatuses: 'All statuses',
    draft: 'Draft',
    submitted: 'Posted',
    entry: 'Entry',
    date: 'Date',
    type: 'Type',
    memo: 'Description',
    lines: 'Lines',
    debit: 'Debit',
    credit: 'Credit',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    post: 'Post',
    noEntries: 'No journal entries match these filters.',
    loading: 'Loading journal entries…',
    loadError: 'Could not load journal entries. Check the connection and retry.',
    noAccess: 'Finance access is restricted to the General Manager and Accountant roles.',
    retry: 'Retry',
    formNew: 'New journal entry',
    formEdit: 'Edit draft entry',
    reference: 'Reference',
    narration: 'Narration',
    account: 'Account',
    description: 'Line description',
    addLine: 'Add line',
    removeLine: 'Remove',
    total: 'Entry total',
    balanced: 'Balanced',
    difference: 'Difference',
    saveDraft: 'Save draft',
    submitPost: 'Post entry',
    cancel: 'Cancel',
    required: 'Choose an account and enter a debit or credit for each line.',
    needTwoLines: 'A posted entry must contain at least two lines.',
    notBalanced: 'Debits and credits must match before posting.',
    accountRequired: 'Create active posting accounts in the Chart of Accounts first.',
    duplicate: 'This entry could not be saved because its number already exists.',
    invalidAccount: 'A line uses an inactive, group, or invalid account.',
    locked: 'Posted entries cannot be edited.',
    serverError: 'The request failed. Check your connection and try again.',
    typeLabels: { journal: 'Journal', receipt: 'Receipt', payment: 'Payment', sales: 'Sales', purchase: 'Purchase' },
    statusLabel: { draft: 'Draft', submitted: 'Posted' },
  },
  ar: {
    eyebrow: 'العمليات المحاسبية',
    title: 'القيود المحاسبية',
    subtitle: 'إعداد قيود متوازنة وترحيلها إلى دفتر الأستاذ العام.',
    newEntry: 'قيد يومي جديد',
    search: 'ابحث برقم القيد أو الوصف أو المرجع',
    allStatuses: 'كل الحالات',
    draft: 'مسودة',
    submitted: 'مرحّل',
    entry: 'القيد',
    date: 'التاريخ',
    type: 'النوع',
    memo: 'البيان',
    lines: 'السطور',
    debit: 'مدين',
    credit: 'دائن',
    status: 'الحالة',
    actions: 'الإجراءات',
    edit: 'تعديل',
    post: 'ترحيل',
    noEntries: 'لا توجد قيود تطابق عوامل التصفية.',
    loading: 'جارٍ تحميل القيود…',
    loadError: 'تعذر تحميل القيود. تحقق من الاتصال وأعد المحاولة.',
    noAccess: 'الوصول المالي متاح للمدير العام والمحاسب فقط.',
    retry: 'إعادة المحاولة',
    formNew: 'قيد يومي جديد',
    formEdit: 'تعديل مسودة',
    reference: 'المرجع',
    narration: 'البيان',
    account: 'الحساب',
    description: 'وصف السطر',
    addLine: 'إضافة سطر',
    removeLine: 'حذف',
    total: 'إجمالي القيد',
    balanced: 'متوازن',
    difference: 'الفرق',
    saveDraft: 'حفظ المسودة',
    submitPost: 'ترحيل القيد',
    cancel: 'إلغاء',
    required: 'اختر حساباً وأدخل مبلغاً مديناً أو دائناً لكل سطر.',
    needTwoLines: 'يجب أن يحتوي القيد المرحّل على سطرين على الأقل.',
    notBalanced: 'يجب تساوي المدين والدائن قبل الترحيل.',
    accountRequired: 'أنشئ حسابات ترحيل نشطة في دليل الحسابات أولاً.',
    duplicate: 'تعذر حفظ القيد بسبب تكرار رقمه.',
    invalidAccount: 'يحتوي أحد السطور على حساب غير صالح أو غير نشط أو تجميعي.',
    locked: 'لا يمكن تعديل القيود المرحلة.',
    serverError: 'تعذر تنفيذ الطلب. تحقق من الاتصال وحاول مرة أخرى.',
    typeLabels: { journal: 'قيد يومية', receipt: 'قبض', payment: 'دفع', sales: 'مبيعات', purchase: 'مشتريات' },
    statusLabel: { draft: 'مسودة', submitted: 'مرحّل' },
  },
} as const;

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const blankLine = (): JournalLineInput => ({ accountId: '', debit: 0, credit: 0, description: '' });

function blankEntry(): JournalEntryInput {
  return { date: localDate(), entryType: 'journal', reference: '', memo: '', status: 'draft', lines: [blankLine(), blankLine()] };
}

export default function JournalEntries({ language, user }: { language: Language; user: AppUser }) {
  const labels = copy[language];
  const canAccess = user.role === 'GM' || user.role === 'Accountant';
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [entries, setEntries] = useState<JournalEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JournalStatus>('all');
  const [editing, setEditing] = useState<JournalEntryRecord | null>(null);
  const [draft, setDraft] = useState<JournalEntryInput>(blankEntry);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const [accountResult, entryResult] = await Promise.all([fetchAccounts(), fetchJournalEntries()]);
        if (active) {
          setAccounts(accountResult.accounts);
          setEntries(entryResult.entries);
        }
      } catch (error) {
        if (active) setLoadError(error instanceof ApiError && error.code === 'permission_denied' ? labels.noAccess : labels.loadError);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (canAccess) load();
    else setLoading(false);
    return () => { active = false; };
  }, [canAccess, labels.loadError, labels.noAccess, reload]);

  const postingAccounts = useMemo(() => accounts.filter((account) => account.isActive && !account.isGroup), [accounts]);
  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entries.filter((entry) => {
      const matchesQuery = !query || [entry.entryNumber, entry.memo, entry.reference].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesQuery && (statusFilter === 'all' || entry.status === statusFilter);
    });
  }, [entries, search, statusFilter]);
  const totals = useMemo(() => draft.lines.reduce((result, line) => ({
    debit: result.debit + (Number(line.debit) || 0),
    credit: result.credit + (Number(line.credit) || 0),
  }), { debit: 0, credit: 0 }), [draft.lines]);
  const difference = Math.round((totals.debit - totals.credit) * 100) / 100;
  const formatAmount = (value: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));

  function openCreate() {
    setEditing(null);
    setDraft(blankEntry());
    setFormError('');
    setRequestError('');
    setShowForm(true);
  }

  async function openEdit(entry: JournalEntryRecord) {
    setRequestError('');
    try {
      const detail = await fetchJournalEntry(entry.id);
      setEditing(detail.entry);
      setDraft({
        date: detail.entry.date,
        entryType: detail.entry.entryType,
        reference: detail.entry.reference,
        memo: detail.entry.memo,
        status: 'draft',
        projectId: detail.entry.projectId,
        projectName: detail.entry.projectName,
        lines: detail.lines.map(({ accountId, debit, credit, description }) => ({ accountId, debit, credit, description })),
      });
      setFormError('');
      setShowForm(true);
    } catch {
      setRequestError(labels.serverError);
    }
  }

  function changeLine(index: number, patch: Partial<JournalLineInput>) {
    setDraft((current) => ({ ...current, lines: current.lines.map((line, position) => {
      if (position !== index) return line;
      const next = { ...line, ...patch };
      if (patch.debit && patch.debit > 0) next.credit = 0;
      if (patch.credit && patch.credit > 0) next.debit = 0;
      return next;
    }) }));
  }

  function setField<K extends keyof JournalEntryInput>(key: K, value: JournalEntryInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validate(status: JournalStatus) {
    if (!draft.date || !draft.lines.every((line) => line.accountId && ((line.debit > 0) !== (line.credit > 0)))) {
      setFormError(labels.required);
      return false;
    }
    if (status === 'submitted' && draft.lines.length < 2) {
      setFormError(labels.needTwoLines);
      return false;
    }
    if (status === 'submitted' && Math.abs(difference) >= 0.005) {
      setFormError(labels.notBalanced);
      return false;
    }
    return true;
  }

  async function save(status: JournalStatus) {
    if (!validate(status)) return;
    setSaving(true);
    setFormError('');
    setRequestError('');
    try {
      let saved;
      if (editing) {
        saved = (await updateJournalEntry(editing.id, { ...draft, status: 'draft' })).entry;
        if (status === 'submitted') saved = (await postJournalEntry(editing.id)).entry;
      } else {
        saved = (await createJournalEntry({ ...draft, status })).entry;
      }
      setShowForm(false);
      setReload((value) => value + 1);
      setEntries((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setFormError(
        code === 'journal_not_balanced' ? labels.notBalanced
          : code === 'invalid_journal_line' || code === 'invalid_journal_lines' ? labels.invalidAccount
            : code === 'journal_entry_locked' ? labels.locked
              : code === 'permission_denied' ? labels.noAccess
                : labels.serverError,
      );
    } finally {
      setSaving(false);
    }
  }

  async function post(entry: JournalEntryRecord) {
    setRequestError('');
    try {
      const result = await postJournalEntry(entry.id);
      setEntries((current) => current.map((item) => item.id === entry.id ? result.entry : item));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setRequestError(code === 'journal_not_balanced' ? labels.notBalanced : code === 'invalid_journal_line' ? labels.invalidAccount : labels.serverError);
    }
  }

  if (!canAccess) return <section className="page" dir={language === 'ar' ? 'rtl' : 'ltr'}><div className="inline-alert" role="alert">{labels.noAccess}</div></section>;

  return (
    <section className="page journal-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="section-heading">
        <div><p className="eyebrow">{labels.eyebrow}</p><h2>{labels.title}</h2><p className="subtext">{labels.subtitle}</p></div>
        <button className="primary-button" onClick={openCreate} type="button">＋ {labels.newEntry}</button>
      </div>
      {requestError && <div className="inline-alert" role="alert">{requestError}</div>}
      {loadError && <div className="inline-alert" role="alert">{loadError}</div>}
      {loadError && <button className="ghost-button" onClick={() => setReload((value) => value + 1)} type="button">{labels.retry}</button>}

      <div className="directory-panel panel">
        <div className="directory-toolbar journal-toolbar">
          <div><h3>{labels.title}</h3><span className="directory-count">{visibleEntries.length}</span></div>
          <div className="journal-filters">
            <input aria-label={labels.search} className="filter-input" onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} value={search} />
            <select aria-label={labels.allStatuses} className="filter-input" onChange={(event) => setStatusFilter(event.target.value as 'all' | JournalStatus)} value={statusFilter}>
              <option value="all">{labels.allStatuses}</option><option value="draft">{labels.draft}</option><option value="submitted">{labels.submitted}</option>
            </select>
          </div>
        </div>
        <div className="employee-table-wrap">
          <table className="employee-table journal-table">
            <thead><tr><th>{labels.entry}</th><th>{labels.date}</th><th>{labels.type}</th><th>{labels.memo}</th><th>{labels.lines}</th><th>{labels.debit}</th><th>{labels.credit}</th><th>{labels.status}</th><th>{labels.actions}</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="empty-state" colSpan={9}>{labels.loading}</td></tr> : visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td><strong className="journal-number">{entry.entryNumber}</strong>{entry.reference && <small className="journal-reference">{entry.reference}</small>}</td>
                  <td>{formatDate(entry.date)}</td>
                  <td>{labels.typeLabels[entry.entryType]}</td>
                  <td>{entry.memo || '—'}</td>
                  <td>{entry.lineCount}</td>
                  <td className="journal-amount">{formatAmount(entry.totalDebit)}</td>
                  <td className="journal-amount">{formatAmount(entry.totalCredit)}</td>
                  <td><span className={`employee-status ${entry.status === 'submitted' ? 'active' : 'inactive'}`}>{labels.statusLabel[entry.status]}</span></td>
                  <td>{entry.status === 'draft' && <div className="row-actions"><button className="text-button" onClick={() => openEdit(entry)} type="button">{labels.edit}</button><button className="text-button" onClick={() => post(entry)} type="button">{labels.post}</button></div>}</td>
                </tr>
              ))}
              {!loading && visibleEntries.length === 0 && <tr><td className="empty-state" colSpan={9}>{labels.noEntries}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <form className="employee-form panel journal-form" onSubmit={(event) => { event.preventDefault(); void save('draft'); }}>
            <div className="form-heading"><div><p className="eyebrow">{labels.eyebrow}</p><h3>{editing ? labels.formEdit : labels.formNew}</h3></div><button type="button" className="modal-close" aria-label={labels.cancel} onClick={() => setShowForm(false)}>×</button></div>
            <div className="form-grid">
              <Field label={labels.date}><input required type="date" value={draft.date} onChange={(event) => setField('date', event.target.value)} /></Field>
              <Field label={labels.type}><select value={draft.entryType} onChange={(event) => setField('entryType', event.target.value as JournalEntryType)}>{entryTypes.map((type) => <option key={type} value={type}>{labels.typeLabels[type]}</option>)}</select></Field>
              <Field label={labels.reference}><input value={draft.reference} onChange={(event) => setField('reference', event.target.value)} /></Field>
              <Field label={labels.narration}><input value={draft.memo} onChange={(event) => setField('memo', event.target.value)} /></Field>
            </div>

            <div className="journal-lines-heading"><h4>{labels.lines}</h4><button className="ghost-button" onClick={() => setDraft((current) => ({ ...current, lines: [...current.lines, blankLine()] }))} type="button">＋ {labels.addLine}</button></div>
            {postingAccounts.length === 0 && <div className="inline-alert" role="alert">{labels.accountRequired}</div>}
            <div className="journal-line-list">
              {draft.lines.map((line, index) => (
                <div className="journal-line-row" key={index}>
                  <label className="field journal-account-field"><span>{labels.account}</span><select value={line.accountId} onChange={(event) => changeLine(index, { accountId: event.target.value })}><option value="">—</option>{postingAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {language === 'ar' ? account.nameAr : account.nameEn}</option>)}</select></label>
                  <label className="field"><span>{labels.debit}</span><input min="0" step="0.01" type="number" value={line.debit || ''} onChange={(event) => changeLine(index, { debit: Number(event.target.value) || 0 })} /></label>
                  <label className="field"><span>{labels.credit}</span><input min="0" step="0.01" type="number" value={line.credit || ''} onChange={(event) => changeLine(index, { credit: Number(event.target.value) || 0 })} /></label>
                  <label className="field journal-description-field"><span>{labels.description}</span><input value={line.description} onChange={(event) => changeLine(index, { description: event.target.value })} /></label>
                  <button className="text-button muted-action journal-remove" disabled={draft.lines.length <= 1} onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((_, position) => position !== index) }))} type="button">{labels.removeLine}</button>
                </div>
              ))}
            </div>

            <div className={`journal-totals ${Math.abs(difference) < 0.005 ? 'is-balanced' : 'is-unbalanced'}`}>
              <div><span>{labels.debit}</span><strong>{formatAmount(totals.debit)}</strong></div>
              <div><span>{labels.credit}</span><strong>{formatAmount(totals.credit)}</strong></div>
              <div><span>{Math.abs(difference) < 0.005 ? labels.balanced : labels.difference}</span><strong>{formatAmount(Math.abs(difference))}</strong></div>
            </div>
            {formError && <div className="inline-alert form-alert" role="alert">{formError}</div>}
            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={() => setShowForm(false)}>{labels.cancel}</button>
              <button type="button" className="ghost-button" disabled={saving} onClick={() => void save('draft')}>{labels.saveDraft}</button>
              <button type="button" className="primary-button" disabled={saving || postingAccounts.length === 0} onClick={() => void save('submitted')}>{saving ? labels.loading : labels.submitPost}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  createAccount,
  fetchAccounts,
  updateAccount,
  type AccountInput,
  type AccountRecord,
  type AccountType,
  type AppUser,
} from '../api';

type Language = 'en' | 'ar';

const accountTypes: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];

const copy = {
  en: {
    eyebrow: 'Finance foundation',
    title: 'Chart of accounts',
    subtitle: 'Maintain the account hierarchy used by journals and financial reports.',
    newAccount: 'New account',
    activeAccounts: 'Active accounts',
    groupAccounts: 'Group accounts',
    inactiveAccounts: 'Inactive accounts',
    search: 'Search code or account name',
    allTypes: 'All account types',
    allStatuses: 'All statuses',
    active: 'Active',
    inactive: 'Inactive',
    code: 'Account code',
    name: 'Account name',
    type: 'Account type',
    parent: 'Parent account',
    group: 'Account kind',
    openingBalance: 'Opening balance',
    status: 'Status',
    actions: 'Actions',
    groupAccount: 'Group',
    detailAccount: 'Posting account',
    isGroup: 'This account is a group and cannot receive postings.',
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    noParent: 'No parent account',
    noAccounts: 'No accounts match these filters.',
    noAccess: 'Finance access is restricted to the General Manager and Accountant roles.',
    loading: 'Loading chart of accounts…',
    loadError: 'Could not load accounts from the server. Check your connection and retry.',
    retry: 'Retry',
    formNew: 'Create account',
    formEdit: 'Edit account',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    notes: 'Notes',
    save: 'Save account',
    cancel: 'Cancel',
    required: 'Enter a valid code and both account names.',
    duplicate: 'This account code is already in use.',
    invalidParent: 'Choose an active group of the same account type as the parent.',
    groupBalance: 'Group accounts cannot have an opening balance.',
    groupChildren: 'A group with child accounts cannot be converted to a posting account or deactivated.',
    accountTypeLocked: 'An account with journal history cannot be reclassified.',
    codeImmutable: 'Account codes cannot be changed after creation.',
    serverError: 'The account could not be saved. Check your connection and try again.',
    accessError: 'You do not have permission to change accounts.',
    noDate: '—',
    types: {
      asset: 'Asset',
      liability: 'Liability',
      equity: 'Equity',
      income: 'Income',
      expense: 'Expense',
    } satisfies Record<AccountType, string>,
  },
  ar: {
    eyebrow: 'الأساس المالي',
    title: 'دليل الحسابات',
    subtitle: 'إدارة هيكل الحسابات المستخدم في القيود والتقارير المالية.',
    newAccount: 'حساب جديد',
    activeAccounts: 'الحسابات النشطة',
    groupAccounts: 'الحسابات التجميعية',
    inactiveAccounts: 'الحسابات غير النشطة',
    search: 'ابحث بالرمز أو اسم الحساب',
    allTypes: 'كل أنواع الحسابات',
    allStatuses: 'كل الحالات',
    active: 'نشط',
    inactive: 'غير نشط',
    code: 'رمز الحساب',
    name: 'اسم الحساب',
    type: 'نوع الحساب',
    parent: 'الحساب الأب',
    group: 'تصنيف الحساب',
    openingBalance: 'الرصيد الافتتاحي',
    status: 'الحالة',
    actions: 'الإجراءات',
    groupAccount: 'تجميعي',
    detailAccount: 'حساب ترحيل',
    isGroup: 'هذا حساب تجميعي ولا يستقبل قيوداً مباشرة.',
    edit: 'تعديل',
    deactivate: 'إيقاف',
    activate: 'تفعيل',
    noParent: 'دون حساب أب',
    noAccounts: 'لا توجد حسابات تطابق عوامل التصفية.',
    noAccess: 'الوصول المالي متاح للمدير العام والمحاسب فقط.',
    loading: 'جارٍ تحميل دليل الحسابات…',
    loadError: 'تعذر تحميل الحسابات من الخادم. تحقق من الاتصال وأعد المحاولة.',
    retry: 'إعادة المحاولة',
    formNew: 'إنشاء حساب',
    formEdit: 'تعديل حساب',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    notes: 'ملاحظات',
    save: 'حفظ الحساب',
    cancel: 'إلغاء',
    required: 'أدخل رمزاً صحيحاً واسمي الحساب باللغتين.',
    duplicate: 'رمز الحساب مستخدم بالفعل.',
    invalidParent: 'اختر حساباً تجميعياً نشطاً من النوع نفسه ليكون الحساب الأب.',
    groupBalance: 'لا يمكن تعيين رصيد افتتاحي لحساب تجميعي.',
    groupChildren: 'لا يمكن تحويل حساب تجميعي له حسابات فرعية إلى حساب ترحيل أو إيقافه.',
    accountTypeLocked: 'لا يمكن تغيير تصنيف حساب مرتبط بقيود محاسبية.',
    codeImmutable: 'لا يمكن تغيير رمز الحساب بعد إنشائه.',
    serverError: 'تعذر حفظ الحساب. تحقق من الاتصال وحاول مرة أخرى.',
    accessError: 'ليست لديك صلاحية لتعديل الحسابات.',
    noDate: '—',
    types: {
      asset: 'أصل',
      liability: 'التزام',
      equity: 'حقوق ملكية',
      income: 'إيراد',
      expense: 'مصروف',
    } satisfies Record<AccountType, string>,
  },
} as const;

function emptyDraft(): AccountInput {
  return {
    code: '',
    nameAr: '',
    nameEn: '',
    type: 'asset',
    parentCode: '',
    isGroup: false,
    openingBalance: 0,
    isActive: true,
    notes: '',
  };
}

export default function ChartOfAccounts({ language, user }: { language: Language; user: AppUser }) {
  const labels = copy[language];
  const canAccess = user.role === 'GM' || user.role === 'Accountant';
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<AccountRecord | null>(null);
  const [draft, setDraft] = useState<AccountInput>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const result = await fetchAccounts();
        if (active) setAccounts(result.accounts);
      } catch (error) {
        if (active) {
          setLoadError(error instanceof ApiError && error.code === 'permission_denied' ? labels.noAccess : labels.loadError);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    if (canAccess) load();
    else setLoading(false);
    return () => {
      active = false;
    };
  }, [canAccess, labels.loadError, labels.noAccess, reload]);

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return accounts.filter((account) => {
      const matchesSearch = !query || [account.code, account.nameAr, account.nameEn].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesType = typeFilter === 'all' || account.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || account.isActive === (statusFilter === 'active');
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, search, statusFilter, typeFilter]);

  const counts = useMemo(() => ({
    active: accounts.filter((account) => account.isActive).length,
    groups: accounts.filter((account) => account.isGroup).length,
    inactive: accounts.filter((account) => !account.isActive).length,
  }), [accounts]);

  function openCreateForm() {
    setEditing(null);
    setDraft(emptyDraft());
    setFormError('');
    setRequestError('');
    setShowForm(true);
  }

  function openEditForm(account: AccountRecord) {
    setEditing(account);
    const { id: _id, ...accountDraft } = account;
    setDraft(accountDraft);
    setFormError('');
    setRequestError('');
    setShowForm(true);
  }

  function setDraftField<K extends keyof AccountInput>(key: K, value: AccountInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: AccountInput = {
      ...draft,
      code: draft.code.trim(),
      nameAr: draft.nameAr.trim(),
      nameEn: draft.nameEn.trim(),
      parentCode: draft.parentCode.trim(),
      openingBalance: draft.isGroup ? 0 : Number(draft.openingBalance),
      notes: draft.notes.trim(),
    };
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/.test(payload.code) || !payload.nameAr || !payload.nameEn) {
      setFormError(labels.required);
      return;
    }
    if (payload.isGroup && payload.openingBalance !== 0) {
      setFormError(labels.groupBalance);
      return;
    }
    setSaving(true);
    setFormError('');
    setRequestError('');
    try {
      const saved = editing
        ? (await updateAccount(editing.id, payload)).account
        : (await createAccount(payload)).account;
      setAccounts((current) => editing
        ? current.map((account) => account.id === saved.id ? saved : account)
        : [...current, saved].sort((a, b) => a.code.localeCompare(b.code)));
      setShowForm(false);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setFormError(
        code === 'duplicate_account_code' ? labels.duplicate
          : code === 'invalid_account_parent' ? labels.invalidParent
            : code === 'account_group_has_children' || code === 'account_group_has_active_children' ? labels.groupChildren
                : code === 'account_code_immutable' ? labels.codeImmutable
                  : code === 'account_type_has_activity' || code === 'account_type_has_children' ? labels.accountTypeLocked
                : code === 'invalid_account' ? labels.required
                  : code === 'permission_denied' ? labels.accessError
                    : labels.serverError,
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: AccountRecord) {
    setRequestError('');
    try {
      const saved = (await updateAccount(account.id, { ...account, isActive: !account.isActive })).account;
      setAccounts((current) => current.map((item) => item.id === saved.id ? saved : item));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setRequestError(code === 'account_group_has_active_children' ? labels.groupChildren : labels.serverError);
    }
  }

  const formatBalance = (value: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  const parentOptions = accounts.filter((account) =>
    account.isGroup && account.isActive && account.type === draft.type && account.id !== editing?.id,
  );

  if (!canAccess) {
    return <section className="page account-page" dir={language === 'ar' ? 'rtl' : 'ltr'}><div className="inline-alert" role="alert">{labels.noAccess}</div></section>;
  }

  return (
    <section className="page account-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{labels.eyebrow}</p>
          <h2>{labels.title}</h2>
          <p className="subtext">{labels.subtitle}</p>
        </div>
        <button className="primary-button" onClick={openCreateForm} type="button">＋ {labels.newAccount}</button>
      </div>

      {requestError && <div className="inline-alert" role="alert">{requestError}</div>}
      {loadError && <div className="inline-alert" role="alert">{loadError}</div>}
      {loadError && <button className="ghost-button" onClick={() => setReload((value) => value + 1)} type="button">{labels.retry}</button>}

      <div className="section-metrics account-metrics">
        <Metric label={labels.activeAccounts} value={counts.active} />
        <Metric label={labels.groupAccounts} value={counts.groups} />
        <Metric label={labels.inactiveAccounts} value={counts.inactive} />
      </div>

      <div className="directory-panel panel">
        <div className="directory-toolbar">
          <div>
            <h3>{labels.title}</h3>
            <span className="directory-count">{visibleAccounts.length} / {accounts.length}</span>
          </div>
          <div className="directory-filters account-filters">
            <input aria-label={labels.search} className="filter-input" onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} value={search} />
            <select aria-label={labels.allTypes} className="filter-input" onChange={(event) => setTypeFilter(event.target.value as AccountType | 'all')} value={typeFilter}>
              <option value="all">{labels.allTypes}</option>
              {accountTypes.map((type) => <option key={type} value={type}>{labels.types[type]}</option>)}
            </select>
            <select aria-label={labels.allStatuses} className="filter-input" onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')} value={statusFilter}>
              <option value="all">{labels.allStatuses}</option>
              <option value="active">{labels.active}</option>
              <option value="inactive">{labels.inactive}</option>
            </select>
          </div>
        </div>

        <div className="employee-table-wrap">
          <table className="employee-table account-table">
            <thead>
              <tr>
                <th>{labels.code}</th>
                <th>{labels.name}</th>
                <th>{labels.type}</th>
                <th>{labels.parent}</th>
                <th>{labels.group}</th>
                <th>{labels.openingBalance}</th>
                <th>{labels.status}</th>
                <th>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-state" colSpan={8}>{labels.loading}</td></tr>
              ) : visibleAccounts.map((account) => (
                <tr key={account.id}>
                  <td><strong className="account-code">{account.code}</strong></td>
                  <td>
                    <div className={`account-name ${account.parentCode ? 'is-child' : ''}`}>
                      <strong>{language === 'ar' ? account.nameAr : account.nameEn}</strong>
                      <small>{language === 'ar' ? account.nameEn : account.nameAr}</small>
                    </div>
                  </td>
                  <td>{labels.types[account.type]}</td>
                  <td>{account.parentCode || labels.noParent}</td>
                  <td><span className={`employee-status ${account.isGroup ? 'active' : 'inactive'}`}>{account.isGroup ? labels.groupAccount : labels.detailAccount}</span></td>
                  <td className="account-balance">{formatBalance(account.openingBalance)}</td>
                  <td><span className={`employee-status ${account.isActive ? 'active' : 'inactive'}`}>{account.isActive ? labels.active : labels.inactive}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" onClick={() => openEditForm(account)} type="button">{labels.edit}</button>
                      <button className="text-button muted-action" onClick={() => toggleActive(account)} type="button">
                        {account.isActive ? labels.deactivate : labels.activate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && visibleAccounts.length === 0 && (
                <tr><td className="empty-state" colSpan={8}>{labels.noAccounts}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <form className="employee-form panel account-form" onSubmit={submitForm}>
            <div className="form-heading">
              <div>
                <p className="eyebrow">{labels.eyebrow}</p>
                <h3>{editing ? labels.formEdit : labels.formNew}</h3>
              </div>
              <button type="button" className="modal-close" aria-label={labels.cancel} onClick={() => setShowForm(false)}>×</button>
            </div>

            <div className="form-grid">
              <FormField label={labels.code} required>
                <input autoFocus disabled={Boolean(editing)} maxLength={32} required value={draft.code} onChange={(event) => setDraftField('code', event.target.value.toUpperCase())} />
              </FormField>
              <FormField label={labels.type} required>
                <select value={draft.type} onChange={(event) => {
                  setDraft((current) => ({ ...current, type: event.target.value as AccountType, parentCode: '' }));
                }}>
                  {accountTypes.map((type) => <option key={type} value={type}>{labels.types[type]}</option>)}
                </select>
              </FormField>
              <FormField label={labels.nameAr} required>
                <input dir="rtl" required value={draft.nameAr} onChange={(event) => setDraftField('nameAr', event.target.value)} />
              </FormField>
              <FormField label={labels.nameEn} required>
                <input dir="ltr" required value={draft.nameEn} onChange={(event) => setDraftField('nameEn', event.target.value)} />
              </FormField>
              <FormField label={labels.parent}>
                <select value={draft.parentCode} onChange={(event) => setDraftField('parentCode', event.target.value)}>
                  <option value="">{labels.noParent}</option>
                  {parentOptions.map((account) => (
                    <option key={account.id} value={account.code}>{account.code} · {language === 'ar' ? account.nameAr : account.nameEn}</option>
                  ))}
                </select>
              </FormField>
              <FormField label={labels.openingBalance}>
                <input disabled={draft.isGroup} min="-999999999999" step="0.01" type="number" value={draft.isGroup ? 0 : draft.openingBalance} onChange={(event) => setDraftField('openingBalance', Number(event.target.value))} />
              </FormField>
            </div>

            <label className="account-group-toggle">
              <input checked={draft.isGroup} onChange={(event) => setDraft((current) => ({ ...current, isGroup: event.target.checked, openingBalance: event.target.checked ? 0 : current.openingBalance }))} type="checkbox" />
              <span><strong>{labels.groupAccount}</strong><small>{labels.isGroup}</small></span>
            </label>
            <FormField label={labels.notes}>
              <textarea rows={3} value={draft.notes} onChange={(event) => setDraftField('notes', event.target.value)} />
            </FormField>
            {editing && <label className="account-group-toggle">
              <input checked={draft.isActive} onChange={(event) => setDraftField('isActive', event.target.checked)} type="checkbox" />
              <span><strong>{labels.active}</strong></span>
            </label>}
            {formError && <div className="inline-alert form-alert" role="alert">{formError}</div>}
            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={() => setShowForm(false)}>{labels.cancel}</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? labels.loading : labels.save}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric-panel panel metric-blue"><span>{label}</span><strong>{value}</strong></div>;
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}{required && <b className="required-mark"> *</b>}</span>
      {children}
    </label>
  );
}
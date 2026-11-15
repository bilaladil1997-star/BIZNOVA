import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  createEmployee,
  deactivateEmployee,
  fetchEmployees,
  migrateEmployees,
  updateEmployee,
} from '../api';
import { employeeStorageKey, isEmployee, type Employee, type EmployeeStatus } from '../data/employees';

type Language = 'en' | 'ar';
type EmployeeDraft = Omit<Employee, 'id' | 'employeeCode'>;

const departments = [
  'Human Resources',
  'Finance',
  'Operations',
  'Sales',
  'Marketing',
  'Manufacturing',
];
const branches = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah'];
const copy = {
  en: {
    eyebrow: 'People operations',
    title: 'Employee directory',
    subtitle: 'Manage employee records, locations, and employment status.',
    add: 'Add employee',
    total: 'Total employees',
    active: 'Active',
    onLeave: 'On leave',
    inactive: 'Inactive',
    search: 'Search name, code, email, or job title',
    allDepartments: 'All departments',
    allStatuses: 'All statuses',
    employee: 'Employee',
    department: 'Department',
    branch: 'Branch',
    joined: 'Joined',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    deactivate: 'Deactivate',
    activate: 'Activate',
    empty: 'No employees match these filters.',
    formNew: 'Add employee',
    formEdit: 'Edit employee',
    fullName: 'Full name',
    email: 'Work email',
    phone: 'Phone',
    jobTitle: 'Job title',
    joiningDate: 'Joining date',
    save: 'Save employee',
    cancel: 'Cancel',
    required: 'Complete all required fields with a valid email address.',
    duplicate: 'An employee with this email already exists.',
    loadError: 'Employee records could not be loaded from the server. Check your connection and retry.',
    serverError: 'The server request failed. Check your connection and try again.',
    migrationError: 'Older browser data could not be migrated. It remains saved in this browser.',
    loading: 'Loading employee records…',
    noDate: '—',
    statusActive: 'Active',
    statusLeave: 'On leave',
    statusInactive: 'Inactive',
    directory: 'Directory',
    recordCount: 'records',
    newRecord: 'New employee record',
    departments: {
      'Human Resources': 'Human Resources',
      Finance: 'Finance',
      Operations: 'Operations',
      Sales: 'Sales',
      Marketing: 'Marketing',
      Manufacturing: 'Manufacturing',
    },
    branches: {
      Dubai: 'Dubai',
      'Abu Dhabi': 'Abu Dhabi',
      Sharjah: 'Sharjah',
      'Ras Al Khaimah': 'Ras Al Khaimah',
    },
  },
  ar: {
    eyebrow: 'عمليات الموارد البشرية',
    title: 'دليل الموظفين',
    subtitle: 'إدارة سجلات الموظفين والفروع وحالة العمل.',
    add: 'إضافة موظف',
    total: 'إجمالي الموظفين',
    active: 'على رأس العمل',
    onLeave: 'في إجازة',
    inactive: 'غير نشط',
    search: 'ابحث بالاسم أو الرقم أو البريد أو المسمى الوظيفي',
    allDepartments: 'كل الأقسام',
    allStatuses: 'كل الحالات',
    employee: 'الموظف',
    department: 'القسم',
    branch: 'الفرع',
    joined: 'تاريخ الانضمام',
    status: 'الحالة',
    actions: 'الإجراءات',
    edit: 'تعديل',
    deactivate: 'إيقاف',
    activate: 'تفعيل',
    empty: 'لا يوجد موظفون يطابقون عوامل التصفية.',
    formNew: 'إضافة موظف',
    formEdit: 'تعديل بيانات الموظف',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني للعمل',
    phone: 'رقم الهاتف',
    jobTitle: 'المسمى الوظيفي',
    joiningDate: 'تاريخ الانضمام',
    save: 'حفظ بيانات الموظف',
    cancel: 'إلغاء',
    required: 'أكمل الحقول المطلوبة وأدخل بريداً إلكترونياً صحيحاً.',
    duplicate: 'يوجد موظف مسجل بهذا البريد الإلكتروني.',
    loadError: 'تعذر تحميل سجلات الموظفين من الخادم. تحقق من الاتصال وأعد المحاولة.',
    serverError: 'تعذر تنفيذ الطلب من الخادم. تحقق من الاتصال وحاول مرة أخرى.',
    migrationError: 'تعذّر ترحيل البيانات القديمة؛ ما زالت محفوظة في هذا المتصفح.',
    loading: 'جارٍ تحميل سجلات الموظفين…',
    noDate: '—',
    statusActive: 'على رأس العمل',
    statusLeave: 'في إجازة',
    statusInactive: 'غير نشط',
    directory: 'دليل الموظفين',
    recordCount: 'سجلات',
    newRecord: 'سجل موظف جديد',
    departments: {
      'Human Resources': 'الموارد البشرية',
      Finance: 'المالية',
      Operations: 'العمليات',
      Sales: 'المبيعات',
      Marketing: 'التسويق',
      Manufacturing: 'التصنيع',
    },
    branches: {
      Dubai: 'دبي',
      'Abu Dhabi': 'أبوظبي',
      Sharjah: 'الشارقة',
      'Ras Al Khaimah': 'رأس الخيمة',
    },
  },
} as const;

const blankDraft = (): EmployeeDraft => ({
  fullName: '',
  email: '',
  phone: '',
  department: departments[0],
  jobTitle: '',
  branch: branches[0],
  joiningDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
});

function statusLabel(status: EmployeeStatus, language: Language) {
  const labels = copy[language];
  if (status === 'Active') return labels.statusActive;
  if (status === 'On leave') return labels.statusLeave;
  return labels.statusInactive;
}

export default function EmployeeDirectory({ language }: { language: Language }) {
  const labels = copy[language];
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [migrationError, setMigrationError] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(blankDraft);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        let currentEmployees = (await fetchEmployees()).employees;
        try {
          const legacyData = window.localStorage.getItem(employeeStorageKey);
          if (legacyData) {
            const parsed: unknown = JSON.parse(legacyData);
            if (!Array.isArray(parsed) || !parsed.every(isEmployee)) {
              setMigrationError(true);
            } else {
              const migrated = await migrateEmployees(parsed);
              currentEmployees = migrated.employees;
              window.localStorage.removeItem(employeeStorageKey);
            }
          }
        } catch {
          setMigrationError(true);
        }
        if (active) {
          setEmployees(currentEmployees);
          setLoadError(false);
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [reload]);

  const counts = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((employee) => employee.status === 'Active').length,
      onLeave: employees.filter((employee) => employee.status === 'On leave').length,
      inactive: employees.filter((employee) => employee.status === 'Inactive').length,
    }),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        [
          employee.fullName,
          employee.employeeCode,
          employee.email,
          employee.jobTitle,
          employee.department,
        ].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [departmentFilter, employees, search, statusFilter]);

  function openCreateForm() {
    setEditing(null);
    setDraft(blankDraft());
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(employee: Employee) {
    setEditing(employee);
    const { id: _id, employeeCode: _employeeCode, ...employeeDraft } = employee;
    setDraft(employeeDraft);
    setFormError('');
    setShowForm(true);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = draft.fullName.trim();
    const email = draft.email.trim().toLocaleLowerCase();
    const jobTitle = draft.jobTitle.trim();

    if (!fullName || !jobTitle || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !draft.phone.trim()) {
      setFormError(labels.required);
      return;
    }

    if (employees.some((employee) => employee.email.toLocaleLowerCase() === email && employee.id !== editing?.id)) {
      setFormError(labels.duplicate);
      return;
    }

    setSaving(true);
    setRequestError('');
    setFormError('');
    try {
      const saved = editing
        ? (await updateEmployee({
            ...editing,
            ...draft,
            fullName,
            email,
            jobTitle,
            phone: draft.phone.trim(),
          })).employee
        : (await createEmployee({
            ...draft,
            fullName,
            email,
            jobTitle,
            phone: draft.phone.trim(),
          })).employee;
      setEmployees((current) =>
        editing
          ? current.map((employee) => (employee.id === saved.id ? saved : employee))
          : [saved, ...current],
      );
      setShowForm(false);
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'duplicate_employee') {
        setFormError(labels.duplicate);
      } else {
        setRequestError(labels.serverError);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(employee: Employee) {
    setRequestError('');
    try {
      if (employee.status === 'Inactive') {
        const updated = (await updateEmployee({ ...employee, status: 'Active' })).employee;
        setEmployees((current) => current.map((item) => item.id === employee.id ? updated : item));
      } else {
        await deactivateEmployee(employee.id);
        setEmployees((current) => current.map((item) =>
          item.id === employee.id ? { ...item, status: 'Inactive' } : item,
        ));
      }
    } catch {
      setRequestError(labels.serverError);
    }
  }

  return (
    <section className="page hr-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{labels.eyebrow}</p>
          <h2>{labels.title}</h2>
          <p className="subtext">{labels.subtitle}</p>
        </div>
        <button className="primary-button" onClick={openCreateForm}>＋ {labels.add}</button>
      </div>

      {loadError && <div className="inline-alert" role="alert">{labels.loadError}</div>}
      {migrationError && <div className="inline-alert" role="alert">{labels.migrationError}</div>}
      {requestError && <div className="inline-alert" role="alert">{requestError}</div>}
      {loadError && <button className="ghost-button" onClick={() => setReload((value) => value + 1)}>{language === 'en' ? 'Retry loading' : 'إعادة التحميل'}</button>}

      <div className="section-metrics hr-metrics">
        <Metric label={labels.total} value={counts.total} accent="blue" />
        <Metric label={labels.active} value={counts.active} accent="green" />
        <Metric label={labels.onLeave} value={counts.onLeave} accent="orange" />
        <Metric label={labels.inactive} value={counts.inactive} accent="muted" />
      </div>

      <div className="directory-panel panel">
        <div className="directory-toolbar">
          <div>
            <h3>{labels.directory}</h3>
            <span className="directory-count">{filteredEmployees.length} {labels.recordCount}</span>
          </div>
          <div className="directory-filters">
            <input
              aria-label={labels.search}
              className="filter-input"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.search}
              value={search}
            />
            <select aria-label={labels.allDepartments} className="filter-input" onChange={(event) => setDepartmentFilter(event.target.value)} value={departmentFilter}>
              <option value="all">{labels.allDepartments}</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <select aria-label={labels.allStatuses} className="filter-input" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">{labels.allStatuses}</option>
              <option value="Active">{labels.statusActive}</option>
              <option value="On leave">{labels.statusLeave}</option>
              <option value="Inactive">{labels.statusInactive}</option>
            </select>
          </div>
        </div>

        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>{labels.employee}</th>
                <th>{labels.department}</th>
                <th>{labels.branch}</th>
                <th>{labels.joined}</th>
                <th>{labels.status}</th>
                <th>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-state" colSpan={6}>{labels.loading}</td></tr>
              ) : filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-cell">
                      <span className="employee-avatar">{employee.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                      <span>
                        <strong>{employee.fullName}</strong>
                        <small>{employee.employeeCode} · {employee.jobTitle}</small>
                      </span>
                    </div>
                  </td>
                  <td>{labels.departments[employee.department as keyof typeof labels.departments] ?? employee.department}</td>
                  <td>{labels.branches[employee.branch as keyof typeof labels.branches] ?? employee.branch}</td>
                  <td>{employee.joiningDate || labels.noDate}</td>
                  <td><span className={`employee-status ${employee.status.toLowerCase().replace(/\s+/g, '-')}`}>{statusLabel(employee.status, language)}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="text-button" onClick={() => openEditForm(employee)}>{labels.edit}</button>
                      <button className="text-button muted-action" onClick={() => toggleActive(employee)}>
                        {employee.status === 'Inactive' ? labels.activate : labels.deactivate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredEmployees.length === 0 && (
                <tr><td className="empty-state" colSpan={6}>{labels.empty}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <form className="employee-form panel" onSubmit={submitForm}>
            <div className="form-heading">
              <div>
                <p className="eyebrow">{labels.newRecord}</p>
                <h3>{editing ? labels.formEdit : labels.formNew}</h3>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowForm(false)}>×</button>
            </div>

            {editing && <div className="code-preview">{editing.employeeCode}</div>}
            <div className="form-grid">
              <FormField label={labels.fullName} required>
                <input autoFocus required value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} />
              </FormField>
              <FormField label={labels.email} required>
                <input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </FormField>
              <FormField label={labels.phone} required>
                <input required type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              </FormField>
              <FormField label={labels.jobTitle} required>
                <input required value={draft.jobTitle} onChange={(event) => setDraft({ ...draft, jobTitle: event.target.value })} />
              </FormField>
              <FormField label={labels.department} required>
                <select value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })}>
                  {departments.map((department) => <option key={department} value={department}>{labels.departments[department as keyof typeof labels.departments]}</option>)}
                </select>
              </FormField>
              <FormField label={labels.branch} required>
                <select value={draft.branch} onChange={(event) => setDraft({ ...draft, branch: event.target.value })}>
                  {branches.map((branch) => <option key={branch} value={branch}>{labels.branches[branch as keyof typeof labels.branches]}</option>)}
                </select>
              </FormField>
              <FormField label={labels.joiningDate} required>
                <input required type="date" value={draft.joiningDate} onChange={(event) => setDraft({ ...draft, joiningDate: event.target.value })} />
              </FormField>
              <FormField label={labels.status}>
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as EmployeeStatus })}>
                  <option value="Active">{labels.statusActive}</option>
                  <option value="On leave">{labels.statusLeave}</option>
                  <option value="Inactive">{labels.statusInactive}</option>
                </select>
              </FormField>
            </div>
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

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`metric-panel panel metric-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}{required && <b className="required-mark"> *</b>}</span>
      {children}
    </label>
  );
}

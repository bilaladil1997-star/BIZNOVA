import type { Role } from './data/erp';
import type { Employee } from './data/employees';

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
};

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export type AccountRecord = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentCode: string;
  isGroup: boolean;
  openingBalance: number;
  isActive: boolean;
  notes: string;
};

export type AccountInput = Omit<AccountRecord, 'id'>;

export type JournalEntryType = 'journal' | 'receipt' | 'payment' | 'sales' | 'purchase';
export type JournalStatus = 'draft' | 'submitted';

export type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
};

export type JournalLineRecord = JournalLineInput & {
  id: string;
  entryId: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  accountType: AccountType;
  projectId: string;
  projectName: string;
};

export type JournalEntryInput = {
  date: string;
  entryType: JournalEntryType;
  reference: string;
  memo: string;
  status: JournalStatus;
  projectId?: string;
  projectName?: string;
  lines: JournalLineInput[];
};

export type JournalEntryRecord = {
  id: string;
  entryNumber: string;
  date: string;
  entryType: JournalEntryType;
  reference: string;
  memo: string;
  status: JournalStatus;
  totalDebit: number;
  totalCredit: number;
  projectId: string;
  projectName: string;
  createdByName: string;
  createdAt: string;
  lineCount: number;
};

export type JournalEntryDetail = { entry: JournalEntryRecord; lines: JournalLineRecord[] };

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  debit: number;
  credit: number;
  activityDebit: number;
  activityCredit: number;
};

export type TrialBalanceReport = {
  asOf: string;
  rows: TrialBalanceRow[];
  totals: { debit: number; credit: number };
};

export type GeneralLedgerLine = {
  id: string;
  entryId: string;
  entryNumber: string;
  date: string;
  entryType: JournalEntryType;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
  description: string;
  balance: number;
};

export type GeneralLedgerReport = {
  account: Pick<AccountRecord, 'id' | 'code' | 'nameAr' | 'nameEn' | 'type'>;
  openingBalance: number;
  from: string;
  to: string;
  lines: GeneralLedgerLine[];
  endingBalance: number;
};

type SessionResponse = {
  user: AppUser | null;
  needsSetup: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network_error', 0, 'network_error');
  }

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
      ? result.error
      : 'request_failed';
    throw new ApiError(error, response.status, error);
  }
  return result as T;
}

export function getSession() {
  return request<SessionResponse>('/api/auth/session');
}

export function createInitialAccount(fullName: string, email: string, password: string) {
  return request<{ user: AppUser }>('/api/auth/setup', 'POST', { fullName, email, password });
}

export function login(email: string, password: string) {
  return request<{ user: AppUser }>('/api/auth/login', 'POST', { email, password });
}

export function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', 'POST');
}

export function fetchAccounts() {
  return request<{ accounts: AccountRecord[] }>('/api/accounts');
}

export function createAccount(account: AccountInput) {
  return request<{ account: AccountRecord }>('/api/accounts', 'POST', account);
}

export function updateAccount(id: string, account: AccountInput) {
  return request<{ account: AccountRecord }>(`/api/accounts/${encodeURIComponent(id)}`, 'PATCH', account);
}

export function fetchJournalEntries(status: 'all' | JournalStatus = 'all') {
  return request<{ entries: JournalEntryRecord[] }>(`/api/journal-entries?status=${status}`);
}

export function fetchJournalEntry(id: string) {
  return request<JournalEntryDetail>(`/api/journal-entries/${encodeURIComponent(id)}`);
}

export function createJournalEntry(entry: JournalEntryInput) {
  return request<JournalEntryDetail>('/api/journal-entries', 'POST', entry);
}

export function updateJournalEntry(id: string, entry: JournalEntryInput) {
  return request<JournalEntryDetail>(`/api/journal-entries/${encodeURIComponent(id)}`, 'PATCH', entry);
}

export function postJournalEntry(id: string) {
  return request<JournalEntryDetail>(`/api/journal-entries/${encodeURIComponent(id)}/post`, 'POST');
}

export function fetchTrialBalance(asOf: string) {
  return request<TrialBalanceReport>(`/api/finance/trial-balance?as_of=${encodeURIComponent(asOf)}`);
}

export function fetchGeneralLedger(accountId: string, from: string, to: string) {
  const query = new URLSearchParams({ account_id: accountId, from, to });
  return request<GeneralLedgerReport>(`/api/finance/general-ledger?${query}`);
}

export function fetchEmployees() {
  return request<{ employees: Employee[] }>('/api/employees');
}

export type MyEmployeeProfile = Pick<
  Employee,
  'employeeCode' | 'fullName' | 'email' | 'phone' | 'department' | 'jobTitle' | 'branch' | 'joiningDate' | 'status'
>;

export function fetchMyEmployee() {
  return request<{ employee: MyEmployeeProfile | null }>('/api/employees/me');
}

export function createEmployee(employee: Omit<Employee, 'id' | 'employeeCode'>) {
  return request<{ employee: Employee }>('/api/employees', 'POST', employee);
}

export function updateEmployee(employee: Employee) {
  return request<{ employee: Employee }>(`/api/employees/${encodeURIComponent(employee.id)}`, 'PATCH', employee);
}

export function deactivateEmployee(id: string) {
  return request<{ ok: boolean }>(`/api/employees/${encodeURIComponent(id)}`, 'DELETE');
}

export function migrateEmployees(employees: Employee[]) {
  return request<{ imported: number; employees: Employee[] }>('/api/employees/migrate', 'POST', { employees });
}

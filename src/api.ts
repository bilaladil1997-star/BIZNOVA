import type { Employee } from './data/employees';

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'GM' | 'HR Manager';
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

export function fetchEmployees() {
  return request<{ employees: Employee[] }>('/api/employees');
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

export type EmployeeStatus = 'Active' | 'On leave' | 'Inactive';

export type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  branch: string;
  joiningDate: string;
  status: EmployeeStatus;
};

export const employeeStorageKey = 'biznova-erp-employees-v1';

export function isEmployee(value: unknown): value is Employee {
  if (!value || typeof value !== 'object') return false;
  const employee = value as Record<string, unknown>;
  return (
    typeof employee.id === 'string' &&
    typeof employee.employeeCode === 'string' &&
    typeof employee.fullName === 'string' &&
    typeof employee.email === 'string' &&
    typeof employee.phone === 'string' &&
    typeof employee.department === 'string' &&
    typeof employee.jobTitle === 'string' &&
    typeof employee.branch === 'string' &&
    typeof employee.joiningDate === 'string' &&
    (employee.status === 'Active' || employee.status === 'On leave' || employee.status === 'Inactive')
  );
}

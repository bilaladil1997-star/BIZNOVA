export type Role = 'GM' | 'HR Manager' | 'Recruiter' | 'Accountant' | 'Manager';

export const roles: Role[] = ['GM', 'HR Manager', 'Recruiter', 'Accountant', 'Manager'];

export const phaseStatus = [
  { phase: 'Phase 0', status: 'Done', note: 'Execution protocol and safety rules established.' },
  { phase: 'Phase 1', status: 'Partial', note: 'Home dashboard and role widgets are active.' },
  { phase: 'Phase 2', status: 'Partial', note: 'Bilingual shared components planned.' },
  { phase: 'Phase 3', status: 'Partial', note: 'Settings and Integration Center are designed.' },
  { phase: 'Phase 4', status: 'Partial', note: 'Employee directory MVP is available; full HR workflows remain open.' },
  { phase: 'Phase 5', status: 'Not started', note: 'Accounts section pending.' },
  { phase: 'Phase 6', status: 'Not started', note: 'Collaboration module pending.' },
  { phase: 'Phase 7', status: 'Not started', note: 'Marketing module pending.' },
  { phase: 'Phase 8', status: 'Not started', note: 'Sales and customers module pending.' },
  { phase: 'Phase 9', status: 'Not started', note: 'Purchasing module pending.' },
  { phase: 'Phase 10', status: 'Not started', note: 'Inventory/POS/assets pending.' },
  { phase: 'Phase 11', status: 'Not started', note: 'Manufacturing build pending.' },
  { phase: 'Phase 12', status: 'Not started', note: 'Management build pending.' },
  { phase: 'Phase 13', status: 'Not started', note: 'Automation and security pending.' },
  { phase: 'Phase 14', status: 'Not started', note: 'Acceptance tests pending.' },
  { phase: 'Phase 15', status: 'Not started', note: 'AI Copilot build pending.' },
  { phase: 'Phase 16', status: 'Not started', note: 'Gap audit and QA pending.' },
];

export const roleWidgets: Record<Role, { title: string; value: string; icon: string; accent: string }[]> = {
  GM: [
    { title: 'Open approvals', value: '14', icon: '✅', accent: 'green' },
    { title: 'Departments', value: '9', icon: '🏢', accent: 'blue' },
    { title: 'Active projects', value: '18', icon: '📈', accent: 'purple' },
    { title: 'Build status', value: 'Partial', icon: '🛠️', accent: 'orange' },
  ],
  'HR Manager': [
    { title: 'Employees', value: '482', icon: '👥', accent: 'blue' },
    { title: 'Leave requests', value: '27', icon: '📅', accent: 'green' },
    { title: 'Pending hires', value: '12', icon: '🧑‍💼', accent: 'orange' },
    { title: 'Attendance alerts', value: '5', icon: '⏰', accent: 'purple' },
  ],
  Recruiter: [
    { title: 'Open positions', value: '18', icon: '🔍', accent: 'orange' },
    { title: 'Applicants', value: '146', icon: '📝', accent: 'blue' },
    { title: 'Interviews', value: '9', icon: '🎯', accent: 'green' },
    { title: 'Offer stage', value: '4', icon: '📦', accent: 'purple' },
  ],
  Accountant: [
    { title: 'Pending invoices', value: '31', icon: '🧾', accent: 'orange' },
    { title: 'Bank balances', value: 'AED 8.4M', icon: '🏦', accent: 'green' },
    { title: 'Journals', value: '96', icon: '📊', accent: 'blue' },
    { title: 'Commitments', value: '12', icon: '⚠️', accent: 'purple' },
  ],
  Manager: [
    { title: 'Tasks', value: '34', icon: '✅', accent: 'green' },
    { title: 'Team load', value: '82%', icon: '📉', accent: 'blue' },
    { title: 'Objectives', value: '7', icon: '🎯', accent: 'purple' },
    { title: 'Alerts', value: '3', icon: '🔔', accent: 'orange' },
  ],
};

export const personalData = {
  name: 'Nabil Rahman',
  email: 'nabil.rahman@biznova.ae',
  phone: '+971 50 123 4567',
  department: 'Executive Management',
  branch: 'Dubai - Head Office',
  language: 'English',
  role: 'GM',
};

export const moduleContent: Record<string, {
  metrics: { label: string; value: string; trend: string }[];
  rows: { name: string; value1: string; value2: string; value3: string; value4: string }[];
}> = {
  'Human Resources': {
    metrics: [
      { label: 'Employees', value: '482', trend: '+8.3%' },
      { label: 'Open jobs', value: '18', trend: '+2' },
      { label: 'Attendance', value: '96.4%', trend: '+1.6%' },
      { label: 'Leave balance', value: '1,248', trend: 'Stable' },
    ],
    rows: [
      { name: 'Sarah Al-Mansoori', value1: 'HR Manager', value2: 'Present', value3: '96%', value4: 'Dubai' },
      { name: 'Ali Hassan', value1: 'Recruiter', value2: 'Present', value3: '94%', value4: 'Sharjah' },
      { name: 'Mariam Yusuf', value1: 'Payroll Officer', value2: 'Late', value3: '91%', value4: 'Abu Dhabi' },
      { name: 'Omar Salem', value1: 'Operations Lead', value2: 'Present', value3: '98%', value4: 'Ras Al Khaimah' },
    ],
  },
  Accounts: {
    metrics: [
      { label: 'Revenue', value: 'AED 2.8M', trend: '+12.4%' },
      { label: 'Expenses', value: 'AED 1.9M', trend: '-3.1%' },
      { label: 'Cash flow', value: 'AED 0.9M', trend: '+6.2%' },
      { label: 'Invoices', value: '312', trend: '+18' },
    ],
    rows: [
      { name: 'INV-1047', value1: 'Account Payable', value2: 'AED 18,400', value3: 'Due in 6 days', value4: 'Approved' },
      { name: 'INV-1048', value1: 'Payroll', value2: 'AED 64,200', value3: 'Due today', value4: 'Pending' },
      { name: 'INV-1049', value1: 'Vendor fees', value2: 'AED 11,600', value3: 'Due in 2 days', value4: 'Approved' },
      { name: 'INV-1050', value1: 'Manufacturing', value2: 'AED 39,700', value3: 'Due in 10 days', value4: 'Draft' },
    ],
  },
  'CRM & Sales': {
    metrics: [
      { label: 'Leads', value: '486', trend: '+19%' },
      { label: 'Opportunities', value: '132', trend: '+11%' },
      { label: 'Win rate', value: '32%', trend: '+4.2%' },
      { label: 'Pipeline', value: 'AED 4.6M', trend: '+9.8%' },
    ],
    rows: [
      { name: 'Apex Logistics', value1: 'Prospect', value2: 'AED 460k', value3: '4 stages', value4: 'Review' },
      { name: 'Blue Pearl', value1: 'Proposal', value2: 'AED 220k', value3: '3 stages', value4: 'Negotiation' },
      { name: 'Elyx Group', value1: 'Customer', value2: 'AED 980k', value3: 'Closed', value4: 'Won' },
      { name: 'Nawa Tech', value1: 'Renewal', value2: 'AED 170k', value3: '2 stages', value4: 'Active' },
    ],
  },
  Inventory: {
    metrics: [
      { label: 'Items', value: '1,420', trend: '+5.8%' },
      { label: 'Stock value', value: 'AED 3.7M', trend: '+7.1%' },
      { label: 'Low stock', value: '24', trend: 'Review' },
      { label: 'Transfers', value: '44', trend: '+12' },
    ],
    rows: [
      { name: 'Steel Rod 12mm', value1: 'Warehouse A', value2: '1,240 pcs', value3: 'Low', value4: 'Awaiting PO' },
      { name: 'PVC Pipe 4in', value1: 'Warehouse B', value2: '480 pcs', value3: 'Healthy', value4: 'Available' },
      { name: 'Cement Bag 50kg', value1: 'Warehouse C', value2: '200 bags', value3: 'Critical', value4: 'Reorder' },
      { name: 'Industrial Filter', value1: 'Warehouse D', value2: '92 pcs', value3: 'Healthy', value4: 'Available' },
    ],
  },
  Manufacturing: {
    metrics: [
      { label: 'Open WOs', value: '37', trend: '+6' },
      { label: 'OEE', value: '81.2%', trend: '+2.5%' },
      { label: 'Scrap', value: '3.8%', trend: '-0.7%' },
      { label: 'Output', value: '12,480', trend: '+9.4%' },
    ],
    rows: [
      { name: 'WO-4821', value1: 'Smart Panel', value2: 'In progress', value3: '85%', value4: 'Assembly' },
      { name: 'WO-4822', value1: 'Pump Housing', value2: 'Testing', value3: '62%', value4: 'QC' },
      { name: 'WO-4823', value1: 'Valve Set', value2: 'Queued', value3: '0%', value4: 'Input' },
      { name: 'WO-4824', value1: 'Control Unit', value2: 'Completed', value3: '100%', value4: 'Approved' },
    ],
  },
  Projects: {
    metrics: [
      { label: 'Active projects', value: '18', trend: '+3' },
      { label: 'On-time', value: '76%', trend: '+4.1%' },
      { label: 'Milestones', value: '49', trend: '+8' },
      { label: 'Budget used', value: '64%', trend: 'On track' },
    ],
    rows: [
      { name: 'ERP Rollout', value1: 'Technology', value2: 'Phase 3', value3: 'AED 640k', value4: 'On track' },
      { name: 'Factory Upgrade', value1: 'Operations', value2: 'Phase 2', value3: 'AED 920k', value4: 'Delayed' },
      { name: 'Warehouse Modernization', value1: 'Logistics', value2: 'Phase 1', value3: 'AED 410k', value4: 'Healthy' },
      { name: 'HR Automation', value1: 'People', value2: 'Phase 4', value3: 'AED 280k', value4: 'At risk' },
    ],
  },
};

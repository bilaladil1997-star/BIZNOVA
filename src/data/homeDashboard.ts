export type DashboardRole =
  | 'GM'
  | 'HR Manager'
  | 'Recruiter'
  | 'Accountant'
  | 'Manager'
  | 'Marketer'
  | 'Sales Rep'
  | 'Purchasing Rep'
  | 'Employee'
  | 'Worker';

export type DashboardMetric = {
  key: string;
  value: string;
  change: string;
  direction: 'up' | 'down' | 'neutral';
  icon: string;
};

export type DashboardTask = {
  time: string;
  title: string;
  department: string;
  status: 'Complete' | 'Due soon' | 'Upcoming';
};

export type DashboardRequest = {
  team: string;
  title: string;
  age: string;
};

export type DashboardMockData = {
  profile: {
    employeeCode: string;
    department: string;
    branch: string;
    firstWorkDate: string;
    birthday: string;
    salary: string;
    endOfService: string;
  };
  metrics: DashboardMetric[];
  tasks: DashboardTask[];
  attendance: {
    checkIn: string;
    shiftEnd: string;
    weeklyRate: number;
    workedHours: string;
  };
  leave: {
    availableDays: string;
    annualDays: string;
    nextLeave: string;
  };
  onboarding: string[] | null;
  onboardingCompleted: number;
  requests: DashboardRequest[];
};

export const USE_MOCK_DATA = true;

export const financeDashboardMock = {
  revenueExpenses: [
    { month: 'Jan', monthAr: 'يناير', revenue: 420, expenses: 310 },
    { month: 'Feb', monthAr: 'فبراير', revenue: 460, expenses: 325 },
    { month: 'Mar', monthAr: 'مارس', revenue: 435, expenses: 350 },
    { month: 'Apr', monthAr: 'أبريل', revenue: 520, expenses: 370 },
    { month: 'May', monthAr: 'مايو', revenue: 570, expenses: 390 },
    { month: 'Jun', monthAr: 'يونيو', revenue: 610, expenses: 405 },
  ],
  budgetActual: [
    { department: 'Operations', departmentAr: 'العمليات', budget: 240, actual: 186 },
    { department: 'People', departmentAr: 'الموارد البشرية', budget: 180, actual: 151 },
    { department: 'Marketing', departmentAr: 'التسويق', budget: 125, actual: 132 },
    { department: 'Technology', departmentAr: 'التقنية', budget: 210, actual: 174 },
  ],
  cashAccounts: [
    { label: 'Operating bank', labelAr: 'البنك التشغيلي', amount: 72, color: '#14b8a6' },
    { label: 'Reserve', labelAr: 'الاحتياطي', amount: 20, color: '#3b82f6' },
    { label: 'Petty cash', labelAr: 'العهد النقدية', amount: 8, color: '#f5b544' },
  ],
  recentEntries: [
    { number: 'JV-2026-0148', date: '2026-11-18', memo: 'Monthly service revenue', memoAr: 'إيرادات الخدمات الشهرية', type: 'journal', amount: 18450, status: 'submitted' },
    { number: 'JV-2026-0147', date: '2026-11-18', memo: 'Office supplies settlement', memoAr: 'تسوية مستلزمات المكتب', type: 'payment', amount: 2780, status: 'submitted' },
    { number: 'JV-2026-0146', date: '2026-11-17', memo: 'Customer receipt', memoAr: 'تحصيل من عميل', type: 'receipt', amount: 12600, status: 'submitted' },
    { number: 'JV-2026-0145', date: '2026-11-16', memo: 'Payroll accrual', memoAr: 'استحقاق الرواتب', type: 'journal', amount: 42600, status: 'draft' },
  ],
};

export const hrDashboardMock = {
  hiringPipeline: [
    { stage: 'Sourcing', stageAr: 'استقطاب', count: 42 },
    { stage: 'Screening', stageAr: 'فرز', count: 28 },
    { stage: 'Interview', stageAr: 'مقابلة', count: 16 },
    { stage: 'Offer', stageAr: 'عرض وظيفي', count: 7 },
  ],
};

const task = (
  time: string,
  title: string,
  department: string,
  status: DashboardTask['status'],
): DashboardTask => ({ time, title, department, status });

const metric = (
  key: string,
  value: string,
  change: string,
  direction: DashboardMetric['direction'],
  icon: string,
): DashboardMetric => ({ key, value, change, direction, icon });

const createMockDashboard = (
  employeeCode: string,
  department: string,
  branch: string,
  metrics: DashboardMetric[],
  tasks: DashboardTask[],
  onboarding: string[] | null,
  requests: DashboardRequest[],
  onboardingCompleted = 0,
): DashboardMockData => ({
  profile: {
    employeeCode,
    department,
    branch,
    firstWorkDate: '2021-03-15',
    birthday: '1984-05-12',
    salary: 'AED 32,000',
    endOfService: 'AED 48,500',
  },
  metrics,
  tasks,
  attendance: {
    checkIn: '08:42',
    shiftEnd: '17:30',
    weeklyRate: 96,
    workedHours: '6h 24m',
  },
  leave: {
    availableDays: '18.5',
    annualDays: '30',
    nextLeave: '2026-11-28',
  },
  onboarding,
  onboardingCompleted,
  requests,
});

export const mockDashboards: Record<DashboardRole, DashboardMockData> = {
  GM: createMockDashboard(
    'EX-M0001',
    'Executive Management',
    'Dubai',
    [
      metric('approvals', '14', '+4', 'up', '✓'),
      metric('departments', '9', 'All active', 'neutral', '▤'),
      metric('activeProjects', '18', '+3', 'up', '◷'),
      metric('revenue', 'AED 2.8M', '+12.4%', 'up', '↗'),
    ],
    [
      task('09:00', 'reviewApprovals', 'Finance', 'Due soon'),
      task('10:30', 'leadershipStandup', 'Executive Management', 'Upcoming'),
      task('13:00', 'reviewHiringPlan', 'Human Resources', 'Upcoming'),
      task('15:00', 'factoryReview', 'Manufacturing', 'Upcoming'),
    ],
    null,
    [
      { team: 'Finance', title: 'approveQuarterlyBudget', age: '2h' },
      { team: 'Human Resources', title: 'confirmHeadcountPlan', age: '4h' },
      { team: 'Operations', title: 'reviewFactoryDowntime', age: '1d' },
    ],
  ),
  'HR Manager': createMockDashboard(
    'HR-M0001',
    'Human Resources',
    'Dubai',
    [
      metric('employees', '482', '+8.3%', 'up', '♙'),
      metric('openRoles', '18', '+2', 'up', '⌕'),
      metric('attendanceRate', '96.4%', '+1.6%', 'up', '◷'),
      metric('leaveApprovals', '27', '8 urgent', 'down', '▣'),
    ],
    [
      task('09:00', 'reviewLeaveRequests', 'Human Resources', 'Due soon'),
      task('10:00', 'confirmPayrollInputs', 'Finance', 'Upcoming'),
      task('11:30', 'screenShortlist', 'Recruitment', 'Upcoming'),
      task('14:00', 'meetNewJoiners', 'Human Resources', 'Upcoming'),
    ],
    ['verifyDocuments', 'assignBuddy', 'scheduleOrientation'],
    [
      { team: 'Finance', title: 'confirmPayrollChanges', age: '35m' },
      { team: 'Operations', title: 'approveShiftChanges', age: '3h' },
    ],
    1,
  ),
  Recruiter: createMockDashboard(
    'HR-M0008',
    'Human Resources',
    'Dubai',
    [
      metric('openRoles', '18', '+2', 'up', '⌕'),
      metric('candidates', '146', '+19%', 'up', '♙'),
      metric('interviews', '9', 'Today', 'neutral', '▣'),
      metric('offers', '4', '2 awaiting', 'down', '✓'),
    ],
    [
      task('09:30', 'reviewCandidateShortlist', 'Recruitment', 'Due soon'),
      task('11:00', 'interviewOperationsLead', 'Operations', 'Upcoming'),
      task('13:30', 'prepareOfferPack', 'Human Resources', 'Upcoming'),
    ],
    null,
    [{ team: 'Department Leads', title: 'provideInterviewFeedback', age: '1h' }],
  ),
  Accountant: createMockDashboard(
    'AC-M0001',
    'Finance',
    'Dubai',
    [
      metric('payables', '31', '6 due today', 'down', '▤'),
      metric('revenue', 'AED 2.8M', '+12.4%', 'up', '↗'),
      metric('cashPosition', 'AED 8.4M', 'Stable', 'neutral', '◫'),
      metric('journals', '96', '+18', 'up', '▣'),
    ],
    [
      task('08:45', 'reconcileBankFeed', 'Finance', 'Due soon'),
      task('10:00', 'reviewPayrollBatch', 'Human Resources', 'Upcoming'),
      task('13:00', 'closeVendorInvoices', 'Purchasing', 'Upcoming'),
    ],
    null,
    [{ team: 'Purchasing', title: 'attachMissingReceipts', age: '2h' }],
  ),
  Manager: createMockDashboard(
    'MG-M0004',
    'Operations',
    'Dubai',
    [
      metric('teamLoad', '82%', '+4%', 'up', '◷'),
      metric('myTasks', '34', '3 due today', 'down', '✓'),
      metric('objectives', '7', '2 at risk', 'down', '▤'),
      metric('alerts', '3', '1 urgent', 'down', '⚠'),
    ],
    [
      task('09:00', 'reviewDepartmentGoals', 'Operations', 'Due soon'),
      task('10:30', 'approveTravelRequests', 'Human Resources', 'Upcoming'),
      task('13:30', 'reviewProjectMilestones', 'Projects', 'Upcoming'),
      task('15:00', 'finalizeHiringPlan', 'Human Resources', 'Upcoming'),
    ],
    ['confirmDepartmentPlan', 'reviewBudgetVariance', 'shareTeamUpdates'],
    [{ team: 'Finance', title: 'approveBudgetVariance', age: '1h' }],
    1,
  ),
  Marketer: createMockDashboard(
    'MK-M0001',
    'Marketing',
    'Dubai',
    [
      metric('campaigns', '12', '+3', 'up', '◉'),
      metric('leads', '486', '+19%', 'up', '♙'),
      metric('conversionRate', '4.8%', '+0.6%', 'up', '↗'),
      metric('roas', '4.2×', '+8%', 'up', '▤'),
    ],
    [
      task('09:00', 'reviewCampaignPerformance', 'Marketing', 'Due soon'),
      task('10:30', 'approveLandingPage', 'Design', 'Upcoming'),
      task('14:00', 'handoffQualifiedLeads', 'Sales', 'Upcoming'),
    ],
    null,
    [{ team: 'Sales', title: 'shareLeadQualificationRules', age: '3h' }],
  ),
  'Sales Rep': createMockDashboard(
    'SA-M0024',
    'Sales',
    'Dubai',
    [
      metric('myPipeline', 'AED 1.2M', '+11%', 'up', '↗'),
      metric('openDeals', '24', '+5', 'up', '▤'),
      metric('meetings', '6', 'Today', 'neutral', '▣'),
      metric('winRate', '32%', '+4.2%', 'up', '✓'),
    ],
    [
      task('09:30', 'callApexLogistics', 'Sales', 'Due soon'),
      task('11:00', 'sendBluePearlProposal', 'Sales', 'Upcoming'),
      task('14:30', 'updateRenewalForecast', 'Accounts', 'Upcoming'),
    ],
    null,
    [{ team: 'Marketing', title: 'reviewNewQualifiedLeads', age: '45m' }],
  ),
  'Purchasing Rep': createMockDashboard(
    'PU-M0004',
    'Purchasing',
    'Dubai',
    [
      metric('purchaseRequests', '24', '+6', 'up', '▤'),
      metric('pendingOrders', '12', '4 urgent', 'down', '▣'),
      metric('onTimeSuppliers', '91%', '+3%', 'up', '✓'),
      metric('savings', 'AED 84k', '+8.1%', 'up', '↘'),
    ],
    [
      task('09:00', 'compareSupplierQuotes', 'Purchasing', 'Due soon'),
      task('10:45', 'confirmSteelDelivery', 'Inventory', 'Upcoming'),
      task('13:00', 'reviewInvoiceMatch', 'Finance', 'Upcoming'),
    ],
    null,
    [{ team: 'Inventory', title: 'confirmRequiredQuantities', age: '1h' }],
  ),
  Employee: createMockDashboard(
    'OP-M0128',
    'Operations',
    'Dubai',
    [
      metric('myTasks', '8', '3 due today', 'down', '✓'),
      metric('leaveBalance', '18.5 days', 'of 30', 'neutral', '▣'),
      metric('attendanceRate', '96%', '+1.2%', 'up', '◷'),
      metric('training', '2', 'In progress', 'neutral', '▤'),
    ],
    [
      task('09:00', 'completeSafetyBriefing', 'Operations', 'Due soon'),
      task('10:00', 'reviewProjectUpdates', 'Projects', 'Upcoming'),
      task('13:30', 'submitWeeklyTimesheet', 'Human Resources', 'Upcoming'),
    ],
    ['completeProfile', 'readWorkplacePolicy', 'meetTeamLead'],
    [{ team: 'Human Resources', title: 'confirmEmergencyContact', age: '1d' }],
    1,
  ),
  Worker: createMockDashboard(
    'MF-M0036',
    'Manufacturing',
    'Ras Al Khaimah',
    [
      metric('shiftStatus', 'On shift', 'Started 08:00', 'neutral', '◷'),
      metric('myTasks', '5', '2 due soon', 'down', '✓'),
      metric('attendanceRate', '98%', '+0.8%', 'up', '▣'),
      metric('safetyTraining', '100%', 'Up to date', 'up', '♙'),
    ],
    [
      task('08:00', 'startWorkOrder', 'Manufacturing', 'Complete'),
      task('10:15', 'recordQualityCheck', 'Quality', 'Due soon'),
      task('13:00', 'confirmMaterialCount', 'Inventory', 'Upcoming'),
    ],
    ['reviewSafetyRules', 'completeMachineTraining', 'confirmShiftSchedule'],
    [{ team: 'Human Resources', title: 'updateEmergencyContact', age: '2d' }],
    2,
  ),
};

export function getMockDashboard(role: string): DashboardMockData | null {
  if (!USE_MOCK_DATA || !Object.prototype.hasOwnProperty.call(mockDashboards, role)) return null;
  return mockDashboards[role as DashboardRole];
}

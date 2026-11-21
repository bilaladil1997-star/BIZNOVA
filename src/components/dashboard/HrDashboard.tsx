import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, ShieldCheck, Users } from 'lucide-react';
import { fetchEmployees, type AppUser } from '../../api';
import type { Employee } from '../../data/employees';
import { getMockDashboard, hrDashboardMock, USE_MOCK_DATA } from '../../data/homeDashboard';
import { homeDashboardCopy } from '../../i18n/homeDashboard';
import KpiCard from './KpiCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';

type Language = 'en' | 'ar';

const copy = {
  en: {
    eyebrow: 'PEOPLE / OVERVIEW',
    title: 'Human resources',
    subtitle: 'A practical view of your people, attendance, hiring, and the week ahead.',
    directory: 'Employee directory',
    sample: 'Sample attendance and hiring data',
    headcount: 'Headcount',
    active: 'Active employees',
    onLeave: 'On leave',
    hiring: 'Candidates in pipeline',
    profile: 'People profile',
    department: 'Department',
    branch: 'Branch',
    role: 'Role',
    attendance: 'Attendance today',
    attendanceRate: 'Weekly attendance',
    checkIn: 'Check-in',
    shiftEnd: 'Shift ends',
    hoursToday: 'Hours today',
    leave: 'Leave balance',
    daysAvailable: 'days available',
    annual: 'Annual allowance',
    nextLeave: 'Next approved leave',
    onboarding: 'Onboarding checklist',
    completed: 'completed',
    hiringPipeline: 'Hiring pipeline',
    week: 'This week',
    noEmployees: 'No employee records are available yet.',
    noOnboarding: 'No onboarding checklist for this role.',
    stage: 'Stage',
    candidates: 'Candidates',
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    events: ['Interviews', 'New joiners', 'Payroll review', 'Team check-in'],
  },
  ar: {
    eyebrow: 'الموارد البشرية / النظرة العامة',
    title: 'الموارد البشرية',
    subtitle: 'نظرة عملية على الموظفين والحضور والتوظيف وأبرز مواعيد الأسبوع.',
    directory: 'دليل الموظفين',
    sample: 'بيانات حضور وتوظيف تجريبية',
    headcount: 'إجمالي الموظفين',
    active: 'الموظفون النشطون',
    onLeave: 'في إجازة',
    hiring: 'المرشحون في المسار',
    profile: 'ملف الموظف',
    department: 'القسم',
    branch: 'الفرع',
    role: 'الدور',
    attendance: 'الحضور اليوم',
    attendanceRate: 'الحضور الأسبوعي',
    checkIn: 'وقت الحضور',
    shiftEnd: 'نهاية الدوام',
    hoursToday: 'ساعات اليوم',
    leave: 'رصيد الإجازات',
    daysAvailable: 'يوم متاح',
    annual: 'الرصيد السنوي',
    nextLeave: 'الإجازة المعتمدة القادمة',
    onboarding: 'قائمة التهيئة',
    completed: 'مكتمل',
    hiringPipeline: 'مسار التوظيف',
    week: 'هذا الأسبوع',
    noEmployees: 'لا توجد سجلات موظفين بعد.',
    noOnboarding: 'لا توجد قائمة تهيئة لهذا الدور.',
    stage: 'المرحلة',
    candidates: 'المرشحون',
    monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد',
    events: ['مقابلات', 'موظفون جدد', 'مراجعة الرواتب', 'اجتماع الفريق'],
  },
} as const;

const WEEK_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function getWeekDates() {
  const date = new Date();
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return WEEK_KEYS.map((_, index) => {
    const day = new Date(date);
    day.setDate(date.getDate() + index);
    return day;
  });
}

export default function HrDashboard({ language, user }: { language: Language; user: AppUser }) {
  const labels = copy[language];
  const locale = language === 'ar' ? 'ar-AE' : 'en-AE';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const weekDates = useMemo(getWeekDates, []);
  const roleDashboard = USE_MOCK_DATA ? getMockDashboard(user.role) : null;
  const myEmployee = employees.find((employee) => employee.email.toLocaleLowerCase() === user.email.toLocaleLowerCase());
  const counts = useMemo(() => ({
    total: employees.length,
    active: employees.filter((employee) => employee.status === 'Active').length,
    onLeave: employees.filter((employee) => employee.status === 'On leave').length,
  }), [employees]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    fetchEmployees().then(({ employees: records }) => {
      if (active) setEmployees(records);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  const attendance = roleDashboard?.attendance;
  const leave = roleDashboard?.leave;
  const onboarding = roleDashboard?.onboarding ?? (USE_MOCK_DATA ? ['verifyDocuments', 'assignBuddy', 'scheduleOrientation'] : null);
  const completedOnboarding = roleDashboard?.onboardingCompleted ?? 0;
  const pipelineTotal = hrDashboardMock.hiringPipeline.reduce((sum, stage) => sum + stage.count, 0);
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date());
  const formatDate = (date: Date) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);

  return (
    <section className="page hr-dashboard" data-accent="hr" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="dashboard-page-heading">
        <div><p className="dashboard-kicker">{labels.eyebrow}</p><h1>{labels.title}</h1><p>{labels.subtitle}</p></div>
        <div className="dashboard-actions"><span className="dashboard-date-label">{dateLabel}</span><NavLink className="primary-button" to="/hr/employee-records"><Users size={17} />{labels.directory}<ArrowRight size={15} /></NavLink></div>
      </header>
      {USE_MOCK_DATA && <span className="sample-data-label">{labels.sample}</span>}
      {loadError && <div className="inline-alert" role="alert">{labels.noEmployees}<button className="text-button" onClick={() => setReload((value) => value + 1)} type="button">{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button></div>}

      <div className="dashboard-bento hr-bento">
        <ChartCard title={labels.profile} icon={Users} className="dashboard-profile-card">
          {loading ? <div className="dashboard-skeleton" /> : <>
            <div className="dashboard-profile-head"><span className="dashboard-profile-avatar">{(myEmployee?.fullName ?? user.fullName).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><h2>{myEmployee?.fullName ?? user.fullName}</h2><p>{myEmployee?.jobTitle ?? user.role}</p></div></div>
            {myEmployee ? <div className="dashboard-profile-details"><div><span>{labels.department}</span><strong>{myEmployee.department}</strong></div><div><span>{labels.branch}</span><strong>{myEmployee.branch}</strong></div></div> : <div className="hr-profile-note">{labels.noEmployees}</div>}
          </>}
        </ChartCard>

        <section className="hr-kpis" aria-label={labels.headcount}>
          <KpiCard label={labels.headcount} value={loading ? '—' : String(counts.total)} icon={Users} accent="var(--accent-hr)" />
          <KpiCard label={labels.active} value={loading ? '—' : String(counts.active)} icon={CheckCircle2} accent="var(--success)" />
          <KpiCard label={labels.onLeave} value={loading ? '—' : String(counts.onLeave)} icon={CalendarDays} accent="#3b82f6" />
          <KpiCard label={labels.hiring} value={USE_MOCK_DATA ? String(pipelineTotal) : '—'} icon={BriefcaseBusiness} accent="#ec4899" />
        </section>

        <ChartCard title={labels.attendance} subtitle={labels.attendanceRate} icon={Clock3} className="hr-attendance">
          {attendance ? <div className="attendance-content">
            <svg className="attendance-ring" viewBox="0 0 120 120" role="img" aria-label={`${attendance.weeklyRate}% ${labels.attendanceRate}`}>
              <circle className="ring-track" cx="60" cy="60" r="48" /><circle className="ring-value" cx="60" cy="60" r="48" strokeDasharray={`${(attendance.weeklyRate / 100) * 301.59} 301.59`} /><text x="60" y="61">{attendance.weeklyRate}%</text>
            </svg>
            <div className="attendance-facts"><span>{labels.checkIn}: <strong>{attendance.checkIn}</strong></span><span>{labels.shiftEnd}: <strong>{attendance.shiftEnd}</strong></span><span>{labels.hoursToday}: <strong>{attendance.workedHours}</strong></span></div>
          </div> : <EmptyState title={labels.sample} />}
        </ChartCard>

        <ChartCard title={labels.leave} subtitle={leave ? `${labels.annual}: ${leave.annualDays} ${language === 'ar' ? 'يوم' : 'days'}` : undefined} icon={CalendarDays} className="hr-leave">
          {leave ? <><strong className="leave-balance-value">{leave.availableDays} <small>{labels.daysAvailable}</small></strong><div className="leave-meter" role="progressbar" aria-label={labels.leave} aria-valuemin={0} aria-valuemax={Number(leave.annualDays)} aria-valuenow={Number(leave.availableDays)}><span style={{ width: `${Math.min(100, (Number(leave.availableDays) / Number(leave.annualDays)) * 100)}%` }} /></div><p className="chart-card-subtitle">{labels.nextLeave}: {formatDate(new Date(`${leave.nextLeave}T00:00:00`))}</p></> : <EmptyState title={labels.sample} />}
        </ChartCard>

        <ChartCard title={labels.onboarding} icon={ClipboardCheck} className="hr-onboarding">
          {onboarding?.length ? <div className="checklist">{onboarding.map((item, index) => <div className="checklist-row" key={item}><span className={`checklist-mark ${index < completedOnboarding ? 'done' : ''}`}>{index < completedOnboarding ? <CheckCircle2 size={14} /> : null}</span><span>{homeDashboardCopy[language].onboardingLabels[item as keyof typeof homeDashboardCopy.en.onboardingLabels] ?? item}</span></div>)}</div> : <EmptyState title={labels.noOnboarding} />}
        </ChartCard>

        <ChartCard title={labels.hiringPipeline} icon={BriefcaseBusiness} className="hr-pipeline">
          {USE_MOCK_DATA ? <div className="pipeline-list">{hrDashboardMock.hiringPipeline.map((stage, index) => <div className="pipeline-row" key={stage.stage}><span>{language === 'ar' ? stage.stageAr : stage.stage}</span><strong>{stage.count}</strong><div className="pipeline-meter"><span style={{ width: `${(stage.count / hrDashboardMock.hiringPipeline[0].count) * 100}%`, opacity: 1 - index * 0.1 }} /></div></div>)}</div> : <EmptyState title={labels.sample} />}
        </ChartCard>

        <ChartCard title={labels.week} icon={CalendarDays} className="hr-week">
          <div className="week-grid">{weekDates.map((date, index) => {
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            const hasEvent = USE_MOCK_DATA && [0, 1, 2, 3].includes(index);
            return <div className={`week-day ${isToday ? 'today' : ''}`} key={date.toISOString()}><span className="week-day-name">{labels[WEEK_KEYS[index]]}</span><strong className="week-day-number">{formatDate(date)}</strong>{hasEvent && <span className="week-event">{labels.events[index]}</span>}</div>;
          })}</div>
        </ChartCard>
      </div>
    </section>
  );
}
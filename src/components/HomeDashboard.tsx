import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, ArrowRight, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, HandCoins, ListTodo, ShieldCheck, Users, Wallet, type LucideIcon } from 'lucide-react';
import { fetchMyEmployee, type AppUser, type MyEmployeeProfile } from '../api';
import { getMockDashboard, USE_MOCK_DATA } from '../data/homeDashboard';
import { homeDashboardCopy } from '../i18n/homeDashboard';
import KpiCard from './dashboard/KpiCard';
import ChartCard from './dashboard/ChartCard';
import EmptyState from './dashboard/EmptyState';

type Language = 'en' | 'ar';

type HomeWidget = 'metrics' | 'agenda' | 'onboarding' | 'requests';

const defaultWidgetOrder: HomeWidget[] = ['metrics', 'agenda', 'onboarding', 'requests'];

function readWidgetPreferences(email: string): { order: HomeWidget[]; hidden: HomeWidget[] } {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(`biznova-home-widgets-${email}`) ?? 'null');
    if (stored && typeof stored === 'object') {
      const value = stored as { order?: unknown; hidden?: unknown };
      const order = Array.isArray(value.order)
        ? value.order.filter((item): item is HomeWidget => defaultWidgetOrder.includes(item as HomeWidget))
        : [];
      const hidden = Array.isArray(value.hidden)
        ? value.hidden.filter((item): item is HomeWidget => defaultWidgetOrder.includes(item as HomeWidget))
        : [];
      const completeOrder = [...order, ...defaultWidgetOrder.filter((item) => !order.includes(item))];
      return { order: completeOrder, hidden: [...new Set(hidden)] };
    }
  } catch {
    // Widget preferences remain session-only if browser storage is unavailable.
  }
  return { order: defaultWidgetOrder, hidden: [] };
}

const metricIcons: Record<string, LucideIcon> = {
  approvals: CheckCircle2,
  departments: Building2,
  activeProjects: BriefcaseBusiness,
  revenue: HandCoins,
  employees: Users,
  openRoles: BriefcaseBusiness,
  attendanceRate: Clock3,
  leaveApprovals: CalendarDays,
  candidates: Users,
  interviews: CalendarDays,
  offers: FileCheck2,
  payables: Wallet,
  cashPosition: Wallet,
  journals: Activity,
  campaigns: Activity,
  leads: Users,
  conversionRate: ArrowRight,
  roas: HandCoins,
  myPipeline: Activity,
  openDeals: BriefcaseBusiness,
  meetings: CalendarDays,
  winRate: CheckCircle2,
  purchaseRequests: FileCheck2,
  pendingOrders: ListTodo,
  onTimeSuppliers: CheckCircle2,
  savings: HandCoins,
  myTasks: ListTodo,
  teamLoad: Users,
  objectives: CheckCircle2,
  alerts: Activity,
  leaveBalance: CalendarDays,
  training: ShieldCheck,
  shiftStatus: Clock3,
  safetyTraining: ShieldCheck,
};

export default function HomeDashboard({ language, user }: { language: Language; user: AppUser }) {
  const copy = homeDashboardCopy[language];
  const dashboard = getMockDashboard(user.role);
  const locale = language === 'ar' ? 'ar-AE' : 'en-AE';
  const [employeeProfile, setEmployeeProfile] = useState<MyEmployeeProfile | null>(null);
  const [profileState, setProfileState] = useState<'loading' | 'linked' | 'unlinked' | 'error'>('loading');
  const [profileReload, setProfileReload] = useState(0);
  const [customizing, setCustomizing] = useState(false);
  const [widgetPreferences, setWidgetPreferences] = useState(() => readWidgetPreferences(user.email));
  const today = new Date();
  const initials = user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const formattedDate = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

  useEffect(() => {
    let active = true;
    setEmployeeProfile(null);
    setProfileState('loading');
    fetchMyEmployee().then(({ employee }) => {
      if (active) {
        setEmployeeProfile(employee);
        setProfileState(employee ? 'linked' : 'unlinked');
      }
    }).catch(() => {
      if (active) setProfileState('error');
    });
    return () => { active = false; };
  }, [profileReload, user.email]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `biznova-home-widgets-${user.email}`,
        JSON.stringify(widgetPreferences),
      );
    } catch {
      // Widget preferences remain available for the current session.
    }
  }, [user.email, widgetPreferences]);

  function moveWidget(widget: HomeWidget, direction: -1 | 1) {
    setWidgetPreferences((current) => {
      const position = current.order.indexOf(widget);
      const target = position + direction;
      if (target < 0 || target >= current.order.length) return current;
      const order = [...current.order];
      [order[position], order[target]] = [order[target], order[position]];
      return { ...current, order };
    });
  }

  function toggleWidget(widget: HomeWidget) {
    setWidgetPreferences((current) => ({
      ...current,
      hidden: current.hidden.includes(widget)
        ? current.hidden.filter((item) => item !== widget)
        : [...current.hidden, widget],
    }));
  }

  function renderWidget(widget: HomeWidget) {
    if (widgetPreferences.hidden.includes(widget)) return null;

    if (widget === 'metrics') {
      return (
        <section className="home-kpis" aria-label={copy.metrics} key={widget}>
          {dashboard?.metrics.map((metric) => {
            const Icon = metricIcons[metric.key] ?? Activity;
            const label = copy.metricLabels[metric.key as keyof typeof copy.metricLabels] ?? metric.key;
            const route = metric.key === 'revenue' || metric.key === 'cashPosition'
              ? '/accounts/financial-overview'
              : metric.key === 'journals'
                ? '/accounts/journal-entries'
                : metric.key === 'employees'
                  ? '/hr/employee-records'
                  : '/hr';
            return (
              <NavLink className="home-kpi-link" key={metric.key} to={route}>
                <KpiCard label={label} value={metric.value} change={copy.metricChanges[metric.change as keyof typeof copy.metricChanges] ?? metric.change} direction={metric.direction} icon={Icon} accent="var(--primary)" />
              </NavLink>
            );
          })}
          {!dashboard && <EmptyState title={copy.noMetrics} />}
        </section>
      );
    }

    if (!dashboard) return null;

    if (widget === 'agenda') {
      return (
        <div className="home-agenda-widget" key={widget}>
          <ChartCard title={copy.attendanceLeave} subtitle={copy.today} icon={Clock3} className="hr-attendance home-attendance">
            <div className="attendance-content">
              <svg className="attendance-ring" viewBox="0 0 120 120" role="img" aria-label={`${dashboard.attendance.weeklyRate}% ${copy.weeklyAttendance}`}>
                <circle className="ring-track" cx="60" cy="60" r="48" />
                <circle className="ring-value" cx="60" cy="60" r="48" strokeDasharray={`${(dashboard.attendance.weeklyRate / 100) * 301.59} 301.59`} />
                <text x="60" y="61">{dashboard.attendance.weeklyRate}%</text>
              </svg>
              <div className="attendance-facts">
                <span>{copy.checkIn}: <strong>{dashboard.attendance.checkIn}</strong></span>
                <span>{copy.shiftEnd}: <strong>{dashboard.attendance.shiftEnd}</strong></span>
                <span>{copy.hoursToday}: <strong>{dashboard.attendance.workedHours}</strong></span>
              </div>
            </div>
          </ChartCard>

          <ChartCard title={copy.leaveBalance} subtitle={`${copy.annualAllowance}: ${dashboard.leave.annualDays} ${copy.days}`} icon={CalendarDays} className="hr-leave home-leave">
            <strong className="leave-balance-value">{dashboard.leave.availableDays} <small>{copy.days}</small></strong>
            <div className="leave-meter" role="progressbar" aria-label={copy.leaveBalance} aria-valuemin={0} aria-valuemax={Number(dashboard.leave.annualDays)} aria-valuenow={Number(dashboard.leave.availableDays)}><span style={{ width: `${Math.min(100, (Number(dashboard.leave.availableDays) / Number(dashboard.leave.annualDays)) * 100)}%` }} /></div>
            <p className="chart-card-subtitle">{copy.nextLeave}: {formattedDate(dashboard.leave.nextLeave)}</p>
          </ChartCard>

          <ChartCard title={copy.schedule} subtitle={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(today)} icon={CalendarDays} className="hr-week home-schedule">
            {dashboard.tasks.length ? <div className="home-task-list">{dashboard.tasks.map((task) => {
              const label = copy.taskLabels[task.title as keyof typeof copy.taskLabels] ?? task.title;
              return <div className="home-task-row" key={`${task.time}-${task.title}`}><time>{task.time}</time><span className="home-task-dot" /><div><strong>{label}</strong><small>{copy.teams[task.department as keyof typeof copy.teams] ?? task.department}</small></div><span className={`home-task-status ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>{copy.status[task.status]}</span></div>;
            })}</div> : <EmptyState title={copy.noTasks} />}
          </ChartCard>
        </div>
      );
    }

    if (widget === 'onboarding' && dashboard.onboarding) {
      return (
        <ChartCard title={copy.onboarding} icon={ClipboardCheck} className="hr-onboarding home-onboarding" key={widget}>
          <div className="checklist">{dashboard.onboarding.map((item, index) => <div className="checklist-row" key={item}><span className={`checklist-mark ${index < dashboard.onboardingCompleted ? 'done' : ''}`}>{index < dashboard.onboardingCompleted ? <CheckCircle2 size={14} /> : null}</span><span>{copy.onboardingLabels[item as keyof typeof copy.onboardingLabels] ?? item}</span></div>)}</div>
        </ChartCard>
      );
    }

    if (widget === 'requests') {
      return (
        <ChartCard title={copy.crossTeam} subtitle={copy.waiting} icon={FileCheck2} className="hr-pipeline home-requests" key={widget}>
          {dashboard.requests.length ? <div className="home-request-list">{dashboard.requests.map((request) => <div className="home-request-row" key={`${request.team}-${request.title}`}><span className="home-request-avatar">{request.team.slice(0, 1)}</span><div><strong>{copy.requestLabels[request.title as keyof typeof copy.requestLabels] ?? request.title}</strong><small>{copy.teams[request.team as keyof typeof copy.teams] ?? request.team}</small></div><time>{request.age}</time></div>)}</div> : <EmptyState title={copy.noRequests} />}
        </ChartCard>
      );
    }

    return null;
  }

  const roleLabel = copy.roleLabels[user.role as keyof typeof copy.roleLabels] ?? user.role;
  const employeeName = employeeProfile?.fullName ?? user.fullName;
  const department = employeeProfile?.department ?? dashboard?.profile.department;
  const branch = employeeProfile?.branch ?? dashboard?.profile.branch;

  return (
    <section className="page home-dashboard" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="dashboard-page-heading">
        <div>
          <p className="dashboard-kicker">{copy.welcome}</p>
          <h1>{employeeName}</h1>
          <p>{copy.executiveSummary}</p>
        </div>
        <div className="dashboard-heading-meta">
          <span className="dashboard-date-label">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today)}</span>
          {USE_MOCK_DATA && <span className="sample-data-label">{copy.sampleData}</span>}
          <button
            type="button"
            className="dashboard-customize-button"
            aria-expanded={customizing}
            onClick={() => setCustomizing((value) => !value)}
          >
            {copy.customizeDashboard}
          </button>
        </div>
      </header>

      {customizing && (
        <aside className="dashboard-customize-panel" aria-label={copy.customizeDashboard}>
          <div>
            <strong>{copy.customizeDashboard}</strong>
            <span>{copy.customizeDashboardHint}</span>
          </div>
          <div className="dashboard-widget-controls">
            {widgetPreferences.order.map((widget, index) => {
              const hidden = widgetPreferences.hidden.includes(widget);
              return (
                <div className="dashboard-widget-control" key={widget}>
                  <span>{copy.widgetLabels[widget]}</span>
                  <div>
                    <button type="button" onClick={() => moveWidget(widget, -1)} disabled={index === 0}>{copy.moveUp}</button>
                    <button type="button" onClick={() => moveWidget(widget, 1)} disabled={index === widgetPreferences.order.length - 1}>{copy.moveDown}</button>
                    <button type="button" onClick={() => toggleWidget(widget)}>{hidden ? copy.showWidget : copy.hideWidget}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      <div className="dashboard-bento home-bento">
        <ChartCard title={copy.profile} icon={Users} className="dashboard-profile-card home-profile-card">
          <div className="dashboard-profile-head">
            <span className="dashboard-profile-avatar">{initials}</span>
            <div><h2>{employeeName}</h2><p>{employeeProfile?.jobTitle ?? roleLabel}</p></div>
          </div>
          <div className="dashboard-profile-details">
            <div><span>{copy.employeeCode}</span><strong>{employeeProfile?.employeeCode ?? (dashboard ? dashboard.profile.employeeCode : '—')}</strong></div>
            <div><span>{copy.department}</span><strong>{department ? copy.teams[department as keyof typeof copy.teams] ?? department : '—'}</strong></div>
            <div><span>{copy.branch}</span><strong>{branch ? copy.branches[branch as keyof typeof copy.branches] ?? branch : '—'}</strong></div>
            <div><span>{copy.employmentStatus}</span><strong>{employeeProfile ? copy.statusLabels[employeeProfile.status] : roleLabel}</strong></div>
          </div>
          <div className={`profile-data-note ${profileState === 'error' ? 'has-error' : ''}`} role={profileState === 'error' ? 'alert' : 'status'}>
            <span>{profileState === 'loading' ? copy.profileLoading : profileState === 'linked' ? copy.profileLinked : profileState === 'error' ? copy.profileLoadError : copy.profileUnlinked}</span>
            {profileState === 'error' && <button className="profile-retry-button" type="button" onClick={() => setProfileReload((value) => value + 1)}>{copy.retry}</button>}
          </div>
          <NavLink className="dashboard-link" to="/hr/employee-records">{copy.employeeDirectory}<ArrowRight size={15} /></NavLink>
        </ChartCard>

        {widgetPreferences.order.map((widget) => renderWidget(widget))}
      </div>
    </section>
  );
}
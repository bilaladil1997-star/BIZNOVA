import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, Bell, BriefcaseBusiness, Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, FileText, Factory, LayoutDashboard, LogOut, Menu, Moon, Palette, PanelLeftClose, PanelLeftOpen, Search, Settings, Shield, ShoppingBag, Sun, Users, WalletCards, Wrench, type LucideIcon } from 'lucide-react';
import { moduleContent, phaseStatus, type Role } from './data/erp';
import { navigablePages, navigationSections, type NavigationNode } from './data/navigation';
import EmployeeDirectory from './components/EmployeeDirectory';
import ChartOfAccounts from './components/ChartOfAccounts';
import JournalEntries from './components/JournalEntries';
import FinanceReports, { type FinanceReportMode } from './components/FinanceReports';
import HomeDashboard from './components/HomeDashboard';
import FinanceDashboard from './components/dashboard/FinanceDashboard';
import HrDashboard from './components/dashboard/HrDashboard';
import AppearancePanel from './components/layout/AppearancePanel';
import { useAppearance } from './theme/ThemeProvider';
import { ApiError, createInitialAccount, fetchMyEmployee, getSession, login, logout, type AppUser, type MyEmployeeProfile } from './api';

const moduleTitles = {
  en: {
    Accounts: 'Accounts',
    'CRM & Sales': 'CRM & Sales',
    Inventory: 'Inventory',
    Manufacturing: 'Manufacturing',
    Projects: 'Projects',
    Collaboration: 'Collaboration',
    Automation: 'Automation',
    Acceptance: 'Acceptance Tests',
    Copilot: 'AI Copilot',
    Audit: 'Gap Audit & Design QA',
  },
  ar: {
    Accounts: 'الحسابات',
    'CRM & Sales': 'المبيعات وCRM',
    Inventory: 'المخزون',
    Manufacturing: 'التصنيع',
    Projects: 'المشاريع',
    Collaboration: 'التعاون',
    Automation: 'الأتمتة',
    Acceptance: 'اختبارات القبول',
    Copilot: 'المساعد الذكي',
    Audit: 'تدقيق الفجوات وجودة التصميم',
  },
} as const;

const navigationGroups = [
  { key: 'workspace', sectionIds: ['dashboard', 'accounts', 'hr', 'sales', 'crm', 'business'] },
  { key: 'operations', sectionIds: ['inventory', 'purchasing', 'manufacturing', 'projects', 'customer-service', 'assets', 'quality'] },
  { key: 'insights', sectionIds: ['marketing', 'reports', 'documents', 'integrations'] },
  { key: 'system', sectionIds: ['settings'] },
] as const;

const navigationIcons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  accounts: WalletCards,
  hr: Users,
  sales: ShoppingBag,
  crm: BriefcaseBusiness,
  business: BriefcaseBusiness,
  inventory: Building2,
  purchasing: ShoppingBag,
  manufacturing: Factory,
  projects: BriefcaseBusiness,
  'customer-service': CircleHelp,
  assets: Building2,
  quality: Shield,
  marketing: Activity,
  reports: Activity,
  documents: FileText,
  integrations: Wrench,
  settings: Settings,
};

function flattenNavigationPages(nodes: NavigationNode[] = []): NavigationNode[] {
  return nodes.flatMap((node) => node.path ? [node] : flattenNavigationPages(node.children));
}

function findPageSiblings(path: string, nodes = navigationSections): NavigationNode[] | null {
  for (const node of nodes) {
    const children = node.children ?? [];
    if (children.some((child) => child.path === path)) return children.filter((child) => child.path);
    const nested = findPageSiblings(path, children);
    if (nested) return nested;
  }
  return null;
}

function readExpandedNavigation(): Record<string, boolean> {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem('biznova-navigation-expanded') ?? 'null');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      const selected = Object.entries(stored).find((entry): entry is [string, true] => entry[1] === true);
      return selected ? { [selected[0]]: true } : {};
    }
  } catch {
    // Keep the default navigation state if stored preferences are unavailable.
  }
  return {};
}

function readFavoriteNavigation(): string[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem('biznova-navigation-favorites') ?? 'null');
    return Array.isArray(stored) ? stored.filter((path): path is string => typeof path === 'string') : [];
  } catch {
    return [];
  }
}

function findNavigationAncestors(path: string, nodes = navigationSections, ancestors: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.path === path) return node.children?.length ? [...ancestors, node.id] : ancestors;
    if (node.children) {
      const match = findNavigationAncestors(path, node.children, [...ancestors, node.id]);
      if (match) return match;
    }
  }
  return null;
}

function readLanguagePreference(): 'en' | 'ar' {
  try {
    return window.localStorage.getItem('biznova-language') === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

function App() {
  const [language, setLanguage] = useState<'en' | 'ar'>(readLanguagePreference);
  const [session, setSession] = useState<{ user: AppUser | null; needsSetup: boolean } | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [reloadSession, setReloadSession] = useState(0);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    try {
      window.localStorage.setItem('biznova-language', language);
    } catch {
      // The selected language remains active for this session if storage is unavailable.
    }
  }, [language]);

  useEffect(() => {
    let active = true;
    getSession()
      .then((result) => {
        if (active) {
          setSession(result);
          setSessionError(false);
        }
      })
      .catch(() => {
        if (active) setSessionError(true);
      });
    return () => {
      active = false;
    };
  }, [reloadSession]);

  if (sessionError) {
    return (
      <div className="auth-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card panel">
          <div className="brand-mark">B</div>
          <h1>BIZNOVA ERP</h1>
          <p>{language === 'en' ? 'Unable to connect to the ERP server.' : 'تعذر الاتصال بخادم النظام.'}</p>
          <button className="primary-button" onClick={() => setReloadSession((value) => value + 1)}>
            {language === 'en' ? 'Retry connection' : 'إعادة المحاولة'}
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card panel">
          <span className="auth-loading" />
          <p>{language === 'en' ? 'Connecting to BIZNOVA…' : 'جارٍ الاتصال بـ BIZNOVA…'}</p>
        </div>
      </div>
    );
  }

  if (!session.user) {
    return (
      <AuthScreen
        language={language}
        needsSetup={session.needsSetup}
        onLanguageChange={setLanguage}
        onAuthenticated={(user) => setSession({ user, needsSetup: false })}
      />
    );
  }

  return (
    <AuthenticatedApp
      language={language}
      onLanguageChange={setLanguage}
      onLogout={async () => {
        await logout();
        setSession({ user: null, needsSetup: false });
      }}
      user={session.user}
    />
  );
}

function AuthScreen({
  language,
  needsSetup,
  onLanguageChange,
  onAuthenticated,
}: {
  language: 'en' | 'ar';
  needsSetup: boolean;
  onLanguageChange: (language: 'en' | 'ar') => void;
  onAuthenticated: (user: AppUser) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const english = language === 'en';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = needsSetup
        ? await createInitialAccount(fullName, email, password)
        : await login(email, password);
      onAuthenticated(result.user);
    } catch (reason) {
      const code = reason instanceof ApiError ? reason.code : 'request_failed';
      setError(
        code === 'invalid_login'
          ? english ? 'Email or password is incorrect.' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
          : code === 'too_many_attempts'
            ? english ? 'Too many attempts. Try again later.' : 'محاولات كثيرة. حاول مرة أخرى لاحقاً.'
            : code === 'setup_already_complete'
              ? english ? 'Initial setup is already complete. Refresh and sign in.' : 'اكتمل الإعداد الأولي. حدّث الصفحة وسجّل الدخول.'
              : code === 'network_error'
                ? english ? 'Could not reach the server.' : 'تعذر الوصول إلى الخادم.'
                : english ? 'Could not complete the request. Check the details and try again.' : 'تعذر إكمال الطلب. تحقق من البيانات وحاول مرة أخرى.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page" dir={english ? 'ltr' : 'rtl'}>
      <form className="auth-card panel" onSubmit={submit}>
        <div className="auth-brand">
          <div className="brand-mark">B</div>
          <div><strong>BIZNOVA ERP</strong><small>Enterprise Suite</small></div>
        </div>
        <div className="lang-switch auth-language">
          <button type="button" className={english ? 'active' : ''} onClick={() => onLanguageChange('en')}>EN</button>
          <button type="button" className={!english ? 'active' : ''} onClick={() => onLanguageChange('ar')}>AR</button>
        </div>
        <p className="eyebrow">{english ? 'Secure workspace' : 'مساحة عمل آمنة'}</p>
        <h1>{needsSetup ? english ? 'Create administrator' : 'إنشاء حساب المدير' : english ? 'Welcome back' : 'مرحباً بعودتك'}</h1>
        <p className="auth-subtitle">
          {needsSetup
            ? english ? 'Create the first GM account. Use a unique password with at least 12 characters.' : 'أنشئ حساب المدير العام الأول بكلمة مرور فريدة لا تقل عن 12 حرفاً.'
            : english ? 'Sign in to continue to your ERP workspace.' : 'سجّل الدخول للمتابعة إلى مساحة العمل.'}
        </p>
        {needsSetup && (
          <label className="field">
            <span>{english ? 'Full name' : 'الاسم الكامل'}</span>
            <input autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
        )}
        <label className="field">
          <span>{english ? 'Work email' : 'البريد الإلكتروني للعمل'}</span>
          <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span>{english ? 'Password' : 'كلمة المرور'}</span>
          <input autoComplete={needsSetup ? 'new-password' : 'current-password'} minLength={needsSetup ? 12 : undefined} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <div className="inline-alert" role="alert">{error}</div>}
        <button className="primary-button auth-submit" disabled={submitting} type="submit">
          {submitting ? english ? 'Please wait…' : 'يرجى الانتظار…' : needsSetup ? english ? 'Create secure account' : 'إنشاء حساب آمن' : english ? 'Sign in' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}

function AuthenticatedApp({
  language,
  onLanguageChange,
  onLogout,
  user,
}: {
  language: 'en' | 'ar';
  onLanguageChange: (language: 'en' | 'ar') => void;
  onLogout: () => void;
  user: AppUser;
}) {
  const selectedRole: Role = user.role;
  const { settings, update: updateAppearance } = useAppearance();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(readExpandedNavigation);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [favoritePaths, setFavoritePaths] = useState<string[]>(readFavoriteNavigation);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const t = useMemo(() => {
    const map = {
      en: {
        brand: 'BIZNOVA ERP',
        search: 'Search pages and modules…',
        sidebarSearch: 'Search navigation',
        appearance: 'Appearance settings',
        selectedRole: 'Signed in',
        signOut: 'Sign out',
        workspace: 'Workspace',
        operations: 'Operations',
        system: 'System',
        dashboard: 'Dashboard',
        hr: 'Human Resources',
        accounts: 'Accounts',
        crm: 'CRM & Sales',
        inventory: 'Inventory',
        manufacturing: 'Manufacturing',
        projects: 'Projects',
        collaboration: 'Collaboration',
        automation: 'Automation',
        acceptance: 'Acceptance',
        copilot: 'AI Copilot',
        audit: 'Gap Audit',
        settings: 'Settings',
        purchasing: 'Purchasing',
        marketing: 'Marketing',
        employeeDirectory: 'Employee directory',
        recruitment: 'Recruitment',
        attendance: 'Attendance',
        leaveManagement: 'Leave management',
        endOfService: 'End of service',
        journalEntries: 'Journal entries',
        generalLedger: 'General ledger',
        budget: 'Budget',
        costCenters: 'Cost centers',
        financeReports: 'Reports',
        projectOverview: 'Project overview',
        projectDevelopment: 'Development',
        projectContracts: 'Contracts',
        expandSection: 'Expand section',
        collapseSection: 'Collapse section',
        buildStatus: 'Build Status',
        today: 'Today',
        notifications: 'Notifications',
        noNotifications: 'You’re all caught up.',
        theme: 'Toggle color theme',
        openMenu: 'Open navigation menu',
        collapseMenu: 'Collapse navigation',
        expandMenu: 'Expand navigation',
        help: 'Need a hand?',
        helpNote: 'Explore the workspace and your assigned modules.',
        helpAction: 'Help center',
        noResults: 'No matching pages',
        insights: 'Insights & resources',
        inDevelopment: 'In development',
        noProductionData: 'This workspace is not available yet. No live or sample business records are shown here.',
        favorites: 'Favorites',
        addFavorite: 'Add to favorites',
        removeFavorite: 'Remove from favorites',
      },
      ar: {
        brand: 'BIZNOVA ERP',
        search: 'ابحث في الصفحات والوحدات…',
        sidebarSearch: 'ابحث في القائمة',
        appearance: 'إعدادات المظهر',
        selectedRole: 'مسجل الدخول',
        signOut: 'تسجيل الخروج',
        workspace: 'مساحة العمل',
        operations: 'العمليات',
        system: 'النظام',
        dashboard: 'لوحة التحكم',
        hr: 'الموارد البشرية',
        accounts: 'الحسابات',
        crm: 'المبيعات وCRM',
        inventory: 'المخزون',
        manufacturing: 'التصنيع',
        projects: 'المشاريع',
        collaboration: 'التعاون',
        automation: 'الأتمتة',
        acceptance: 'اختبارات القبول',
        copilot: 'المساعد الذكي',
        audit: 'تدقيق الفجوات',
        settings: 'الإعدادات',
        purchasing: 'المشتريات',
        marketing: 'التسويق',
        employeeDirectory: 'دليل الموظفين',
        recruitment: 'التوظيف',
        attendance: 'الحضور',
        leaveManagement: 'إدارة الإجازات',
        endOfService: 'نهاية الخدمة',
        journalEntries: 'القيود المحاسبية',
        generalLedger: 'دفتر الأستاذ العام',
        budget: 'الميزانية',
        costCenters: 'مراكز التكلفة',
        financeReports: 'التقارير',
        projectOverview: 'نظرة عامة على المشاريع',
        projectDevelopment: 'التطوير',
        projectContracts: 'العقود',
        expandSection: 'توسيع القسم',
        collapseSection: 'طي القسم',
        buildStatus: 'حالة البناء',
        today: 'اليوم',
        notifications: 'الإشعارات',
        noNotifications: 'لا توجد إشعارات جديدة.',
        theme: 'تغيير المظهر',
        openMenu: 'فتح قائمة التنقل',
        collapseMenu: 'طي قائمة التنقل',
        expandMenu: 'توسيع قائمة التنقل',
        help: 'هل تحتاج للمساعدة؟',
        helpNote: 'استكشف مساحة العمل والوحدات المتاحة لك.',
        helpAction: 'مركز المساعدة',
        noResults: 'لا توجد صفحات مطابقة',
        insights: 'التحليلات والموارد',
        inDevelopment: 'قيد التطوير',
        noProductionData: 'هذه المساحة غير متاحة بعد. لا تُعرض هنا سجلات أعمال فعلية أو تجريبية.',
        favorites: 'المفضلة',
        addFavorite: 'إضافة إلى المفضلة',
        removeFavorite: 'إزالة من المفضلة',
      },
    } as const;
    return map[language];
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem('biznova-navigation-expanded', JSON.stringify(expandedModules));
    } catch {
      // The expanded state remains available for the current session.
    }
  }, [expandedModules]);

  useEffect(() => {
    try {
      window.localStorage.setItem('biznova-navigation-favorites', JSON.stringify(favoritePaths));
    } catch {
      // Favorites remain available for the current session.
    }
  }, [favoritePaths]);

  useEffect(() => {
    const ancestors = findNavigationAncestors(location.pathname);
    setExpandedModules(ancestors?.length ? { [ancestors[0]]: true } : {});
  }, [location.pathname]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setMobileSidebarOpen(false);
        setAppearanceOpen(false);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (!searchWrapRef.current?.contains(event.target)) setSearchOpen(false);
      if (
        !notificationsRef.current?.contains(event.target)
        && !userMenuRef.current?.contains(event.target)
      ) {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, []);

  const initials = user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const topbarDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  const pageSiblings = findPageSiblings(location.pathname)?.filter((page) => !(page.adminOnly && user.role !== 'GM')) ?? [];
  const availableLinks = navigablePages
    .filter((link) => !(link.adminOnly && user.role !== 'GM'))
    .filter((link) => {
      const label = link.label[language];
      return !searchQuery || label.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase());
    });

  const renderNavigationNode = (node: NavigationNode): React.ReactNode => {
    if (node.adminOnly && user.role !== 'GM') return null;
    const label = node.label[language];
    const pages = flattenNavigationPages(node.children).filter((page) => !(page.adminOnly && user.role !== 'GM'));
    const hasChildren = pages.length > 0;
    const expanded = Boolean(expandedModules[node.id]);
    const query = sidebarSearch.trim().toLocaleLowerCase();
    const sectionMatches = label.toLocaleLowerCase().includes(query);
    const matchingPages = pages.filter((page) => page.label[language].toLocaleLowerCase().includes(query));
    if (query && !sectionMatches && !matchingPages.length) return null;
    const displayedPages = query && sectionMatches ? pages : query ? matchingPages : pages;
    const Icon = navigationIcons[node.id] ?? LayoutDashboard;
    const toggleExpanded = () => setExpandedModules((current) => current[node.id] ? {} : { [node.id]: true });
    const toggleFavorite = (page: NavigationNode) => {
      if (!page.path) return;
      setFavoritePaths((current) => current.includes(page.path!) ? current.filter((path) => path !== page.path) : [...current, page.path!]);
    };

    if (!hasChildren) {
      const active = node.path === location.pathname;
      const favorite = Boolean(node.path && favoritePaths.includes(node.path));
      return <div className="nav-module-row" key={node.id} data-module={node.id}><NavLink to={node.path ?? '/'} end={node.path === '/'} title={label} className={({ isActive }) => `nav-link nav-root-link ${isActive ? 'active' : ''}`} onClick={() => setMobileSidebarOpen(false)}><span className="nav-icon-tile"><Icon size={20} strokeWidth={1.75} /></span><span className="nav-label">{label}</span></NavLink>{node.path && <button className={`nav-favorite ${favorite ? 'is-favorite' : ''}`} type="button" aria-label={`${favorite ? t.removeFavorite : t.addFavorite}: ${label}`} aria-pressed={favorite} title={favorite ? t.removeFavorite : t.addFavorite} onClick={() => toggleFavorite(node)}><span aria-hidden="true">★</span></button>}</div>;
    }

    return (
      <div className={`nav-module ${expanded ? 'expanded' : ''}`} key={node.id} data-module={node.id}>
        <div className="nav-module-row">
          {node.path ? <NavLink to={node.path} title={label} className={({ isActive }) => `nav-link nav-root-link ${isActive ? 'active' : ''}`} onClick={() => setMobileSidebarOpen(false)}><span className="nav-icon-tile"><Icon size={20} strokeWidth={1.75} /></span><span className="nav-label">{label}</span></NavLink> : <button type="button" className={`nav-link nav-group-toggle ${expanded ? 'expanded' : ''}`} aria-expanded={expanded} aria-controls={`submenu-${node.id}`} onClick={toggleExpanded}><span className="nav-icon-tile"><Icon size={20} strokeWidth={1.75} /></span><span className="nav-label">{label}</span></button>}
          <button type="button" className="nav-expand" aria-label={`${expanded ? t.collapseSection : t.expandSection} ${label}`} aria-expanded={expanded} aria-controls={`submenu-${node.id}`} onClick={toggleExpanded}><ChevronDown size={16} className={expanded ? 'rotated' : ''} /></button>
        </div>
        {expanded && <div className="nav-submenu" id={`submenu-${node.id}`}>
          {displayedPages.map((page) => {
            const favorite = Boolean(page.path && favoritePaths.includes(page.path));
            return <div className="nav-page-row" key={page.id}>
              <NavLink to={page.path ?? '#'} title={page.label[language]} className={({ isActive }) => `nav-link nav-page-link ${isActive ? 'active' : ''}`} onClick={() => setMobileSidebarOpen(false)}><span className="nav-label">{page.label[language]}</span></NavLink>
              {page.path && <button type="button" className={`nav-favorite ${favorite ? 'is-favorite' : ''}`} aria-label={`${favorite ? t.removeFavorite : t.addFavorite}: ${page.label[language]}`} aria-pressed={favorite} title={favorite ? t.removeFavorite : t.addFavorite} onClick={() => toggleFavorite(page)}><span aria-hidden="true">★</span></button>}
            </div>;
          })}
        </div>}
      </div>
    );
  };

  function navigateSidebarByKey(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('.nav-link'));
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + step + items.length) % items.length;
    event.preventDefault();
    items[nextIndex]?.focus();
  }

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? 'is-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-nav-open' : ''}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <button className="sidebar-scrim" aria-label={t.openMenu} onClick={() => setMobileSidebarOpen(false)} />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">B</div>
          <div className="brand-copy">
            <div className="brand-name">{t.brand}</div>
            <small>Enterprise Suite</small>
          </div>
          <button
            className="sidebar-collapse"
            aria-label={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
            title={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <div className="role-switcher">
          <div className="signed-in-role">
            <span className="role-avatar">{initials}</span>
            <span className="role-copy"><small>{t.selectedRole}</small><strong>{selectedRole}</strong></span>
          </div>
        </div>

        <label className="sidebar-search">
          <Search size={16} aria-hidden="true" />
          <input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder={t.sidebarSearch} aria-label={t.sidebarSearch} />
        </label>

        <nav className="nav" onKeyDown={navigateSidebarByKey} aria-label={language === 'en' ? 'Main navigation' : 'التنقل الرئيسي'}>
          {favoritePaths.length > 0 && (
            <div className="nav-group favorites-nav-group">
              <h2 className="nav-group-heading">{t.favorites}</h2>
              {navigablePages
                .filter((node) => node.path && favoritePaths.includes(node.path))
                .filter((node) => !(node.adminOnly && user.role !== 'GM'))
                .filter((node) => !sidebarSearch || node.label[language].toLocaleLowerCase().includes(sidebarSearch.toLocaleLowerCase()))
                .map((node) => (
                  <NavLink
                    className={({ isActive }) => (isActive ? 'nav-link active favorite-link' : 'nav-link favorite-link')}
                    key={node.path}
                    to={node.path!}
                    title={node.label[language]}
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <span className="nav-icon-tile"><FileText size={18} strokeWidth={1.75} /></span>
                    <span className="nav-label">{node.label[language]}</span>
                  </NavLink>
                ))}
            </div>
          )}
          {navigationGroups.map((group) => {
            const query = sidebarSearch.trim().toLocaleLowerCase();
            const sections = navigationSections.filter((node) => group.sectionIds.some((id) => id === node.id))
              .filter((node) => !query || node.label[language].toLocaleLowerCase().includes(query) || flattenNavigationPages(node.children).some((page) => page.label[language].toLocaleLowerCase().includes(query)));
            if (!sections.length) return null;
            return (
              <div className="nav-group" key={group.key}>
                <h2 className="nav-group-heading">{t[group.key as keyof typeof t]}</h2>
                {sections.map((node) => renderNavigationNode(node))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-help">
          <span className="help-mark">?</span>
          <div className="help-copy"><strong>{t.help}</strong><small>{t.helpNote}</small></div>
          <button className="help-action" aria-label={t.helpAction}>↗</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button mobile-menu-button"
              aria-label={t.openMenu}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="search-wrap" ref={searchWrapRef}>
              <Search className="search-icon" aria-hidden="true" size={17} />
              <input
                ref={searchRef}
                type="search"
                placeholder={t.search}
                aria-label={t.search}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
              <kbd className="search-shortcut">⌘ K</kbd>
              {searchOpen && searchQuery && (
                <div className="search-results">
                  {availableLinks.length ? availableLinks.map((link) => (
                    <NavLink key={link.id} to={link.path ?? '#'} onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                      setMobileSidebarOpen(false);
                    }}>
                      <FileText size={17} aria-hidden="true" />
                      {link.label[language]}
                    </NavLink>
                  )) : <span className="no-search-results">{t.noResults}</span>}
                </div>
              )}
            </div>
            <time className="today-label" dateTime={new Date().toISOString().slice(0, 10)}><span className="today-dot" />{topbarDate}</time>
          </div>

          <div className="topbar-actions">
            <div className="lang-switch topbar-language" aria-label={language === 'en' ? 'Choose language' : 'اختيار اللغة'}>
              <button className={language === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>EN</button>
              <button className={language === 'ar' ? 'active' : ''} onClick={() => onLanguageChange('ar')}>AR</button>
            </div>
            <button className="icon-button" aria-label={t.theme} title={t.theme} onClick={() => updateAppearance({ mode: settings.mode === 'dark' ? 'light' : 'dark' })}>
              {settings.mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" aria-label={t.appearance} title={t.appearance} onClick={() => setAppearanceOpen(true)}><Palette size={18} /></button>
            <div className="popover-anchor" ref={notificationsRef}>
              <button className={`icon-button notification-button ${notificationsOpen ? 'selected' : ''}`} aria-label={t.notifications} aria-expanded={notificationsOpen} onClick={() => {
                setNotificationsOpen((open) => !open);
                setUserMenuOpen(false);
              }}>
                <Bell size={18} /><span className="notification-dot" />
              </button>
              {notificationsOpen && <div className="topbar-popover notification-popover"><strong>{t.notifications}</strong><p>{t.noNotifications}</p></div>}
            </div>
            <div className="popover-anchor" ref={userMenuRef}>
              <button className={`user-pill ${userMenuOpen ? 'selected' : ''}`} aria-expanded={userMenuOpen} onClick={() => {
                setUserMenuOpen((open) => !open);
                setNotificationsOpen(false);
              }}>
                <span className="avatar">{initials}</span>
                <span className="user-copy">
                  <strong>{user.fullName}</strong>
                  <small>{selectedRole}</small>
                </span>
                <ChevronDown className="user-chevron" size={15} aria-hidden="true" />
              </button>
              {userMenuOpen && (
                <div className="topbar-popover user-popover">
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                  <button className="signout-button" onClick={onLogout}><LogOut size={15} />{t.signOut}</button>
                </div>
              )}
              </div>
          </div>
        </header>

        {pageSiblings.length > 1 && <nav className="page-pill-tabs" aria-label={language === 'en' ? 'Page navigation' : 'تنقل الصفحات'}>{pageSiblings.map((page) => <NavLink key={page.path} to={page.path ?? '#'} className={({ isActive }) => `page-pill-tab ${isActive ? 'active' : ''}`}>{page.label[language]}</NavLink>)}</nav>}

        <Routes>
          <Route path="/" element={<HomeDashboard language={language} user={user} />} />
          <Route path="/hr" element={<HrDashboard language={language} user={user} />} />
          <Route path="/hr/employee-records" element={<EmployeeDirectory language={language} />} />
          <Route path="/accounts/chart-of-accounts" element={<ChartOfAccounts language={language} user={user} />} />
          <Route path="/accounts" element={<FinanceDashboard language={language} user={user} />} />
          <Route path="/accounts/financial-overview" element={<FinanceDashboard language={language} user={user} />} />
          <Route path="/accounts/journal-entries" element={<JournalEntries language={language} user={user} />} />
          <Route path="/accounts/general-ledger" element={<FinanceReports language={language} user={user} mode="general-ledger" />} />
          <Route path="/accounts/trial-balance" element={<FinanceReports language={language} user={user} mode="trial-balance" />} />
          <Route path="/accounts/revenue-expenses" element={<FinanceReports language={language} user={user} mode="overview" />} />
          <Route path="/accounts/reports" element={<FinanceReports language={language} user={user} mode="trial-balance" />} />
          <Route path="/crm" element={<CrmView language={language} />} />
          <Route path="/inventory" element={<InventoryView language={language} />} />
          <Route path="/manufacturing" element={<ManufacturingView language={language} />} />
          <Route path="/projects" element={<ProjectsView language={language} />} />
          <Route path="/collaboration" element={<CollaborationView language={language} />} />
          <Route path="/automation" element={<AutomationView language={language} />} />
          <Route path="/acceptance" element={<AcceptanceView language={language} />} />
          <Route path="/copilot" element={<CopilotView language={language} />} />
          <Route path="/audit" element={<AuditView language={language} />} />
          <Route path="/settings" element={<SettingsView language={language} user={user} />} />
          <Route path="/purchasing" element={<PurchasingView language={language} />} />
          <Route path="/marketing" element={<MarketingView language={language} />} />
          <Route
            path="/admin/build-status"
            element={user.role === 'GM' ? <BuildStatusView language={language} /> : <AccessDeniedView language={language} />}
          />
          {navigablePages
            .filter((node) => node.path && ![
              '/', '/hr', '/accounts', '/accounts/chart-of-accounts', '/accounts/journal-entries',
              '/hr/employee-records',
              '/accounts/general-ledger', '/accounts/trial-balance', '/accounts/financial-overview',
              '/accounts/revenue-expenses', '/accounts/reports', '/crm', '/collaboration', '/inventory', '/manufacturing',
              '/projects', '/settings', '/purchasing', '/marketing', '/automation', '/acceptance',
              '/copilot', '/audit', '/admin/build-status',
            ].includes(node.path))
            .filter((node) => !(node.adminOnly && user.role !== 'GM'))
            .map((node) => (
              <Route
                key={node.path}
                path={node.path}
                element={(
                  <ModuleDevelopmentView
                    language={language}
                    title={node.label[language]}
                    status={t.inDevelopment}
                    description={t.noProductionData}
                  />
                )}
              />
            ))}
        </Routes>
      </main>
      <AppearancePanel open={appearanceOpen} onClose={() => setAppearanceOpen(false)} language={language} />
    </div>
  );
}

function ModuleDevelopmentView({
  language,
  title,
  status,
  description,
}: {
  language: 'en' | 'ar';
  title: string;
  status: string;
  description: string;
}) {
  return (
    <section className="page module-development-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="module-development-header">
        <p className="eyebrow">{status}</p>
        <h1>{title}</h1>
      </header>
      <div className="module-development-card panel" role="status">
        <span className="module-development-icon" aria-hidden="true">◷</span>
        <div>
          <strong>{status}</strong>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}

function InventoryView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Inventory & Warehouse' : 'المخزون والمستودعات';
  const section = moduleContent.Inventory ?? {
    metrics: [
      { label: language === 'en' ? 'Items' : 'العناصر', value: '1,420', trend: '+5.8%' },
      { label: language === 'en' ? 'Stock value' : 'قيمة المخزون', value: 'AED 3.7M', trend: '+7.1%' },
      { label: language === 'en' ? 'Low stock' : 'مخزون منخفض', value: '24', trend: 'Review' },
      { label: language === 'en' ? 'Transfers' : 'التحويلات', value: '44', trend: '+12' },
    ],
    rows: [
      { name: 'Steel Rod 12mm', value1: 'Warehouse A', value2: '1,240 pcs', value3: 'Low', value4: 'Awaiting PO' },
      { name: 'PVC Pipe 4in', value1: 'Warehouse B', value2: '480 pcs', value3: 'Healthy', value4: 'Available' },
      { name: 'Cement Bag 50kg', value1: 'Warehouse C', value2: '200 bags', value3: 'Critical', value4: 'Reorder' },
      { name: 'Industrial Filter', value1: 'Warehouse D', value2: '92 pcs', value3: 'Healthy', value4: 'Available' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Warehouse availability' : 'توفر المستودعات', value: '94.2%', note: language === 'en' ? 'Stable' : 'مستقر' },
    { label: language === 'en' ? 'On-hand value' : 'قيمة المخزون المتاح', value: 'AED 3.1M', note: language === 'en' ? 'In stock' : 'متوفر' },
    { label: language === 'en' ? 'Reorder alerts' : 'تنبيهات إعادة الطلب', value: '7', note: language === 'en' ? 'Action required' : 'يتطلب متابعة' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Operations' : 'العمليات'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Stock adjustment' : 'تعديل المخزون'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Status' : 'الحالة'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Inventory movement' : 'حركة المخزون'}</h3>
          <span className="chip">{language === 'en' ? 'Updated today' : 'تم التحديث اليوم'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Item' : 'العنصر'}</th>
              <th>{language === 'en' ? 'Location' : 'الموقع'}</th>
              <th>{language === 'en' ? 'Quantity' : 'الكمية'}</th>
              <th>{language === 'en' ? 'Health' : 'الحالة'}</th>
              <th>{language === 'en' ? 'Action' : 'الإجراء'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManufacturingView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Manufacturing & Production' : 'التصنيع والإنتاج';
  const section = moduleContent.Manufacturing ?? {
    metrics: [
      { label: language === 'en' ? 'Open WOs' : 'أوامر العمل المفتوحة', value: '37', trend: '+6' },
      { label: language === 'en' ? 'OEE' : 'مؤشر OEE', value: '81.2%', trend: '+2.5%' },
      { label: language === 'en' ? 'Scrap' : 'الخردة', value: '3.8%', trend: '-0.7%' },
      { label: language === 'en' ? 'Output' : 'الإنتاج', value: '12,480', trend: '+9.4%' },
    ],
    rows: [
      { name: 'WO-4821', value1: 'Smart Panel', value2: 'In progress', value3: '85%', value4: 'Assembly' },
      { name: 'WO-4822', value1: 'Pump Housing', value2: 'Testing', value3: '62%', value4: 'QC' },
      { name: 'WO-4823', value1: 'Valve Set', value2: 'Queued', value3: '0%', value4: 'Input' },
      { name: 'WO-4824', value1: 'Control Unit', value2: 'Completed', value3: '100%', value4: 'Approved' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Production plan' : 'خطة الإنتاج', value: '92%', note: language === 'en' ? 'On track' : 'ضمن الخطة' },
    { label: language === 'en' ? 'BOM health' : 'حالة قائمة المواد', value: 'High', note: language === 'en' ? 'Stable' : 'مستقر' },
    { label: language === 'en' ? 'Quality checks' : 'فحوصات الجودة', value: '18', note: language === 'en' ? 'Pending review' : 'بانتظار المراجعة' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Operations' : 'العمليات'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Create work order' : 'إنشاء أمر عمل'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Status' : 'الحالة'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Work orders' : 'أوامر العمل'}</h3>
          <span className="chip">{language === 'en' ? 'Live production' : 'إنتاج مباشر'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Work order' : 'رقم الأمر'}</th>
              <th>{language === 'en' ? 'Product' : 'المنتج'}</th>
              <th>{language === 'en' ? 'Stage' : 'المرحلة'}</th>
              <th>{language === 'en' ? 'Progress' : 'التقدم'}</th>
              <th>{language === 'en' ? 'Queue' : 'الطابور'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectsView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Projects & Strategy' : 'المشاريع والاستراتيجية';
  const section = moduleContent.Projects ?? {
    metrics: [
      { label: language === 'en' ? 'Active projects' : 'المشاريع النشطة', value: '18', trend: '+3' },
      { label: language === 'en' ? 'On-time' : 'في الوقت', value: '76%', trend: '+4.1%' },
      { label: language === 'en' ? 'Milestones' : 'المراحل', value: '49', trend: '+8' },
      { label: language === 'en' ? 'Budget used' : 'الميزانية المستخدمة', value: '64%', trend: 'On track' },
    ],
    rows: [
      { name: 'ERP Rollout', value1: 'Technology', value2: 'Phase 3', value3: 'AED 640k', value4: 'On track' },
      { name: 'Factory Upgrade', value1: 'Operations', value2: 'Phase 2', value3: 'AED 920k', value4: 'Delayed' },
      { name: 'Warehouse Modernization', value1: 'Logistics', value2: 'Phase 1', value3: 'AED 410k', value4: 'Healthy' },
      { name: 'HR Automation', value1: 'People', value2: 'Phase 4', value3: 'AED 280k', value4: 'At risk' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Portfolio health' : 'صحة المحفظة', value: '72%', note: language === 'en' ? 'Stable' : 'مستقر' },
    { label: language === 'en' ? 'Risk watchlist' : 'قائمة المخاطر', value: '5', note: language === 'en' ? 'Action needed' : 'يتطلب متابعة' },
    { label: language === 'en' ? 'Capital plan' : 'خطة رأس المال', value: 'AED 2.1M', note: language === 'en' ? 'Allocated' : 'مخصص' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Management' : 'الإدارة'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'New initiative' : 'مبادرة جديدة'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Portfolio overview' : 'نظرة عامة على المحفظة'}</h3>
          <span className="chip">{language === 'en' ? 'Live tracking' : 'تتبع مباشر'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Project' : 'المشروع'}</th>
              <th>{language === 'en' ? 'Department' : 'القسم'}</th>
              <th>{language === 'en' ? 'Phase' : 'المرحلة'}</th>
              <th>{language === 'en' ? 'Budget' : 'الميزانية'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CrmView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'CRM & Sales' : 'المبيعات وCRM';
  const section = moduleContent['CRM & Sales'] ?? {
    metrics: [
      { label: language === 'en' ? 'Leads' : 'الفرص', value: '486', trend: '+19%' },
      { label: language === 'en' ? 'Opportunities' : 'الفرص', value: '132', trend: '+11%' },
      { label: language === 'en' ? 'Win rate' : 'نسبة الفوز', value: '32%', trend: '+4.2%' },
      { label: language === 'en' ? 'Pipeline' : 'الأنبوب', value: 'AED 4.6M', trend: '+9.8%' },
    ],
    rows: [
      { name: 'Apex Logistics', value1: 'Prospect', value2: 'AED 460k', value3: '4 stages', value4: 'Review' },
      { name: 'Blue Pearl', value1: 'Proposal', value2: 'AED 220k', value3: '3 stages', value4: 'Negotiation' },
      { name: 'Elyx Group', value1: 'Customer', value2: 'AED 980k', value3: 'Closed', value4: 'Won' },
      { name: 'Nawa Tech', value1: 'Renewal', value2: 'AED 170k', value3: '2 stages', value4: 'Active' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Hot pipeline' : 'الخط الساخن', value: 'AED 1.8M', note: language === 'en' ? 'Fast moving' : 'حركية عالية' },
    { label: language === 'en' ? 'Renewals' : 'التجديدات', value: '11', note: language === 'en' ? 'Upcoming' : 'قريباً' },
    { label: language === 'en' ? 'Conversion' : 'التحويل', value: '28%', note: language === 'en' ? 'Improving' : 'يتحسن' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Commercial' : 'تجاري'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'New opportunity' : 'فرصة جديدة'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Value' : 'القيمة'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Sales pipeline' : 'قيمة المبيعات'}</h3>
          <span className="chip">{language === 'en' ? 'Updated today' : 'تم التحديث اليوم'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Account' : 'الحساب'}</th>
              <th>{language === 'en' ? 'Stage' : 'المرحلة'}</th>
              <th>{language === 'en' ? 'Value' : 'القيمة'}</th>
              <th>{language === 'en' ? 'Pipeline' : 'القناة'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PurchasingView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Purchasing & Suppliers' : 'المشتريات والموردين';
  const section = {
    metrics: [
      { label: language === 'en' ? 'Open POs' : 'أوامر الشراء المفتوحة', value: '18', trend: '+4' },
      { label: language === 'en' ? 'Spend' : 'المصروف', value: 'AED 1.4M', trend: '+8.3%' },
      { label: language === 'en' ? 'On-time delivery' : 'التسليم في الوقت', value: '92%', trend: '+2.1%' },
      { label: language === 'en' ? 'Suppliers' : 'الموردين', value: '64', trend: '+7' },
    ],
    rows: [
      { name: 'PO-4820', value1: 'Industrial Supply Co.', value2: 'AED 320k', value3: 'Due in 5 days', value4: 'Approved' },
      { name: 'PO-4819', value1: 'Rapid Metals', value2: 'AED 205k', value3: 'Due today', value4: 'In transit' },
      { name: 'PO-4818', value1: 'SafeBuild Materials', value2: 'AED 146k', value3: 'Due in 2 days', value4: 'Review' },
      { name: 'PO-4817', value1: 'Prime Packaging', value2: 'AED 94k', value3: 'Received', value4: 'Closed' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Approval queue' : 'طابور الموافقات', value: '6', note: language === 'en' ? 'Waiting' : 'بانتظار' },
    { label: language === 'en' ? 'Supplier score' : 'مؤشر المورد', value: '4.7/5', note: language === 'en' ? 'Strong' : 'قوي' },
    { label: language === 'en' ? 'Committed spend' : 'المصروف المتعهد', value: 'AED 2.2M', note: language === 'en' ? 'Planned' : 'مخطط' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Operations' : 'العمليات'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Create purchase order' : 'إنشاء أمر شراء'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Procurement pipeline' : 'قائمة المشتريات'}</h3>
          <span className="chip">{language === 'en' ? 'Updated today' : 'تم التحديث اليوم'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'PO' : 'أمر الشراء'}</th>
              <th>{language === 'en' ? 'Supplier' : 'المورد'}</th>
              <th>{language === 'en' ? 'Amount' : 'المبلغ'}</th>
              <th>{language === 'en' ? 'Due' : 'الاستحقاق'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MarketingView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Marketing & Campaigns' : 'التسويق والحملات';
  const section = {
    metrics: [
      { label: language === 'en' ? 'Campaigns' : 'الحملات', value: '14', trend: '+3' },
      { label: language === 'en' ? 'Qualified leads' : 'العملاء المؤهلين', value: '286', trend: '+19%' },
      { label: language === 'en' ? 'CTR' : 'معدل النقر', value: '6.4%', trend: '+1.2%' },
      { label: language === 'en' ? 'ROAS' : 'عائد الإعلان', value: '4.8x', trend: '+0.9x' },
    ],
    rows: [
      { name: 'Spring Launch', value1: 'Digital', value2: 'AED 120k', value3: '66% CTR', value4: 'Running' },
      { name: 'Retargeting Boost', value1: 'Social', value2: 'AED 48k', value3: '42% CTR', value4: 'Approved' },
      { name: 'Partner Webinar', value1: 'Field', value2: 'AED 26k', value3: '89% signups', value4: 'Scheduled' },
      { name: 'Loyalty Push', value1: 'CRM', value2: 'AED 19k', value3: '31% lift', value4: 'In review' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Pipeline quality' : 'جودة القناة', value: '71%', note: language === 'en' ? 'Strong' : 'قوي' },
    { label: language === 'en' ? 'Brand lift' : 'رفع العلامة', value: '+12.8%', note: language === 'en' ? 'Positive' : 'إيجابي' },
    { label: language === 'en' ? 'Pending approval' : 'في انتظار الموافقة', value: '3', note: language === 'en' ? 'Fast lane' : 'مسار سريع' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Growth' : 'النمو'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Launch campaign' : 'إطلاق حملة'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Value' : 'القيمة'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Campaign performance' : 'أداء الحملات'}</h3>
          <span className="chip">{language === 'en' ? 'Live reporting' : 'تقارير مباشرة'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Campaign' : 'الحملة'}</th>
              <th>{language === 'en' ? 'Channel' : 'القناة'}</th>
              <th>{language === 'en' ? 'Budget' : 'الميزانية'}</th>
              <th>{language === 'en' ? 'Performance' : 'الأداء'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CollaborationView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Collaboration & Teams' : 'التعاون والفرق';
  const section = moduleContent.Collaboration ?? {
    metrics: [
      { label: language === 'en' ? 'Active rooms' : 'الغرف النشطة', value: '12', trend: '+3' },
      { label: language === 'en' ? 'Task completion' : 'إكمال المهام', value: '89%', trend: '+6.1%' },
      { label: language === 'en' ? 'Comments' : 'التعليقات', value: '248', trend: '+18%' },
      { label: language === 'en' ? 'Response time' : 'زمن الاستجابة', value: '2.4h', trend: '-18m' },
    ],
    rows: [
      { name: 'ERP rollout', value1: 'Project room', value2: '9 tasks', value3: '3 blockers', value4: 'Review' },
      { name: 'Facility upgrade', value1: 'Operations', value2: '6 tasks', value3: '1 due today', value4: 'On track' },
      { name: 'Recruitment sprint', value1: 'People team', value2: '11 tasks', value3: '2 approvals', value4: 'In progress' },
      { name: 'Finance close', value1: 'Accounting', value2: '7 tasks', value3: '1 risk', value4: 'Escalated' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Team alignment' : 'مواءمة الفريق', value: '91%', note: language === 'en' ? 'Strong' : 'قوي' },
    { label: language === 'en' ? 'Unresolved blockers' : 'العوائق غير المحلولة', value: '4', note: language === 'en' ? 'Monitor' : 'مراقبة' },
    { label: language === 'en' ? 'Cross-team work' : 'الأعمال المشتركة', value: '17', note: language === 'en' ? 'Active' : 'نشط' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Collaboration' : 'التعاون'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Start workspace' : 'بدء مساحة عمل'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Team workstreams' : 'مسارات العمل'}</h3>
          <span className="chip">{language === 'en' ? 'Live updates' : 'تحديثات مباشرة'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Workspace' : 'مساحة العمل'}</th>
              <th>{language === 'en' ? 'Group' : 'المجموعة'}</th>
              <th>{language === 'en' ? 'Tasks' : 'المهام'}</th>
              <th>{language === 'en' ? 'Follow-up' : 'المتابعة'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AutomationView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Automation & Security' : 'الأتمتة والأمان';
  const section = moduleContent.Automation ?? {
    metrics: [
      { label: language === 'en' ? 'Rules active' : 'القواعد النشطة', value: '31', trend: '+7' },
      { label: language === 'en' ? 'Auto approvals' : 'الموافقات التلقائية', value: '84%', trend: '+9.3%' },
      { label: language === 'en' ? 'Audit events' : 'أحداث التدقيق', value: '1,284', trend: '+22%' },
      { label: language === 'en' ? 'Exceptions' : 'الاستثناءات', value: '8', trend: '-3' },
    ],
    rows: [
      { name: 'PO approval gate', value1: 'Purchasing', value2: 'Threshold > AED 200k', value3: 'Enabled', value4: 'Healthy' },
      { name: 'Stock transfer alert', value1: 'Inventory', value2: 'Low stock + transfer', value3: 'Enabled', value4: 'Watching' },
      { name: 'Payroll hold check', value1: 'Finance', value2: 'Missing approval', value3: 'Dry-run', value4: 'Queued' },
      { name: 'Vendor policy sync', value1: 'Compliance', value2: 'Code review', value3: 'Scheduled', value4: 'Pending' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Control coverage' : 'تغطية التحكم', value: '92%', note: language === 'en' ? 'Strong' : 'قوي' },
    { label: language === 'en' ? 'Blocked automations' : 'الأتمتة المحظورة', value: '3', note: language === 'en' ? 'Needs review' : 'تحتاج مراجعة' },
    { label: language === 'en' ? 'Risk posture' : 'مستوى المخاطر', value: 'Low', note: language === 'en' ? 'Stable' : 'مستقر' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Governance' : 'الحوكمة'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Add rule' : 'إضافة قاعدة'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Automation rules' : 'قواعد الأتمتة'}</h3>
          <span className="chip">{language === 'en' ? 'Live logs' : 'سجلات مباشرة'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Rule' : 'القاعدة'}</th>
              <th>{language === 'en' ? 'Process' : 'العملية'}</th>
              <th>{language === 'en' ? 'Condition' : 'الشرط'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
              <th>{language === 'en' ? 'Health' : 'الصحة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AcceptanceView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Acceptance & QA' : 'القبول والجودة';
  const section = moduleContent.Acceptance ?? {
    metrics: [
      { label: language === 'en' ? 'Scenarios passed' : 'السيناريوهات المكتملة', value: '84%', trend: '+11%' },
      { label: language === 'en' ? 'Critical defects' : 'العيوب الحرجة', value: '6', trend: '-2' },
      { label: language === 'en' ? 'E2E checks' : 'فحوصات النهاية إلى النهاية', value: '142', trend: '+19' },
      { label: language === 'en' ? 'UAT signoff' : 'موافقة المستخدم', value: '73%', trend: '+8.4%' },
    ],
    rows: [
      { name: 'HR onboarding', value1: 'Payroll', value2: 'Pass', value3: 'No blockers', value4: 'Approved' },
      { name: 'Finance close', value1: 'Accounting', value2: 'Pass', value3: 'Minor issue', value4: 'Review' },
      { name: 'Warehouse transfer', value1: 'Inventory', value2: 'Pass', value3: 'Audit log ok', value4: 'Approved' },
      { name: 'Production work order', value1: 'Manufacturing', value2: 'Partial', value3: 'Traceability gap', value4: 'Escalated' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Business readiness' : 'جاهزية الأعمال', value: '81%', note: language === 'en' ? 'On track' : 'ضمن الخطة' },
    { label: language === 'en' ? 'Open defects' : 'العيوب المفتوحة', value: '11', note: language === 'en' ? 'Monitored' : 'قيد المراقبة' },
    { label: language === 'en' ? 'Risk status' : 'حالة المخاطر', value: 'Medium', note: language === 'en' ? 'Action needed' : 'يتطلب متابعة' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Quality' : 'الجودة'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Run validation' : 'تشغيل التحقق'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Validation checklist' : 'قائمة التحقق'}</h3>
          <span className="chip">{language === 'en' ? 'Latest cycle' : 'الدورة الأخيرة'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Scenario' : 'السيناريو'}</th>
              <th>{language === 'en' ? 'Area' : 'النطاق'}</th>
              <th>{language === 'en' ? 'Result' : 'النتيجة'}</th>
              <th>{language === 'en' ? 'Observation' : 'الملاحظة'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CopilotView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'AI Copilot' : 'المساعد الذكي';
  const section = moduleContent.Copilot ?? {
    metrics: [
      { label: language === 'en' ? 'Active users' : 'المستخدمون النشطون', value: '218', trend: '+24%' },
      { label: language === 'en' ? 'Auto suggestions' : 'الاقتراحات الآلية', value: '1,460', trend: '+19%' },
      { label: language === 'en' ? 'Approval accuracy' : 'دقة الموافقة', value: '96.7%', trend: '+1.3%' },
      { label: language === 'en' ? 'Blocked prompts' : 'المطالبات المحظورة', value: '9', trend: '-4' },
    ],
    rows: [
      { name: 'GM summary', value1: 'Management', value2: '3 prompts', value3: 'Policy-safe', value4: 'Ready' },
      { name: 'HR leave assistant', value1: 'People', value2: '18 prompts', value3: 'Role-scoped', value4: 'Active' },
      { name: 'Marketing brief', value1: 'Marketing', value2: '12 prompts', value3: 'Approved', value4: 'Published' },
      { name: 'Warehouse exception', value1: 'Operations', value2: '6 prompts', value3: 'Escalation rules', value4: 'Monitoring' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Guardrails' : 'الحواجز', value: 'Enabled', note: language === 'en' ? 'Strong' : 'قوي' },
    { label: language === 'en' ? 'Data access' : 'وصول البيانات', value: 'Role-aware', note: language === 'en' ? 'Controlled' : 'مراقب' },
    { label: language === 'en' ? 'Risk posture' : 'مستوى المخاطر', value: 'Low', note: language === 'en' ? 'Stable' : 'مستقر' },
  ];

  const suggestions = language === 'en'
    ? [
        'Summarize the GM weekly risk report.',
        'Draft a leave approval summary for HR.',
        'List the top 3 initiatives for next quarter.',
      ]
    : [
        'لخص تقرير المخاطر الأسبوعي للمدير العام.',
        'أنشئ ملخصاً لطلبات الإجازة في الموارد البشرية.',
        'أدرج أفضل 3 مبادرات للفترة القادمة.',
      ];

  const defaults = {
    en: 'Summarize the current business risks and recommended actions for leadership.',
    ar: 'لخص مخاطر العمل الحالية والإجراءات الموصى بها للقيادة.',
  };

  const [prompt, setPrompt] = useState(defaults[language]);
  const [result, setResult] = useState(
    language === 'en'
      ? '1. Finance remains stable with strong cash coverage.\n2. Inventory and manufacturing need tighter traceability checks.\n3. Recommendation: accelerate policy review and approval routing.'
      : '1. المالية مستقرة مع تغطية نقدية جيدة.\n2. المخزون والتصنيع يحتاجان إلى فحوصات تتبع أكثر صرامة.\n3. التوصية: تسريع مراجعة السياسات وتوجيه الموافقات.'
  );

  const handleSubmit = () => {
    const normalized = prompt.trim();
    if (!normalized) {
      setResult(language === 'en' ? 'Please enter a prompt for the assistant.' : 'يرجى إدخال طلب للمساعد.');
      return;
    }

    const concise = normalized.toLowerCase();
    if (concise.includes('leave') || concise.includes('إجازة') || concise.includes('hr')) {
      setResult(language === 'en'
        ? 'HR metrics show 27 leave requests pending. 9 are awaiting manager approval and 3 need payroll review before close.'
        : 'تظهر مؤشرات الموارد البشرية وجود 27 طلب إجازة معلقة. 9 تنتظر موافقة المدير و3 تحتاج مراجعة الرواتب قبل الإغلاق.');
      return;
    }

    if (concise.includes('inventory') || concise.includes('مخزون') || concise.includes('warehouse')) {
      setResult(language === 'en'
        ? 'Warehouse readiness is at 94%. The main issue is material traceability for 3 critical SKUs. The recommended action is to align stock transfer approvals and audit logs.'
        : 'جاهزية المستودعات 94%. المشكلة الرئيسية هي تتبع المواد في 3 عناصر حرجة. الإجراء الموصى به هو مواءمة الموافقات وسجلات التدقيق لنقل المخزون.');
      return;
    }

    setResult(language === 'en'
      ? 'Leadership should prioritize: cash discipline, operational traceability, and faster approvals across finance and manufacturing.'
      : 'يجب على القيادة إعطاء الأولوية: للانضباط النقدي، وتتبع العمليات، وتسريع عمليات الموافقة في المالية والتصنيع.');
  };

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Executive AI' : 'الذكاء التنفيذي'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button" onClick={() => setPrompt(defaults[language])}>{language === 'en' ? 'Open assistant' : 'فتح المساعد'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        <div className="panel settings-panel" style={{ gridColumn: '1 / -1' }}>
          <h3>{language === 'en' ? 'Ask the Copilot' : 'اسأل المساعد'}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {suggestions.map((item) => (
              <button
                key={item}
                className="ghost-button"
                onClick={() => setPrompt(item)}
                style={{ padding: '8px 12px', borderRadius: '999px' }}
              >
                {item}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            style={{ width: '100%', resize: 'vertical', borderRadius: '12px', border: '1px solid #dfe7f1', padding: '12px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="primary-button" onClick={handleSubmit}>{language === 'en' ? 'Generate insight' : 'إنشاء رؤية'}</button>
          </div>
          <div style={{ marginTop: '16px', whiteSpace: 'pre-line', background: '#f6f9fc', borderRadius: '12px', padding: '16px', lineHeight: 1.7 }}>
            {result}
          </div>
        </div>
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Live assistant sessions' : 'جلسات المساعد المباشرة'}</h3>
          <span className="chip">{language === 'en' ? 'Policy-safe' : 'آمن وفق السياسة'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Experience' : 'التجربة'}</th>
              <th>{language === 'en' ? 'Department' : 'القسم'}</th>
              <th>{language === 'en' ? 'Volume' : 'الحجم'}</th>
              <th>{language === 'en' ? 'Guardrail' : 'الحماية'}</th>
              <th>{language === 'en' ? 'State' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'Gap Audit & Design QA' : 'تدقيق الفجوات وجودة التصميم';
  const section = moduleContent.Audit ?? {
    metrics: [
      { label: language === 'en' ? 'Coverage score' : 'نتيجة التغطية', value: '89%', trend: '+7.2%' },
      { label: language === 'en' ? 'Critical gaps' : 'الفجوات الحرجة', value: '4', trend: '-2' },
      { label: language === 'en' ? 'Design checks' : 'فحوصات التصميم', value: '126', trend: '+14' },
      { label: language === 'en' ? 'Dept readiness' : 'جاهزية الأقسام', value: '86%', trend: '+5.1%' },
    ],
    rows: [
      { name: 'HR capability', value1: 'People', value2: 'Ready', value3: 'No major block', value4: 'Approved' },
      { name: 'Finance controls', value1: 'Finance', value2: 'Ready', value3: 'Policy alignment', value4: 'Approved' },
      { name: 'Warehouse ops', value1: 'Operations', value2: 'Gap', value3: 'Stock traceability', value4: 'Follow-up' },
      { name: 'Manufacturing QA', value1: 'Production', value2: 'Ready', value3: 'Traceability review', value4: 'Monitoring' },
    ],
  };

  const overview = [
    { label: language === 'en' ? 'Capability posture' : 'وضعية القدرة', value: '86%', note: language === 'en' ? 'Strong' : 'قوي' },
    { label: language === 'en' ? 'Open gaps' : 'الفجوات المفتوحة', value: '7', note: language === 'en' ? 'Action plan active' : 'خطة عمل نشطة' },
    { label: language === 'en' ? 'Design risk' : 'مخاطر التصميم', value: 'Low', note: language === 'en' ? 'Under control' : 'تحت السيطرة' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Governance' : 'الحوكمة'}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Run audit' : 'تشغيل التدقيق'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="settings-grid" style={{ marginBottom: '20px' }}>
        {overview.map((item) => (
          <div key={item.label} className="panel settings-panel">
            <h3>{item.label}</h3>
            <div className="pref-item"><span>{language === 'en' ? 'Current' : 'الحالي'}</span><strong>{item.value}</strong></div>
            <div className="pref-item"><span>{language === 'en' ? 'Signal' : 'الإشارة'}</span><strong>{item.note}</strong></div>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Department gap review' : 'مراجعة فجوات الأقسام'}</h3>
          <span className="chip">{language === 'en' ? 'Quarterly review' : 'مراجعة ربع سنوية'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Area' : 'النطاق'}</th>
              <th>{language === 'en' ? 'Department' : 'القسم'}</th>
              <th>{language === 'en' ? 'Readiness' : 'الجاهزية'}</th>
              <th>{language === 'en' ? 'Observation' : 'الملاحظة'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionView({ title, language }: { title: string; language: 'en' | 'ar' }) {
  const section = moduleContent[title] ?? {
    metrics: [
      { label: language === 'en' ? 'Overview' : 'نظرة عامة', value: 'Ready', trend: 'Live' },
      { label: language === 'en' ? 'Status' : 'الحالة', value: 'Active', trend: 'Stable' },
      { label: language === 'en' ? 'Tasks' : 'المهام', value: '24', trend: '+3' },
      { label: language === 'en' ? 'Alerts' : 'التنبيهات', value: '2', trend: 'Low' },
    ],
    rows: [
      { name: 'Record 1', value1: 'Prepared', value2: 'Ready', value3: 'Active', value4: 'Live' },
      { name: 'Record 2', value1: 'Prepared', value2: 'Ready', value3: 'Active', value4: 'Live' },
      { name: 'Record 3', value1: 'Prepared', value2: 'Ready', value3: 'Active', value4: 'Live' },
      { name: 'Record 4', value1: 'Prepared', value2: 'Ready', value3: 'Active', value4: 'Live' },
    ],
  };
  const displayTitle = moduleTitles[language][title as keyof typeof moduleTitles.en] ?? title;

  const headers =
    title === 'Human Resources'
      ? ['Employee', 'Position', 'Attendance', 'Efficiency', 'Location']
      : title === 'Accounts'
        ? ['Document', 'Type', 'Amount', 'Due', 'Status']
        : title === 'CRM & Sales'
          ? ['Account', 'Stage', 'Value', 'Pipeline', 'Status']
          : title === 'Inventory'
            ? ['Item', 'Location', 'Quantity', 'Health', 'Action']
            : title === 'Manufacturing'
              ? ['Work order', 'Product', 'Stage', 'Progress', 'Queue']
              : title === 'Projects'
                ? ['Project', 'Department', 'Phase', 'Budget', 'Status']
                : ['Name', 'Field 1', 'Field 2', 'Field 3', 'Field 4'];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Module' : 'الوحدة'}</p>
          <h2>{displayTitle}</h2>
        </div>
        <button className="ghost-button">{language === 'en' ? 'Create record' : 'إنشاء سجل'}</button>
      </div>

      <div className="section-metrics">
        {section.metrics.map((item) => (
          <div key={item.label} className="metric-panel panel">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </div>
        ))}
      </div>

      <div className="table-panel panel">
        <div className="panel-header">
          <h3>{language === 'en' ? 'Recent entries' : 'السجلات الأخيرة'}</h3>
          <span className="chip">{language === 'en' ? 'Updated today' : 'تم التحديث اليوم'}</span>
        </div>
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value1}</td>
                <td>{row.value2}</td>
                <td>{row.value3}</td>
                <td>{row.value4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsView({ language, user }: { language: 'en' | 'ar'; user: AppUser }) {
  const [employeeProfile, setEmployeeProfile] = useState<MyEmployeeProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    fetchMyEmployee().then(({ employee }) => {
      if (active) {
        setEmployeeProfile(employee);
        setProfileLoading(false);
      }
    }).catch(() => {
      if (active) setProfileLoading(false);
    });
    return () => { active = false; };
  }, [user.email]);

  const t = language === 'en'
    ? {
        title: 'System settings',
        personal: 'Personal data',
        company: 'Company profile',
        roleMatrix: 'Role matrix',
        preferences: 'Preferences',
        integrations: 'Integration center',
        employeeCode: 'Employee code format',
        codePattern: '[DEPT]-[BRANCH][4 digits]',
        notes: 'Notes',
        fullName: 'Full name',
        email: 'Email',
        phone: 'Phone',
        language: 'Language',
        workspace: 'Workspace',
        branch: 'Branch',
        department: 'Department',
        theme: 'Color theme',
        widgets: 'Home widgets',
        modules: 'Modules',
        buildStatus: 'Build status page',
        valueDeepBlue: 'Deep Blue',
        valueRoleBased: 'Role-based',
        valueERP: 'ERP suite',
        valueGM: 'Visible to GM',
        companyName: 'BIZNOVA Manufacturing',
        companyEmail: 'ops@biznova.ae',
        companyPhone: '+971 4 333 8844',
        companyBranch: 'Dubai - Head Office',
        companyDepartment: 'Executive Management',
        onboarding: 'Initial setup complete',
      }
    : {
        title: 'إعدادات النظام',
        personal: 'البيانات الشخصية',
        company: 'ملف الشركة',
        roleMatrix: 'مصفوفة الأدوار',
        preferences: 'التفضيلات',
        integrations: 'مركز التكامل',
        employeeCode: 'صيغة كود الموظف',
        codePattern: '[القسم]-[الفرع][4 أرقام]',
        notes: 'ملاحظات',
        fullName: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        language: 'اللغة',
        workspace: 'مساحة العمل',
        branch: 'الفرع',
        department: 'القسم',
        theme: 'لون الواجهة',
        widgets: 'عناصر الصفحة الرئيسية',
        modules: 'الوحدات',
        buildStatus: 'صفحة حالة البناء',
        valueDeepBlue: 'أزرق داكن',
        valueRoleBased: 'حسب الدور',
        valueERP: 'مجموعة ERP',
        valueGM: 'مرئية للمدير العام',
        companyName: 'BIZNOVA Manufacturing',
        companyEmail: 'ops@biznova.ae',
        companyPhone: '+971 4 333 8844',
        companyBranch: 'دبي - المقر الرئيسي',
        companyDepartment: 'الإدارة التنفيذية',
        onboarding: 'اكتمل الإعداد الأولي',
      };

  const roleMatrix = [
    { role: 'GM', access: 'Full access', note: language === 'en' ? 'Executive oversight' : 'إشراف تنفيذي' },
    { role: 'HR Manager', access: 'HR + payroll', note: language === 'en' ? 'People operations' : 'عمليات الموارد البشرية' },
    { role: 'Recruiter', access: 'Hiring only', note: language === 'en' ? 'Talent pipeline' : 'مسار التوظيف' },
    { role: 'Accountant', access: 'Finance only', note: language === 'en' ? 'Ledger and AP' : 'دفتر الأستاذ والدفع' },
    { role: 'Manager', access: 'Team data', note: language === 'en' ? 'Operational review' : 'مراجعة التشغيل' },
  ];

  const integrations = [
    { name: language === 'en' ? 'Biometric devices' : 'أجهزة البصمة', status: 'Connected', tone: 'green' },
    { name: language === 'en' ? 'Payroll feeds' : 'تغذيات الرواتب', status: 'Ready', tone: 'blue' },
    { name: language === 'en' ? 'CRM connectors' : 'موصلات CRM', status: 'Queued', tone: 'amber' },
    { name: language === 'en' ? 'AI provider config' : 'إعداد مزود الذكاء', status: 'Draft', tone: 'purple' },
  ];

  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'System' : 'النظام'}</p>
          <h2>{t.title}</h2>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <h3>{t.personal}</h3>
          <div className="field"><label>{t.fullName}</label><input value={profileLoading ? '…' : employeeProfile?.fullName ?? user.fullName} readOnly /></div>
          <div className="field"><label>{t.email}</label><input value={employeeProfile?.email ?? user.email} readOnly /></div>
          <div className="field"><label>{t.phone}</label><input value={profileLoading ? '…' : employeeProfile?.phone ?? '—'} readOnly /></div>
          <div className="field"><label>{t.language}</label><input value={language === 'ar' ? 'العربية' : 'English'} readOnly /></div>
        </div>

        <div className="panel settings-panel">
          <h3>{t.company}</h3>
          <div className="field"><label>{t.company}</label><input value={t.companyName} readOnly /></div>
          <div className="field"><label>{t.email}</label><input value={t.companyEmail} readOnly /></div>
          <div className="field"><label>{t.phone}</label><input value={t.companyPhone} readOnly /></div>
          <div className="field"><label>{t.branch}</label><input value={t.companyBranch} readOnly /></div>
          <div className="field"><label>{t.department}</label><input value={t.companyDepartment} readOnly /></div>
        </div>

        <div className="panel settings-panel">
          <h3>{t.preferences}</h3>
          <div className="pref-item"><span>{t.theme}</span><strong>{t.valueDeepBlue}</strong></div>
          <div className="pref-item"><span>{t.widgets}</span><strong>{t.valueRoleBased}</strong></div>
          <div className="pref-item"><span>{t.modules}</span><strong>{t.valueERP}</strong></div>
          <div className="pref-item"><span>{t.buildStatus}</span><strong>{t.valueGM}</strong></div>
          <div className="pref-item"><span>{t.notes}</span><strong>{t.onboarding}</strong></div>
        </div>
      </div>

      <div className="settings-grid" style={{ marginTop: '20px' }}>
        <div className="panel settings-panel">
          <h3>{t.employeeCode}</h3>
          <div className="pref-item"><span>{language === 'en' ? 'Pattern' : 'النمط'}</span><strong>{t.codePattern}</strong></div>
          <div className="pref-item"><span>{language === 'en' ? 'Example' : 'مثال'}</span><strong>HR-M0001</strong></div>
          <div className="pref-item"><span>{language === 'en' ? 'Generation' : 'التوليد'}</span><strong>{language === 'en' ? 'Auto by department + branch' : 'تلقائي حسب القسم + الفرع'}</strong></div>
        </div>

        <div className="panel settings-panel">
          <h3>{t.roleMatrix}</h3>
          <table>
            <thead>
              <tr>
                <th>{language === 'en' ? 'Role' : 'الدور'}</th>
                <th>{language === 'en' ? 'Access' : 'الصلاحية'}</th>
                <th>{language === 'en' ? 'Note' : 'ملاحظة'}</th>
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row) => (
                <tr key={row.role}>
                  <td>{row.role}</td>
                  <td>{row.access}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="settings-grid" style={{ marginTop: '20px' }}>
        <div className="panel settings-panel" style={{ gridColumn: '1 / -1' }}>
          <h3>{t.integrations}</h3>
          <div className="section-cards">
            {integrations.map((item) => (
              <div key={item.name} className="panel info-card" style={{ padding: '16px' }}>
                <strong>{item.name}</strong>
                <p>{language === 'en' ? 'Status' : 'الحالة'}: {item.status}</p>
                <span className={`badge ${item.tone === 'green' ? 'done' : item.tone === 'blue' ? 'partial' : item.tone === 'amber' ? 'not-started' : 'blocked'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildStatusView({ language }: { language: 'en' | 'ar' }) {
  const title = language === 'en' ? 'General Manager Build Status' : 'حالة البناء للمدير العام';
  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Executive view' : 'عرض تنفيذي'}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="status-table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>{language === 'en' ? 'Phase' : 'المرحلة'}</th>
              <th>{language === 'en' ? 'Status' : 'الحالة'}</th>
              <th>{language === 'en' ? 'Note' : 'ملاحظة'}</th>
            </tr>
          </thead>
          <tbody>
            {phaseStatus.map((row) => (
              <tr key={row.phase}>
                <td>{row.phase}</td>
                <td><span className={`badge ${row.status.toLowerCase().replace(/\s+/g, '-')}`}>{row.status}</span></td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AccessDeniedView({ language }: { language: 'en' | 'ar' }) {
  const copy = language === 'en'
    ? {
        title: 'Access denied',
        message: 'This page is restricted to General Manager access only.',
      }
    : {
        title: 'تم رفض الوصول',
        message: 'هذه الصفحة مخصصة فقط للمدير العام.',
      };

  return (
    <section className="page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="panel warning-box">
        <h2>{copy.title}</h2>
        <p>{copy.message}</p>
      </div>
    </section>
  );
}

export default App;

import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { moduleContent, personalData, phaseStatus, roleWidgets, type Role } from './data/erp';
import EmployeeDirectory from './components/EmployeeDirectory';
import { ApiError, createInitialAccount, getSession, login, logout, type AppUser } from './api';

const moduleGroups = [
  {
    key: 'workspace',
    links: [
      { to: '/', key: 'dashboard', icon: '⌂' },
      { to: '/hr', key: 'hr', icon: '♙' },
      { to: '/accounts', key: 'accounts', icon: '◫' },
      { to: '/crm', key: 'crm', icon: '↗' },
    ],
  },
  {
    key: 'operations',
    links: [
      { to: '/inventory', key: 'inventory', icon: '▦' },
      { to: '/manufacturing', key: 'manufacturing', icon: '⚙' },
      { to: '/projects', key: 'projects', icon: '◷' },
    ],
  },
  {
    key: 'system',
    links: [
      { to: '/settings', key: 'settings', icon: '⚙' },
      { to: '/admin/build-status', key: 'buildStatus', icon: '◉', adminOnly: true },
    ],
  },
];

function App() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [session, setSession] = useState<{ user: AppUser | null; needsSetup: boolean } | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [reloadSession, setReloadSession] = useState(0);

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('biznova-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => {
    const map = {
      en: {
        brand: 'BIZNOVA ERP',
        search: 'Search pages and modules…',
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
        settings: 'Settings',
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
      },
      ar: {
        brand: 'BIZNOVA ERP',
        search: 'ابحث في الصفحات والوحدات…',
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
        settings: 'الإعدادات',
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
      },
    } as const;
    return map[language];
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('biznova-theme', theme);
    } catch {
      // The selected theme remains active for this session if storage is unavailable.
    }
  }, [theme]);

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
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const initials = user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const availableLinks = moduleGroups.flatMap((group) => group.links)
    .filter((link) => !(link.adminOnly && user.role !== 'GM'))
    .filter((link) => {
      const label = t[link.key as keyof typeof t];
      return !searchQuery || label.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase());
    });

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? 'is-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-nav-open' : ''}`}
      data-theme={theme}
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
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="role-switcher">
          <div className="signed-in-role">
            <span className="role-avatar">{initials}</span>
            <span className="role-copy"><small>{t.selectedRole}</small><strong>{selectedRole}</strong></span>
          </div>
        </div>

        <nav className="nav" aria-label={language === 'en' ? 'Main navigation' : 'التنقل الرئيسي'}>
          {moduleGroups.map((group) => {
            const links = group.links.filter((link) => !(link.adminOnly && user.role !== 'GM'));
            if (links.length === 0) return null;
            return (
              <div className="nav-group" key={group.key}>
                <h2 className="nav-group-heading">{t[group.key as keyof typeof t]}</h2>
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={t[link.key as keyof typeof t]}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <span className="nav-icon" aria-hidden="true">{link.icon}</span>
                    <span className="nav-label">{t[link.key as keyof typeof t]}</span>
                  </NavLink>
                ))}
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
              ☰
            </button>
            <div className="search-wrap">
              <span className="search-icon" aria-hidden="true">⌕</span>
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
                    <NavLink key={link.to} to={link.to} onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}>
                      <span className="nav-icon" aria-hidden="true">{link.icon}</span>
                      {t[link.key as keyof typeof t]}
                    </NavLink>
                  )) : <span className="no-search-results">{t.noResults}</span>}
                </div>
              )}
            </div>
            <span className="today-label"><span className="today-dot" />{t.today}</span>
          </div>

          <div className="topbar-actions">
            <div className="lang-switch topbar-language" aria-label={language === 'en' ? 'Choose language' : 'اختيار اللغة'}>
              <button className={language === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>EN</button>
              <button className={language === 'ar' ? 'active' : ''} onClick={() => onLanguageChange('ar')}>AR</button>
            </div>
            <button className="icon-button" aria-label={t.theme} title={t.theme} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '☾' : '☀'}
            </button>
            <div className="popover-anchor">
              <button className={`icon-button notification-button ${notificationsOpen ? 'selected' : ''}`} aria-label={t.notifications} aria-expanded={notificationsOpen} onClick={() => {
                setNotificationsOpen((open) => !open);
                setUserMenuOpen(false);
              }}>
                ♧<span className="notification-dot" />
              </button>
              {notificationsOpen && <div className="topbar-popover notification-popover"><strong>{t.notifications}</strong><p>{t.noNotifications}</p></div>}
            </div>
            <div className="popover-anchor">
              <button className={`user-pill ${userMenuOpen ? 'selected' : ''}`} aria-expanded={userMenuOpen} onClick={() => {
                setUserMenuOpen((open) => !open);
                setNotificationsOpen(false);
              }}>
                <span className="avatar">{initials}</span>
                <span className="user-copy">
                  <strong>{user.fullName}</strong>
                  <small>{selectedRole}</small>
                </span>
                <span className="user-chevron" aria-hidden="true">⌄</span>
              </button>
              {userMenuOpen && (
                <div className="topbar-popover user-popover">
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                  <button className="signout-button" onClick={onLogout}>{t.signOut}</button>
                </div>
              )}
              </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomeView language={language} selectedRole={selectedRole} user={user} />} />
          <Route path="/hr" element={<EmployeeDirectory language={language} />} />
          <Route path="/accounts" element={<SectionView title="Accounts" language={language} />} />
          <Route path="/crm" element={<SectionView title="CRM & Sales" language={language} />} />
          <Route path="/inventory" element={<SectionView title="Inventory" language={language} />} />
          <Route path="/manufacturing" element={<SectionView title="Manufacturing" language={language} />} />
          <Route path="/projects" element={<SectionView title="Projects" language={language} />} />
          <Route path="/settings" element={<SettingsView language={language} />} />
          <Route
            path="/admin/build-status"
            element={user.role === 'GM' ? <BuildStatusView language={language} /> : <AccessDeniedView />}
          />
        </Routes>
      </main>
    </div>
  );
}

function HomeView({ language, selectedRole, user }: { language: 'en' | 'ar'; selectedRole: Role; user: AppUser }) {
  const widgets = roleWidgets[selectedRole];
  const salesLabel = language === 'en' ? 'Sales' : 'المبيعات';
  const marginLabel = language === 'en' ? 'Margin' : 'الهامش';

  const quickActions = [
    language === 'en' ? 'Approve payroll' : 'موافقة الرواتب',
    language === 'en' ? 'Review invoices' : 'مراجعة الفواتير',
    language === 'en' ? 'Stock transfer' : 'نقل المخزون',
    language === 'en' ? 'Open AI Copilot' : 'فتح AI Copilot',
  ];

  return (
    <section className="page">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">{language === 'en' ? 'Welcome back' : 'مرحباً بعودتك'}</p>
          <h1>{user.fullName}</h1>
          <p className="subtext">{language === 'en' ? 'Executive overview for BIZNOVA ERP' : 'نظرة عامة تنفيذية على نظام BIZNOVA ERP'}</p>
        </div>
        <div className="hero-badges">
          <span className="badge-pill success">{selectedRole}</span>
          <span className="badge-pill neutral">Live</span>
        </div>
      </div>

      <div className="stats-grid">
        {widgets.map((widget) => (
          <div key={widget.title} className={`stat-card ${widget.accent}`}>
            <div className="icon-wrap">{widget.icon}</div>
            <div>
              <p>{widget.title}</p>
              <strong>{widget.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <div className="panel large-panel">
          <div className="panel-header">
            <h3>{language === 'en' ? 'Performance' : 'الأداء'}</h3>
            <span className="chip">+12.4%</span>
          </div>
          <div className="chart-bars">
            {[48, 75, 60, 90, 88, 72, 96].map((value, index) => (
              <div key={index} className="bar-column">
                <span style={{ height: `${value}%` }} />
              </div>
            ))}
          </div>
          <div className="chart-labels">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
          </div>
        </div>

        <div className="panel mini-panel">
          <div className="panel-header">
            <h3>{salesLabel}</h3>
            <span className="chip sky">AED 2.8M</span>
          </div>
          <div className="metric-stack">
            <div><span>{marginLabel}</span><strong>24.8%</strong></div>
            <div><span>{language === 'en' ? 'Orders' : 'الطلبات'}</span><strong>462</strong></div>
            <div><span>{language === 'en' ? 'Returns' : 'الاسترجاعات'}</span><strong>8.1%</strong></div>
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>{language === 'en' ? 'Quick actions' : 'إجراءات سريعة'}</h3>
          </div>
          <div className="action-list">
            {quickActions.map((action) => (
              <button key={action} className="action-button">{action}</button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>{language === 'en' ? 'Personal data' : 'البيانات الشخصية'}</h3>
          </div>
          <div className="info-row"><span>{language === 'en' ? 'Department' : 'القسم'}</span><strong>{personalData.department}</strong></div>
          <div className="info-row"><span>{language === 'en' ? 'Branch' : 'الفرع'}</span><strong>{personalData.branch}</strong></div>
          <div className="info-row"><span>{language === 'en' ? 'Email' : 'البريد'}</span><strong>{user.email}</strong></div>
          <div className="info-row"><span>{language === 'en' ? 'Role' : 'الدور'}</span><strong>{user.role}</strong></div>
        </div>
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
          <h2>{title}</h2>
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

function SettingsView({ language }: { language: 'en' | 'ar' }) {
  return (
    <section className="page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{language === 'en' ? 'System' : 'النظام'}</p>
          <h2>{language === 'en' ? 'Personal Data' : 'البيانات الشخصية'}</h2>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="field"><label>{language === 'en' ? 'Full name' : 'الاسم الكامل'}</label><input value={personalData.name} readOnly /></div>
          <div className="field"><label>{language === 'en' ? 'Email' : 'البريد الإلكتروني'}</label><input value={personalData.email} readOnly /></div>
          <div className="field"><label>{language === 'en' ? 'Phone' : 'الهاتف'}</label><input value={personalData.phone} readOnly /></div>
          <div className="field"><label>{language === 'en' ? 'Language' : 'اللغة'}</label><input value={personalData.language} readOnly /></div>
        </div>

        <div className="panel settings-panel">
          <h3>{language === 'en' ? 'Preferences' : 'التفضيلات'}</h3>
          <div className="pref-item"><span>{language === 'en' ? 'Color theme' : 'لون الواجهة'}</span><strong>{language === 'en' ? 'Deep Blue' : 'أزرق داكن'}</strong></div>
          <div className="pref-item"><span>{language === 'en' ? 'Home widgets' : 'عناصر الصفحة الرئيسية'}</span><strong>{language === 'en' ? 'Role-based' : 'حسب الدور'}</strong></div>
          <div className="pref-item"><span>{language === 'en' ? 'Modules' : 'الوحدات'}</span><strong>{language === 'en' ? 'ERP suite' : 'مجموعة ERP'}</strong></div>
          <div className="pref-item"><span>{language === 'en' ? 'Build status page' : 'صفحة حالة البناء'}</span><strong>{language === 'en' ? 'Visible to GM' : 'مرئية للمدير العام'}</strong></div>
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

function AccessDeniedView() {
  return (
    <section className="page">
      <div className="panel warning-box">
        <h2>Access denied</h2>
        <p>This page is restricted to General Manager access only.</p>
      </div>
    </section>
  );
}

export default App;

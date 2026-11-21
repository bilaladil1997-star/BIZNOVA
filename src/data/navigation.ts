export type NavigationLanguage = 'en' | 'ar';

export type NavigationNode = {
  id: string;
  label: Record<NavigationLanguage, string>;
  icon?: string;
  path?: string;
  adminOnly?: boolean;
  children?: NavigationNode[];
};

const page = (id: string, en: string, ar: string, path: string, adminOnly = false): NavigationNode => ({
  id,
  label: { en, ar },
  path,
  adminOnly,
});

const group = (id: string, en: string, ar: string, children: NavigationNode[]): NavigationNode => ({
  id,
  label: { en, ar },
  children,
});

const section = (
  id: string,
  en: string,
  ar: string,
  icon: string,
  path: string | undefined,
  children: NavigationNode[],
): NavigationNode => ({
  id,
  label: { en, ar },
  icon,
  path,
  children,
});

export const navigationSections: NavigationNode[] = [
  {
    id: 'dashboard',
    label: { en: 'Dashboard', ar: 'لوحة التحكم' },
    icon: '⌂',
    path: '/',
  },
  section('accounts', 'Accounting & Finance', 'الحسابات والمالية', '◫', '/accounts', [
    group('finance-dashboard', 'Financial dashboard', 'لوحة الحسابات', [
      page('financial-overview', 'Financial overview', 'نظرة عامة مالية', '/accounts/financial-overview'),
      page('cash-flow', 'Cash flow', 'التدفق النقدي', '/accounts/cash-flow'),
      page('revenue-expenses', 'Revenue & expenses', 'الإيرادات والمصروفات', '/accounts/revenue-expenses'),
    ]),
    group('chart-of-accounts', 'Chart of accounts', 'دليل الحسابات', [
      page('accounts-list', 'Accounts list', 'قائمة الحسابات', '/accounts/chart-of-accounts'),
      page('cost-centers', 'Cost centers', 'مراكز التكلفة', '/accounts/cost-centers'),
      page('financial-dimensions', 'Branches & projects', 'الفروع والمشاريع', '/accounts/financial-dimensions'),
    ]),
    group('journals-ledger', 'Journals & general ledger', 'القيود ودفتر الأستاذ', [
      page('journal-entries', 'Journal entries', 'القيود اليومية', '/accounts/journal-entries'),
      page('recurring-journals', 'Recurring & reversing entries', 'القيود المتكررة والعكسية', '/accounts/recurring-journals'),
      page('general-ledger', 'General ledger', 'دفتر الأستاذ العام', '/accounts/general-ledger'),
      page('unposted-transactions', 'Unposted transactions', 'المعاملات غير المرحلة', '/accounts/unposted-transactions'),
    ]),
    group('receivables-payables', 'Receivables & payables', 'الحسابات المدينة والدائنة', [
      page('accounts-receivable', 'Accounts receivable', 'الحسابات المدينة', '/accounts/receivable'),
      page('accounts-payable', 'Accounts payable', 'الحسابات الدائنة', '/accounts/payable'),
      page('customers-finance', 'Customer balances', 'أرصدة العملاء', '/accounts/customer-balances'),
      page('supplier-balances', 'Supplier balances', 'أرصدة الموردين', '/accounts/supplier-balances'),
      page('aging', 'Receivable & payable aging', 'أعمار الديون', '/accounts/aging'),
    ]),
    group('cash-banking', 'Cash & banking', 'النقد والبنوك', [
      page('bank-accounts', 'Bank accounts', 'الحسابات البنكية', '/accounts/bank-accounts'),
      page('bank-reconciliation', 'Bank reconciliation', 'التسوية البنكية', '/accounts/bank-reconciliation'),
      page('cash-management', 'Cash management', 'إدارة النقد', '/accounts/cash-management'),
      page('petty-cash', 'Petty cash', 'العهد النقدية', '/accounts/petty-cash'),
    ]),
    group('tax-budget-close', 'Tax, budgets & closing', 'الضرائب والموازنات والإقفال', [
      page('tax-management', 'VAT & tax', 'ضريبة القيمة المضافة والضرائب', '/accounts/tax'),
      page('budgets', 'Budgets & budget vs actual', 'الموازنات ومقارنة الفعلي', '/accounts/budgets'),
      page('financial-closing', 'Period closing & adjustments', 'إقفال الفترات والتسويات', '/accounts/closing'),
      page('financial-reports', 'Financial reports', 'التقارير المالية', '/accounts/reports'),
    ]),
  ]),
  section('hr', 'Human Resources', 'الموارد البشرية', '♙', '/hr', [
    group('people-records', 'People & organization', 'الموظفون والهيكل التنظيمي', [
      page('employee-records', 'Employee records', 'ملفات الموظفين', '/hr/employee-records'),
      page('organization', 'Organization structure', 'الهيكل التنظيمي', '/hr/organization'),
      page('employee-portal', 'Employee self-service', 'بوابة الموظف', '/hr/employee-portal'),
    ]),
    group('talent', 'Recruitment & onboarding', 'التوظيف والتهيئة', [
      page('recruitment', 'Recruitment', 'التوظيف', '/hr/recruitment'),
      page('hiring', 'Hiring & offers', 'التعيين والعروض', '/hr/hiring'),
      page('onboarding', 'Onboarding', 'تهيئة الموظفين', '/hr/onboarding'),
    ]),
    group('time-leave', 'Time & leave', 'الدوام والإجازات', [
      page('attendance', 'Attendance & shifts', 'الحضور والورديات', '/hr/attendance'),
      page('leave-management', 'Leave management', 'إدارة الإجازات', '/hr/leave'),
    ]),
    group('payroll-benefits', 'Payroll & benefits', 'الرواتب والمستحقات', [
      page('payroll', 'Payroll', 'الرواتب', '/hr/payroll'),
      page('end-of-service', 'End of service', 'نهاية الخدمة', '/hr/end-of-service'),
    ]),
    group('people-development', 'Performance & development', 'الأداء والتطوير', [
      page('performance', 'Performance management', 'إدارة الأداء', '/hr/performance'),
      page('training', 'Training & development', 'التدريب والتطوير', '/hr/training'),
      page('employee-relations', 'Employee relations & policies', 'العلاقات الوظيفية والسياسات', '/hr/relations'),
    ]),
  ]),
  section('inventory', 'Inventory & Warehouses', 'المخازن والمستودعات', '▦', '/inventory', [
    group('inventory-master', 'Products & warehouses', 'المنتجات والمخازن', [
      page('products', 'Products & items', 'المنتجات والأصناف', '/inventory/products'),
      page('warehouses', 'Warehouses & locations', 'المخازن والمواقع', '/inventory/warehouses'),
    ]),
    group('inventory-operations', 'Stock operations', 'العمليات المخزنية', [
      page('stock-movements', 'Receipts, issues & transfers', 'الاستلام والصرف والتحويل', '/inventory/movements'),
      page('stock-counts', 'Stock counts', 'الجرد المخزني', '/inventory/stock-counts'),
      page('reorder-planning', 'Replenishment planning', 'تخطيط إعادة الطلب', '/inventory/replenishment'),
    ]),
    group('inventory-controls', 'Valuation & controls', 'التقييم والرقابة', [
      page('inventory-valuation', 'Inventory valuation & costing', 'تقييم المخزون وتكلفته', '/inventory/valuation'),
      page('inventory-reports', 'Inventory reports', 'تقارير المخزون', '/inventory/reports'),
    ]),
  ]),
  section('purchasing', 'Purchasing & Procurement', 'المشتريات والتوريد', '🧾', '/purchasing', [
    group('procurement-sourcing', 'Suppliers & sourcing', 'الموردون والتوريد', [
      page('suppliers', 'Supplier directory', 'دليل الموردين', '/purchasing/suppliers'),
      page('request-for-quotation', 'Requests for quotation', 'طلبات عروض الأسعار', '/purchasing/rfqs'),
      page('supplier-evaluation', 'Supplier evaluation', 'تقييم الموردين', '/purchasing/supplier-evaluation'),
    ]),
    group('procurement-orders', 'Requests & orders', 'الطلبات وأوامر الشراء', [
      page('purchase-requests', 'Purchase requests', 'طلبات الشراء', '/purchasing/requests'),
      page('purchase-orders', 'Purchase orders', 'أوامر الشراء', '/purchasing/orders'),
      page('purchase-receipts', 'Purchasing receipts', 'استلامات المشتريات', '/purchasing/receipts'),
    ]),
    group('procurement-controls', 'Contracts & analysis', 'العقود والتحليل', [
      page('supplier-contracts', 'Supplier contracts', 'عقود الموردين', '/purchasing/contracts'),
      page('purchase-analysis', 'Purchasing analysis', 'تحليل المشتريات', '/purchasing/analysis'),
    ]),
  ]),
  section('sales', 'Sales', 'المبيعات', '↗', '/crm', [
    group('sales-cycle', 'Sales cycle', 'دورة المبيعات', [
      page('quotations', 'Quotations & proposals', 'عروض الأسعار والمقترحات', '/crm/quotations'),
      page('sales-orders', 'Sales orders', 'أوامر البيع', '/crm/orders'),
      page('sales-delivery', 'Deliveries & returns', 'التسليم والمرتجعات', '/crm/deliveries'),
      page('sales-invoices', 'Sales invoices', 'فواتير المبيعات', '/crm/invoices'),
    ]),
    group('sales-controls', 'Customers & performance', 'العملاء والأداء', [
      page('sales-customers', 'Customers', 'العملاء', '/crm/customers'),
      page('sales-commissions', 'Commissions', 'العمولات', '/crm/commissions'),
      page('sales-reports', 'Sales reports', 'تقارير المبيعات', '/crm/reports'),
    ]),
  ]),
  section('manufacturing', 'Manufacturing & Production', 'التصنيع والإنتاج', '⚙', '/manufacturing', [
    group('manufacturing-planning', 'Planning & product structures', 'التخطيط وهياكل المنتجات', [
      page('bills-of-materials', 'Bills of materials', 'قوائم المواد', '/manufacturing/bom'),
      page('production-planning', 'Production planning', 'تخطيط الإنتاج', '/manufacturing/planning'),
      page('work-centers', 'Work centers & routing', 'مراكز العمل والمسارات', '/manufacturing/work-centers'),
    ]),
    group('manufacturing-execution', 'Production execution', 'تنفيذ الإنتاج', [
      page('work-orders', 'Work orders', 'أوامر التصنيع', '/manufacturing/work-orders'),
      page('shop-floor', 'Shop floor', 'إدارة أرضية المصنع', '/manufacturing/shop-floor'),
      page('material-consumption', 'Material consumption & output', 'استهلاك المواد والإنتاج', '/manufacturing/materials'),
    ]),
    group('manufacturing-quality', 'Quality & costing', 'الجودة والتكلفة', [
      page('production-inspections', 'Production inspections', 'فحوصات الإنتاج', '/manufacturing/inspections'),
      page('manufacturing-costing', 'Production costing & OEE', 'تكلفة الإنتاج وكفاءة المعدات', '/manufacturing/costing'),
    ]),
  ]),
  section('projects', 'Projects & Project Management', 'المشاريع وإدارتها', '◷', '/projects', [
    group('project-planning', 'Projects & planning', 'المشاريع والتخطيط', [
      page('project-register', 'Project register', 'سجل المشاريع', '/projects/register'),
      page('project-plans', 'Plans, tasks & milestones', 'الخطط والمهام والمراحل', '/projects/plans'),
      page('project-resources', 'Project resources', 'موارد المشاريع', '/projects/resources'),
    ]),
    group('project-finance', 'Project financials', 'الشؤون المالية للمشاريع', [
      page('project-costs', 'Costs & budgets', 'التكاليف والموازنات', '/projects/costs'),
      page('project-revenue', 'Revenue & profitability', 'الإيرادات والربحية', '/projects/profitability'),
    ]),
    group('project-insights', 'Files & reports', 'الملفات والتقارير', [
      page('project-files', 'Project files', 'ملفات المشاريع', '/projects/files'),
      page('project-reports', 'Project reports', 'تقارير المشاريع', '/projects/reports'),
    ]),
  ]),
  section('business', 'Business Management', 'إدارة الأعمال', '◈', '/collaboration', [
    group('business-execution', 'Tasks & operations', 'المهام والعمليات', [
      page('business-tasks', 'Tasks & action plans', 'المهام وخطط العمل', '/collaboration/tasks'),
      page('business-strategy', 'Goals & strategy', 'الأهداف والاستراتيجية', '/collaboration/strategy'),
    ]),
    group('business-workflows', 'Workflows & approvals', 'سير العمل والموافقات', [
      page('approval-center', 'Approval center', 'مركز الموافقات', '/collaboration/approvals'),
      page('approval-rules', 'Approval rules & delegation', 'قواعد الموافقة والتفويض', '/collaboration/approval-rules'),
      page('activity-history', 'Activity & decision history', 'سجل الأنشطة والقرارات', '/collaboration/activity'),
    ]),
  ]),
  section('marketing', 'Marketing', 'التسويق', '✦', '/marketing', [
    group('marketing-planning', 'Planning & campaigns', 'التخطيط والحملات', [
      page('marketing-plans', 'Marketing plans', 'الخطط التسويقية', '/marketing/plans'),
      page('campaigns', 'Campaigns', 'الحملات', '/marketing/campaigns'),
      page('advertising', 'Advertising', 'الإعلانات', '/marketing/advertising'),
    ]),
    group('marketing-content', 'Channels & content', 'القنوات والمحتوى', [
      page('social-media', 'Social media', 'التواصل الاجتماعي', '/marketing/social'),
      page('content-studio', 'Design & content', 'التصميم والمحتوى', '/marketing/content'),
      page('email-marketing', 'Email marketing', 'التسويق عبر البريد', '/marketing/email'),
    ]),
    group('marketing-insights', 'Marketing insights', 'تحليلات التسويق', [
      page('marketing-leads', 'Lead sources & conversion', 'مصادر العملاء والتحويل', '/marketing/conversion'),
      page('marketing-reports', 'Marketing reports', 'تقارير التسويق', '/marketing/reports'),
    ]),
  ]),
  section('crm', 'Communication & CRM', 'التواصل وإدارة العملاء', '◌', undefined, [
    group('crm-relationships', 'Customer relationships', 'علاقات العملاء', [
      page('crm-dashboard', 'CRM dashboard', 'لوحة إدارة العملاء', '/crm/relationships'),
      page('leads', 'Leads & opportunities', 'العملاء المحتملون والفرص', '/crm/leads'),
      page('contacts', 'Contacts & accounts', 'جهات الاتصال والحسابات', '/crm/contacts'),
    ]),
    group('crm-activities', 'Communication & activities', 'التواصل والأنشطة', [
      page('crm-activities', 'Calls, meetings & activities', 'المكالمات والاجتماعات والأنشطة', '/crm/activities'),
      page('crm-pipeline', 'Sales pipeline', 'مسار المبيعات', '/crm/pipeline'),
    ]),
  ]),
  section('customer-service', 'Customer Service', 'خدمة العملاء', '♡', undefined, [
    group('service-operations', 'Service operations', 'عمليات الخدمة', [
      page('service-dashboard', 'Service dashboard', 'لوحة خدمة العملاء', '/customer-service'),
      page('service-cases', 'Cases & requests', 'الحالات والطلبات', '/customer-service/cases'),
      page('service-inbox', 'Customer inbox', 'صندوق تواصل العملاء', '/customer-service/inbox'),
    ]),
    group('service-quality', 'Service quality', 'جودة الخدمة', [
      page('knowledge-base', 'Knowledge base', 'قاعدة المعرفة', '/customer-service/knowledge'),
      page('service-levels', 'Service levels & satisfaction', 'مستويات الخدمة ورضا العملاء', '/customer-service/quality'),
    ]),
  ]),
  section('assets', 'Assets & Maintenance', 'الأصول والصيانة', '⌁', undefined, [
    group('asset-register', 'Asset lifecycle', 'دورة حياة الأصول', [
      page('asset-dashboard', 'Assets dashboard', 'لوحة الأصول', '/assets'),
      page('asset-register', 'Asset register', 'سجل الأصول', '/assets/register'),
      page('asset-transactions', 'Acquisition, transfer & disposal', 'الاقتناء والنقل والاستبعاد', '/assets/transactions'),
    ]),
    group('asset-maintenance', 'Maintenance', 'الصيانة', [
      page('maintenance-plans', 'Maintenance plans', 'خطط الصيانة', '/assets/maintenance'),
      page('maintenance-work-orders', 'Maintenance work orders', 'أوامر الصيانة', '/assets/work-orders'),
      page('asset-depreciation', 'Depreciation', 'الإهلاك', '/assets/depreciation'),
    ]),
  ]),
  section('quality', 'Quality Management', 'إدارة الجودة', '✓', undefined, [
    group('quality-controls', 'Quality controls', 'ضوابط الجودة', [
      page('quality-dashboard', 'Quality dashboard', 'لوحة الجودة', '/quality'),
      page('inspection-plans', 'Inspection plans', 'خطط الفحص', '/quality/inspections'),
      page('nonconformances', 'Nonconformance & corrective action', 'عدم المطابقة والإجراء التصحيحي', '/quality/nonconformance'),
    ]),
    group('quality-assurance', 'Assurance & audits', 'ضمان الجودة والتدقيق', [
      page('supplier-quality', 'Supplier quality', 'جودة الموردين', '/quality/suppliers'),
      page('quality-audits', 'Quality audits', 'تدقيق الجودة', '/quality/audits'),
    ]),
  ]),
  section('reports', 'Reports & Analytics', 'التقارير والتحليلات', '▤', undefined, [
    group('reports-dashboards', 'Dashboards', 'لوحات المعلومات', [
      page('executive-dashboard', 'Executive dashboard', 'لوحة الإدارة التنفيذية', '/reports/executive'),
      page('department-dashboards', 'Department dashboards', 'لوحات الأقسام', '/reports/departments'),
    ]),
    group('reports-library', 'Reports library', 'مكتبة التقارير', [
      page('financial-analytics', 'Financial analytics', 'التحليلات المالية', '/reports/finance'),
      page('operational-analytics', 'HR & operations analytics', 'تحليلات الموارد البشرية والعمليات', '/reports/operations'),
      page('sales-analytics', 'Sales & customer analytics', 'تحليلات المبيعات والعملاء', '/reports/sales'),
    ]),
  ]),
  section('documents', 'Documents & Files', 'المستندات والملفات', '▧', undefined, [
    group('document-center', 'Document center', 'مركز المستندات', [
      page('document-library', 'Document library', 'مكتبة المستندات', '/documents'),
      page('document-templates', 'Templates & forms', 'القوالب والنماذج', '/documents/templates'),
      page('document-archive', 'Archive & retention', 'الأرشفة والاحتفاظ', '/documents/archive'),
    ]),
    group('document-governance', 'Document governance', 'حوكمة المستندات', [
      page('document-approvals', 'Document approvals', 'اعتمادات المستندات', '/documents/approvals'),
      page('document-access', 'Access & sharing', 'الوصول والمشاركة', '/documents/access'),
    ]),
  ]),
  section('integrations', 'Integrations', 'التكاملات والربط الخارجي', '⎈', undefined, [
    group('integration-center', 'Integration center', 'مركز التكاملات', [
      page('integration-dashboard', 'Integration dashboard', 'لوحة التكاملات', '/integrations'),
      page('api-integrations', 'APIs & webhooks', 'واجهات API والربط', '/integrations/api'),
      page('payment-integrations', 'Banking & payment providers', 'البنوك ومزودو الدفع', '/integrations/payments'),
    ]),
    group('integration-platforms', 'Connected platforms', 'المنصات الخارجية', [
      page('ecommerce-integrations', 'E-commerce platforms', 'منصات التجارة الإلكترونية', '/integrations/ecommerce'),
      page('cloud-integrations', 'Cloud & storage', 'الخدمات السحابية والتخزين', '/integrations/cloud'),
      page('integration-logs', 'Connection status & logs', 'حالة الاتصالات والسجلات', '/integrations/logs'),
    ]),
  ]),
  section('settings', 'System Administration & Settings', 'إدارة النظام والإعدادات', '⚙', '/settings', [
    group('system-access', 'Users & access control', 'المستخدمون والتحكم بالوصول', [
      page('user-management', 'User management', 'إدارة المستخدمين', '/settings/users'),
      page('roles-permissions', 'Roles & permissions', 'الأدوار والصلاحيات', '/settings/permissions'),
      page('security-settings', 'Security settings', 'إعدادات الأمان', '/settings/security'),
    ]),
    group('system-organization', 'Organization & localization', 'المنظمة والإعدادات المحلية', [
      page('company-settings', 'Company, branches & departments', 'الشركة والفروع والأقسام', '/settings/organization'),
      page('language-currency', 'Language & currency', 'اللغة والعملة', '/settings/localization'),
      page('fiscal-periods', 'Fiscal year & periods', 'السنة والفترات المالية', '/settings/fiscal-periods'),
    ]),
    group('system-workflows', 'Workflows & notifications', 'سير العمل والإشعارات', [
      page('workflow-settings', 'Workflow & approval rules', 'سير العمل وقواعد الموافقة', '/settings/workflows'),
      page('notification-settings', 'Notification settings', 'إعدادات الإشعارات', '/settings/notifications'),
      page('email-settings', 'Email settings', 'إعدادات البريد الإلكتروني', '/settings/email'),
    ]),
    group('system-audit', 'Audit & system health', 'التدقيق وصحة النظام', [
      page('audit-logs', 'Audit & activity logs', 'سجلات التدقيق والأنشطة', '/settings/audit-logs'),
      page('data-tools', 'Import, export & backup', 'الاستيراد والتصدير والنسخ الاحتياطي', '/settings/data-tools'),
      page('system-health', 'System health & error logs', 'صحة النظام وسجلات الأخطاء', '/settings/system-health'),
    ]),
    group('system-tools', 'System tools', 'أدوات النظام', [
      page('automation', 'Automation', 'الأتمتة', '/automation'),
      page('acceptance', 'Acceptance tests', 'اختبارات القبول', '/acceptance'),
      page('copilot', 'AI Copilot', 'المساعد الذكي', '/copilot'),
      page('gap-audit', 'Gap audit & design QA', 'تدقيق الفجوات وجودة التصميم', '/audit'),
      page('build-status', 'Build status', 'حالة البناء', '/admin/build-status', true),
    ]),
  ]),
];

export const navigablePages = navigationSections.flatMap(function flatten(node): NavigationNode[] {
  return [
    ...(node.path ? [node] : []),
    ...(node.children?.flatMap(flatten) ?? []),
  ];
});

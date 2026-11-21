وه# BIZNOVA ERP

BIZNOVA is a bilingual (English/Arabic), multi-branch enterprise resource planning platform built to serve management, human resources, finance, sales, operations, manufacturing, and executive oversight in a single secure system.

This design follows the Qaid ERP master build prompt and organizes the product in phased delivery order, starting at Phase 0 and Phase 1 while preserving the existing app structure and extending it safely.

## 1. Design Intent

The platform is designed as a role-aware ERP suite with:

- unified company, branch, department, and employee structure
- configurable permissions and field-level security
- bilingual UI and localized business logic
- workflow automation with audit trails
- AI Copilot assistance for management, HR, and marketing
- import/export center, API integration catalog, and device integrations
- enterprise reporting, budgets, approvals, and manufacturing analytics

## 2. Execution Standards

The build must follow the master prompt’s operating rules:

- execute in phase order and stop at a fully working sub-step when capacity is reached
- maintain a GM-only Build Status page at /admin/build-status
- record every phase/sub-step as Done / Partial / Not started / Blocked with a note
- never delete or rename existing entities, fields, pages, routes, or records
- extend the current ERP rather than replacing it
- inspect existing entities before creating new ones
- preserve existing data and never lose user-entered records

## 3. System Architecture

### 3.1 Product layers

- Frontend: role-aware dashboard, bilingual interfaces, shared components, widgets, dynamic forms
- Backend: domain services, policies, validation, approval workflows, secure permissions
- Database: transactional system of record for master data, transactions, logs, approvals, and audit history
- Integrations: attendance devices, payroll feeds, CRM tools, ERP connectors, website and communication channels
- AI layer: shared Copilot engine with role-scoped skills and governance controls
- Reporting layer: dashboard KPIs, charts, exports, and audit reports

### 3.2 Recommended technical stack

- Frontend: React + Next.js (or equivalent component-based SPA framework)
- Backend: Node.js + NestJS or equivalent enterprise service layer
- Database: PostgreSQL for ERP core with audit tables and transactional consistency
- Cache/queue: Redis for session state, async jobs, and notification bursts
- File storage: object storage or managed file service for documents, SOPs, imports, and employee attachments
- Integrations: REST + webhook handlers, CSV/XLSX imports, device adapters, API gateway abstraction
- Observability: structured logs, audit events, health checks, and operational monitoring

## 4. Core Design Principles

### 4.1 Role-aware ERP
Different roles must get different home dashboards and modules while sharing a common data model:

- General Manager
- HR Manager
- HR Officer
- Payroll Officer
- Recruiter
- Accountant
- Department Manager
- Sales Manager
- Warehouse Manager
- Manufacturing Supervisor

### 4.2 Design reference model
The product direction is intentionally blended from enterprise references to balance usability and governance without importing a rigid one-size-fits-all template:

- ERPNext reference: modern command-center dashboards, KPI-based workspaces, manufacturing visibility, and workflow-oriented operational views.
- Odoo reference: role-based management, process-driven workflows, cross-functional teams, and operational control surfaces for HR, sales, and projects.
- SMACC6 / accounting reference: disciplined chart-of-accounts, cost controls, approvals, budget tracking, and cash-flow accountability.
- Enterprise UX standard: clean card layout, modular pages, dense but readable information architecture, and bilingual controls optimized for growth-stage ERP execution.

This keeps the prototype aligned to real enterprise expectations while preserving the incremental Phase-based delivery strategy of the current codebase.

### 4.2 Bilingual by design
All user-facing strings, reports, forms, and dashboards must be translatable, and workflows should be valid in both English and Arabic. The system must support right-to-left and locale-aware formatting for dates, numbers, and currency.

### 4.3 Security model
The system must enforce:

- row-level and field-level permissions
- approval-based actions for finance, payroll, leave, purchases, and manufacturing
- audit log for every create, update, delete, approval, and import/export action
- role-based access to employee data, salary, finance, and operational history
- AI safety: employees must not access another person’s data through Copilot or other agent workflows

### 4.4 Modularity with shared foundations
The platform uses shared components for:

- organization structure
- employee and user identity
- settings and parameter management
- internationalization
- notification and workflow engine
- import/export and document center
- integrations and AI hooks

## 5. Shared Foundation Modules

### 5.1 Organization and master data
The ERP must support:

- companies
- branches
- departments
- cost centers
- projects
- teams and workgroups
- employees and user profiles

### 5.2 Employee code format
Employee codes follow the approved format:

- [DEPT]-[BRANCH][4 digits]
- examples: HR-M0001, AC-M0001

This must be configurable and enforceable during onboarding and HR updates.

### 5.3 Settings and parameterization
Settings includes:

- appearance preferences
- permissions and role matrix
- operational policies
- expense and payroll formulas
- approval routing
- leave policy and effective dates
- integration catalog and providers
- automation rules and import/export templates

### 5.4 Integration Center
The Integration Center groups connections by business category, including:

- attendance and biometric devices
- payroll sources
- HR and recruitment data sources
- CRM and sales tools
- website and digital presence sources
- AI providers and model configuration

## 6. Domain Modules

### 6.1 Human Resources
Full HR lifecycle covering:

- employee master data
- onboarding and exit workflows
- departments and job positions
- attendance records and biometric devices
- leave policies and balances
- salary structures, payroll, and pay slips
- benefits and end-of-service calculations
- recruitment, hiring requests, courses, and applicants
- training and development tracking
- employee finance and expense requests
- employee documents and compliance records

### 6.2 Accounts and Finance
Accounts is organized into six sections:

- Accounts
- Operations
- Reports
- Budget
- Cost Centers
- Setup

Financial capabilities include:

- chart of accounts
- journal entries and postings
- budget against departments and projects
- bank accounts and payment terms
- tax templates
- fiscal year controls
- approval and disbursement flows
- operating expense requests and general ledger reporting

### 6.3 Communication and Collaboration
The platform supports:

- internal communication and announcements
- project/task collaboration
- approval routing and comments
- document sharing and policy access
- team updates and escalations

### 6.4 Marketing
Marketing covers:

- campaigns and marketing plans
- lead generation and qualification
- CRM handoff to sales
- campaign performance measurement
- marketing automation and AI-assisted messaging

### 6.5 Sales and Customers
Sales manages:

- customer master data and contacts
- opportunities and pipeline stages
- quotations and sales orders
- contract follow-up
- customer communications and CRM history

### 6.6 Purchasing
Purchasing supports:

- vendor management
- purchase requests
- purchase orders
- receipts and payables
- supplier evaluations and approvals

### 6.7 Inventory, POS, and Assets
Inventory functionality includes:

- item master data and categories
- warehouse and locations
- stock movement and transfer approvals
- low-stock alerts and reorder thresholds
- POS sales flows
- item cost tracking
- fixed assets and depreciation handling

### 6.8 Manufacturing
Manufacturing is built on top of inventory and must include:

- BOMs and routing
- work orders and job cards
- WIP tracking and stock transfer to production
- material consumption and scrap records
- inspection and NCR handling
- lot traceability and output verification
- OEE and production dashboards
- material usage, scrap, and downtime analysis

### 6.9 Management and Projects
Management covers:

- tasks and action plans
- goals and key results
- project planning and milestone tracking
- maintenance schedules and asset upkeep
- strategy and operational reporting

### 6.10 Automation Engine and Governance
Each movement—including purchase, sale, payroll, stock transfer, manufacturing, and approvals—must be able to trigger workflow automation.

Automation model includes:

- trigger
- conditions
- actions
- dry-run testing
- run log
- enable/disable control

### 6.11 AI Copilot
The AI Copilot is a single role-aware experience inside Qaid, beginning with:

- Management Copilot
- HR Copilot
- Marketing Copilot

It must use enterprise-safe knowledge sources including:

- Policies entity
- HR manual
- SOPs and uploaded documentation
- approved company content and workflow data

## 7. Phase Roadmap

### Phase 0 — Execution Protocol and Standing Rules
- safe build process
- Build Status reporting
- checkpointing and protection of existing data

### Phase 1 — Personalized Home Screen for Every User
- per-user home dashboards
- role-specific widgets
- data sourced from Settings → Personal Data
- Copilot entry point in the header

### Phase 2 — Languages and Shared Components
- bilingual UI string management
- reusable forms, tables, selectors, and filters

### Phase 3 — Settings and Structure
- appearance, permissions, roles, departments, company configuration
- employee code settings
- effective-date parameters
- Integration Center
- AI providers configuration

### Phase 4 — Human Resources (Full Completion)
- employee lifecycle, leave, attendance, payroll, recruitment, training, and finance support
- biometric and attendance sources

### Phase 5 — Accounts
- chart of accounts, operations, reports, budget, cost centers, setup

### Phase 6 — Communication and Collaboration
- team communication, approvals, and collaboration workspace

### Phase 7 — Marketing
- campaigns, lead flow, CRM handoff, AI marketing support

### Phase 8 — Sales and Customers
- customer data, opportunities, pipeline, and sales activity

### Phase 9 — Purchasing
- supplier, request, order, AP, and vendor controls

### Phase 10 — Inventory, Point of Sale, and Assets
- stock management, POS, location controls, asset registry

### Phase 11 — Manufacturing
- BOM, routing, WIP, job card, inspection, NCR, OEE, traceability

### Phase 12 — Management: Tasks, Plans, Strategy, Projects, and Maintenance
- strategy execution workflow and operational governance

### Phase 13 — Automation Engine, Security, and Audit
- automation rules
- security matrix
- import/export center
- audit logging

### Phase 14 — Acceptance Tests
- lifecycle and end-to-end business scenarios for HR, finance, operations, manufacturing, attendance, security, automation, and AI

### Phase 15 — AI Copilot for Management, HR, and Marketing
- governed, secure, role-aware Copilot interactions

### Phase 16 — Department Skills, Gap Audit, and Design QA
- department capability review
- gap analysis
- design quality assurance

## 8. Proposed Entities and Key Records

The system should include core entities such as:

- Company
- Branch
- Department
- CostCenter
- Project
- Employee
- User
- Role
- Permission
- LeaveType
- LeavePolicy
- LeaveBalance
- SalaryStructure
- PayrollRun
- AttendanceRecord
- BiometricDevice
- TimeLog
- Applicant
- Course
- Vendor
- PurchaseOrder
- Item
- Warehouse
- StockMovement
- Asset
- AssetCategory
- BOM
- Routing
- WorkOrder
- JobCard
- Inspection
- NCR
- Customer
- Opportunity
- CommunicationThread
- Policy
- IntegrationConnection
- AutomationRule
- ImportExportJob
- AIChatSession

## 9. Functional Acceptance Standards

The acceptance layer must validate:

- employee onboarding creates a valid employee code and payroll structure
- payroll summary totals by company, branch, and department
- attendance import from CSV/device data maps correctly to employee profiles
- manufacturing work orders and inspections maintain traceability
- access controls prevent unauthorized data access
- automation dry runs produce the expected action logs
- AI Copilot cannot reveal restricted employee data

## 10. Build Status Snapshot

The Build Status page should list the following state summary:

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0 | Done | Execution protocol and safety rules established |
| Phase 1 | Done | Role-aware dashboard loads the signed-in employee profile and supports per-account widget order and visibility in browser storage; attendance, leave, tasks, requests, and KPI values are clearly labeled sample data |
| Phase 2 | Partial | Bilingual hierarchical navigation is active; reusable shared components remain open |
| Phase 3 | Partial | Settings and Integration Center design ready |
| Phase 4 | Partial | HR employee directory uses a persistent SQLite API; attendance, leave, and payroll remain open |
| Phase 5 | Partial | Persistent chart of accounts with finance-role access and change audit is available; journal posting, general ledger, and financial reports remain open |
| Phase 6 | Partial | Collaboration and team-workflow controls are active for the ERP pilot |
| Phase 7 | Partial | Marketing campaign controls are active for the ERP pilot |
| Phase 8 | Partial | CRM and sales controls are active for the ERP pilot |
| Phase 9 | Partial | Purchasing and supplier controls are active for the ERP pilot |
| Phase 10 | Partial | Inventory and warehouse controls are active for the ERP pilot |
| Phase 11 | Partial | Manufacturing overview and work-order controls are active for the pilot |
| Phase 12 | Partial | Projects and strategy controls are active for the ERP pilot |
| Phase 13 | Partial | Automation engine, security, and audit controls are active for the ERP pilot |
| Phase 14 | Partial | Acceptance validation and QA coverage are active for the ERP pilot |
| Phase 15 | Partial | AI Copilot workflows and role-safe guidance are active for the ERP pilot |
| Phase 16 | Partial | Gap audit, department readiness, and design QA are active for the ERP pilot |

This state is a milestone snapshot for planning and will evolve as implementation progresses.

The current HR MVP includes a searchable and filterable employee directory, employee creation and editing, active/inactive status changes, generated employee codes, duplicate-email validation, bilingual UI, and a SQLite-backed API. The home dashboard uses the authenticated user's identity and role, links dashboard cards to their ERP modules, and loads the employee profile matching the signed-in email through a session-protected self-profile endpoint. Users can reorder or hide dashboard sections; these preferences are stored per account in the current browser and are not yet synchronized to the server. Attendance, leave, salary, end-of-service, task, onboarding, request, and KPI values remain explicitly labeled sample data. The backend creates a first GM account through the initial setup screen, stores password hashes, and requires a server-side session for employee APIs. Legacy browser records are migrated to the API when valid.

For local development, use Node.js 24 and run `npm run dev`. The application database is created at `data/biznova.sqlite` and is intentionally excluded from version control. Run `npm run test:api` for focused API tests and `npm run build` for the frontend production build. The current server binds to loopback for local development; production deployment still needs managed hosting, HTTPS, account administration/recovery, and an operational backup policy.

## 11. Summary

BIZNOVA ERP is a secure, multi-module enterprise platform that starts with shared foundations, expands through role-aware business processes, and closes with automation and AI governance. It is intentionally designed to be extensible, bilingual, auditable, and aligned with the master build prompt’s phased, low-risk delivery methodology.

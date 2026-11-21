import { createHash, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const SESSION_COOKIE = 'biznova_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const PASSWORD_BYTES = 64;
const BODY_LIMIT = 64 * 1024;
const departments = {
  'Human Resources': 'HR',
  Finance: 'AC',
  Operations: 'OP',
  Sales: 'SA',
  Marketing: 'MK',
  Manufacturing: 'MF',
};
const branches = {
  Dubai: 'M',
  'Abu Dhabi': 'A',
  Sharjah: 'S',
  'Ras Al Khaimah': 'R',
};
const statuses = new Set(['Active', 'On leave', 'Inactive']);
const validRoles = new Set(['GM', 'HR Manager', 'Recruiter', 'Accountant', 'Manager', 'Marketer', 'Sales Rep', 'Purchasing Rep', 'Employee', 'Worker']);

export function createAppServer({ dbPath }) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('GM', 'HR Manager', 'Recruiter', 'Accountant', 'Manager', 'Marketer', 'Sales Rep', 'Purchasing Rep', 'Employee', 'Worker')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL,
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      branch TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Active', 'On leave', 'Inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS employees_department_idx ON employees(department);
    CREATE INDEX IF NOT EXISTS employees_status_idx ON employees(status);
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
      parent_code TEXT REFERENCES accounts(code) ON UPDATE RESTRICT,
      is_group INTEGER NOT NULL DEFAULT 0 CHECK (is_group IN (0, 1)),
      opening_balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      notes TEXT NOT NULL DEFAULT '',
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS accounts_parent_code_idx ON accounts(parent_code);
    CREATE INDEX IF NOT EXISTS accounts_type_active_idx ON accounts(type, is_active);
    CREATE TABLE IF NOT EXISTS account_audit (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
      changes_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS account_audit_account_idx ON account_audit(account_id, created_at);
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      entry_type TEXT NOT NULL CHECK (entry_type IN ('journal', 'receipt', 'payment', 'sales', 'purchase')),
      reference TEXT NOT NULL DEFAULT '',
      memo TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('draft', 'submitted')),
      total_debit REAL NOT NULL DEFAULT 0,
      total_credit REAL NOT NULL DEFAULT 0,
      project_id TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL DEFAULT '',
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS journal_entries_date_status_idx ON journal_entries(date, status);
    CREATE TABLE IF NOT EXISTS journal_lines (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      account_code TEXT NOT NULL,
      account_name_ar TEXT NOT NULL,
      account_name_en TEXT NOT NULL,
      account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
      debit REAL NOT NULL DEFAULT 0 CHECK (debit >= 0),
      credit REAL NOT NULL DEFAULT 0 CHECK (credit >= 0),
      description TEXT NOT NULL DEFAULT '',
      project_id TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL DEFAULT '',
      CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
    );
    CREATE INDEX IF NOT EXISTS journal_lines_entry_idx ON journal_lines(entry_id);
    CREATE INDEX IF NOT EXISTS journal_lines_account_idx ON journal_lines(account_id, entry_id);
    CREATE TABLE IF NOT EXISTS journal_audit (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL REFERENCES journal_entries(id),
      actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'submitted')),
      changes_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS journal_audit_entry_idx ON journal_audit(entry_id, created_at);
  `);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

  const loginAttempts = new Map();
  const dummySalt = randomBytes(16).toString('hex');
  const dummyHash = scryptSync(randomBytes(32), dummySalt, PASSWORD_BYTES);

  function json(response, status, data, headers = {}) {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    });
    response.end(JSON.stringify(data));
  }

  function cookieValue(request, name) {
    const cookieHeader = request.headers.cookie ?? '';
    const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
  }

  function currentUser(request) {
    const token = cookieValue(request, SESSION_COOKIE);
    if (!token) return null;
    const session = db.prepare(`
      SELECT users.id, users.full_name, users.email, users.role, sessions.token_hash
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(hashToken(token), Date.now());
    return session ?? null;
  }

  function profile(user) {
    if (!validRoles.has(user.role)) {
      throw httpError(500, 'unsupported_role');
    }
    return { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
  }

  function createSession(response, userId) {
    const token = randomBytes(32).toString('base64url');
    const expiry = Date.now() + SESSION_DURATION;
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), userId, expiry);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION / 1000}${secure}`,
    );
  }

  async function readJson(request) {
    let size = 0;
    const chunks = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > BODY_LIMIT) throw httpError(413, 'request_too_large');
      chunks.push(chunk);
    }
    if (!size) return {};
    if (!String(request.headers['content-type'] ?? '').includes('application/json')) {
      throw httpError(415, 'json_required');
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw httpError(400, 'invalid_json');
    }
  }

  function requireUser(user) {
    if (!user) throw httpError(401, 'authentication_required');
    return user;
  }

  function requireHrWrite(user) {
    requireUser(user);
    if (user.role !== 'GM' && user.role !== 'HR Manager') throw httpError(403, 'permission_denied');
  }

  function requireFinance(user) {
    requireUser(user);
    if (user.role !== 'GM' && user.role !== 'Accountant') throw httpError(403, 'permission_denied');
    return user;
  }

  function validateCredentials(body, needsName) {
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      (needsName && (!fullName || fullName.length > 100)) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      password.length < (needsName ? 12 : 1) ||
      password.length > 128
    ) {
      throw httpError(400, 'invalid_credentials');
    }
    return { fullName, email, password };
  }

  function validateEmployee(body, existing = {}) {
    const employee = {
      fullName: pickString(body.fullName, existing.fullName, 100),
      email: pickString(body.email, existing.email, 254).toLowerCase(),
      phone: pickString(body.phone, existing.phone, 40),
      department: pickString(body.department, existing.department, 80),
      jobTitle: pickString(body.jobTitle, existing.jobTitle, 100),
      branch: pickString(body.branch, existing.branch, 80),
      joiningDate: pickString(body.joiningDate, existing.joiningDate, 10),
      status: pickString(body.status, existing.status, 20),
    };

    if (
      !employee.fullName ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email) ||
      !employee.phone ||
      !employee.jobTitle ||
      !Object.hasOwn(departments, employee.department) ||
      !Object.hasOwn(branches, employee.branch) ||
      !validDate(employee.joiningDate) ||
      !statuses.has(employee.status)
    ) {
      throw httpError(400, 'invalid_employee');
    }
    return employee;
  }

  function employeeFromRow(row) {
    return {
      id: row.id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      department: row.department,
      jobTitle: row.job_title,
      branch: row.branch,
      joiningDate: row.joining_date,
      status: row.status,
    };
  }

  function accountFromRow(row) {
    return {
      id: row.id,
      code: row.code,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      type: row.type,
      parentCode: row.parent_code ?? '',
      isGroup: Boolean(row.is_group),
      openingBalance: Number(row.opening_balance),
      isActive: Boolean(row.is_active),
      notes: row.notes,
    };
  }

  function listAccounts() {
    return db.prepare(`
      SELECT id, code, name_ar, name_en, type, parent_code, is_group, opening_balance, is_active, notes
      FROM accounts ORDER BY code COLLATE NOCASE
    `).all().map(accountFromRow);
  }

  function validateAccount(body, existing = null) {
    const types = new Set(['asset', 'liability', 'equity', 'income', 'expense']);
    const code = pickString(body.code, existing?.code, 32);
    const nameAr = pickString(body.nameAr, existing?.name_ar, 160);
    const nameEn = pickString(body.nameEn, existing?.name_en, 160);
    const type = pickString(body.type, existing?.type, 20);
    const parentCode = pickString(body.parentCode, existing?.parent_code ?? '', 32);
    const isGroup = typeof body.isGroup === 'boolean' ? body.isGroup : Boolean(existing?.is_group);
    const openingBalance = body.openingBalance === undefined
      ? Number(existing?.opening_balance ?? 0)
      : Number(body.openingBalance);
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : existing ? Boolean(existing.is_active) : true;
    const notes = pickString(body.notes, existing?.notes ?? '', 2000);

    if (
      !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/.test(code) ||
      !nameAr || !nameEn || !types.has(type) || !Number.isFinite(openingBalance) ||
      (body.isGroup !== undefined && typeof body.isGroup !== 'boolean') ||
      (body.isActive !== undefined && typeof body.isActive !== 'boolean') ||
      (isGroup && openingBalance !== 0)
    ) {
      throw httpError(400, 'invalid_account');
    }
    if (existing && body.code !== undefined && body.code !== existing.code) {
      throw httpError(400, 'account_code_immutable');
    }
    if (parentCode) {
      if (parentCode === code) throw httpError(400, 'invalid_account_parent');
      const parent = db.prepare('SELECT code, type, is_group, is_active FROM accounts WHERE code = ?').get(parentCode);
      if (!parent || !parent.is_group || !parent.is_active || parent.type !== type) {
        throw httpError(400, 'invalid_account_parent');
      }
      let ancestorCode = parent.code;
      while (ancestorCode) {
        if (existing && ancestorCode === existing.code) throw httpError(400, 'invalid_account_parent');
        const ancestor = db.prepare('SELECT parent_code FROM accounts WHERE code = ?').get(ancestorCode);
        ancestorCode = ancestor?.parent_code ?? '';
      }
    }
    if (existing && isGroup !== Boolean(existing.is_group)) {
      const child = db.prepare('SELECT 1 FROM accounts WHERE parent_code = ? LIMIT 1').get(existing.code);
      if (child) throw httpError(400, 'account_group_has_children');
    }
    if (existing && type !== existing.type) {
      const child = db.prepare('SELECT 1 FROM accounts WHERE parent_code = ? LIMIT 1').get(existing.code);
      if (child) throw httpError(400, 'account_type_has_children');
      const activity = db.prepare('SELECT 1 FROM journal_lines WHERE account_id = ? LIMIT 1').get(existing.id);
      if (activity) throw httpError(400, 'account_type_has_activity');
    }
    if (existing && !isActive && existing.is_active) {
      const activeChild = db.prepare('SELECT 1 FROM accounts WHERE parent_code = ? AND is_active = 1 LIMIT 1').get(existing.code);
      if (activeChild) throw httpError(400, 'account_group_has_active_children');
    }
    return { code, nameAr, nameEn, type, parentCode, isGroup, openingBalance, isActive, notes };
  }

  function journalEntryFromRow(row) {
    return {
      id: row.id,
      entryNumber: row.entry_number,
      date: row.date,
      entryType: row.entry_type,
      reference: row.reference,
      memo: row.memo,
      status: row.status,
      totalDebit: Number(row.total_debit),
      totalCredit: Number(row.total_credit),
      projectId: row.project_id,
      projectName: row.project_name,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      lineCount: Number(row.line_count ?? 0),
    };
  }

  function journalLineFromRow(row) {
    return {
      id: row.id,
      entryId: row.entry_id,
      accountId: row.account_id,
      accountCode: row.account_code,
      accountNameAr: row.account_name_ar,
      accountNameEn: row.account_name_en,
      accountType: row.account_type,
      debit: Number(row.debit),
      credit: Number(row.credit),
      description: row.description,
      projectId: row.project_id,
      projectName: row.project_name,
    };
  }

  function journalLinesFor(entryId) {
    return db.prepare(`
      SELECT id, entry_id, account_id, account_code, account_name_ar, account_name_en,
             account_type, debit, credit, description, project_id, project_name
      FROM journal_lines WHERE entry_id = ? ORDER BY rowid
    `).all(entryId).map(journalLineFromRow);
  }

  function listJournalEntries(status, limit) {
    const filter = status === 'all' ? '' : 'WHERE journal_entries.status = ?';
    const statement = db.prepare(`
      SELECT journal_entries.*,
             (SELECT COUNT(*) FROM journal_lines WHERE journal_lines.entry_id = journal_entries.id) AS line_count
      FROM journal_entries ${filter}
      ORDER BY date DESC, entry_number DESC LIMIT ?
    `);
    const rows = status === 'all' ? statement.all(limit) : statement.all(status, limit);
    return rows.map(journalEntryFromRow);
  }

  function validateJournal(body, existing = null) {
    const entryTypes = new Set(['journal', 'receipt', 'payment', 'sales', 'purchase']);
    const date = pickString(body.date, existing?.date, 10);
    const entryType = pickString(body.entryType, existing?.entry_type, 20);
    const reference = pickString(body.reference, existing?.reference, 160);
    const memo = pickString(body.memo, existing?.memo, 500);
    const status = body.status ?? existing?.status ?? 'draft';
    const projectId = pickString(body.projectId, existing?.project_id, 64);
    const projectName = pickString(body.projectName, existing?.project_name, 160);
    const lines = body.lines;

    if (!validDate(date) || !entryTypes.has(entryType) || !['draft', 'submitted'].includes(status)) {
      throw httpError(400, 'invalid_journal_entry');
    }
    if (!Array.isArray(lines) || lines.length < 1 || lines.length > 100 || (status === 'submitted' && lines.length < 2)) {
      throw httpError(400, 'invalid_journal_lines');
    }

    const accountById = db.prepare(`
      SELECT id, code, name_ar, name_en, type, is_group, is_active FROM accounts WHERE id = ?
    `);
    const normalizedLines = lines.map((line) => {
      if (!line || typeof line !== 'object') throw httpError(400, 'invalid_journal_lines');
      const account = accountById.get(line.accountId);
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      const description = pickString(line.description, '', 500);
      if (
        !account || !account.is_active || account.is_group ||
        !Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0 ||
        (debit === 0 && credit === 0) || (debit > 0 && credit > 0)
      ) {
        throw httpError(400, 'invalid_journal_line');
      }
      return {
        accountId: account.id,
        accountCode: account.code,
        accountNameAr: account.name_ar,
        accountNameEn: account.name_en,
        accountType: account.type,
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        description,
        projectId,
        projectName,
      };
    });
    const debitCents = normalizedLines.reduce((sum, line) => sum + Math.round(line.debit * 100), 0);
    const creditCents = normalizedLines.reduce((sum, line) => sum + Math.round(line.credit * 100), 0);
    if (status === 'submitted' && debitCents !== creditCents) throw httpError(400, 'journal_not_balanced');

    return {
      date,
      entryType,
      reference,
      memo,
      status,
      projectId,
      projectName,
      lines: normalizedLines,
      totalDebit: debitCents / 100,
      totalCredit: creditCents / 100,
    };
  }

  function insertJournalLines(entryId, journal) {
    const insert = db.prepare(`
      INSERT INTO journal_lines (
        id, entry_id, account_id, account_code, account_name_ar, account_name_en,
        account_type, debit, credit, description, project_id, project_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const line of journal.lines) {
      insert.run(
        randomUUID(), entryId, line.accountId, line.accountCode, line.accountNameAr, line.accountNameEn,
        line.accountType, line.debit, line.credit, line.description, line.projectId, line.projectName,
      );
    }
  }

  function nextJournalNumber(date) {
    const year = date.slice(0, 4);
    const rows = db.prepare('SELECT entry_number FROM journal_entries WHERE entry_number LIKE ?')
      .all(`JV-${year}-%`);
    const highest = rows.reduce((max, row) => {
      const match = row.entry_number.match(new RegExp(`^JV-${year}-(\\d{4,})$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `JV-${year}-${String(highest + 1).padStart(4, '0')}`;
  }

  function insertJournalAudit(entryId, actorId, action, changes) {
    db.prepare(`
      INSERT INTO journal_audit (id, entry_id, actor_id, action, changes_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), entryId, actorId, action, JSON.stringify(changes));
  }

  function listEmployees() {
    return db.prepare(`
      SELECT id, employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
      FROM employees ORDER BY full_name COLLATE NOCASE
    `).all().map(employeeFromRow);
  }

  function generateEmployeeCode(department, branch) {
    const prefix = `${departments[department]}-${branches[branch]}`;
    const records = db.prepare('SELECT employee_code FROM employees WHERE employee_code LIKE ?')
      .all(`${prefix}%`);
    const highest = records.reduce((max, record) => {
      const match = record.employee_code.match(new RegExp(`^${prefix}(\\d{4})$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    if (highest >= 9999) throw httpError(409, 'employee_code_sequence_exhausted');
    return `${prefix}${String(highest + 1).padStart(4, '0')}`;
  }

  function insertEmployee(employee, employeeCode = generateEmployeeCode(employee.department, employee.branch), id = randomUUID()) {
    db.prepare(`
      INSERT INTO employees (
        id, employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      employeeCode,
      employee.fullName,
      employee.email,
      employee.phone,
      employee.department,
      employee.jobTitle,
      employee.branch,
      employee.joiningDate,
      employee.status,
    );
    return db.prepare(`
      SELECT id, employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
      FROM employees WHERE id = ?
    `).get(id);
  }

  async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return json(response, 404, { error: 'not_found' });

    const user = currentUser(request);
    try {
      if (request.method === 'GET' && url.pathname === '/api/auth/session') {
        return json(response, 200, {
          user: user ? profile(user) : null,
          needsSetup: db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0,
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/setup') {
        const body = await readJson(request);
        const credentials = validateCredentials(body, true);
        let created;
        db.exec('BEGIN IMMEDIATE');
        try {
          if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count !== 0) {
            throw httpError(409, 'setup_already_complete');
          }
          const id = randomUUID();
          const salt = randomBytes(16).toString('hex');
          const passwordHash = scryptSync(credentials.password, salt, PASSWORD_BYTES).toString('hex');
          db.prepare(`
            INSERT INTO users (id, full_name, email, password_salt, password_hash, role)
            VALUES (?, ?, ?, ?, ?, 'GM')
          `).run(id, credentials.fullName, credentials.email, salt, passwordHash);
          created = { id, full_name: credentials.fullName, email: credentials.email, role: 'GM' };
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        createSession(response, created.id);
        return json(response, 201, { user: profile(created) });
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJson(request);
        const credentials = validateCredentials(body, false);
        const ip = request.socket.remoteAddress ?? 'unknown';
        const attempts = loginAttempts.get(ip);
        if (attempts && attempts.count >= 8 && Date.now() - attempts.startedAt < 15 * 60 * 1000) {
          return json(response, 429, { error: 'too_many_attempts' });
        }

        const found = db.prepare(`
          SELECT id, full_name, email, role, password_salt, password_hash
          FROM users WHERE email = ? COLLATE NOCASE
        `).get(credentials.email);
        const candidate = scryptSync(credentials.password, found?.password_salt ?? dummySalt, PASSWORD_BYTES);
        const expected = found ? Buffer.from(found.password_hash, 'hex') : dummyHash;
        const valid = timingSafeEqual(candidate, expected) && Boolean(found);
        if (!valid) {
          const next = attempts && Date.now() - attempts.startedAt < 15 * 60 * 1000
            ? { startedAt: attempts.startedAt, count: attempts.count + 1 }
            : { startedAt: Date.now(), count: 1 };
          loginAttempts.set(ip, next);
          return json(response, 401, { error: 'invalid_login' });
        }

        loginAttempts.delete(ip);
        createSession(response, found.id);
        return json(response, 200, { user: profile(found) });
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        if (user) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(user.token_hash);
        return json(response, 200, { ok: true }, {
          'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/accounts') {
        requireFinance(user);
        return json(response, 200, { accounts: listAccounts() });
      }

      if (request.method === 'POST' && url.pathname === '/api/accounts') {
        const actor = requireFinance(user);
        const account = validateAccount(await readJson(request));
        const id = randomUUID();
        db.prepare(`
          INSERT INTO accounts (
            id, code, name_ar, name_en, type, parent_code, is_group, opening_balance,
            is_active, notes, created_by_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, account.code, account.nameAr, account.nameEn, account.type, account.parentCode || null,
          Number(account.isGroup), account.openingBalance, Number(account.isActive), account.notes, actor.id,
        );
        db.prepare(`
          INSERT INTO account_audit (id, account_id, actor_id, action, changes_json)
          VALUES (?, ?, ?, 'created', ?)
        `).run(randomUUID(), id, actor.id, JSON.stringify(account));
        const row = db.prepare(`
          SELECT id, code, name_ar, name_en, type, parent_code, is_group, opening_balance, is_active, notes
          FROM accounts WHERE id = ?
        `).get(id);
        return json(response, 201, { account: accountFromRow(row) });
      }

      const accountRoute = url.pathname.match(/^\/api\/accounts\/([0-9a-f-]{36})$/i);
      if (accountRoute && request.method === 'PATCH') {
        const actor = requireFinance(user);
        const existing = db.prepare(`
          SELECT id, code, name_ar, name_en, type, parent_code, is_group, opening_balance, is_active, notes
          FROM accounts WHERE id = ?
        `).get(accountRoute[1]);
        if (!existing) throw httpError(404, 'account_not_found');
        const account = validateAccount(await readJson(request), existing);
        db.prepare(`
          UPDATE accounts
          SET name_ar = ?, name_en = ?, type = ?, parent_code = ?, is_group = ?, opening_balance = ?,
              is_active = ?, notes = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          account.nameAr, account.nameEn, account.type, account.parentCode || null, Number(account.isGroup),
          account.openingBalance, Number(account.isActive), account.notes, existing.id,
        );
        db.prepare(`
          INSERT INTO account_audit (id, account_id, actor_id, action, changes_json)
          VALUES (?, ?, ?, 'updated', ?)
        `).run(randomUUID(), existing.id, actor.id, JSON.stringify(account));
        const row = db.prepare(`
          SELECT id, code, name_ar, name_en, type, parent_code, is_group, opening_balance, is_active, notes
          FROM accounts WHERE id = ?
        `).get(existing.id);
        return json(response, 200, { account: accountFromRow(row) });
      }

      if (request.method === 'GET' && url.pathname === '/api/journal-entries') {
        requireFinance(user);
        const status = url.searchParams.get('status') ?? 'all';
        if (!['all', 'draft', 'submitted'].includes(status)) throw httpError(400, 'invalid_journal_status');
        const requestedLimit = Number(url.searchParams.get('limit') ?? 500);
        const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 1000) : 500;
        return json(response, 200, { entries: listJournalEntries(status, limit) });
      }

      if (request.method === 'POST' && url.pathname === '/api/journal-entries') {
        const actor = requireFinance(user);
        const journal = validateJournal(await readJson(request));
        const id = randomUUID();
        db.exec('BEGIN IMMEDIATE');
        try {
          const entryNumber = nextJournalNumber(journal.date);
          db.prepare(`
            INSERT INTO journal_entries (
              id, entry_number, date, entry_type, reference, memo, status, total_debit, total_credit,
              project_id, project_name, created_by_id, created_by_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id, entryNumber, journal.date, journal.entryType, journal.reference, journal.memo, journal.status,
            journal.totalDebit, journal.totalCredit, journal.projectId, journal.projectName, actor.id, actor.full_name,
          );
          insertJournalLines(id, journal);
          insertJournalAudit(id, actor.id, 'created', journal);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        const row = db.prepare(`
          SELECT journal_entries.*,
                 (SELECT COUNT(*) FROM journal_lines WHERE journal_lines.entry_id = journal_entries.id) AS line_count
          FROM journal_entries WHERE id = ?
        `).get(id);
        return json(response, 201, { entry: journalEntryFromRow(row), lines: journalLinesFor(id) });
      }

      const journalEntryRoute = url.pathname.match(/^\/api\/journal-entries\/([0-9a-f-]{36})$/i);
      if (journalEntryRoute && request.method === 'GET') {
        requireFinance(user);
        const row = db.prepare(`
          SELECT journal_entries.*,
                 (SELECT COUNT(*) FROM journal_lines WHERE journal_lines.entry_id = journal_entries.id) AS line_count
          FROM journal_entries WHERE id = ?
        `).get(journalEntryRoute[1]);
        if (!row) throw httpError(404, 'journal_entry_not_found');
        return json(response, 200, { entry: journalEntryFromRow(row), lines: journalLinesFor(row.id) });
      }

      if (journalEntryRoute && request.method === 'PATCH') {
        const actor = requireFinance(user);
        const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(journalEntryRoute[1]);
        if (!existing) throw httpError(404, 'journal_entry_not_found');
        if (existing.status !== 'draft') throw httpError(409, 'journal_entry_locked');
        if (actor.role !== 'GM' && actor.id !== existing.created_by_id) throw httpError(403, 'permission_denied');
        const journal = validateJournal(await readJson(request), existing);
        if (journal.status !== 'draft') throw httpError(400, 'invalid_journal_status');
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare(`
            UPDATE journal_entries
            SET date = ?, entry_type = ?, reference = ?, memo = ?, total_debit = ?, total_credit = ?,
                project_id = ?, project_name = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(
            journal.date, journal.entryType, journal.reference, journal.memo, journal.totalDebit,
            journal.totalCredit, journal.projectId, journal.projectName, existing.id,
          );
          db.prepare('DELETE FROM journal_lines WHERE entry_id = ?').run(existing.id);
          insertJournalLines(existing.id, journal);
          insertJournalAudit(existing.id, actor.id, 'updated', journal);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        const row = db.prepare(`
          SELECT journal_entries.*,
                 (SELECT COUNT(*) FROM journal_lines WHERE journal_lines.entry_id = journal_entries.id) AS line_count
          FROM journal_entries WHERE id = ?
        `).get(existing.id);
        return json(response, 200, { entry: journalEntryFromRow(row), lines: journalLinesFor(existing.id) });
      }

      const journalPostRoute = url.pathname.match(/^\/api\/journal-entries\/([0-9a-f-]{36})\/post$/i);
      if (journalPostRoute && request.method === 'POST') {
        const actor = requireFinance(user);
        const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(journalPostRoute[1]);
        if (!existing) throw httpError(404, 'journal_entry_not_found');
        if (existing.status !== 'draft') throw httpError(409, 'journal_entry_locked');
        if (actor.role !== 'GM' && actor.id !== existing.created_by_id) throw httpError(403, 'permission_denied');
        const totals = db.prepare(`
          SELECT COUNT(*) AS line_count,
                 COALESCE(SUM(CAST(ROUND(debit * 100) AS INTEGER)), 0) AS debit_cents,
                 COALESCE(SUM(CAST(ROUND(credit * 100) AS INTEGER)), 0) AS credit_cents,
                 SUM(CASE WHEN accounts.is_active = 0 OR accounts.is_group = 1 THEN 1 ELSE 0 END) AS invalid_accounts
          FROM journal_lines JOIN accounts ON accounts.id = journal_lines.account_id
          WHERE journal_lines.entry_id = ?
        `).get(existing.id);
        if (totals.line_count < 2 || totals.debit_cents !== totals.credit_cents) {
          throw httpError(400, 'journal_not_balanced');
        }
        if (totals.invalid_accounts) throw httpError(400, 'invalid_journal_line');
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare(`
            UPDATE journal_entries SET status = 'submitted', updated_at = datetime('now') WHERE id = ?
          `).run(existing.id);
          insertJournalAudit(existing.id, actor.id, 'submitted', { status: 'submitted' });
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        const row = db.prepare(`
          SELECT journal_entries.*,
                 (SELECT COUNT(*) FROM journal_lines WHERE journal_lines.entry_id = journal_entries.id) AS line_count
          FROM journal_entries WHERE id = ?
        `).get(existing.id);
        return json(response, 200, { entry: journalEntryFromRow(row), lines: journalLinesFor(existing.id) });
      }

      if (request.method === 'GET' && url.pathname === '/api/finance/trial-balance') {
        requireFinance(user);
        const asOf = url.searchParams.get('as_of') ?? new Date().toISOString().slice(0, 10);
        if (!validDate(asOf)) throw httpError(400, 'invalid_date');
        const rows = db.prepare(`
          SELECT accounts.id, accounts.code, accounts.name_ar, accounts.name_en, accounts.type,
                 accounts.opening_balance,
                 COALESCE(SUM(CASE WHEN journal_entries.status = 'submitted' AND journal_entries.date <= ?
                   THEN journal_lines.debit ELSE 0 END), 0) AS debit,
                 COALESCE(SUM(CASE WHEN journal_entries.status = 'submitted' AND journal_entries.date <= ?
                   THEN journal_lines.credit ELSE 0 END), 0) AS credit
          FROM accounts
          LEFT JOIN journal_lines ON journal_lines.account_id = accounts.id
          LEFT JOIN journal_entries ON journal_entries.id = journal_lines.entry_id
          WHERE accounts.is_group = 0
          GROUP BY accounts.id ORDER BY accounts.code
        `).all(asOf, asOf).map((row) => {
          const net = Number(row.opening_balance) + Number(row.debit) - Number(row.credit);
          return {
            accountId: row.id,
            code: row.code,
            nameAr: row.name_ar,
            nameEn: row.name_en,
            type: row.type,
            debit: Math.max(net, 0),
            credit: Math.max(-net, 0),
            activityDebit: Number(row.debit),
            activityCredit: Number(row.credit),
          };
        });
        const totals = rows.reduce((sum, row) => ({ debit: sum.debit + row.debit, credit: sum.credit + row.credit }), { debit: 0, credit: 0 });
        return json(response, 200, { asOf, rows, totals });
      }

      if (request.method === 'GET' && url.pathname === '/api/finance/cash-flow') {
        requireFinance(user);
        const today = new Date().toISOString().slice(0, 10);
        const from = url.searchParams.get('from') ?? `${today.slice(0, 4)}-01-01`;
        const to = url.searchParams.get('to') ?? today;
        if (!validDate(from) || !validDate(to) || from > to) throw httpError(400, 'invalid_report_filter');
        const rows = db.prepare(`
          SELECT substr(journal_entries.date, 1, 7) AS month,
                 COALESCE(SUM(journal_lines.debit), 0) AS inflow,
                 COALESCE(SUM(journal_lines.credit), 0) AS outflow
          FROM journal_lines
          JOIN journal_entries ON journal_entries.id = journal_lines.entry_id
          JOIN accounts ON accounts.id = journal_lines.account_id
          WHERE journal_entries.status = 'submitted' AND journal_entries.date BETWEEN ? AND ?
            AND accounts.type = 'asset' AND accounts.code LIKE '11%'
          GROUP BY substr(journal_entries.date, 1, 7)
          ORDER BY month
        `).all(from, to).map((row) => ({
          month: row.month,
          inflow: Number(row.inflow),
          outflow: Number(row.outflow),
          net: Number(row.inflow) - Number(row.outflow),
        }));
        const totals = rows.reduce((sum, row) => ({
          inflow: sum.inflow + row.inflow,
          outflow: sum.outflow + row.outflow,
          net: sum.net + row.net,
        }), { inflow: 0, outflow: 0, net: 0 });
        return json(response, 200, { from, to, rows, totals });
      }

      if (request.method === 'GET' && url.pathname === '/api/finance/general-ledger') {
        requireFinance(user);
        const accountId = url.searchParams.get('account_id') ?? '';
        const from = url.searchParams.get('from') ?? '';
        const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
        if (!accountId || !validDate(to) || (from && !validDate(from)) || (from && from > to)) {
          throw httpError(400, 'invalid_report_filter');
        }
        const account = db.prepare(`
          SELECT id, code, name_ar, name_en, type, opening_balance, is_group
          FROM accounts WHERE id = ?
        `).get(accountId);
        if (!account) throw httpError(404, 'account_not_found');
        if (account.is_group) throw httpError(400, 'group_account_no_ledger');
        const before = from ? db.prepare(`
          SELECT COALESCE(SUM(journal_lines.debit), 0) AS debit,
                 COALESCE(SUM(journal_lines.credit), 0) AS credit
          FROM journal_lines JOIN journal_entries ON journal_entries.id = journal_lines.entry_id
          WHERE journal_lines.account_id = ? AND journal_entries.status = 'submitted' AND journal_entries.date < ?
        `).get(accountId, from) : { debit: 0, credit: 0 };
        let balance = Number(account.opening_balance) + Number(before.debit) - Number(before.credit);
        const activity = db.prepare(`
          SELECT journal_lines.id, journal_entries.id AS entry_id, journal_entries.entry_number,
                 journal_entries.date, journal_entries.entry_type, journal_entries.reference, journal_entries.memo,
                 journal_lines.debit, journal_lines.credit, journal_lines.description
          FROM journal_lines JOIN journal_entries ON journal_entries.id = journal_lines.entry_id
          WHERE journal_lines.account_id = ? AND journal_entries.status = 'submitted'
            AND journal_entries.date <= ? AND (? = '' OR journal_entries.date >= ?)
          ORDER BY journal_entries.date, journal_entries.entry_number, journal_lines.rowid
        `).all(accountId, to, from, from).map((row) => {
          balance += Number(row.debit) - Number(row.credit);
          return {
            id: row.id,
            entryId: row.entry_id,
            entryNumber: row.entry_number,
            date: row.date,
            entryType: row.entry_type,
            reference: row.reference,
            memo: row.memo,
            debit: Number(row.debit),
            credit: Number(row.credit),
            description: row.description,
            balance,
          };
        });
        return json(response, 200, {
          account: { id: account.id, code: account.code, nameAr: account.name_ar, nameEn: account.name_en, type: account.type },
          openingBalance: Number(account.opening_balance) + Number(before.debit) - Number(before.credit),
          from,
          to,
          lines: activity,
          endingBalance: balance,
        });
      }

      if (url.pathname === '/api/employees' && request.method === 'GET') {
        requireUser(user);
        return json(response, 200, { employees: listEmployees() });
      }

      if (url.pathname === '/api/employees/me' && request.method === 'GET') {
        const authenticatedUser = requireUser(user);
        const row = db.prepare(`
          SELECT employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
          FROM employees WHERE email = ? COLLATE NOCASE
        `).get(authenticatedUser.email);
        const employee = row ? {
          employeeCode: row.employee_code,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          department: row.department,
          jobTitle: row.job_title,
          branch: row.branch,
          joiningDate: row.joining_date,
          status: row.status,
        } : null;
        return json(response, 200, { employee });
      }

      if (url.pathname === '/api/employees' && request.method === 'POST') {
        requireHrWrite(user);
        const employee = validateEmployee(await readJson(request));
        const result = insertEmployee(employee);
        return json(response, 201, { employee: employeeFromRow(result) });
      }

      const employeeRoute = url.pathname.match(/^\/api\/employees\/([0-9a-f-]{36})$/i);
      if (employeeRoute && request.method === 'PATCH') {
        requireHrWrite(user);
        const existingRow = db.prepare(`
          SELECT id, employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
          FROM employees WHERE id = ?
        `).get(employeeRoute[1]);
        if (!existingRow) throw httpError(404, 'employee_not_found');
        const current = employeeFromRow(existingRow);
        const updated = validateEmployee(await readJson(request), current);
        db.prepare(`
          UPDATE employees
          SET full_name = ?, email = ?, phone = ?, department = ?, job_title = ?, branch = ?,
              joining_date = ?, status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          updated.fullName,
          updated.email,
          updated.phone,
          updated.department,
          updated.jobTitle,
          updated.branch,
          updated.joiningDate,
          updated.status,
          current.id,
        );
        const result = db.prepare(`
          SELECT id, employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
          FROM employees WHERE id = ?
        `).get(current.id);
        return json(response, 200, { employee: employeeFromRow(result) });
      }

      if (employeeRoute && request.method === 'DELETE') {
        requireHrWrite(user);
        const result = db.prepare(`
          UPDATE employees SET status = 'Inactive', updated_at = datetime('now') WHERE id = ?
        `).run(employeeRoute[1]);
        if (result.changes === 0) throw httpError(404, 'employee_not_found');
        return json(response, 200, { ok: true });
      }

      if (request.method === 'POST' && url.pathname === '/api/employees/migrate') {
        requireHrWrite(user);
        const body = await readJson(request);
        if (!Array.isArray(body.employees) || body.employees.length > 1000) {
          throw httpError(400, 'invalid_migration');
        }
        let imported = 0;
        db.exec('BEGIN IMMEDIATE');
        try {
          for (const candidate of body.employees) {
            const employee = validateEmployee(candidate);
            if (
              typeof candidate.employeeCode !== 'string' ||
              !/^[A-Z]{2}-[A-Z]\d{4}$/.test(candidate.employeeCode) ||
              !candidate.employeeCode.startsWith(`${departments[employee.department]}-${branches[employee.branch]}`)
            ) {
              throw httpError(400, 'invalid_legacy_employee');
            }
            const result = db.prepare(`
              INSERT OR IGNORE INTO employees (
                id, employee_code, full_name, email, phone, department, job_title, branch, joining_date, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              typeof candidate.id === 'string' ? candidate.id : randomUUID(),
              candidate.employeeCode,
              employee.fullName,
              employee.email,
              employee.phone,
              employee.department,
              employee.jobTitle,
              employee.branch,
              employee.joiningDate,
              employee.status,
            );
            imported += Number(result.changes);
          }
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        return json(response, 200, { imported, employees: listEmployees() });
      }

      return json(response, 404, { error: 'not_found' });
    } catch (error) {
      if (error?.status) return json(response, error.status, { error: error.code });
      if (error?.errcode === 2067 && String(error.message).includes('accounts.code')) {
        return json(response, 409, { error: 'duplicate_account_code' });
      }
      if (error?.errcode === 2067 || error?.errcode === 1555) {
        return json(response, 409, { error: 'duplicate_employee' });
      }
      console.error('API request failed:', error);
      return json(response, 500, { error: 'internal_error' });
    }
  }

  const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error('Unhandled API request failure:', error);
      if (!response.headersSent) json(response, 500, { error: 'internal_error' });
      else response.destroy();
    });
  });

  return {
    server,
    close() {
      db.close();
    },
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function pickString(value, fallback, maxLength) {
  const selected = value === undefined ? fallback : value;
  return typeof selected === 'string' && selected.trim().length <= maxLength
    ? selected.trim()
    : '';
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function httpError(status, code) {
  return Object.assign(new Error(code), { status, code });
}

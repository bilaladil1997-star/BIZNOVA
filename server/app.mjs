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
      role TEXT NOT NULL CHECK (role IN ('GM', 'HR Manager')),
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

      if (url.pathname === '/api/employees' && request.method === 'GET') {
        requireUser(user);
        return json(response, 200, { employees: listEmployees() });
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

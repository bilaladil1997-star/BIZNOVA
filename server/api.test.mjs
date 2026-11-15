import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createAppServer } from './app.mjs';

test('HR API requires auth, validates employee records, and persists them', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'biznova-hr-'));
  const dbPath = join(directory, 'test.sqlite');
  let app = createAppServer({ dbPath });
  let baseUrl;
  let cookie;

  async function start() {
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${app.server.address().port}`;
  }

  async function call(path, { method = 'GET', body, sessionCookie = cookie } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return { response, data };
  }

  try {
    await start();
    const session = await call('/api/auth/session');
    assert.deepEqual(session.data, { user: null, needsSetup: true });

    const unauthorized = await call('/api/employees');
    assert.equal(unauthorized.response.status, 401);

    const setup = await call('/api/auth/setup', {
      method: 'POST',
      body: { fullName: 'Test Admin', email: 'admin@example.com', password: 'a-strong-password-123' },
      sessionCookie: null,
    });
    assert.equal(setup.response.status, 201);
    assert.equal(setup.data.user.role, 'GM');
    cookie = setup.response.headers.get('set-cookie').split(';', 1)[0];

    const secondSetup = await call('/api/auth/setup', {
      method: 'POST',
      body: { fullName: 'Second Admin', email: 'other@example.com', password: 'another-password-123' },
    });
    assert.equal(secondSetup.response.status, 409);

    const employee = {
      fullName: 'Samira Saleh',
      email: 'samira@example.com',
      phone: '+971501234567',
      department: 'Human Resources',
      jobTitle: 'HR Officer',
      branch: 'Dubai',
      joiningDate: '2025-02-14',
      status: 'Active',
    };
    const created = await call('/api/employees', { method: 'POST', body: employee });
    assert.equal(created.response.status, 201);
    assert.equal(created.data.employee.employeeCode, 'HR-M0001');

    const duplicate = await call('/api/employees', { method: 'POST', body: employee });
    assert.equal(duplicate.response.status, 409);

    const invalidDate = await call('/api/employees', {
      method: 'POST',
      body: { ...employee, email: 'date@example.com', joiningDate: '2025-02-31' },
    });
    assert.equal(invalidDate.response.status, 400);

    const unauthorizedWrite = await call('/api/employees', {
      method: 'POST',
      body: employee,
      sessionCookie: null,
    });
    assert.equal(unauthorizedWrite.response.status, 401);

    await new Promise((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
    app.close();
    app = createAppServer({ dbPath });
    await start();

    const login = await call('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'a-strong-password-123' },
      sessionCookie: null,
    });
    assert.equal(login.response.status, 200);
    cookie = login.response.headers.get('set-cookie').split(';', 1)[0];
    const records = await call('/api/employees');
    assert.equal(records.data.employees.length, 1);
    assert.equal(records.data.employees[0].email, 'samira@example.com');
  } finally {
    if (app.server.listening) {
      await new Promise((resolve) => app.server.close(resolve));
    }
    app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

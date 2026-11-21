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
    const unauthorizedProfile = await call('/api/employees/me');
    assert.equal(unauthorizedProfile.response.status, 401);

    const setup = await call('/api/auth/setup', {
      method: 'POST',
      body: { fullName: 'Test Admin', email: 'admin@example.com', password: 'a-strong-password-123' },
      sessionCookie: null,
    });
    assert.equal(setup.response.status, 201);
    assert.equal(setup.data.user.role, 'GM');
    cookie = setup.response.headers.get('set-cookie').split(';', 1)[0];
    const unlinkedProfile = await call('/api/employees/me');
    assert.deepEqual(unlinkedProfile.data, { employee: null });

    const secondSetup = await call('/api/auth/setup', {
      method: 'POST',
      body: { fullName: 'Second Admin', email: 'other@example.com', password: 'another-password-123' },
    });
    assert.equal(secondSetup.response.status, 409);

    const employee = {
      fullName: 'Samira Saleh',
      email: 'admin@example.com',
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
    const ownProfile = await call('/api/employees/me');
    assert.equal(ownProfile.response.status, 200);
    assert.deepEqual(ownProfile.data.employee, {
      employeeCode: 'HR-M0001',
      fullName: 'Samira Saleh',
      email: 'admin@example.com',
      phone: '+971501234567',
      department: 'Human Resources',
      jobTitle: 'HR Officer',
      branch: 'Dubai',
      joiningDate: '2025-02-14',
      status: 'Active',
    });

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
    assert.equal(records.data.employees[0].email, 'admin@example.com');
  } finally {
    if (app.server.listening) {
      await new Promise((resolve) => app.server.close(resolve));
    }
    app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Accounts API validates the chart, restricts access, and persists account records', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'biznova-accounts-'));
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
    return { response, data: await response.json() };
  }

  try {
    await start();
    const unauthorized = await call('/api/accounts', { sessionCookie: null });
    assert.equal(unauthorized.response.status, 401);

    const setup = await call('/api/auth/setup', {
      method: 'POST',
      body: { fullName: 'Finance Admin', email: 'finance@example.com', password: 'a-strong-password-123' },
      sessionCookie: null,
    });
    assert.equal(setup.response.status, 201);
    cookie = setup.response.headers.get('set-cookie').split(';', 1)[0];

    const groupInput = {
      code: '1000',
      nameAr: 'Assets',
      nameEn: 'Assets',
      type: 'asset',
      parentCode: '',
      isGroup: true,
      openingBalance: 0,
      isActive: true,
      notes: '',
    };
    const group = await call('/api/accounts', { method: 'POST', body: groupInput });
    assert.equal(group.response.status, 201);
    assert.equal(group.data.account.isGroup, true);

    const childInput = { ...groupInput, code: '1100', nameAr: 'Cash', nameEn: 'Cash', parentCode: '1000', isGroup: false };
    const child = await call('/api/accounts', { method: 'POST', body: childInput });
    assert.equal(child.response.status, 201);
    assert.equal(child.data.account.parentCode, '1000');

    const duplicate = await call('/api/accounts', { method: 'POST', body: groupInput });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.data.error, 'duplicate_account_code');

    const invalidGroupBalance = await call('/api/accounts', {
      method: 'POST',
      body: { ...groupInput, code: '2000', openingBalance: 10 },
    });
    assert.equal(invalidGroupBalance.response.status, 400);

    const invalidParent = await call('/api/accounts', {
      method: 'POST',
      body: { ...childInput, code: '1200', parentCode: '9999' },
    });
    assert.equal(invalidParent.response.status, 400);

    const deactivateParent = await call(`/api/accounts/${group.data.account.id}`, {
      method: 'PATCH',
      body: { ...groupInput, isActive: false },
    });
    assert.equal(deactivateParent.response.status, 400);

    const deactivateChild = await call(`/api/accounts/${child.data.account.id}`, {
      method: 'PATCH',
      body: { ...childInput, isActive: false },
    });
    assert.equal(deactivateChild.response.status, 200);
    assert.equal(deactivateChild.data.account.isActive, false);

    await new Promise((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
    app.close();
    app = createAppServer({ dbPath });
    await start();
    const records = await call('/api/accounts');
    assert.equal(records.response.status, 200);
    assert.equal(records.data.accounts.length, 2);
    assert.equal(records.data.accounts.find((account) => account.code === '1100').isActive, false);
  } finally {
    if (app.server.listening) {
      await new Promise((resolve) => app.server.close(resolve));
    }
    app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Journal API only posts balanced drafts and reports posted activity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'biznova-journals-'));
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
    return { response, data: await response.json() };
  }

  try {
    await start();
    const setup = await call('/api/auth/setup', {
      method: 'POST',
      body: { fullName: 'Journal Admin', email: 'journal@example.com', password: 'a-strong-password-123' },
      sessionCookie: null,
    });
    cookie = setup.response.headers.get('set-cookie').split(';', 1)[0];

    const makeAccount = async (account) => {
      const result = await call('/api/accounts', { method: 'POST', body: account });
      assert.equal(result.response.status, 201);
      return result.data.account;
    };
    const assets = await makeAccount({ code: '1000', nameAr: 'Assets', nameEn: 'Assets', type: 'asset', isGroup: true, openingBalance: 0 });
    const cash = await makeAccount({ code: '1100', nameAr: 'Cash', nameEn: 'Cash', type: 'asset', parentCode: assets.code });
    const income = await makeAccount({ code: '4000', nameAr: 'Income', nameEn: 'Income', type: 'income' });

    const draftInput = {
      date: '2026-04-15',
      entryType: 'journal',
      reference: 'TEST-1',
      memo: 'Opening activity',
      status: 'draft',
      lines: [
        { accountId: cash.id, debit: 125, credit: 0, description: 'Cash received' },
        { accountId: income.id, debit: 0, credit: 100, description: 'Income' },
      ],
    };
    const created = await call('/api/journal-entries', { method: 'POST', body: draftInput });
    assert.equal(created.response.status, 201);
    assert.match(created.data.entry.entryNumber, /^JV-2026-\d{4}$/);
    assert.equal(created.data.entry.status, 'draft');

    const unbalancedPost = await call(`/api/journal-entries/${created.data.entry.id}/post`, { method: 'POST' });
    assert.equal(unbalancedPost.response.status, 400);
    assert.equal(unbalancedPost.data.error, 'journal_not_balanced');

    const beforePosting = await call('/api/finance/trial-balance?as_of=2026-04-15');
    assert.equal(beforePosting.data.totals.debit, 0);
    assert.equal(beforePosting.data.totals.credit, 0);

    const updated = await call(`/api/journal-entries/${created.data.entry.id}`, {
      method: 'PATCH',
      body: { ...draftInput, lines: [draftInput.lines[0], { ...draftInput.lines[1], credit: 125 }] },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.data.entry.totalDebit, updated.data.entry.totalCredit);

    const posted = await call(`/api/journal-entries/${created.data.entry.id}/post`, { method: 'POST' });
    assert.equal(posted.response.status, 200);
    assert.equal(posted.data.entry.status, 'submitted');
    assert.equal(posted.data.lines.length, 2);

    const lockedEdit = await call(`/api/journal-entries/${created.data.entry.id}`, {
      method: 'PATCH',
      body: { ...draftInput, lines: [draftInput.lines[0], { ...draftInput.lines[1], credit: 125 }] },
    });
    assert.equal(lockedEdit.response.status, 409);

    const trialBalance = await call('/api/finance/trial-balance?as_of=2026-04-15');
    assert.equal(trialBalance.data.totals.debit, 125);
    assert.equal(trialBalance.data.totals.credit, 125);

    const ledger = await call(`/api/finance/general-ledger?account_id=${cash.id}&from=2026-04-01&to=2026-04-30`);
    assert.equal(ledger.response.status, 200);
    assert.equal(ledger.data.lines.length, 1);
    assert.equal(ledger.data.lines[0].balance, 125);

    const reclassifyUsedAccount = await call(`/api/accounts/${cash.id}`, {
      method: 'PATCH',
      body: { code: cash.code, nameAr: cash.nameAr, nameEn: cash.nameEn, type: 'expense', parentCode: '', isGroup: false, openingBalance: 0, isActive: true, notes: '' },
    });
    assert.equal(reclassifyUsedAccount.response.status, 400);
    assert.equal(reclassifyUsedAccount.data.error, 'account_type_has_activity');
  } finally {
    if (app.server.listening) {
      await new Promise((resolve) => app.server.close(resolve));
    }
    app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

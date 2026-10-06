import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('public/admin-panel.html', 'utf8');
const code = source.slice(source.indexOf('let passwordConfirmation ='), source.indexOf('function renderDashboard()'));
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { value: '', textContent: '', disabled: false, focus() {}, reportValidity() {}, classList: { remove() {} } });
  return elements.get(id);
};
let valid = false, calls = 0, resolveLogin, options;
const context = vm.createContext({
  document: { getElementById: element },
  openModal() {}, escapeHtml: value => value,
  SUPABASE_URL: 'https://example.test', SUPABASE_KEY: 'test',
  sb: { auth: { getUser: async () => ({ data: { user: { id: 'admin', email: 'admin@example.test' } } }) } },
  supabase: { createClient(url, key, opts) {
    options = opts;
    return { auth: {
      async signInWithPassword() {
        calls++;
        if (resolveLogin) await new Promise(resolve => { resolveLogin = resolve; });
        return valid ? { data: { user: { id: 'admin' } } } : { error: { message: 'invalid' }, data: {} };
      },
      async signOut(opts) { assert.equal(opts.scope, 'local'); }
    } };
  } }
});
vm.runInContext(code, context);
const run = expression => vm.runInContext(expression, context);
let approved = false;
const pending = run('requestAdminPassword("Delete")').then(value => { approved = value; });
element('confirm-password').value = 'wrong';
await run('submitAdminPassword()');
assert.equal(approved, false);
assert.ok(element('confirm-password-error').textContent);
assert.equal(element('confirm-password').value, '');
assert.equal(options.auth.persistSession, false);
assert.equal(options.auth.autoRefreshToken, false);
valid = true;
element('confirm-password').value = 'correct';
await run('submitAdminPassword()');
await pending;
assert.equal(approved, true);

resolveLogin = true;
const cancelled = run('requestAdminPassword("Receive")');
element('confirm-password').value = 'correct';
const submitting = run('submitAdminPassword()');
await new Promise(resolve => setImmediate(resolve));
const before = calls;
await run('submitAdminPassword()');
assert.equal(calls, before, 'duplicate submission blocked');
run('closeModal()');
resolveLogin();
await submitting;
assert.equal(await cancelled, false, 'cancel during verification prevents mutation');
for (const name of ['deleteProductNow', 'deleteCategoryNow', 'deleteBrandNow', 'receivePendingBatch']) {
  const body = source.slice(source.indexOf(`async function ${name}(`));
  assert.ok(body.indexOf('await requestAdminPassword(') < body.search(/await sb\.from|const results = await Promise/), `${name} verifies before mutation`);
}
console.log('Admin password confirmation checks passed');

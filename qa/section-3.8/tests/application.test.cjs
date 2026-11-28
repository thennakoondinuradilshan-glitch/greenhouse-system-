// Uses the real server, route handlers, models, and a dedicated local mongod.
// No mock database, synthetic Express routes, remote database, or actuator driver.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '../../..');
const runId = `${Date.now()}-${process.pid}`;
const evidence = path.resolve(process.env.QA_EVIDENCE_DIR || path.join(root, '.qa-local', 'application-evidence'));
const dbPath = path.join(root, '.qa-local', 'mongo', runId);
const dbPort = 27028;
const apiPort = 5001; // The existing frontend points here.
const baseUrl = `http://127.0.0.1:${apiPort}`;
const mongod = process.env.QA_MONGOD || 'C:\\Program Files\\MongoDB\\Server\\9.0\\bin\\mongod.exe';
const requests = [];
const children = [];
const password = `Qa${randomBytes(12).toString('hex')}!`;
const account = {
  username: `qa-farmer-${runId}`, email: `qa-${runId}@example.invalid`,
  password, role: 'farmer', phoneNumber: '0770000000', location: 'Synthetic QA Farm',
};
let token;
let productId;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(
    ([key, item]) => [key, /password|token|authorization|secret/i.test(key) ? '[REDACTED]' : redact(item)]));
  return value;
}

function launch(command, args, options, logName) {
  const log = fs.openSync(path.join(evidence, logName), 'w');
  const child = spawn(command, args, { ...options, windowsHide: true,
    stdio: ['ignore', log, log, ...(command === process.execPath ? ['ipc'] : [])] });
  child.on('error', (error) => { child.launchError = error; });
  children.push(child);
  fs.closeSync(log);
  return child;
}

async function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function waitFor(check, child, description) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (child.launchError) throw child.launchError;
    if (child.exitCode !== null) throw new Error(`${description} exited with ${child.exitCode}; see server logs`);
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function request(method, route, body, authenticated = false) {
  const response = await fetch(`${baseUrl}${route}`, {
    method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  requests.push({ at: new Date().toISOString(), method, route, authenticated,
    request: redact(body), status: response.status, response: redact(data) });
  return { status: response.status, data };
}

before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(dbPath, { recursive: true });
  for (const port of [dbPort, apiPort]) {
    assert.equal(await isListening(port), false, `Port ${port} is occupied; refusing to reuse an existing service`);
  }
  const database = launch(mongod, ['--dbpath', dbPath, '--port', String(dbPort), '--bind_ip', '127.0.0.1'], {}, 'mongodb.log');
  await waitFor(() => isListening(dbPort), database, 'isolated MongoDB');
  const api = launch(process.execPath, ['--require', path.join(root, 'qa/scripts/test-lifecycle.cjs'), 'server.js'], {
    cwd: path.join(root, 'backend'), env: { ...process.env,
      PORT: String(apiPort), MONGO_URI: `mongodb://127.0.0.1:${dbPort}/smartgrow_qa_${runId}`,
      JWT_SECRET: randomBytes(32).toString('hex'), DOTENV_CONFIG_QUIET: 'true' },
  }, 'backend.log');
  await waitFor(async () => {
    try { return (await fetch(baseUrl, { signal: AbortSignal.timeout(1000) })).status === 200; } catch { return false; }
  }, api, 'actual SmartGrow backend');
  const registration = await request('POST', '/api/auth/register', account);
  assert.equal(registration.status, 201, 'Synthetic farmer setup must succeed');
  token = registration.data.token;
  fs.writeFileSync(path.join(evidence, 'environment.json'), JSON.stringify({
    runId, node: process.version, platform: process.platform, api: baseUrl,
    database: `mongodb://127.0.0.1:${dbPort}/smartgrow_qa_${runId}`,
    data: 'Synthetic accounts/products only; fresh mongod directory; no remote connection or actuator',
  }, null, 2));
}, { timeout: 100000 });

after(async () => {
  for (const child of children.reverse()) {
    if (child.exitCode === null && !child.launchError) {
      if (child.connected) child.send('qa-stop');
      else child.kill();
      await Promise.race([new Promise((resolve) => child.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000))]);
      if (child.exitCode === null) child.kill();
    }
  }
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(evidence, 'http-results.json'), JSON.stringify(requests, null, 2));
});

test('APP-01: actual landing route responds with the application message', async () => {
  const result = await request('GET', '/');
  assert.equal(result.status, 200);
  assert.equal(result.data, 'Greenhouse Monitoring API is running...');
});

test('APP-02: lowercase login and protected profile use real persistence', async () => {
  const login = await request('POST', '/api/auth/login', { email: account.email, password });
  assert.equal(login.status, 200);
  token = login.data.token;
  const profile = await request('GET', '/api/auth/profile', undefined, true);
  assert.equal(profile.status, 200);
  assert.equal(profile.data.user.email, account.email);
  assert.equal(profile.data.user.role, 'farmer');
  assert.equal(profile.data.user.password, undefined);
});

test('SG-001: anonymous registration must reject the privileged admin role', async () => {
  const result = await request('POST', '/api/auth/register', { ...account,
    username: `qa-admin-attempt-${runId}`, email: `qa-admin-${runId}@example.invalid`, role: 'admin' });
  assert.equal(result.status, 400, 'Public registration must not create an administrator');
});

test('SG-002: login normalizes email case consistently with registration', async () => {
  const result = await request('POST', '/api/auth/login', { email: ` ${account.email.toUpperCase()} `, password });
  assert.equal(result.status, 200, 'The registered email should work with uppercase letters and surrounding spaces');
  assert.equal(result.data.user.email, account.email);
  const duplicate = await request('POST', '/api/auth/register', { ...account,
    username: `qa-duplicate-${runId}`, email: ` ${account.email.toUpperCase()} ` });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.data.error, 'Email is already registered');
});

test('APP-03: real farmer product creation and database-backed basket calculation', async () => {
  const product = await request('POST', '/api/products', {
    name: `QA Peppers ${runId}`, category: 'Vegetables', description: 'Synthetic QA crop',
    price: 4.5, quantity: 25, unit: 'kg', farmerName: 'Synthetic QA Farmer', location: 'Synthetic QA Farm',
  }, true);
  assert.equal(product.status, 201);
  productId = product.data.data?._id;
  assert.ok(productId, 'Created product must have an id');
  const result = await request('POST', '/api/cart/calculate', {
    items: [{ productId, quantity: 4, price: 0.01 }], deliveryMethod: 'delivery' });
  assert.equal(result.status, 200);
  assert.equal(result.data.subtotal, 18);
  assert.equal(result.data.deliveryFee, 2.5);
  assert.equal(result.data.total, 20.5);
});

test('APP-04: signed-out profile and administrator access are denied', async () => {
  assert.equal((await request('GET', '/api/auth/profile')).status, 401);
  assert.equal((await request('GET', '/api/admin/expertconnect/stats')).status, 401);
});

test('SG-003: signed-out device creation must require authentication', async () => {
  const device = { name: `Synthetic QA Fan ${runId}`, type: 'FAN', mode: 'MANUAL', status: 'OFF' };
  const result = await request('POST', '/api/devices', device);
  assert.ok([401, 403].includes(result.status), `Expected 401/403; actual ${result.status}`);
  const created = await request('POST', '/api/devices', device, true);
  assert.equal(created.status, 201, 'An authenticated farmer can still create devices');
  const id = created.data._id;
  assert.equal((await request('PUT', `/api/devices/${id}`, { status: 'ON' })).status, 401);
  assert.equal((await request('DELETE', `/api/devices/${id}`)).status, 401);
  assert.equal((await request('PUT', `/api/devices/${id}`, { status: 'ON' }, true)).status, 200);
  assert.equal((await request('DELETE', `/api/devices/${id}`, undefined, true)).status, 200);
  const customer = await request('POST', '/api/auth/register', { ...account,
    username: `qa-customer-${runId}`, email: `qa-customer-${runId}@example.invalid`, role: 'customer' });
  assert.equal(customer.status, 201);
  const farmerToken = token;
  token = customer.data.token;
  try { assert.equal((await request('POST', '/api/devices', device, true)).status, 403); }
  finally { token = farmerToken; }
});

test('SG-004: a fallback basket must reject negative quantity', async () => {
  const result = await request('POST', '/api/cart/calculate', {
    items: [{ productId: 'qa-non-database-item', name: 'Synthetic Fallback Crop', price: 5, quantity: -3 }], deliveryMethod: 'delivery' });
  assert.equal(result.status, 400, `Expected validation error; actual total ${result.data.total}`);
  const defaultCropQuantity = await request('POST', '/api/cart/calculate', {
    items: [{ productId: 'qa-default-quantity-crop', name: 'Synthetic Crop', price: 5 }] });
  assert.equal(defaultCropQuantity.status, 200);
  assert.equal(defaultCropQuantity.data.items[0].requestedQuantity, 1);
  for (const quantity of [0, null, 'not-a-number']) {
    assert.equal((await request('POST', '/api/cart/calculate', {
      items: [{ productId, quantity }], deliveryMethod: 'delivery' })).status, 400);
  }
  assert.equal((await request('POST', '/api/cart/calculate', { items: [null] })).status, 400);
  for (const price of [-5, 0, 'not-a-number']) {
    assert.equal((await request('POST', '/api/cart/calculate', {
      items: [{ productId: 'qa-fallback', name: 'Synthetic Crop', price, quantity: 1 }] })).status, 400);
  }
  assert.equal((await request('POST', '/api/cart/calculate-supplies', {
    items: [{ supplyId: 'qa-supply', name: 'Synthetic Supply', price: 5, quantity: 2 }],
    deliveryMethod: 'delivery' })).data.total, 13.5);
  const defaultSupplyQuantity = await request('POST', '/api/cart/calculate-supplies', {
    items: [{ supplyId: 'qa-default-quantity-supply', name: 'Synthetic Supply', price: 5 }] });
  assert.equal(defaultSupplyQuantity.status, 200);
  assert.equal(defaultSupplyQuantity.data.items[0].requestedQuantity, 1);
  for (const quantity of [-2, 0, 'not-a-number']) {
    assert.equal((await request('POST', '/api/cart/calculate-supplies', {
      items: [{ supplyId: 'qa-supply', name: 'Synthetic Supply', price: 5, quantity }] })).status, 400);
  }
  for (const price of [-5, 0, 'not-a-number']) {
    assert.equal((await request('POST', '/api/cart/calculate-supplies', {
      items: [{ supplyId: 'qa-supply', name: 'Synthetic Supply', price, quantity: 1 }] })).status, 400);
  }
});

test('APP-05: fixture-only health route is absent from the actual application', async () => {
  assert.equal((await request('GET', '/api/health')).status, 404);
  for (const route of ['/api/auth/validate-password', '/api/cart/summary', '/api/sensors/evaluate-pump']) {
    assert.equal((await request('POST', route, {})).status, 404);
  }
});

test('SG-005: server simulator import matches the tracked filename exactly', () => {
  const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
  const target = server.match(/require\(['"]\.\/utils\/(sensorSimulator|sensorsimulator)['"]\)/)?.[1];
  assert.ok(target, 'Simulator require must exist');
  assert.ok(fs.readdirSync(path.join(root, 'backend/utils')).includes(`${target}.js`),
    `Import ${target}.js differs in case from the file; case-sensitive systems cannot resolve it`);
});

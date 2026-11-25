const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { SmartGrowMarketplacePage } = require('../../../backend/tests/ui/selenium_marketplace.test.js');

const section = path.resolve(__dirname, '..');
const root = path.resolve(section, '../..');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runtime = path.join(section, '.runtime', runId);
const evidence = path.join(section, 'evidence', ...(process.env.GITHUB_ACTIONS === 'true' ? ['ci'] : []), runId);
const screenshots = path.join(evidence, 'screenshots');
for (const directory of [runtime, evidence, screenshots]) fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(section, '.runtime', 'latest-evidence.txt'), evidence);
const transcript = path.join(evidence, 'terminal-output.txt');
function log(message) { console.log(message); fs.appendFileSync(transcript, `${message}\n`); }
const childProcesses = [];
const api = 'http://127.0.0.1:5001';
const frontend = 'http://127.0.0.1:3000';
const dbPort = 27038;
const headless = process.env.QA_HEADLESS === '1';
const useMongoService = process.env.QA_USE_MONGO_SERVICE === '1';
const customerName = `selenium_customer_${Date.now()}`;
const password = `Selenium${randomBytes(10).toString('hex')}!`;
const account = { username: `selenium_farmer_${Date.now()}`,
  email: `selenium-${Date.now()}@example.invalid`, password, role: 'farmer',
  phoneNumber: '0770000000', location: 'Synthetic Selenium QA Farm' };
const results = [];
const captureRecords = [];
fs.writeFileSync(path.join(evidence, 'test-source-sha256.txt'), createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') + '\n');
let driver;
let page;
let capabilities;

async function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(750);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}
function launch(command, args, cwd, env, name) {
  const output = fs.openSync(path.join(evidence, `${name}.log`), 'w');
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env },
    windowsHide: true, stdio: ['ignore', output, output] });
  fs.closeSync(output);
  child.on('error', (error) => { child.launchError = error; });
  childProcesses.push(child);
  return child;
}
async function waitForService(port, child, name) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.launchError) throw child.launchError;
    if (child.exitCode !== null) throw new Error(`${name} exited: inspect ${name}.log`);
    if (await portOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out starting ${name}`);
}
async function apiRequest(method, route, body, token) {
  const response = await fetch(`${api}${route}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  assert.ok(response.ok, `Synthetic data setup failed at ${route}: HTTP ${response.status}`);
  return data;
}
async function capture(filename) {
  // A brief observation pause makes the headed browser's progress visible.
  // Assertions use explicit waits; this pause is only for evidence capture.
  await driver.sleep(650);
  const fullPath = path.join(screenshots, `${filename}.png`);
  fs.writeFileSync(fullPath, await driver.takeScreenshot(), 'base64');
  captureRecords.push({ file: `screenshots/${filename}.png`, at: new Date().toISOString(),
    title: await driver.getTitle(), url: await driver.getCurrentUrl(),
    sha256: createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex') });
  return fullPath;
}

// Reuses open() and searchCrop() from the repository's existing POM.
// Login is scoped to the actual modal because the landing page also has a form.
class SeleniumPage extends SmartGrowMarketplacePage {
  constructor(browser) { super(browser); this.baseUrl = frontend; }
  async login(locatorApi, email, secret) {
    const emailInput = await driver.findElement(locatorApi.css('.auth-card input[type="email"]'));
    const passwordInput = await driver.findElement(locatorApi.css('.auth-card input[type="password"]'));
    await emailInput.clear(); await emailInput.sendKeys(email);
    await passwordInput.clear(); await passwordInput.sendKeys(secret);
    await driver.findElement(locatorApi.css('.auth-card button[type="submit"]')).click();
  }
  async fresh() {
    await this.open(By);
    await driver.executeScript('window.localStorage.clear()');
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.xpath("//header//button[.//span[normalize-space(.)='Login']]")), 20000);
  }
  async openLogin() {
    await driver.findElement(By.xpath("//header//button[.//span[normalize-space(.)='Login']]")).click();
    await driver.wait(until.elementIsVisible(await driver.findElement(By.css('.auth-card'))), 10000);
  }
  async signedIn() {
    await this.fresh(); await this.openLogin();
    await this.login(By, account.email, password);
    await driver.wait(until.elementLocated(By.xpath("//h2[normalize-space(.)='Greenhouse Actuator Matrix']")), 15000);
  }
  async marketplace() {
    await driver.findElement(By.xpath("//button[normalize-space(.)='Crop Marketplace']")).click();
    await driver.wait(until.elementLocated(By.css('input[placeholder="Search crop, grower or place"]')), 15000);
    await driver.wait(async () => (await driver.findElements(By.xpath("//h3[normalize-space(.)='QA Selenium Peppers']"))).length === 1, 15000);
  }
  async peppers() {
    await this.searchCrop(By, 'QA Selenium Peppers');
    await driver.wait(async () => (await driver.findElements(By.xpath("//h3[normalize-space(.)='QA Selenium Lettuce']"))).length === 0, 10000);
  }
  async amount(label) {
    return driver.findElement(By.xpath(`//span[normalize-space(.)='${label}']/following-sibling::span`)).getText();
  }
  async waitAmount(label, expected) {
    await driver.wait(async () => (await this.amount(label)) === expected, 15000,
      `${label} should display ${expected}`);
  }
}

async function runCase(id, title, expected, execute) {
  const startedAt = new Date().toISOString();
  const firstCapture = captureRecords.length;
  log(`RUN  ${id}  ${title}`);
  try {
    const actual = await execute();
    results.push({ id, title, expected, actual, status: 'PASS', startedAt, finishedAt: new Date().toISOString(),
      screenshots: captureRecords.slice(firstCapture).map((item) => item.file) });
    log(`PASS ${id}  ${actual}`);
  } catch (error) {
    try { await capture(`${id}_99_failure`); } catch {}
    results.push({ id, title, expected, actual: error.message, status: 'FAIL', startedAt,
      finishedAt: new Date().toISOString(), screenshots: captureRecords.slice(firstCapture).map((item) => item.file) });
    log(`FAIL ${id}  ${error.message}`);
  }
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }

function writeReports(setupError) {
  const passed = results.filter((item) => item.status === 'PASS').length;
  const failed = results.filter((item) => item.status === 'FAIL').length;
  const blocked = results.filter((item) => item.status === 'BLOCKED').length;
  const summary = { runId, headed: !headless, passed, failed, blocked, total: results.length,
    frontend, backend: api, database: `mongodb://127.0.0.1:${dbPort}/smartgrow_selenium_${runId.replace(/\W/g, '_')}`,
    node: process.version, selenium: require('selenium-webdriver/package.json').version,
    browser: capabilities, setupError: setupError?.message || null,
    existingPageObject: 'backend/tests/ui/selenium_marketplace.test.js',
    data: 'Fresh isolated mongod; synthetic farmer and crops; no production database or physical actuator',
    testResults: results };
  fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(evidence, 'screenshot-manifest.json'), JSON.stringify(captureRecords, null, 2));
  const table = ['| Test ID | Expected result | Actual result | Status |', '|---|---|---|---|',
    ...results.map((item) => `| ${item.id} | ${item.expected.replace(/\|/g, '/')} | ${item.actual.replace(/\r?\n/g, ' ').replace(/\|/g, '/')} | ${item.status} |`)].join('\n');
  const markdown = `# SmartGrow Selenium UI Test Report — Section 3.6\n\n` +
    `Execution: ${runId} (UTC). Browser: ${capabilities?.browserName || 'unavailable'} ${capabilities?.browserVersion || ''}, ${headless ? 'headless' : 'headed'} mode.\n\n` +
    `Actual result: **${passed} PASS / ${failed} FAIL / ${blocked} BLOCKED** (${results.length} cases).\n\n` + table +
    `\n\nThe browser used the real React/Vite frontend, Express routes, and a separate MongoDB process on port ${dbPort}. ` +
    `Synthetic data was created through actual registration and product APIs. Existing Selenium POM methods were reused.\n\n` +
    `## Evidence\n\n[Actual terminal transcript](terminal-output.txt) · [Terminal screenshot](terminal-results.png) · [Machine-readable results](results.json) · [Screenshot timestamps and hashes](screenshot-manifest.json)\n\n` +
    results.map((item) => `### ${item.id}: ${item.title}\n\n` + item.screenshots.map((file) => `![${file}](${file})`).join('\n\n')).join('\n\n') +
    `\n\n## Limits\n\nEight focused UI cases on one installed Chrome version. These results do not establish complete regression coverage, cross-browser compatibility, security, or a GitHub Actions run. ` +
    `The required-field case records native HTML validity and an actual form screenshot; Chrome may omit its native validation tooltip from a WebDriver screenshot. ` +
    `No GitHub upload, commit, or push was performed.\n`;
  fs.writeFileSync(path.join(evidence, 'REPORT.md'), markdown);
  const rows = results.map((item) => `<tr><td>${item.id}</td><td>${escapeHtml(item.expected)}</td><td>${escapeHtml(item.actual)}</td><td class="${item.status}">${item.status}</td></tr>`).join('');
  const gallery = results.map((item) => `<h2>${item.id}: ${escapeHtml(item.title)}</h2>` + item.screenshots.map((file) => `<figure><a href="${file}"><img src="${file}" alt="${escapeHtml(file)}"></a><figcaption>${escapeHtml(file)}</figcaption></figure>`).join('')).join('');
  fs.writeFileSync(path.join(evidence, 'REPORT.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>SmartGrow Selenium 3.6</title><style>body{font:16px/1.5 system-ui;max-width:1200px;margin:32px auto;padding:0 24px;color:#18352c}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:10px;text-align:left}.PASS{color:#136b34}.FAIL,.BLOCKED{color:#a52020}img{max-width:100%;border:1px solid #ddd}figure{margin:24px 0}figcaption{font-size:13px}</style><h1>SmartGrow Selenium UI Test Report — 3.6</h1><p>${runId} UTC · Headed Chrome ${escapeHtml(capabilities?.browserVersion || 'unavailable')}</p><p><b>${passed} PASS / ${failed} FAIL / ${blocked} BLOCKED</b></p><table><tr><th>Test ID</th><th>Expected</th><th>Actual</th><th>Status</th></tr>${rows}</table><p><a href="terminal-output.txt">Terminal transcript</a> · <a href="terminal-results.png">Actual terminal screenshot</a> · <a href="results.json">JSON results</a></p>${gallery}</html>`);
  fs.writeFileSync(path.join(evidence, 'junit.xml'), `<?xml version="1.0" encoding="UTF-8"?><testsuite name="SmartGrow Selenium" tests="${results.length}" failures="${failed}" skipped="${blocked}">${results.map((item) => `<testcase classname="SmartGrow.UI" name="${item.id}: ${escapeHtml(item.title)}">${item.status === 'FAIL' ? `<failure message="${escapeHtml(item.actual)}"/>` : item.status === 'BLOCKED' ? `<skipped message="${escapeHtml(item.actual)}"/>` : ''}</testcase>`).join('')}</testsuite>`);
  if (headless) {
    const htmlPath = path.join(evidence, 'REPORT.html');
    fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, 'utf8').replace('Headed Chrome', 'Headless Chrome').replace('<a href="terminal-results.png">Actual terminal screenshot</a> · ', ''));
    const mdPath = path.join(evidence, 'REPORT.md');
    fs.writeFileSync(mdPath, fs.readFileSync(mdPath, 'utf8').replace('[Terminal screenshot](terminal-results.png) · ', ''));
  }
  fs.writeFileSync(path.join(section, 'LATEST_RUN.txt'), path.relative(section, evidence).replace(/\\/g, '/') + '\n');
}

async function main() {
  let setupError;
  try {
    log(`SMARTGROW SELENIUM — SECTION 3.6 — ACTUAL ${headless ? 'HEADLESS' : 'HEADED'} EXECUTION`);
    log(`Run ${runId} UTC | Node ${process.version}`);
    for (const port of [5001, 3000, ...(useMongoService ? [] : [dbPort])]) assert.equal(await portOpen(port), false, `Port ${port} is occupied; existing services will not be reused or stopped`);
    if (useMongoService) {
      assert.equal(await portOpen(dbPort), true, `CI MongoDB service must listen on loopback port ${dbPort}`);
    } else {
      const dbPath = path.join(runtime, 'mongodb'); fs.mkdirSync(dbPath);
      const database = launch(process.env.QA_MONGOD || (process.platform === 'win32' ? 'C:\\Program Files\\MongoDB\\Server\\9.0\\bin\\mongod.exe' : 'mongod'),
        ['--dbpath', dbPath, '--port', String(dbPort), '--bind_ip', '127.0.0.1'], root, {}, 'mongodb');
      await waitForService(dbPort, database, 'mongodb');
    }
    const backend = launch(process.execPath, ['server.js'], path.join(root, 'backend'), {
      MONGO_URI: `mongodb://127.0.0.1:${dbPort}/smartgrow_selenium_${runId.replace(/\W/g, '_')}`,
      PORT: '5001', JWT_SECRET: randomBytes(32).toString('hex'), DOTENV_CONFIG_QUIET: 'true',
    }, 'backend');
    await waitForService(5001, backend, 'backend');
    const frontendServer = launch(process.execPath, [path.join(root, 'frontend/node_modules/vite/bin/vite.js'),
      '--host', '127.0.0.1', '--port', '3000', '--strictPort'], path.join(root, 'frontend'), {}, 'frontend');
    await waitForService(3000, frontendServer, 'frontend');
    const backendReady = await fetch(api, { signal: AbortSignal.timeout(15000) });
    assert.equal(backendReady.status, 200);
    assert.equal(await backendReady.text(), 'Greenhouse Monitoring API is running...');
    const frontendReady = await fetch(frontend, { signal: AbortSignal.timeout(15000) });
    assert.equal(frontendReady.status, 200);
    fs.writeFileSync(path.join(evidence, 'service-readiness.json'), JSON.stringify({
      backend: { url: api, status: backendReady.status }, frontend: { url: frontend, status: frontendReady.status },
      database: { host: '127.0.0.1', port: dbPort, mode: useMongoService ? 'isolated CI service' : 'isolated local mongod' },
    }, null, 2));
    const registration = await apiRequest('POST', '/api/auth/register', account);
    const created = [];
    for (const [name, category, price] of [['QA Selenium Peppers', 'Vegetables', 4.5], ['QA Selenium Lettuce', 'Leafy Greens', 2]]) {
      const product = await apiRequest('POST', '/api/products', { name, category, description: 'Synthetic crop for Selenium UI execution',
        price, quantity: 25, unit: 'kg', location: account.location }, registration.token);
      created.push({ name, id: product.data._id, price });
    }
    await apiRequest('POST', '/api/sensors', { temperature: 26, humidity: 65, soilMoisture: 45, lightLevel: 650 });
    fs.writeFileSync(path.join(evidence, 'synthetic-data.json'), JSON.stringify({ account: { username: account.username, email: account.email, role: account.role }, products: created }, null, 2));
    process.env.SE_CACHE_PATH = path.join(section, '.runtime', 'selenium-cache');
    const browserLogs = new logging.Preferences(); browserLogs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    const options = new chrome.Options().setChromeBinaryPath(process.env.QA_CHROME || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome'))
      .addArguments('--start-maximized', '--no-first-run', '--no-default-browser-check', '--disable-search-engine-choice-screen',
        `--user-data-dir=${path.join(runtime, 'chrome-profile')}`)
      .setLoggingPrefs(browserLogs);
    if (headless) options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.manage().window().setRect({ x: 0, y: 0, width: 1440, height: 1000 });
    const caps = await driver.getCapabilities();
    capabilities = { browserName: caps.get('browserName'), browserVersion: caps.get('browserVersion'), platformName: caps.get('platformName'),
      chromedriverVersion: caps.get('chrome')?.chromedriverVersion };
    page = new SeleniumPage(driver);
    log(`${headless ? 'Headless' : 'Visible'} browser: ${capabilities.browserName} ${capabilities.browserVersion}`);

    await runCase('SEL-01', 'Login form validation', 'Empty email is required; malformed email is rejected; session remains signed out.', async () => {
      await page.fresh(); await capture('SEL-01_01_landing_page');
      await page.openLogin(); await capture('SEL-01_02_empty_login_form');
      await driver.findElement(By.css('.auth-card button[type="submit"]')).click();
      const empty = await driver.executeScript("const e=document.querySelector('.auth-card input[type=email]');return {valueMissing:e.validity.valueMissing,message:e.validationMessage,formValid:e.form.checkValidity()}");
      assert.equal(empty.valueMissing, true); assert.equal(empty.formValid, false);
      await capture('SEL-01_03_required_email_validation');
      await driver.findElement(By.css('.auth-card input[type="email"]')).sendKeys('not-an-email');
      await driver.findElement(By.css('.auth-card input[type="password"]')).sendKeys('InvalidSynthetic!1');
      await driver.findElement(By.css('.auth-card button[type="submit"]')).click();
      const malformed = await driver.executeScript("const e=document.querySelector('.auth-card input[type=email]');return {typeMismatch:e.validity.typeMismatch,message:e.validationMessage,formValid:e.form.checkValidity()}");
      assert.equal(malformed.typeMismatch, true); assert.equal(malformed.formValid, false);
      assert.equal(await driver.executeScript('return localStorage.getItem("token")'), null);
      fs.writeFileSync(path.join(evidence, 'SEL-01-validation.json'), JSON.stringify({ empty, malformed }, null, 2));
      await capture('SEL-01_04_invalid_email_validation');
      return 'Required and malformed email checks both rejected submission; no session token was created.';
    });
    await runCase('SEL-02', 'Invalid credentials', 'A wrong password displays Invalid credentials and creates no session.', async () => {
      await page.fresh(); await page.openLogin(); await capture('SEL-02_01_login_before_attempt');
      await page.login(By, account.email, 'WrongSynthetic!123');
      await driver.wait(until.elementLocated(By.css('.auth-error')), 10000);
      assert.equal(await driver.findElement(By.css('.auth-error')).getText(), 'Invalid credentials');
      assert.equal(await driver.executeScript('return localStorage.getItem("token")'), null);
      await capture('SEL-02_02_invalid_credentials_message');
      return 'The real login API error appeared as Invalid credentials; user stayed signed out.';
    });
    await runCase('SEL-03', 'Successful farmer login', 'Valid synthetic credentials open the farmer dashboard with the correct username.', async () => {
      await page.fresh(); await page.openLogin(); await capture('SEL-03_01_login_form_before_submit');
      await page.login(By, account.email, password);
      await driver.wait(until.elementLocated(By.xpath("//h2[normalize-space(.)='Greenhouse Actuator Matrix']")), 15000);
      const user = await driver.executeScript('return JSON.parse(localStorage.getItem("user"))');
      assert.equal(user.username, account.username); assert.equal(user.role, 'farmer');
      assert.equal(await driver.findElement(By.xpath("//button[normalize-space(.)='Smart Greenhouse']")).isDisplayed(), true);
      await capture('SEL-03_02_successful_login_dashboard');
      if (!headless && process.platform === 'win32') {
        const desktopCapture = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
          path.join(section, 'scripts/capture-desktop.ps1'), '-OutputPath', path.join(screenshots, 'SEL-03_03_headed_browser_desktop.png')], { windowsHide: true });
        if (desktopCapture.status !== 0) log('Desktop screenshot unavailable; the WebDriver screenshots are preserved.');
      }
      return 'Valid login opened the Smart Greenhouse dashboard and stored the expected farmer identity.';
    });
    await runCase('SEL-04', 'Module navigation and persisted crop search', 'Crop Marketplace opens and searching Peppers filters out the synthetic Lettuce crop.', async () => {
      await page.signedIn(); await page.marketplace(); await capture('SEL-04_01_marketplace_navigation');
      await page.peppers();
      assert.equal(await driver.findElement(By.xpath("//h3[normalize-space(.)='QA Selenium Peppers']")).isDisplayed(), true);
      assert.equal((await driver.findElements(By.xpath("//h3[normalize-space(.)='QA Selenium Lettuce']"))).length, 0);
      await capture('SEL-04_02_search_filtered_database_crop');
      return 'Crop Marketplace navigation succeeded; the database-backed Peppers card remained and Lettuce was filtered out.';
    });
    await runCase('SEL-05', 'Basket quantity and delivery/pickup totals', 'Two kg at $4.50 show $9.00 subtotal, $11.50 with delivery, and $9.00 with farm pickup.', async () => {
      await page.signedIn(); await page.marketplace(); await page.peppers();
      await driver.findElement(By.xpath("//button[normalize-space(.)='Add to cart']")).click();
      await driver.wait(until.elementLocated(By.xpath("//button[.//span[normalize-space(.)='Basket (1)']]")), 10000);
      await capture('SEL-05_01_crop_added_to_basket');
      await driver.findElement(By.xpath("//button[.//span[normalize-space(.)='Basket (1)']]")).click();
      await page.waitAmount('Produce subtotal', '$4.50');
      await driver.findElement(By.css('button[title="Increase"]')).click();
      await page.waitAmount('Produce subtotal', '$9.00'); await page.waitAmount('Total', '$11.50');
      assert.equal(await page.amount('Delivery charge'), '$2.50');
      await capture('SEL-05_02_two_kg_delivery_total');
      await driver.findElement(By.xpath("//span[normalize-space(.)='Farm Pickup']")).click();
      await page.waitAmount('Delivery charge', 'Free'); await page.waitAmount('Produce subtotal', '$9.00'); await page.waitAmount('Total', '$9.00');
      await capture('SEL-05_03_farm_pickup_total');
      return 'Quantity 2 produced $9.00 subtotal, $11.50 delivery total, and $9.00 pickup total in the actual basket.';
    });
    await runCase('SEL-06', 'Registration validation and successful customer registration', 'A weak password is rejected; valid customer registration succeeds and opens the dashboard.', async () => {
      await page.fresh(); await page.openLogin();
      await driver.findElement(By.xpath("//button[normalize-space(.)='Register Here']")).click();
      const fields = { username: customerName, email: `${customerName}@example.invalid`, password: 'weakpass', phoneNumber: '0770000000', location: 'Synthetic Selenium Customer Farm' };
      for (const [name, value] of Object.entries(fields)) await driver.findElement(By.css(`.auth-card input[name="${name}"]`)).sendKeys(value);
      await driver.findElement(By.css('.auth-card select[name="role"] option[value="customer"]')).click();
      await capture('SEL-06_01_registration_form_before_submit');
      await driver.findElement(By.css('.auth-card button[type="submit"]')).click();
      await driver.wait(until.elementLocated(By.css('.auth-error')), 10000);
      assert.match(await driver.findElement(By.css('.auth-error')).getText(), /uppercase/i);
      assert.equal(await driver.executeScript('return localStorage.getItem("token")'), null);
      await capture('SEL-06_02_weak_password_rejected');
      const input = await driver.findElement(By.css('.auth-card input[name="password"]'));
      await input.clear(); await input.sendKeys(password);
      await capture('SEL-06_03_valid_registration_before_submit');
      await driver.findElement(By.css('.auth-card button[type="submit"]')).click();
      await driver.wait(until.elementLocated(By.xpath(`//header//span[normalize-space(.)='Hi, ${customerName}']`)), 15000);
      const user = await driver.executeScript('return JSON.parse(localStorage.getItem("user"))');
      assert.equal(user.username, customerName); assert.equal(user.role, 'customer');
      await capture('SEL-06_04_customer_registration_success');
      return 'Weak password displayed the uppercase-letter validation message; valid registration created and signed in the synthetic customer.';
    });
    await runCase('SEL-07', 'Unauthorized customer access', 'A customer cannot see Farmer studio and receives 403 for farmer product and administrator APIs.', async () => {
      const user = await driver.executeScript('return JSON.parse(localStorage.getItem("user"))');
      assert.equal(user.role, 'customer', 'The authorization check requires the customer registered in SEL-06');
      await page.marketplace();
      assert.equal((await driver.findElements(By.xpath("//button[normalize-space(.)='Farmer studio']"))).length, 0);
      await capture('SEL-07_01_customer_marketplace_without_farmer_studio');
      const statuses = await driver.executeAsyncScript(`const done=arguments[arguments.length-1];Promise.all(['/products/farmer/my-products','/admin/expertconnect/stats'].map(async route => ({route,status:(await fetch('${api}/api'+route,{headers:{Authorization:'Bearer '+localStorage.getItem('token')}})).status}))).then(done).catch(error=>done({error:error.message}));`);
      assert.ok(Array.isArray(statuses)); assert.deepEqual(statuses.map((item) => item.status), [403, 403]);
      fs.writeFileSync(path.join(evidence, 'SEL-07-authorization-assertions.json'), JSON.stringify(statuses, null, 2));
      await capture('SEL-07_02_after_real_access_denial_assertions');
      return 'Farmer studio was absent for the customer; real browser requests to farmer and administrator endpoints both returned HTTP 403.';
    });
    await runCase('SEL-08', 'Logout clears the session', 'Logout restores the landing Login button and removes the stored token and user.', async () => {
      await page.signedIn(); await capture('SEL-08_01_authenticated_before_logout');
      await driver.findElement(By.css('header button[title="Logout"]')).click();
      await driver.wait(until.elementLocated(By.xpath("//header//button[.//span[normalize-space(.)='Login']]")), 10000);
      const stored = await driver.executeScript('return {token:localStorage.getItem("token"),user:localStorage.getItem("user")}');
      assert.deepEqual(stored, { token: null, user: null });
      await capture('SEL-08_02_logged_out_landing_page');
      return 'Logout returned to the landing page with Login visible and both session values removed.';
    });
  } catch (error) {
    setupError = error; log(`BLOCKED setup: ${error.message}`);
    for (let index = results.length + 1; index <= 8; index++) results.push({ id: `SEL-0${index}`, title: 'Not reached',
      expected: 'Execute the planned browser case.', actual: `Setup blocked: ${error.message}`, status: 'BLOCKED', screenshots: [] });
  } finally {
    if (driver) {
      try { fs.writeFileSync(path.join(evidence, 'browser-console.json'), JSON.stringify(await driver.manage().logs().get(logging.Type.BROWSER), null, 2)); } catch {}
      await driver.quit().catch(() => {});
    }
    for (const child of childProcesses.reverse()) {
      if (child.exitCode === null && !child.launchError) {
        child.kill();
        await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 3000))]);
      }
    }
    writeReports(setupError);
    log(''); log('ACTUAL FINAL SELENIUM RESULTS');
    for (const result of results) log(`${result.id} | ${result.status.padEnd(7)} | ${result.title}`);
    log(`TOTAL: ${results.filter((item) => item.status === 'PASS').length} PASS / ${results.filter((item) => item.status === 'FAIL').length} FAIL / ${results.filter((item) => item.status === 'BLOCKED').length} BLOCKED`);
    log(`Screenshots captured during execution: ${captureRecords.length}`);
    log(`Evidence: ${evidence}`);
    log('Local test processes stopped. No GitHub operations performed.');
    process.exitCode = results.every((item) => item.status === 'PASS') ? 0 : 1;
  }
}
main().catch((error) => { log(error.stack || error.message); process.exitCode = 1; });

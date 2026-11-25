const fs = require('node:fs');
const path = require('node:path');
const section = path.resolve(__dirname, '..');
const latest = path.join(section, 'LATEST_RUN.txt');
const latestRun = fs.existsSync(latest) ? fs.readFileSync(latest, 'utf8').trim() : '';
if (!latestRun || (process.env.GITHUB_ACTIONS === 'true' && !latestRun.startsWith('evidence/ci/'))) {
  const message = 'NOT EXECUTED: Selenium did not reach this workflow run. Inspect the dependency, build, and service startup logs.';
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
} else {
  const run = path.join(section, latestRun);
  const result = JSON.parse(fs.readFileSync(path.join(run, 'results.json'), 'utf8'));
  const summary = `## SmartGrow Selenium\n\n${result.passed} PASS / ${result.failed} FAIL / ${result.blocked} BLOCKED\n\n` +
    '| Test | Status | Scenario |\n|---|---|---|\n' +
    result.testResults.map((item) => `| ${item.id} | ${item.status} | ${item.title} |`).join('\n') +
    '\n\nScreenshots, JUnit XML, JSON, HTML, and logs are in the workflow artifact.\n';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

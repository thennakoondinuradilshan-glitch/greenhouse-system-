// Capture an actual command, its streams, exit status, and source fingerprints.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const [outputDir, command, ...args] = process.argv.slice(2);
if (!outputDir || !command) throw new Error('Usage: node qa/scripts/run-check.cjs <evidence-directory> <command> [args...]');
const directory = path.resolve(outputDir);
fs.mkdirSync(directory, { recursive: true });
const start = new Date().toISOString();
const sourceFiles = ['backend/routes/authRoutes.js', 'backend/server.js', 'backend/routes/cartRoutes.js', 'backend/routes/deviceRoutes.js'];
const fingerprints = Object.fromEntries(sourceFiles.map((file) => [file,
  createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const stdout = fs.createWriteStream(path.join(directory, 'stdout.txt'));
const stderr = fs.createWriteStream(path.join(directory, 'stderr.txt'));
const child = spawn(command, args, { windowsHide: true, env: { ...process.env, QA_EVIDENCE_DIR: directory } });
child.stdout.on('data', (data) => { stdout.write(data); process.stdout.write(data); });
child.stderr.on('data', (data) => { stderr.write(data); process.stderr.write(data); });
child.on('error', (error) => { stderr.write(error.message); });
child.on('close', (code) => {
  stdout.end(); stderr.end();
  fs.writeFileSync(path.join(directory, 'execution.json'), JSON.stringify({
    command: [command, ...args], workingDirectory: process.cwd(), startedAt: start,
    finishedAt: new Date().toISOString(), exitCode: code, node: process.version, sourceSha256: fingerprints,
  }, null, 2));
  process.exitCode = code === null ? 1 : code;
});

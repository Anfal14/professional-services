// Starts the whole platform in one go: Postgres + Redis (Docker), the Spring Boot backend, and the
// customer, vendor and admin web apps pointed at it. Ctrl+C stops the backend and apps; the
// database keeps running (and keeps its data) — `npm run backend:down` stops it.
//
//   npm run dev          everything, apps on the real backend
//   npm run dev:mock     only the three apps, on the offline mock (no Docker or Java needed)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';
const mock = process.argv.includes('--mock');
const API_URL = 'http://localhost:8080';

const APPS = [
  { name: 'customer', port: 8081, color: 36 },
  { name: 'vendor', port: 8082, color: 35 },
  { name: 'admin', port: 8083, color: 33 },
];

const paint = (color, text) => `\x1b[${color}m${text}\x1b[0m`;
const say = (text) => console.log(paint(32, `[dev] ${text}`));
const fail = (text) => {
  console.error(paint(31, `[dev] ${text}`));
  stopAll(1);
};

const children = [];

/** Runs a long-lived command, prefixing each output line with its name. */
function run(name, color, command, args, env = {}) {
  const child = spawn(command, args, { cwd: root, shell: win, env: { ...process.env, FORCE_COLOR: '1', ...env } });
  const prefix = paint(color, `[${name}]`.padEnd(11));
  for (const stream of [child.stdout, child.stderr]) {
    let pending = '';
    stream.on('data', (chunk) => {
      const lines = (pending + chunk).split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) if (line.trim()) console.log(`${prefix}${line}`);
    });
  }
  child.on('exit', (code) => {
    if (!stopping) console.log(`${prefix}${paint(31, `exited (${code ?? 'killed'})`)}`);
  });
  children.push(child);
  return child;
}

let stopping = false;
function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // Maven starts Java and Expo starts Metro as grandchildren, so kill the whole tree.
    if (win) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGINT');
  }
  if (!mock && code === 0) say('Stopped. Postgres and Redis are still running — `npm run backend:down` stops them.');
  process.exit(code);
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

const portInUse = (port) =>
  new Promise((done) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => (socket.destroy(), done(true)));
    socket.once('error', () => done(false));
  });

async function backendHealthy() {
  try {
    const res = await fetch(`${API_URL}/actuator/health`);
    return res.ok && (await res.json()).status === 'UP';
  } catch {
    return false;
  }
}

/** Docker Desktop adds `docker` to PATH, but a terminal opened before installing it won't have it yet. */
function dockerCommand() {
  if (spawnSync('docker', ['--version'], { shell: win, stdio: 'ignore' }).status === 0) return 'docker';
  const desktop = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
  if (win && existsSync(desktop)) return `"${desktop}"`;
  return null;
}

async function startBackend() {
  if (await backendHealthy()) {
    say(`Backend already running at ${API_URL} — using it.`);
    return;
  }

  const docker = dockerCommand();
  if (!docker) fail('Docker not found. Install Docker Desktop, or run `npm run dev:mock` for the offline demo.');
  say('Starting Postgres + Redis (Docker)…');
  const up = spawnSync(docker, ['compose', '-f', 'backend/docker-compose.yml', 'up', '-d', '--wait'], { cwd: root, shell: win, stdio: 'inherit' });
  if (up.status !== 0) fail('Could not start the database containers. Is Docker Desktop open and running?');

  say('Starting the backend (first run downloads Maven dependencies and can take a few minutes)…');
  const backend = run('backend', 34, 'node', ['backend/scripts/mvnw.mjs', 'spring-boot:run']);
  const started = Date.now();
  while (!(await backendHealthy())) {
    if (backend.exitCode !== null) fail('The backend stopped while starting — see the [backend] lines above.');
    if (Date.now() - started > 10 * 60_000) fail('The backend did not become healthy within 10 minutes.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  say(`Backend ready at ${API_URL} (API docs: ${API_URL}/swagger-ui.html)`);
}

async function startApps() {
  // An empty value overrides any .env.local, so --mock always means the mock.
  const env = { EXPO_PUBLIC_API_URL: mock ? '' : API_URL };
  for (const app of APPS) {
    if (await portInUse(app.port)) {
      say(`Port ${app.port} is busy — assuming the ${app.name} app is already running there; skipping it.`);
      continue;
    }
    run(app.name, app.color, 'npm', ['run', 'web', '--workspace', `@profecian/${app.name}`], env);
  }
}

if (!mock) await startBackend();
await startApps();
say(
  [
    `Apps (${mock ? 'offline mock' : 'real backend'}) — they open in your browser once bundled:`,
    ...APPS.map((a) => `  ${a.name.padEnd(9)} http://localhost:${a.port}`),
    'Press Ctrl+C to stop.',
  ].join('\n'),
);

// Runs the Maven wrapper from npm scripts on any OS (cmd.exe can't run ./mvnw).
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = resolve(backend, process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw');
const result = spawnSync(wrapper, process.argv.slice(2), { cwd: backend, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);

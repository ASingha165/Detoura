import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_PORT = 8000;
const BACKEND_HOST = '127.0.0.1';

// Check if backend is already healthy
function isBackendHealthy() {
  return new Promise((resolve) => {
    const req = http.get(`http://${BACKEND_HOST}:${BACKEND_PORT}/health`, { timeout: 1500 }, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Find Python executable in backend virtual environment
function findBackendPython() {
  const candidates = [
    path.join(__dirname, 'detoura-ml', '.venv312', 'Scripts', 'python.exe'),
    path.join(__dirname, 'detoura-ml', '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, 'detoura-ml', '.venv312', 'bin', 'python'),
    path.join(__dirname, 'detoura-ml', '.venv', 'bin', 'python'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return 'python';
}

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
    } catch {}
  } else {
    try {
      proc.kill('SIGTERM');
    } catch {}
  }
}

async function main() {
  console.log('====================================================');
  console.log('  DETOURA Local Unified Development Server Launcher');
  console.log('====================================================\n');

  let backendProc = null;
  const isHealthy = await isBackendHealthy();

  if (isHealthy) {
    console.log(`[DETOURA] Backend already active at http://${BACKEND_HOST}:${BACKEND_PORT} (health check OK).`);
  } else {
    const pythonExe = findBackendPython();
    console.log(`[DETOURA] Starting backend using: ${pythonExe}`);
    backendProc = spawn(
      pythonExe,
      ['-m', 'uvicorn', 'app:app', '--host', BACKEND_HOST, '--port', String(BACKEND_PORT), '--reload'],
      {
        cwd: path.join(__dirname, 'detoura-ml'),
        stdio: 'inherit',
        shell: false
      }
    );

    backendProc.on('error', (err) => {
      console.error(`[DETOURA] Failed to start backend: ${err.message}`);
    });

    backendProc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[DETOURA] Backend exited with code ${code}`);
      }
    });
  }

  const isWin = process.platform === 'win32';
  const frontendProc = isWin
    ? spawn('npm --prefix detoura-frontend run dev', {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      })
    : spawn('npm', ['--prefix', 'detoura-frontend', 'run', 'dev'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: false
      });

  frontendProc.on('error', (err) => {
    console.error(`[DETOURA] Failed to start frontend: ${err.message}`);
  });

  const cleanup = () => {
    console.log('\n[DETOURA] Shutting down services...');
    if (frontendProc) killProcess(frontendProc);
    if (backendProc) killProcess(backendProc);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

main().catch((err) => {
  console.error('[DETOURA] Startup error:', err);
  process.exit(1);
});

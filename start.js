const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const isWin = os.platform() === 'win32';
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[36m%s\x1b[0m', '           INICIANDO DISCFINANCI (BACKEND + FRONTEND)           ');
console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('  Backend:  \x1b[33mhttp://127.0.0.1:8002\x1b[0m (Swagger: /docs)');
console.log('  Frontend: \x1b[32mhttp://127.0.0.1:3002\x1b[0m');
console.log('\x1b[36m%s\x1b[0m', '================================================================\n');

// 0. Liberar portas 8002 e 3002 se estiverem presas por processos anteriores
function freePorts() {
  if (!isWin) return;
  try {
    const cmd = 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8002,3002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"';
    const output = execSync(cmd).toString().trim();
    if (output) {
      const pids = output.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && s !== '0');
      for (const p of pids) {
        console.log(`\x1b[33m[SISTEMA]\x1b[0m Liberando porta ocupada pelo PID ${p}...`);
        try {
          execSync(`taskkill /pid ${p} /t /f`);
        } catch {}
      }
    }
  } catch {}
}

freePorts();

const pyExe = isWin
  ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
  : path.join(backendDir, 'venv', 'bin', 'python');
const npmCmd = isWin ? 'npm.cmd' : 'npm';

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

// 1. Iniciar Backend com Auto-Restart em caso de queda
function startBackend() {
  if (isShuttingDown) return;
  console.log('\x1b[34m[SISTEMA]\x1b[0m Iniciando Backend FastAPI na porta 8002...');
  backendProcess = spawn(pyExe, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8002', '--reload'], {
    cwd: backendDir,
    stdio: 'pipe',
  });

  backendProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((l) => {
      if (l.trim()) console.log('\x1b[33m[BACKEND]\x1b[0m ' + l.trim());
    });
  });

  backendProcess.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((l) => {
      if (l.trim()) console.log('\x1b[33m[BACKEND]\x1b[0m ' + l.trim());
    });
  });

  backendProcess.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      console.log(`\x1b[31m[BACKEND]\x1b[0m Processo encerrou (código: ${code}, sinal: ${signal}). Reiniciando em 2 segundos...`);
      setTimeout(startBackend, 2000);
    }
  });
}

// 2. Iniciar Frontend com Auto-Restart
function startFrontend() {
  if (isShuttingDown) return;
  console.log('\x1b[34m[SISTEMA]\x1b[0m Iniciando Frontend Vite na porta 3002...');
  frontendProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: frontendDir,
    shell: isWin,
    stdio: 'pipe',
  });

  frontendProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((l) => {
      if (l.trim()) console.log('\x1b[32m[FRONTEND]\x1b[0m ' + l.trim());
    });
  });

  frontendProcess.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((l) => {
      if (l.trim()) console.log('\x1b[32m[FRONTEND]\x1b[0m ' + l.trim());
    });
  });

  frontendProcess.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      console.log(`\x1b[31m[FRONTEND]\x1b[0m Processo encerrou (código: ${code}, sinal: ${signal}). Reiniciando em 2 segundos...`);
      setTimeout(startFrontend, 2000);
    }
  });
}

startBackend();
startFrontend();

// 3. Abrir Navegador após 3.5 segundos
setTimeout(() => {
  console.log('\n\x1b[35m[NAVEGADOR]\x1b[0m Abrindo http://127.0.0.1:3002 no seu navegador...');
  const openCmd = isWin ? 'start http://127.0.0.1:3002' : 'open http://127.0.0.1:3002';
  exec(openCmd, () => {});
}, 3500);

// Gerenciamento de encerramento gracioso (Ctrl+C manual)
function cleanup() {
  isShuttingDown = true;
  console.log('\n\x1b[31m[SISTEMA]\x1b[0m Encerrando DiscFinanci...');
  try {
    if (isWin) {
      if (backendProcess && backendProcess.pid) exec(`taskkill /pid ${backendProcess.pid} /t /f`);
      if (frontendProcess && frontendProcess.pid) exec(`taskkill /pid ${frontendProcess.pid} /t /f`);
    } else {
      if (backendProcess) backendProcess.kill('SIGTERM');
      if (frontendProcess) frontendProcess.kill('SIGTERM');
    }
  } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

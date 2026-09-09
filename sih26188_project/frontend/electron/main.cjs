const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');


let mainWindow = null;
let _backendProcess = null; // Track the spawned uvicorn child process

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// ─── Backend Process Management ──────────────────────────────────────────────

/** Probe GET /api/v1/health — resolves true if the backend is alive */
function isBackendAlive() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/v1/health', { timeout: 1500 }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

/** Poll health every 500ms until alive or timeoutMs exceeded */
function waitForBackend(timeoutMs = 30000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = async () => {
      if (await isBackendAlive()) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(tick, 500);
    };
    tick();
  });
}

/** Spawn uvicorn using the .venv311 or .venv Python in the backend directory */
function spawnUvicorn() {
  if (_backendProcess && !_backendProcess.killed) {
    console.info('[Electron] uvicorn already running (PID', _backendProcess.pid, ')');
    return true;
  }

  // Resolve the project root relative to this file's location
  const projectRoot = path.resolve(__dirname, '..', '..');
  const backendDir = path.join(projectRoot, 'backend');

  // Prefer .venv311, fall back to .venv, fall back to plain python3
  const venv311 = path.join(backendDir, '.venv311', 'bin', 'python');
  const venv = path.join(backendDir, '.venv', 'bin', 'python');
  const pythonBin = fs.existsSync(venv311) ? venv311
    : fs.existsSync(venv) ? venv
    : 'python3';

  console.info('[Electron] Spawning uvicorn with:', pythonBin);

  _backendProcess = spawn(
    pythonBin,
    ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
    {
      cwd: backendDir,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  _backendProcess.stdout.on('data', (d) => process.stdout.write(`[uvicorn] ${d}`));
  _backendProcess.stderr.on('data', (d) => process.stderr.write(`[uvicorn] ${d}`));
  _backendProcess.on('exit', (code) => {
    console.info('[Electron] uvicorn exited with code', code);
    _backendProcess = null;
  });

  return true;
}

// Kill uvicorn when Electron exits
app.on('will-quit', () => {
  if (_backendProcess && !_backendProcess.killed) {
    _backendProcess.kill();
  }
});

function setupAdbReverse() {
  try {
    const cp = spawn('adb', ['reverse', 'tcp:8000', 'tcp:8000'], { stdio: 'ignore' });
    cp.on('error', () => {}); // Silently ignore if adb not found
  } catch {}
}

// IPC handler: renderer calls window.electronAPI.startBackend()
ipcMain.handle('backend:start', async () => {
  const already = await isBackendAlive();
  if (already) {
    setupAdbReverse();
    return 'Backend already running on port 8000';
  }

  spawnUvicorn();

  const cameUp = await waitForBackend(30000);
  if (cameUp) {
    setupAdbReverse();
    return 'Backend started successfully on port 8000';
  }

  throw new Error(
    'Backend did not respond within 30 s. ' +
    'Check that Python and the .venv311 venv exist in the backend/ directory.'
  );
});

// ─────────────────────────────────────────────────────────────────────────────



function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    title: 'Sashastra Seema Bal — Sovereign Document Screening & Biometric Terminal',
    backgroundColor: '#051329',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows local camera stream / local API cross-origin requests on edge workstation
    },
  });

  // Gracefully show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Handle external link clicks securely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  setupAppMenu();
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'SSB Enclave',
            submenu: [
              { role: 'about', label: 'About SSB Document Screening' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide Terminal' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Exit Enclave' },
            ],
          },
        ]
      : []),
    {
      label: 'Screening Operations',
      submenu: [
        {
          label: 'Reload Terminal Deck',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Clear Ingestion Bay',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            mainWindow?.webContents.send('app:clear-bay');
          },
        },
        { type: 'separator' },
        {
          label: 'Companion Device Pairing Center',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.send('app:open-pairing');
          },
        },
        {
          label: 'Audit & Forensics Certificate',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('app:open-audit');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Kiosk / Full Screen Mode' },
        {
          label: 'Toggle Developer Inspector',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Sovereign Enclave',
      submenu: [
        {
          label: 'DPDP Act 2023 Compliance Dossier',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'DPDP Act 2023 Sovereign Security Protocol',
              message: 'Digital Personal Data Protection Act 2023 Compliance',
              detail:
                '1. Ephemeral In-Memory Processing: Zero permanent traveler biometrics stored in volatile memory.\n2. Air-Gapped Operation: Full local edge neural model execution with zero cloud egress.\n3. Cryptographic Tamper Evidence: SHA-256 integrity hashing on all audit ledger certificates.\n4. Section 14 Foreigners Act: Full statutory compliance for border immigration inspection.',
            });
          },
        },
        {
          label: 'Indo-Nepal & Indo-Bhutan Frontier Guard',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sashastra Seema Bal (SSB)',
              message: 'Ministry of Home Affairs • Government of India',
              detail:
                'Motto: सेवा • सुरक्षा • बन्धुत्व (Service, Security, Brotherhood)\nHeadquarters: Force Headquarters, New Delhi\nOperational Area: 1,751 km Indo-Nepal Border & 699 km Indo-Bhutan Border',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

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

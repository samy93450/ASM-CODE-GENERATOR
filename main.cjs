'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function openWindow() {
  const window = new BrowserWindow({
    width: 500,
    height: 1000,
    minWidth: 360,
    minHeight: 530,
    backgroundColor: '#100d09',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'asm-code-generator.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.loadFile('index.html').catch((error) => {
    console.error('Impossible d’ouvrir ASM Code Generator.', error);
    app.exit(1);
  });
}

app.whenReady().then(() => {
  openWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

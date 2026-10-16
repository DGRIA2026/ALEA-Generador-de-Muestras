const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let updateTimer = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.ELECTRON_START_URL;

  if (devUrl) {
    mainWindow.loadURL(devUrl);
    return mainWindow;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  return mainWindow;
}

function setupAutoUpdater(mainWindow) {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error?.message || error);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualizacion disponible',
      message: `La version ${info.version} ya se descargo.`,
      detail: 'Reinicia la aplicacion para instalar la actualizacion.',
      buttons: ['Reiniciar ahora', 'Mas tarde'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('No se pudo verificar actualizaciones:', error?.message || error);
  });

  updateTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Error al consultar actualizaciones:', error?.message || error);
    });
  }, UPDATE_CHECK_INTERVAL_MS);
}

app.whenReady().then(() => {
  const mainWindow = createWindow();
  setupAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

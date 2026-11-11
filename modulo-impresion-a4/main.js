const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: "Ctrl+Geek - Centro de Impresión A4",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // --- INTERCEPTOR DE DESCARGAS SELECTIVAS (Solo PDFs de Producción) ---
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const filename = item.getFilename();

    // Solo interceptar si es un PDF de salida de producción
    if (filename.endsWith('.pdf')) {
      const desktopPath = app.getPath('desktop');
      const folderPath = path.join(desktopPath, 'Diseños Sublimacion');

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, filename);
      item.setSavePath(filePath);
    }
  });
  // ---------------------------------------------------------------------

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
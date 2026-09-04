const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  // Crea la ventana del navegador nativo
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: "Ctrl+Geek - Centro de Impresión A4",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Oculta el menú clásico de "Archivo, Editar, Ver..."
  mainWindow.setMenuBarVisibility(false);

  // --- INTERCEPTOR DE DESCARGAS AUTOMÁTICAS ---
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    // 1. Obtener la ruta del escritorio
    const desktopPath = app.getPath('desktop');
    // 2. Definir la carpeta de destino
    const folderPath = path.join(desktopPath, 'Diseños Sublimacion');

    // 3. Crear la carpeta si no existe
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // 4. Forzar el guardado silencioso en esa carpeta
    const filePath = path.join(folderPath, item.getFilename());
    item.setSavePath(filePath);
  });
  // ---------------------------------------------

  // Carga tu archivo visual
  mainWindow.loadFile('index.html');
}

// Cuando el motor esté listo, abre la ventana
app.whenReady().then(createWindow);

// Cierra el proceso cuando cierras la ventana
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
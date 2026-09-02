const { app, BrowserWindow } = require('electron');

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

  // Oculta el menú clásico de "Archivo, Editar, Ver..." para que luzca como app moderna
  mainWindow.setMenuBarVisibility(false);

  // Carga tu archivo visual
  mainWindow.loadFile('index.html');
}

// Cuando el motor esté listo, abre la ventana
app.whenReady().then(createWindow);

// Cierra el proceso cuando cierras la ventana (Estándar de Windows)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
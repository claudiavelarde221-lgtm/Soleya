const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function crear() {
  const win = new BrowserWindow({
    width: 1100, height: 800, minWidth: 420, minHeight: 600,
    title: 'Soleya', backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'app', 'icons', 'icon-512.png'),
    webPreferences: { contextIsolation: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // Enlaces externos (WhatsApp) se abren en el navegador, no dentro de la app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(crear);
app.on('window-all-closed', () => app.quit());

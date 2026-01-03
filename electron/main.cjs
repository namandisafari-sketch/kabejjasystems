const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#1e3a5f',
        show: false,
        title: 'Kabejja Systems',
        icon: path.join(__dirname, '../build/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    if (isDev) {
        win.loadURL('http://localhost:8080');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    if (!isDev) {
        win.setMenu(null);
    }
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

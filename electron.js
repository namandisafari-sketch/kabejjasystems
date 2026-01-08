const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'electron-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
        icon: path.join(__dirname, 'public/pwa-512x512.png'),
        title: 'Kabejja Biz Track',
        backgroundColor: '#1e3a5f',
        show: false, // Don't show until ready-to-show
    });

    // Show window when ready to prevent flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Register file protocol for production
app.whenReady().then(() => {
    protocol.registerFileProtocol('file', (request, callback) => {
        const pathname = decodeURI(request.url.replace('file:///', ''));
        callback(pathname);
    });

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

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        // Allow localhost and file protocol in development
        if (isDev && (parsedUrl.protocol === 'http:' && parsedUrl.hostname === 'localhost')) {
            return;
        }

        // Block external navigation
        if (parsedUrl.protocol !== 'file:') {
            event.preventDefault();
        }
    });
});

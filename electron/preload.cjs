const { contextBridge, ipcRenderer } = require('electron');

// Briding native features if needed in the future
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    // Add more bridges here as needed
});

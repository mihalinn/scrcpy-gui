const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスに公開するAPI
contextBridge.exposeInMainWorld('api', {
    // scrcpy関連
    checkScrcpy: () => ipcRenderer.invoke('check-scrcpy'),
    downloadScrcpy: () => ipcRenderer.invoke('download-scrcpy'),
    startScrcpy: (options) => ipcRenderer.invoke('start-scrcpy', options),
    stopScrcpy: () => ipcRenderer.invoke('stop-scrcpy'),
    isScrcpyRunning: () => ipcRenderer.invoke('is-scrcpy-running'),

    // ADB関連
    getDevices: () => ipcRenderer.invoke('get-devices'),
    connectTcpip: (ip, port) => ipcRenderer.invoke('connect-tcpip', ip, port),
    disconnectTcpip: (address) => ipcRenderer.invoke('disconnect-tcpip', address),

    // 情報取得
    listEncoders: () => ipcRenderer.invoke('list-encoders'),
    listDisplays: (serial) => ipcRenderer.invoke('list-displays', serial),
    listCameras: (serial) => ipcRenderer.invoke('list-cameras', serial),
    listApps: (serial) => ipcRenderer.invoke('list-apps', serial),

    // ダイアログ
    selectRecordFile: () => ipcRenderer.invoke('select-record-file'),

    // イベントリスナー
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },
    onDownloadStatus: (callback) => {
        ipcRenderer.on('download-status', (event, status) => callback(status));
    },
    onScrcpyOutput: (callback) => {
        ipcRenderer.on('scrcpy-output', (event, output) => callback(output));
    },
    onScrcpyClosed: (callback) => {
        ipcRenderer.on('scrcpy-closed', (event, code) => callback(code));
    },
    onScrcpyError: (callback) => {
        ipcRenderer.on('scrcpy-error', (event, error) => callback(error));
    }
});

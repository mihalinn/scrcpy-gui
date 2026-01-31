// ========================================
// ScrcpyGUI - Renderer Process
// ========================================

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const mainScreen = document.getElementById('main-screen');
const setupStatus = document.getElementById('setup-status');
const setupProgress = document.getElementById('setup-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const setupDownloadBtn = document.getElementById('setup-download-btn');

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const refreshDevicesBtn = document.getElementById('refresh-devices-btn');
const deviceList = document.getElementById('device-list');
const logContent = document.getElementById('log-content');
const clearLogBtn = document.getElementById('clear-log-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalText = document.getElementById('modal-text');
const modalClose = document.querySelector('.modal-close');

// State
let selectedDevice = null;
let isRunning = false;

// ========================================
// Initialization
// ========================================

async function init() {
    // scrcpyの存在確認
    const hasScrcpy = await window.api.checkScrcpy();

    if (hasScrcpy) {
        showMainScreen();
        refreshDevices();
    } else {
        showSetupScreen();
    }

    setupEventListeners();
    setupIpcListeners();
}

function showSetupScreen() {
    setupScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    setupStatus.innerHTML = '<span>scrcpyが見つかりません</span>';
    setupDownloadBtn.style.display = 'inline-flex';
}

function showMainScreen() {
    setupScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Setup screen
    setupDownloadBtn.addEventListener('click', downloadScrcpy);

    // Navigation tabs
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    // Device refresh
    refreshDevicesBtn.addEventListener('click', refreshDevices);

    // TCP/IP connection
    document.getElementById('tcpip-connect-btn').addEventListener('click', connectTcpip);

    // Start/Stop buttons
    startBtn.addEventListener('click', startScrcpy);
    stopBtn.addEventListener('click', stopScrcpy);

    // Record file selection
    document.getElementById('select-record-path-btn').addEventListener('click', async () => {
        const path = await window.api.selectRecordFile();
        if (path) {
            document.getElementById('record-path').value = path;
            document.getElementById('enable-record').checked = true;
        }
    });

    // List buttons
    document.getElementById('list-displays-btn').addEventListener('click', async () => {
        const result = await window.api.listDisplays(selectedDevice?.serial);
        showModal('ディスプレイ一覧', result.output);
    });

    document.getElementById('list-cameras-btn').addEventListener('click', async () => {
        const result = await window.api.listCameras(selectedDevice?.serial);
        showModal('カメラ一覧', result.output);
    });

    document.getElementById('list-apps-btn').addEventListener('click', async () => {
        addLog('アプリ一覧を取得中...（時間がかかる場合があります）', 'info');
        const result = await window.api.listApps(selectedDevice?.serial);
        showModal('アプリ一覧', result.output);
    });

    // Log clear
    clearLogBtn.addEventListener('click', () => {
        logContent.innerHTML = '';
    });

    // Modal close
    modalClose.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // Video source change
    document.getElementById('video-source').addEventListener('change', (e) => {
        // カメラ選択時はカメラタブへ誘導
        if (e.target.value === 'camera') {
            addLog('カメラモードが選択されました。「カメラ」タブで詳細設定ができます。', 'info');
        }
    });

    // Virtual display checkbox
    document.getElementById('enable-new-display').addEventListener('change', (e) => {
        const newDisplayInput = document.getElementById('new-display');
        if (e.target.checked && !newDisplayInput.value) {
            newDisplayInput.value = '1920x1080';
        }
    });
}

function setupIpcListeners() {
    // Download progress
    window.api.onDownloadProgress((progress) => {
        progressFill.style.width = progress + '%';
        progressText.textContent = progress + '%';
    });

    window.api.onDownloadStatus((status) => {
        setupStatus.innerHTML = `<span>${status}</span>`;
    });

    // scrcpy output
    window.api.onScrcpyOutput((output) => {
        addLog(output, 'info');
    });

    window.api.onScrcpyClosed((code) => {
        addLog(`scrcpyが終了しました (code: ${code})`, code === 0 ? 'success' : 'error');
        setRunningState(false);
    });

    window.api.onScrcpyError((error) => {
        addLog('エラー: ' + error, 'error');
        setRunningState(false);
    });
}

// ========================================
// Tab Navigation
// ========================================

function switchTab(tabId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabId);
    });
}

// ========================================
// Device Management
// ========================================

async function refreshDevices() {
    deviceList.innerHTML = '<div class="device-placeholder">デバイスを検索中...</div>';

    const result = await window.api.getDevices();

    if (result.error) {
        deviceList.innerHTML = `<div class="device-placeholder">エラー: ${result.error}</div>`;
        addLog('デバイス検出エラー: ' + result.error, 'error');
        return;
    }

    if (result.devices.length === 0) {
        deviceList.innerHTML = '<div class="device-placeholder">デバイスが見つかりません。USBで接続してください。</div>';
        selectedDevice = null;
        return;
    }

    deviceList.innerHTML = '';

    result.devices.forEach(device => {
        const item = document.createElement('div');
        item.className = 'device-item';
        if (selectedDevice?.serial === device.serial) {
            item.classList.add('selected');
        }

        let statusClass = '';
        let statusText = '接続済み';

        if (device.status === 'unauthorized') {
            statusClass = 'unauthorized';
            statusText = '未認証';
        } else if (device.isWireless) {
            statusClass = 'wireless';
            statusText = 'ワイヤレス';
        }

        item.innerHTML = `
      <div class="device-info">
        <span class="device-icon">${device.isWireless ? '📶' : '📱'}</span>
        <div>
          <div class="device-name">${device.model}</div>
          <div class="device-serial">${device.serial}</div>
        </div>
      </div>
      <span class="device-status ${statusClass}">${statusText}</span>
    `;

        item.addEventListener('click', () => {
            selectDevice(device, item);
        });

        deviceList.appendChild(item);
    });

    // Auto-select first device if none selected
    if (!selectedDevice && result.devices.length > 0) {
        selectDevice(result.devices[0], deviceList.querySelector('.device-item'));
    }

    addLog(`${result.devices.length}台のデバイスを検出しました`, 'success');
}

function selectDevice(device, element) {
    selectedDevice = device;

    document.querySelectorAll('.device-item').forEach(item => {
        item.classList.remove('selected');
    });

    element.classList.add('selected');
    addLog(`デバイスを選択: ${device.model} (${device.serial})`, 'info');
}

async function connectTcpip() {
    const ip = document.getElementById('tcpip-ip').value.trim();
    const port = document.getElementById('tcpip-port').value || 5555;

    if (!ip) {
        addLog('IPアドレスを入力してください', 'error');
        return;
    }

    addLog(`TCP/IP接続中: ${ip}:${port}...`, 'info');

    const result = await window.api.connectTcpip(ip, port);
    addLog(result.message, result.success ? 'success' : 'error');

    if (result.success) {
        setTimeout(refreshDevices, 1000);
    }
}

// ========================================
// scrcpy Control
// ========================================

function getScrcpyOptions() {
    const options = {};

    // Device selection
    if (selectedDevice) {
        options.serial = selectedDevice.serial;
    }
    options.otg = document.getElementById('otg-mode').checked;

    // Video settings
    const videoSource = document.getElementById('video-source').value;
    if (videoSource && videoSource !== 'display') {
        options.videoSource = videoSource;
    }

    const maxSize = document.getElementById('max-size').value;
    if (maxSize) options.maxSize = parseInt(maxSize);

    const videoBitrate = document.getElementById('video-bitrate').value;
    if (videoBitrate) options.videoBitRate = videoBitrate;

    const maxFps = document.getElementById('max-fps').value;
    if (maxFps) options.maxFps = parseInt(maxFps);

    const videoCodec = document.getElementById('video-codec').value;
    if (videoCodec) options.videoCodec = videoCodec;

    const captureOrientation = document.getElementById('capture-orientation').value;
    if (captureOrientation) options.captureOrientation = captureOrientation;

    const orientation = document.getElementById('orientation').value;
    if (orientation) options.orientation = orientation;

    const angle = document.getElementById('angle').value;
    if (angle) options.angle = angle;

    // Crop
    const cropWidth = document.getElementById('crop-width').value;
    const cropHeight = document.getElementById('crop-height').value;
    const cropX = document.getElementById('crop-x').value;
    const cropY = document.getElementById('crop-y').value;
    if (cropWidth && cropHeight) {
        options.crop = `${cropWidth}:${cropHeight}:${cropX || 0}:${cropY || 0}`;
    }

    const displayId = document.getElementById('display-id').value;
    if (displayId) options.displayId = displayId;

    options.noVideo = document.getElementById('no-video').checked;

    // Audio settings
    options.noAudio = document.getElementById('no-audio').checked;

    const audioSource = document.getElementById('audio-source').value;
    if (audioSource) options.audioSource = audioSource;

    const audioCodec = document.getElementById('audio-codec').value;
    if (audioCodec) options.audioCodec = audioCodec;

    const audioBitrate = document.getElementById('audio-bitrate').value;
    if (audioBitrate) options.audioBitRate = audioBitrate;

    // Recording
    if (document.getElementById('enable-record').checked) {
        const recordPath = document.getElementById('record-path').value;
        if (recordPath) {
            options.record = recordPath;
        }
    }

    const recordFormat = document.getElementById('record-format').value;
    if (recordFormat) options.recordFormat = recordFormat;

    const timeLimit = document.getElementById('time-limit').value;
    if (timeLimit) options.timeLimit = parseInt(timeLimit);

    options.noPlayback = document.getElementById('no-playback').checked;
    options.noWindow = document.getElementById('no-window').checked;

    // Camera settings
    const cameraId = document.getElementById('camera-id').value;
    if (cameraId) options.cameraId = cameraId;

    const cameraFacing = document.getElementById('camera-facing').value;
    if (cameraFacing) options.cameraFacing = cameraFacing;

    const cameraSize = document.getElementById('camera-size').value;
    if (cameraSize) options.cameraSize = cameraSize;

    // Window settings
    const windowTitle = document.getElementById('window-title').value;
    if (windowTitle) options.windowTitle = windowTitle;

    const windowX = document.getElementById('window-x').value;
    if (windowX) options.windowX = parseInt(windowX);

    const windowY = document.getElementById('window-y').value;
    if (windowY) options.windowY = parseInt(windowY);

    const windowWidth = document.getElementById('window-width').value;
    if (windowWidth) options.windowWidth = parseInt(windowWidth);

    const windowHeight = document.getElementById('window-height').value;
    if (windowHeight) options.windowHeight = parseInt(windowHeight);

    options.windowBorderless = document.getElementById('window-borderless').checked;
    options.alwaysOnTop = document.getElementById('always-on-top').checked;
    options.fullscreen = document.getElementById('fullscreen').checked;
    options.disableScreensaver = document.getElementById('disable-screensaver').checked;

    // Control settings
    options.noControl = document.getElementById('no-control').checked;

    const keyboardMode = document.getElementById('keyboard-mode').value;
    if (keyboardMode) options.keyboard = keyboardMode;

    const mouseMode = document.getElementById('mouse-mode').value;
    if (mouseMode) options.mouse = mouseMode;

    const gamepadMode = document.getElementById('gamepad-mode').value;
    if (gamepadMode) options.gamepad = gamepadMode;

    options.noClipboardAutosync = document.getElementById('no-clipboard-autosync').checked;

    // Device options
    options.turnScreenOff = document.getElementById('turn-screen-off').checked;
    options.stayAwake = document.getElementById('stay-awake').checked;
    options.showTouches = document.getElementById('show-touches').checked;
    options.powerOffOnClose = document.getElementById('power-off-on-close').checked;
    options.noPowerOn = document.getElementById('no-power-on').checked;

    const startApp = document.getElementById('start-app').value;
    if (startApp) options.startApp = startApp;

    // Virtual display
    if (document.getElementById('enable-new-display').checked) {
        const newDisplay = document.getElementById('new-display').value;
        options.newDisplay = newDisplay || '';
    }

    options.noVdSystemDecorations = document.getElementById('no-vd-system-decorations').checked;
    options.noVdDestroyContent = document.getElementById('no-vd-destroy-content').checked;

    return options;
}

async function startScrcpy() {
    if (!selectedDevice && !document.getElementById('otg-mode').checked) {
        addLog('デバイスを選択してください', 'error');
        return;
    }

    const options = getScrcpyOptions();

    addLog('scrcpyを起動中...', 'info');
    addLog('オプション: ' + JSON.stringify(options, null, 2), 'info');

    const result = await window.api.startScrcpy(options);

    if (result.success) {
        addLog('scrcpyが起動しました', 'success');
        setRunningState(true);
    } else {
        addLog('起動失敗: ' + result.message, 'error');
    }
}

async function stopScrcpy() {
    addLog('scrcpyを停止中...', 'info');
    const result = await window.api.stopScrcpy();

    if (result.success) {
        addLog('scrcpyを停止しました', 'success');
        setRunningState(false);
    } else {
        addLog('停止失敗: ' + result.message, 'error');
    }
}

function setRunningState(running) {
    isRunning = running;
    startBtn.style.display = running ? 'none' : 'inline-flex';
    stopBtn.style.display = running ? 'inline-flex' : 'none';
}

// ========================================
// scrcpy Download
// ========================================

async function downloadScrcpy() {
    setupDownloadBtn.style.display = 'none';
    setupProgress.style.display = 'block';
    setupStatus.innerHTML = '<div class="spinner"></div><span>ダウンロード中...</span>';

    try {
        await window.api.downloadScrcpy();
        setupStatus.innerHTML = '<span>✅ セットアップ完了！</span>';

        setTimeout(() => {
            showMainScreen();
            refreshDevices();
        }, 1000);
    } catch (error) {
        setupStatus.innerHTML = `<span>❌ エラー: ${error.message}</span>`;
        setupDownloadBtn.style.display = 'inline-flex';
        setupProgress.style.display = 'none';
    }
}

// ========================================
// Utilities
// ========================================

function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'log-' + type;
    line.textContent = `[${time}] ${message}`;
    logContent.appendChild(line);
    logContent.scrollTop = logContent.scrollHeight;
}

function showModal(title, content) {
    modalTitle.textContent = title;
    modalText.textContent = content || '(なし)';
    modal.style.display = 'flex';
}

function hideModal() {
    modal.style.display = 'none';
}

// ========================================
// Start
// ========================================

document.addEventListener('DOMContentLoaded', init);

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
    // Header start button (Legacy/Global - defaults to Mirroring)
    if (startBtn) startBtn.addEventListener('click', () => startScrcpy('mirroring'));

    // Tab-specific start buttons
    const startMirroringBtn = document.getElementById('start-mirroring-btn');
    if (startMirroringBtn) startMirroringBtn.addEventListener('click', () => startScrcpy('mirroring'));

    const startVdBtn = document.getElementById('start-virtual-display-btn');
    if (startVdBtn) startVdBtn.addEventListener('click', () => startScrcpy('virtual-display'));

    if (stopBtn) stopBtn.addEventListener('click', stopScrcpy);

    // Navigation buttons
    document.getElementById('nav-back').addEventListener('click', () => sendKey(4)); // KEYCODE_BACK
    document.getElementById('nav-home').addEventListener('click', () => sendKey(3)); // KEYCODE_HOME
    document.getElementById('nav-app-switch').addEventListener('click', () => sendKey(187)); // KEYCODE_APP_SWITCH

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

    // Log clear
    clearLogBtn.addEventListener('click', () => {
        logContent.innerHTML = '';
    });

    // Modal close
    modalClose.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // Virtual Display Presets
    const vdPerformanceMode = document.getElementById('vd-performance-mode');
    if (vdPerformanceMode) {
        vdPerformanceMode.addEventListener('change', (e) => {
            applyVdPerformancePreset(e.target.value);
        });
    }

    const vdResolutionPreset = document.getElementById('vd-resolution-preset');
    if (vdResolutionPreset) {
        vdResolutionPreset.addEventListener('change', (e) => {
            const manualGroup = document.getElementById('vd-manual-resolution-group');
            if (e.target.value === 'manual') {
                manualGroup.style.display = 'block';
            } else {
                manualGroup.style.display = 'none';
            }
        });
    }
}

// 仮想ディスプレイのパフォーマンスプリセット適用
function applyVdPerformancePreset(mode) {
    const codecSelect = document.getElementById('vd-video-codec');
    const bufferInput = document.getElementById('vd-buffer');

    // 注: 解像度などは起動時にモードを見て動的に決定するか、ここで設定する
    // main.js側でモード名を受け取る形ではなく、ここで具体的なパラメータに展開する方が柔軟

    switch (mode) {
        case 'quality': // 最高画質
            // 下記はUI上の反映だけの例。実際のscrcpyオプションとしては getScrcpyOptions で構築する
            if (codecSelect) codecSelect.value = 'h265';
            if (bufferInput) bufferInput.value = '50'; // 多少バッファ持たせて安定化
            break;
        case 'balance': // バランス
            if (codecSelect) codecSelect.value = 'h264'; // 互換性
            if (bufferInput) bufferInput.value = '0';
            break;
        case 'speed': // 低遅延
            if (codecSelect) codecSelect.value = 'h264';
            if (bufferInput) bufferInput.value = '0';
            break;
    }

    addLog(`パフォーマンスモードを「${mode}」に変更しました`, 'info');
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

/**
 * 現在のモードに基づいてオプションを収集
 * @param {string} mode - 'mirroring' | 'virtual-display'
 */
function getScrcpyOptions(mode = 'mirroring') {
    const options = {};

    // Device selection
    if (selectedDevice) {
        options.serial = selectedDevice.serial;
    }

    // 共通設定：録画
    if (document.getElementById('enable-record').checked) {
        const recordPath = document.getElementById('record-path').value;
        const timeLimit = document.getElementById('time-limit').value;

        if (recordPath) {
            options.record = recordPath;
            const recordFormat = document.getElementById('record-format').value;
            if (recordFormat) options.recordFormat = recordFormat;
        }
        if (timeLimit) options.timeLimit = parseInt(timeLimit);
    }

    // モード別設定
    if (mode === 'virtual-display') {
        // --- 仮想ディスプレイモード設定 ---
        const perfMode = document.getElementById('vd-performance-mode').value;
        const resPreset = document.getElementById('vd-resolution-preset').value;

        // 解像度の決定
        let newDisplayValue = '1920x1080/440'; // デフォルト

        if (resPreset === 'manual') {
            newDisplayValue = document.getElementById('virtual-display-res').value || newDisplayValue;
        } else {
            newDisplayValue = resPreset;
        }

        // コアオプション
        options.newDisplay = newDisplayValue;
        options.startApp = ""; // 仮想ディスプレイでは通常ホーム画面などを出すか、ドロワーを出す

        // パフォーマンスプリセットの反映（ビットレート・FPS）
        switch (perfMode) {
            case 'quality': // 最高画質
                options.videoBitRate = '20M';
                options.maxFps = 120;
                // コーデックはUI側の初期値としてapply関数で設定されるが、
                // 送信時はUIの値を正とするためここでは設定しない（下部で取得）
                break;
            case 'balance': // バランス
                options.videoBitRate = '8M';
                options.maxFps = 60;
                break;
            case 'speed': // 低遅延
                options.videoBitRate = '4M';
                options.maxFps = 30;
                break;
            case 'custom':
                // 手動設定値を使用（UIがないパラメータはデフォルト or 既存設定）
                // 必要ならカスタム用のbitrate入力欄を追加するが、今回は簡易モードとしてデフォルト(8M/60fps相当)または指定なし
                break;
        }

        // コーデック (UI優先)
        const codec = document.getElementById('vd-video-codec').value;
        if (codec) options.videoCodec = codec;

        // 高度な設定
        const buffer = document.getElementById('vd-buffer').value;
        if (buffer && parseInt(buffer) > 0) {
            options.displayBuffer = parseInt(buffer);
        }

        const vdId = document.getElementById('virtual-display-id').value;
        if (vdId) options.displayId = vdId;

        options.noAudio = true; // 基本は映像のみ（用途によるが）

    } else {
        // --- 通常ミラーリングモード設定 ---
        options.otg = document.getElementById('otg-mode').checked;

        const maxSize = document.getElementById('max-size').value;
        if (maxSize && maxSize !== "0") options.maxSize = parseInt(maxSize);

        const bitRate = document.getElementById('bit-rate').value;
        if (bitRate) options.videoBitRate = bitRate;

        // 詳細設定
        options.noAudio = document.getElementById('no-audio').checked;
        options.stayAwake = document.getElementById('stay-awake').checked;
        options.turnScreenOff = document.getElementById('turn-screen-off').checked;
        options.alwaysOnTop = document.getElementById('always-on-top').checked;
        options.fullscreen = document.getElementById('fullscreen').checked;
        options.showTouches = false; // デフォルトはオフ

        // 詳細設定内の値も取得
        if (document.getElementById('enable-camera').checked) {
            options.videoSource = 'camera';
            options.cameraSize = '1920x1080'; // 簡易設定
        }

    }

    return options;
}


async function startScrcpy(mode = 'mirroring') {
    // 仮想ディスプレイモード以外で、かつOTGモードでない場合はデバイス選択必須
    if (mode !== 'virtual-display' && !selectedDevice && !document.getElementById('otg-mode').checked) {
        addLog('デバイスを選択してください', 'error');
        return;
    }

    // 仮想ディスプレイモードでもデバイスは必要だが、OTGフラグ等は無視する
    if (mode === 'virtual-display' && !selectedDevice) {
        addLog('デバイスを選択してください', 'error');
        return;
    }

    const options = getScrcpyOptions(mode);

    addLog(`scrcpyを起動中 (${mode})...`, 'info');
    // addLog('オプション: ' + JSON.stringify(options, null, 2), 'info'); // デバッグ用

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

async function sendKey(keycode) {
    if (!selectedDevice && !document.getElementById('otg-mode').checked) {
        addLog('操作するデバイスを選択してください', 'error');
        return;
    }

    // OTGモードの場合はadbキーイベントは送れないが、scrcpy起動中なら送れるかも知れない
    // 基本はシリアル指定
    const serial = selectedDevice ? selectedDevice.serial : null;
    await window.api.sendKeyEvent(serial, keycode);
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

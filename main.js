const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const AdmZip = require('adm-zip');

let mainWindow;
let scrcpyProcess = null;

// scrcpyのパス
function getScrcpyPath() {
  // app.isPackaged はapp.whenReady()後にのみ信頼できる
  // 開発時は__dirnameを使用
  try {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'scrcpy');
    }
  } catch (e) {
    // appがまだ準備されていない場合
  }
  return path.join(__dirname, 'scrcpy');
}

function getScrcpyExe() {
  return path.join(getScrcpyPath(), 'scrcpy.exe');
}

function getAdbExe() {
  return path.join(getScrcpyPath(), 'adb.exe');
}

// scrcpyが存在するかチェック
function checkScrcpyExists() {
  return fs.existsSync(getScrcpyExe());
}

// メインウィンドウ作成
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // 開発時はDevToolsを開く
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
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
  // scrcpyプロセスを終了
  if (scrcpyProcess) {
    scrcpyProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC ハンドラー

// scrcpyの存在チェック
ipcMain.handle('check-scrcpy', async () => {
  return checkScrcpyExists();
});

// キーイベント送信
ipcMain.handle('adb-key-event', async (event, { serial, keycode }) => {
  try {
    const adb = getAdbPath();
    const target = serial ? ['-s', serial] : [];

    // adb shell input keyevent <keycode>
    execFile(adb, [...target, 'shell', 'input', 'keyevent', keycode]);
    return { success: true };
  } catch (error) {
    console.error('Key event error:', error);
    return { success: false, error: error.message };
  }
});

// scrcpyのダウンロード
ipcMain.handle('download-scrcpy', async (event) => {
  const scrcpyVersion = 'v3.1';
  const downloadUrl = `https://github.com/Genymobile/scrcpy/releases/download/${scrcpyVersion}/scrcpy-win64-${scrcpyVersion}.zip`;
  const scrcpyDir = getScrcpyPath();
  const zipPath = path.join(app.getPath('temp'), 'scrcpy.zip');

  return new Promise((resolve, reject) => {
    // ディレクトリ作成
    if (!fs.existsSync(scrcpyDir)) {
      fs.mkdirSync(scrcpyDir, { recursive: true });
    }

    // ダウンロード
    const downloadFile = (url, dest, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        // リダイレクト処理
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(response.headers.location, dest, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = Math.round((downloadedSize / totalSize) * 100);
          mainWindow.webContents.send('download-progress', progress);
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            try {
              // ZIP解凍
              mainWindow.webContents.send('download-status', '解凍中...');
              const zip = new AdmZip(zipPath);
              const zipEntries = zip.getEntries();

              // 解凍先を決定（ZIP内のフォルダ構造を確認）
              zipEntries.forEach((entry) => {
                if (!entry.isDirectory) {
                  const fileName = path.basename(entry.entryName);
                  const destPath = path.join(scrcpyDir, fileName);
                  fs.writeFileSync(destPath, entry.getData());
                }
              });

              // ZIPファイル削除
              fs.unlinkSync(zipPath);

              resolve(true);
            } catch (err) {
              reject(err);
            }
          });
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => { });
        reject(err);
      });
    };

    downloadFile(downloadUrl, zipPath);
  });
});

// ADBデバイス一覧取得
ipcMain.handle('get-devices', async () => {
  const adbExe = getAdbExe();

  if (!fs.existsSync(adbExe)) {
    return { error: 'ADB not found' };
  }

  return new Promise((resolve) => {
    exec(`"${adbExe}" devices -l`, (error, stdout, stderr) => {
      if (error) {
        resolve({ error: error.message });
        return;
      }

      const lines = stdout.trim().split('\n').slice(1);
      const devices = [];

      lines.forEach((line) => {
        if (line.trim() === '') return;

        const parts = line.trim().split(/\s+/);
        const serial = parts[0];
        const status = parts[1];

        if (status === 'device' || status === 'unauthorized') {
          let model = '';
          let product = '';

          parts.forEach((part) => {
            if (part.startsWith('model:')) {
              model = part.replace('model:', '');
            }
            if (part.startsWith('product:')) {
              product = part.replace('product:', '');
            }
          });

          devices.push({
            serial,
            status,
            model: model || product || serial,
            isWireless: serial.includes(':')
          });
        }
      });

      resolve({ devices });
    });
  });
});

// TCP/IP接続
ipcMain.handle('connect-tcpip', async (event, ip, port = 5555) => {
  const adbExe = getAdbExe();
  const address = `${ip}:${port}`;

  return new Promise((resolve) => {
    exec(`"${adbExe}" connect ${address}`, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, message: error.message });
        return;
      }

      const output = stdout + stderr;
      const success = output.includes('connected') && !output.includes('failed');
      resolve({ success, message: output.trim() });
    });
  });
});

// TCP/IP切断
ipcMain.handle('disconnect-tcpip', async (event, address) => {
  const adbExe = getAdbExe();

  return new Promise((resolve) => {
    exec(`"${adbExe}" disconnect ${address}`, (error, stdout, stderr) => {
      resolve({ success: !error, message: (stdout + stderr).trim() });
    });
  });
});

// scrcpy開始
ipcMain.handle('start-scrcpy', async (event, options) => {
  if (scrcpyProcess) {
    return { success: false, message: 'scrcpy is already running' };
  }

  const scrcpyExe = getScrcpyExe();

  if (!fs.existsSync(scrcpyExe)) {
    return { success: false, message: 'scrcpy not found' };
  }

  // コマンドライン引数を構築
  const args = buildScrcpyArgs(options);

  return new Promise((resolve) => {
    try {
      scrcpyProcess = spawn(scrcpyExe, args, {
        cwd: getScrcpyPath()
      });

      scrcpyProcess.stdout.on('data', (data) => {
        mainWindow.webContents.send('scrcpy-output', data.toString());
      });

      scrcpyProcess.stderr.on('data', (data) => {
        mainWindow.webContents.send('scrcpy-output', data.toString());
      });

      scrcpyProcess.on('close', (code) => {
        scrcpyProcess = null;
        mainWindow.webContents.send('scrcpy-closed', code);
      });

      scrcpyProcess.on('error', (err) => {
        scrcpyProcess = null;
        mainWindow.webContents.send('scrcpy-error', err.message);
      });

      // 少し待ってから成功を返す
      setTimeout(() => {
        if (scrcpyProcess) {
          resolve({ success: true, message: 'scrcpy started' });
        } else {
          resolve({ success: false, message: 'scrcpy failed to start' });
        }
      }, 500);
    } catch (err) {
      resolve({ success: false, message: err.message });
    }
  });
});

// scrcpy停止
ipcMain.handle('stop-scrcpy', async () => {
  if (scrcpyProcess) {
    scrcpyProcess.kill();
    scrcpyProcess = null;
    return { success: true };
  }
  return { success: false, message: 'scrcpy is not running' };
});

// scrcpyの状態確認
ipcMain.handle('is-scrcpy-running', async () => {
  return scrcpyProcess !== null;
});

// 録画ファイル選択ダイアログ
ipcMain.handle('select-record-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '録画ファイルを保存',
    defaultPath: `scrcpy_${Date.now()}.mp4`,
    filters: [
      { name: 'MP4', extensions: ['mp4'] },
      { name: 'MKV', extensions: ['mkv'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

// エンコーダー一覧取得
ipcMain.handle('list-encoders', async () => {
  const scrcpyExe = getScrcpyExe();

  return new Promise((resolve) => {
    exec(`"${scrcpyExe}" --list-encoders`, { cwd: getScrcpyPath() }, (error, stdout, stderr) => {
      resolve({ output: stdout + stderr });
    });
  });
});

// ディスプレイ一覧取得
ipcMain.handle('list-displays', async (event, serial) => {
  const scrcpyExe = getScrcpyExe();
  let cmd = `"${scrcpyExe}" --list-displays`;
  if (serial) {
    cmd += ` -s ${serial}`;
  }

  return new Promise((resolve) => {
    exec(cmd, { cwd: getScrcpyPath() }, (error, stdout, stderr) => {
      resolve({ output: stdout + stderr });
    });
  });
});

// カメラ一覧取得
ipcMain.handle('list-cameras', async (event, serial) => {
  const scrcpyExe = getScrcpyExe();
  let cmd = `"${scrcpyExe}" --list-cameras`;
  if (serial) {
    cmd += ` -s ${serial}`;
  }

  return new Promise((resolve) => {
    exec(cmd, { cwd: getScrcpyPath() }, (error, stdout, stderr) => {
      resolve({ output: stdout + stderr });
    });
  });
});

// アプリ一覧取得
ipcMain.handle('list-apps', async (event, serial) => {
  const scrcpyExe = getScrcpyExe();
  let cmd = `"${scrcpyExe}" --list-apps`;
  if (serial) {
    cmd += ` -s ${serial}`;
  }

  return new Promise((resolve) => {
    exec(cmd, { cwd: getScrcpyPath(), timeout: 30000 }, (error, stdout, stderr) => {
      resolve({ output: stdout + stderr });
    });
  });
});

// scrcpy引数を構築
function buildScrcpyArgs(options) {
  const args = [];

  // デバイス選択
  if (options.serial) {
    args.push('-s', options.serial);
  }
  if (options.selectUsb) {
    args.push('-d');
  }
  if (options.selectTcpip) {
    args.push('-e');
  }
  if (options.tcpip) {
    args.push('--tcpip=' + options.tcpip);
  }

  // ビデオ設定
  if (options.videoSource === 'camera') {
    args.push('--video-source=camera');
  }
  if (options.maxSize) {
    args.push('-m', options.maxSize.toString());
  }
  if (options.videoBitRate) {
    args.push('-b', options.videoBitRate);
  }
  if (options.maxFps) {
    args.push('--max-fps', options.maxFps.toString());
  }
  if (options.videoCodec && options.videoCodec !== 'h264') {
    args.push('--video-codec=' + options.videoCodec);
  }
  if (options.videoEncoder) {
    args.push('--video-encoder=' + options.videoEncoder);
  }
  if (options.captureOrientation) {
    args.push('--capture-orientation=' + options.captureOrientation);
  }
  if (options.orientation) {
    args.push('--orientation=' + options.orientation);
  }
  if (options.crop) {
    args.push('--crop=' + options.crop);
  }
  if (options.angle) {
    args.push('--angle=' + options.angle);
  }
  if (options.displayId) {
    args.push('--display-id=' + options.displayId);
  }
  if (options.noVideo) {
    args.push('--no-video');
  }

  // オーディオ設定
  if (options.noAudio) {
    args.push('--no-audio');
  }
  if (options.audioSource) {
    args.push('--audio-source=' + options.audioSource);
  }
  if (options.audioCodec && options.audioCodec !== 'opus') {
    args.push('--audio-codec=' + options.audioCodec);
  }
  if (options.audioBitRate) {
    args.push('--audio-bit-rate=' + options.audioBitRate);
  }

  // 録画設定
  if (options.record) {
    args.push('--record=' + options.record);
  }
  if (options.recordFormat) {
    args.push('--record-format=' + options.recordFormat);
  }
  if (options.timeLimit) {
    args.push('--time-limit=' + options.timeLimit);
  }
  if (options.noPlayback) {
    args.push('--no-playback');
  }
  if (options.noWindow) {
    args.push('--no-window');
  }

  // カメラ設定
  if (options.cameraId) {
    args.push('--camera-id=' + options.cameraId);
  }
  if (options.cameraFacing) {
    args.push('--camera-facing=' + options.cameraFacing);
  }
  if (options.cameraSize) {
    args.push('--camera-size=' + options.cameraSize);
  }

  // ウィンドウ設定
  if (options.windowTitle) {
    args.push('--window-title=' + options.windowTitle);
  }
  if (options.windowX !== undefined) {
    args.push('--window-x=' + options.windowX);
  }
  if (options.windowY !== undefined) {
    args.push('--window-y=' + options.windowY);
  }
  if (options.windowWidth) {
    args.push('--window-width=' + options.windowWidth);
  }
  if (options.windowHeight) {
    args.push('--window-height=' + options.windowHeight);
  }
  if (options.windowBorderless) {
    args.push('--window-borderless');
  }
  if (options.alwaysOnTop) {
    args.push('--always-on-top');
  }
  if (options.fullscreen) {
    args.push('--fullscreen');
  }
  if (options.disableScreensaver) {
    args.push('--disable-screensaver');
  }

  // コントロール設定
  if (options.noControl) {
    args.push('--no-control');
  }
  if (options.keyboard) {
    args.push('--keyboard=' + options.keyboard);
  }
  if (options.mouse) {
    args.push('--mouse=' + options.mouse);
  }
  if (options.gamepad) {
    args.push('--gamepad=' + options.gamepad);
  }
  if (options.noClipboardAutosync) {
    args.push('--no-clipboard-autosync');
  }

  // デバイス設定
  if (options.turnScreenOff) {
    args.push('--turn-screen-off');
  }
  if (options.stayAwake) {
    args.push('--stay-awake');
  }
  if (options.showTouches) {
    args.push('--show-touches');
  }
  if (options.powerOffOnClose) {
    args.push('--power-off-on-close');
  }
  if (options.noPowerOn) {
    args.push('--no-power-on');
  }
  if (options.startApp) {
    args.push('--start-app=' + options.startApp);
  }

  // 仮想ディスプレイ
  if (options.newDisplay) {
    args.push('--new-display=' + options.newDisplay);
  }
  if (options.displayBuffer) {
    args.push('--display-buffer=' + options.displayBuffer);
  }
  if (options.noVdSystemDecorations) {
    args.push('--no-vd-system-decorations');
  }
  if (options.noVdDestroyContent) {
    args.push('--no-vd-destroy-content');
  }

  // OTGモード
  if (options.otg) {
    args.push('--otg');
  }

  return args;
}

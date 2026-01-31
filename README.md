# ScrcpyGUI

<p align="center">
  <img src="assets/icon.png" alt="ScrcpyGUI" width="128">
</p>

<p align="center">
  <strong>scrcpyをGUIで操作するデスクトップアプリ</strong>
</p>

<p align="center">
  <a href="#機能">機能</a> •
  <a href="#インストール">インストール</a> •
  <a href="#使い方">使い方</a> •
  <a href="#ビルド">ビルド</a> •
  <a href="#ライセンス">ライセンス</a>
</p>

---

## 概要

ScrcpyGUIは、[scrcpy](https://github.com/Genymobile/scrcpy)のすべての機能をグラフィカルユーザーインターフェース（GUI）で操作できるデスクトップアプリです。

コマンドラインに不慣れなユーザーでも、簡単にAndroidデバイスのミラーリングや録画ができます。

## 機能

### 📱 デバイス接続
- USB接続デバイスの自動検出
- TCP/IP（ワイヤレス）接続
- 複数デバイスの管理
- OTGモード対応

### 🎬 ビデオ設定
- 解像度・ビットレート調整
- フレームレート制限
- コーデック選択（H.264/H.265/AV1）
- 画面の向き・回転
- クロップ（部分表示）

### 🔊 オーディオ設定
- デバイス音声のミラーリング
- マイク入力対応
- コーデック選択

### 📹 録画
- MP4/MKV形式で録画
- 時間制限付き録画
- バックグラウンド録画

### 📷 カメラ
- デバイスカメラのミラーリング
- 前面/背面カメラ選択

### 🖼️ ウィンドウ設定
- ウィンドウサイズ・位置
- ボーダーレス表示
- 常に最前面表示
- フルスクリーン

### 🎮 コントロール
- キーボード・マウス制御
- ゲームパッド対応
- クリップボード同期

### 🖥️ 仮想ディスプレイ
- 新規仮想ディスプレイ作成
- アプリの起動

## 必要条件

- **Windows 10/11** (64-bit)
- **Node.js 18+** (ソースから実行する場合)
- Androidデバイス（USBデバッグを有効化）

## インストール

### 方法1: リリース版を使用（推奨）

1. [Releases](../../releases)から最新版をダウンロード
2. ZIPを解凍またはインストーラーを実行
3. アプリを起動

### 方法2: ソースから実行

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/scrcpy-gui.git
cd scrcpy-gui

# 依存関係をインストール
npm install

# 起動
npm start
```

> **Note**: 初回起動時にscrcpyが自動的にダウンロードされます。

## 使い方

1. **Androidデバイスを準備**
   - 開発者オプションを有効化
   - USBデバッグを有効化
   - PCにUSB接続

2. **アプリを起動**
   - デバイスが自動検出されます
   - 設定を調整（オプション）
   - 「開始」ボタンをクリック

3. **操作**
   - PCのキーボード・マウスでデバイスを操作
   - ショートカットキーで各種機能を実行

## ビルド

### インストーラー作成 (electron-builder)
*注意: 管理者権限が必要な場合があります*

```bash
npm run build:win
```

### ポータブル版作成 (electron-packager)

```bash
npm run package:win
```

ビルド成果物は `dist/` フォルダに出力されます。

## ショートカット

| キー | 機能 |
|------|------|
| `Ctrl+H` | ホーム |
| `Ctrl+B` | 戻る |
| `Ctrl+S` | アプリ切替 |
| `Ctrl+M` | メニュー |
| `Ctrl+P` | 電源 |
| `Ctrl+O` | 画面オフ |
| `Ctrl+N` | 通知パネル |

## トラブルシューティング

### アプリが起動しない場合

`ELECTRON_RUN_AS_NODE` 環境変数が設定されていると、アプリが正常に起動しません。
以下のコマンドで環境変数をリセットしてから起動してください：

**PowerShell:**
```powershell
$env:ELECTRON_RUN_AS_NODE = ''
npm start
```

**または直接Electronを実行:**
```powershell
$env:ELECTRON_RUN_AS_NODE = ''
.\node_modules\electron\dist\electron.exe .
```

### デバイスが検出されない場合

1. USBケーブルが正しく接続されていることを確認
2. Androidデバイスで「USBデバッグ」が有効になっていることを確認
3. PC側でデバイスを信頼するよう求められた場合は許可

## ライセンス

- **ScrcpyGUI**: [MIT License](LICENSE)
- **scrcpy**: [Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE)

## クレジット

- [scrcpy](https://github.com/Genymobile/scrcpy) - Genymobile
- [Electron](https://www.electronjs.org/)

---

<p align="center">
  Made with ❤️
</p>

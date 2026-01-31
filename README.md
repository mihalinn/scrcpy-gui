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

### ✨ 主な機能

- **📱 シンプルな3タブUI**: 「ミラーリング」「仮想ディスプレイ」「録画」を用途で明確に分離。
- **🚀 パフォーマンスモード**: 仮想ディスプレイ用に「最高画質 (2K/120fps)」「バランス」「低遅延」のプリセットを用意。
- **🖥️ 仮想ディスプレイ (Virtual Display)**: PC上に仮想的なセカンドディスプレイを作成。
- **🖱️ 完全なコントロール**: キーボード・マウス共有。ナビゲーションボタン（戻る/ホーム/アプリ切り替え）も搭載。
- **📹 録画機能**: ミラーリングしながらの画面録画に対応。
- **🔌 ワイヤレス接続**: TCP/IPモードでの無線接続をサポート。

## 📥 インストール

[Releases](https://github.com/your-repo/scrcpy-gui/releases) ページから最新の `scrcpy-gui-win32-x64.zip` をダウンロードしてください。
解凍して `scrcpy-gui.exe` を実行するだけで使えます（`scrcpy` 本体は初回起動時に自動ダウンロードされます）。

## 📖 使い方

### 1. 📱 ミラーリング（通常モード）
接続したAndroidデバイスの画面をPCに表示・操作します。
- **接続**: USBまたはWi-Fiで接続し、リストからデバイスを選択。
- **開始**: 「ミラーリング開始」をクリック。

### 2. 🖥️ 仮想ディスプレイ（拡張モード）
PC作業中にAndroidを「サブディスプレイ」として活用したい場合に最適です。
- **モード選択**: 用途に合わせて「最高画質」「バランス」「低遅延」から選択。
- **開始**: 「仮想ディスプレイを開始」をクリックすると、新しいウィンドウで開きます。

### 3. 📹 録画
画面を録画したい場合に設定します。
- **設定**: 保存先やフォーマット(MP4/MKV)を指定。
- **実行**: 各モードの開始と同時に録画されます。

## 🛠️ 開発者向けビルド手順
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

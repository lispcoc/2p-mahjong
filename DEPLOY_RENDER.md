# Render.com デプロイ手順書

本ドキュメントでは、二人麻雀アプリ（Next.js フロントエンド + Express/WebSocket バックエンド）を **Render.com** にデプロイする手順を説明します。

---

## 目次

1. [前提条件](#1-前提条件)
2. [アーキテクチャ概要](#2-アーキテクチャ概要)
3. [事前準備（リポジトリ）](#3-事前準備リポジトリ)
4. [バックエンドのデプロイ（Web Service）](#4-バックエンドのデプロイweb-service)
5. [フロントエンドのデプロイ（Web Service）](#5-フロントエンドのデプロイweb-service)
6. [環境変数の設定](#6-環境変数の設定)
7. [WebSocket 接続の注意点](#7-websocket-接続の注意点)
8. [動作確認](#8-動作確認)
9. [トラブルシューティング](#9-トラブルシューティング)
10. [料金・プランについて](#10-料金プランについて)

---

## 1. 前提条件

- [Render.com](https://render.com/) のアカウントを作成済み
- GitHub リポジトリ（`lispcoc/2p-mahjong`）に最新コードが push 済み
- Render に GitHub アカウントを連携済み

---

## 2. アーキテクチャ概要

```
┌──────────────────────┐       WebSocket (wss://)       ┌──────────────────────┐
│                      │  ◄──────────────────────────►  │                      │
│   Frontend (Next.js) │       HTTP API (https://)       │  Backend (Express)   │
│   Render Web Service │  ────────────────────────────►  │  Render Web Service  │
│                      │                                 │                      │
│   Port: 3000         │                                 │  Port: 3001          │
│   (自動割当)          │                                 │  (process.env.PORT)  │
└──────────────────────┘                                 └──────────────────────┘
```

- **バックエンド**: Express + WebSocket サーバー → Render **Web Service**
- **フロントエンド**: Next.js (SSR) → Render **Web Service**

> ⚠️ Render の Static Site は Next.js の SSR に対応しないため、フロントエンドも **Web Service** としてデプロイします。

---

## 3. 事前準備（リポジトリ）

### 3.1 ルートディレクトリの確認

本プロジェクトはモノレポ構成です。Render では各サービスの **Root Directory** を指定できるため、特にリポジトリ構造を変更する必要はありません。

```
2p-mahjong/
├── backend/    ← バックエンド用 Root Directory
├── frontend/   ← フロントエンド用 Root Directory
└── ...
```

### 3.2 Node.js バージョンの指定（推奨）

Render はデフォルトで Node.js の LTS を使用しますが、明示的に指定する場合は各 `package.json` に `engines` を追加します。

**backend/package.json**:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**frontend/package.json**:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 4. バックエンドのデプロイ（Web Service）

### 4.1 サービス作成

1. [Render Dashboard](https://dashboard.render.com/) にログイン
2. **「New +」** → **「Web Service」** をクリック
3. GitHub リポジトリ `2p-mahjong` を選択

### 4.2 設定値

| 項目 | 値 |
|------|------|
| **Name** | `2p-mahjong-backend`（任意） |
| **Region** | `Singapore (Southeast Asia)` 推奨（日本向け） |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free（または必要に応じてアップグレード） |

### 4.3 環境変数（バックエンド）

| 変数名 | 値 | 説明 |
|--------|------|------|
| `PORT` | `10000` | Render が自動設定（通常は設定不要） |
| `NODE_ENV` | `production` | 本番環境フラグ |

> 💡 Render は `PORT` 環境変数を自動的にセットします。`server.js` の `process.env.PORT || 3001` により自動対応されます。

### 4.4 デプロイ実行

設定完了後、**「Create Web Service」** をクリックするとビルド＆デプロイが開始されます。

デプロイ完了後、以下のような URL が割り当てられます：
```
https://2p-mahjong-backend.onrender.com
```

この URL を控えておいてください（フロントエンドの環境変数で使用します）。

---

## 5. フロントエンドのデプロイ（Web Service）

### 5.1 サービス作成

1. **「New +」** → **「Web Service」** をクリック
2. 同じ GitHub リポジトリ `2p-mahjong` を選択

### 5.2 設定値

| 項目 | 値 |
|------|------|
| **Name** | `2p-mahjong-frontend`（任意） |
| **Region** | `Singapore (Southeast Asia)` 推奨 |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free（または必要に応じてアップグレード） |

### 5.3 環境変数（フロントエンド）

バックエンドの Render URL を元に、以下の環境変数を設定します：

| 変数名 | 値 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_BACKEND_URL` | `wss://2p-mahjong-backend.onrender.com` | WebSocket 接続用 |
| `NEXT_PUBLIC_BACKEND_URL_HTTP` | `https://2p-mahjong-backend.onrender.com` | HTTP API 接続用 |
| `NODE_ENV` | `production` | 本番環境フラグ |

> ⚠️ **重要**: `NEXT_PUBLIC_` プレフィックスが付いた環境変数はビルド時に埋め込まれます。環境変数を変更した場合は**再デプロイ（再ビルド）が必要**です。

> ⚠️ **プロトコルに注意**: Render は HTTPS を提供するため、WebSocket は `wss://`、HTTP API は `https://` を使用してください。`ws://` や `http://` ではありません。

### 5.4 デプロイ実行

設定完了後、**「Create Web Service」** をクリックしてデプロイを開始します。

デプロイ完了後のフロントエンド URL:
```
https://2p-mahjong-frontend.onrender.com
```

---

## 6. 環境変数の設定（まとめ）

### バックエンド (`backend`)

```env
NODE_ENV=production
# PORT は Render が自動設定
```

### フロントエンド (`frontend`)

```env
NEXT_PUBLIC_BACKEND_URL=wss://<バックエンドのRender URL>
NEXT_PUBLIC_BACKEND_URL_HTTP=https://<バックエンドのRender URL>
NODE_ENV=production
```

> 例: バックエンドが `2p-mahjong-backend.onrender.com` の場合
> - `NEXT_PUBLIC_BACKEND_URL` = `wss://2p-mahjong-backend.onrender.com`
> - `NEXT_PUBLIC_BACKEND_URL_HTTP` = `https://2p-mahjong-backend.onrender.com`

---

## 7. WebSocket 接続の注意点

### 7.1 Render の WebSocket サポート

Render の Web Service は **WebSocket をネイティブでサポート**しています。特別な設定は不要です。

- Render は自動的に HTTPS → WSS のアップグレードを処理します
- `wss://` プロトコルを使用してください

### 7.2 CORS 設定

バックエンドの `server.js` では既に `cors()` ミドルウェアが設定されていますが、本番環境ではオリジンを制限することを推奨します。

必要に応じて `server.js` の CORS 設定を更新：

```javascript
app.use(cors({
  origin: [
    'https://2p-mahjong-frontend.onrender.com',
    'http://localhost:3000' // ローカル開発用
  ]
}));
```

### 7.3 接続タイムアウト

Render の Free プランでは、一定時間アクティビティがないとサービスがスリープします。WebSocket の接続維持のため、以下を検討してください：

- クライアント側で **ping/pong** メカニズムを実装する
- Free プランのスリープを避けたい場合は **Paid プラン** にアップグレードする

---

## 8. 動作確認

### 8.1 バックエンド

ブラウザまたは curl でヘルスチェック：

```bash
curl https://2p-mahjong-backend.onrender.com/api/status
```

正常なレスポンス例：
```json
{"message": "Mahjong backend is running", "port": 10000}
```

### 8.2 フロントエンド

ブラウザでフロントエンド URL にアクセス：
```
https://2p-mahjong-frontend.onrender.com
```

以下を確認：
- [x] ログインページが表示される
- [x] プレイヤー名を入力してルームを作成できる
- [x] WebSocket 接続が確立される（ブラウザの DevTools > Network > WS で確認）
- [x] CPU 対戦が正常に動作する

### 8.3 WebSocket 接続の確認

ブラウザの開発者ツール（F12）で以下を確認：

1. **Console** タブ: `✅ WebSocket connected successfully` が表示される
2. **Network** タブ: WebSocket 接続が `101 Switching Protocols` で成功している

---

## 9. トラブルシューティング

### 問題: フロントエンドからバックエンドに接続できない

**原因**: 環境変数が正しく設定されていない

**対処**:
1. Render Dashboard でフロントエンドの環境変数を確認
2. `NEXT_PUBLIC_BACKEND_URL` が `wss://` で始まっているか確認
3. `NEXT_PUBLIC_BACKEND_URL_HTTP` が `https://` で始まっているか確認
4. 環境変数変更後、**Manual Deploy** → **Clear build cache & deploy** を実行

### 問題: WebSocket 接続がタイムアウトする

**原因**: Free プランのサービスがスリープ中

**対処**:
- 初回アクセス時は 30〜60 秒程度の起動時間がかかる場合があります
- Paid プラン（月$7〜）にアップグレードすると常時起動になります

### 問題: ビルドが失敗する（フロントエンド）

**原因**: `sharp` パッケージのネイティブビルド失敗など

**対処**:
- Render の Build Logs を確認
- 必要に応じて `frontend/package.json` に以下を追加:
  ```json
  {
    "scripts": {
      "postinstall": "npm rebuild sharp"
    }
  }
  ```

### 問題: `Mixed Content` エラー

**原因**: HTTPS ページから HTTP/WS への接続

**対処**:
- 環境変数で `wss://` と `https://` を使用していることを確認
- `ws://` や `http://` を使用していないか再チェック

### 問題: デプロイ後にファイル書き込みエラーが出る

**原因**: Render の Web Service はエフェメラルファイルシステム（再デプロイでリセット）

**対処**:
- `player-names.csv`、`profiles.json`、`battle-logs/` などのデータファイルは再デプロイ時に消えます
- 永続化が必要な場合は **Render Disk**（有料）を使用するか、外部データベース（PostgreSQL など）への移行を検討してください
- Render は PostgreSQL データベースを無料枠で提供しています

---

## 10. 料金・プランについて

### Free プラン

| 項目 | 制限 |
|------|------|
| Web Service | 750 時間/月（全サービス合計） |
| スリープ | 15分間アクセスがないとスリープ |
| 起動時間 | スリープ復帰に 30〜60 秒 |
| 帯域幅 | 100 GB/月 |

> 💡 フロントエンド + バックエンドの 2 サービスで合計 750 時間/月。常時稼働の場合は約 31 日 × 24 時間 = 744 時間なので、2 サービスだと足りません。検証用途や個人利用なら十分です。

### Starter プラン（月$7/サービス）

| 項目 | 内容 |
|------|------|
| スリープ | なし（常時起動） |
| パフォーマンス | 512 MB RAM, 0.5 CPU |
| 帯域幅 | 100 GB/月 |

> 🎮 対戦ゲームの場合、**スリープなし**が重要なので Starter プラン以上を推奨します。

---

## 補足: `render.yaml` によるインフラ定義（Blueprint）

`render.yaml` をリポジトリのルートに配置すると、Render の **Blueprint** 機能でワンクリックデプロイが可能です。

### render.yaml の例

```yaml
services:
  # バックエンド
  - type: web
    name: 2p-mahjong-backend
    runtime: node
    region: singapore
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
    plan: free  # または starter

  # フロントエンド
  - type: web
    name: 2p-mahjong-frontend
    runtime: node
    region: singapore
    rootDir: frontend
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_BACKEND_URL
        fromService:
          name: 2p-mahjong-backend
          type: web
          property: host
        # ↑ 自動解決されないため、デプロイ後に手動で wss://<host> に修正が必要
      - key: NEXT_PUBLIC_BACKEND_URL_HTTP
        fromService:
          name: 2p-mahjong-backend
          type: web
          property: host
        # ↑ 同様に https://<host> に手動修正が必要
    plan: free  # または starter
```

> ⚠️ `NEXT_PUBLIC_*` 環境変数は `fromService` で自動解決されますが、`wss://` や `https://` プレフィックスの付加が必要なため、Blueprint デプロイ後に **Render Dashboard で手動修正** してから再デプロイしてください。

---

## デプロイ手順チェックリスト

- [ ] Render アカウント作成 & GitHub 連携
- [ ] バックエンド Web Service を作成（Root Directory: `backend`）
- [ ] バックエンドの環境変数を設定
- [ ] バックエンドのデプロイ完了を確認（URL を控える）
- [ ] フロントエンド Web Service を作成（Root Directory: `frontend`）
- [ ] フロントエンドの環境変数を設定（バックエンド URL を使用）
- [ ] フロントエンドのデプロイ完了を確認
- [ ] ブラウザでアクセスして動作確認
- [ ] WebSocket 接続が正常に確立されることを確認
- [ ] CPU 対戦が正常に動作することを確認

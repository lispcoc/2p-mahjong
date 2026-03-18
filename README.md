# 二人麻雀 - Two-Player Mahjong Game

フルスタック麻雀ゲーム実装（Next.js + Express + WebSocket）

## 機能

- ✅ プレイヤー名でログイン（同じコンピュータから別名で複数ログイン可能）
- ✅ ランダム生成されたルームID
- ✅ WebSocketを使用したリアルタイム通信
- ✅ 2人対戦麻雀ゲーム
- ✅ ゲーム状態の共有管理

## プロジェクト構成

```
.
├── backend/              # Express.js バックエンド
│   ├── src/
│   │   ├── server.js     # メインサーバー、WebSocket管理
│   │   ├── routes/       # APIルート
│   │   └── logic/        # ゲームロジック
│   │       ├── GameRoom.js         # ルーム管理
│   │       ├── MahjongLogic.js     # 麻雀ゲームロジック
│   │       └── Tile.js             # 牌クラス
│   └── package.json
│
└── frontend/             # Next.js フロントエンド
    ├── app/
    │   ├── page.tsx      # メインページ
    │   ├── layout.tsx    # レイアウト
    │   └── globals.css   # グローバルスタイル
    ├── components/
    │   ├── LoginPage.tsx
    │   ├── HomePage.tsx
    │   └── GamePage.tsx
    ├── package.json
    └── next.config.js
```

## セットアップと実行

### 🚀 簡単起動方法（推奨）

プロジェクトルートで以下のいずれかを実行するだけで、バックエンドとフロントエンドが同時に起動します。

#### **Windows バッチファイル（最も簡単）**

```bash
# 複数回実行時（依存関係が既にインストール済みの場合）
start-game.bat

# 初回セットアップが必要な場合
setup-and-start.bat
```

#### **PowerShell（Windows）**

```powershell
.\Start-Game.ps1
```

### 📋 手動セットアップ（参考）

#### バックエンドの実行

```bash
cd backend
npm install
npm start
```

バックエンドは `http://localhost:3001` で起動します。

#### フロントエンドの実行

別のターミナルで：

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

## ゲームフロー

1. **ログイン**: プレイヤー名を入力してログイン
2. **ホームページ**: 自分またはルームIDを入力して参加
   - 「部屋を作成」: 新しいルームを作成（ランダムなルームID生成）
   - 「既存の部屋に参加」: 他のプレイヤーが作成したルームに参加
3. **ゲーム開始**: 2人目のプレイヤーが参加するとゲームが自動開始
4. **ゲームプレイ**: ターン制で行動を実行
   - 牌を引く
   - 牌を捨てる
   - ポン（相手の捨て牌と手持ちの牌で異なる組を形成）
   - 和了（勝利）

## 🎮 テスト手順

### 同じコンピュータから2人でプレイ

1. **スクリプトを実行して両サーバーを起動**
   ```bash
   # Windowsバッチファイル
   start-game.bat
   
   # またはPowerShell
   .\Start-Game.ps1
   ```

2. **ブラウザ2つを開く**（またはプライベートウィンドウ）
   - ウィンドウ1: `http://localhost:3000`
   - ウィンドウ2: `http://localhost:3000`

3. **異なる名前でログイン**
   - ウィンドウ1: 「プレイヤーA」
   - ウィンドウ2: 「プレイヤーB」

4. **部屋を作成**
   - ウィンドウ1 で「部屋を作成」をクリック
   - ルームID（例：`1C35EADF`）が表示

5. **部屋に参加**
   - ウィンドウ2 でルームIDを入力して「参加」
   - ゲームが自動開始

6. **ゲームプレイ**
   - ターン制で「牌を引く」「牌を捨てる」などのアクションを実行

## 🛠️ スクリプト説明

### start-game.bat
シンプルな起動スクリプト。依存関係がすでにインストール済みの場合に使用します。
- 新しいウィンドウでバックエンドを起動
- 新しいウィンドウでフロントエンドを起動
- ウィンドウのタイトルで何が実行されているか識別可能

**使用時期**: 2回目以降の起動

### setup-and-start.bat
セットアップ機能付きの起動スクリプト。必要に応じて dependencies をインストールしてから起動します。
- 依存関係がなければ `npm install` を実行
- 両サーバーを同時に起動
- 初回セットアップに最適

**使用時期**: 初回起動、または `node_modules` フォルダを削除した場合

### Start-Game.ps1
PowerShell用スクリプト。Windowsで PowerShell をよく使う場合に推奨。
- カラー出力で見やすい
- ウィンドウをきれいに管理
- PowerShell の組み込みコマンドを活用

**実行方法**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\Start-Game.ps1
```

## API エンドポイント

### POST /api/rooms
新しいルームを作成してランダムなルームIDを生成

**レスポンス:**
```json
{
  "roomId": "ABC12345"
}
```

### GET /api/rooms/:roomId
ルーム情報を取得

**レスポンス:**
```json
{
  "roomId": "ABC12345",
  "players": [
    { "userId": "uuid", "playerName": "プレイヤー1" }
  ],
  "status": "waiting"
}
```

## WebSocket メッセージ

### クライアント → サーバー

**join (ルーム参加):**
```json
{
  "type": "join",
  "payload": {
    "roomId": "ABC12345",
    "playerName": "プレイヤー1"
  }
}
```

**action (ゲームアクション):**
```json
{
  "type": "action",
  "payload": {
    "type": "discard",
    "tileIndex": 0
  }
}
```

### サーバー → クライアント

**joined:**
```json
{
  "type": "joined",
  "payload": {
    "userId": "uuid",
    "playerName": "プレイヤー1",
    "roomId": "ABC12345",
    "players": [...],
    "gameState": {...}
  }
}
```

**gameStateUpdate:**
```json
{
  "type": "gameStateUpdate",
  "payload": {
    "status": "playing",
    "currentTurn": "userId",
    "tiles": {...},
    "wall": 50,
    "discards": {...}
  }
}
```

## ゲームロジック詳細（現在の実装）

### 初期化フェーズ
- 136枚の牌（萬子、筒子、索子、各1-9が4枚、字牌1-7が4枚）
- 各プレイヤーに13枚配布、先攻プレイヤーがさらに1枚ドロー

### アクション
- **引く (Draw)**: 壁から牌を1枚引く
- **捨てる (Discard)**: 手札から牌を1枚捨てる
- **ポン (Pung)**: 相手の捨て牌を使って異なる組を形成
- **和了 (Win)**: ゲームを終了して勝利を宣言

### 勝利条件
- 手札が特定のパターンで満たされた場合（簡略実装）

## 今後の拡張可能性

- [ ] より詳細な役の判定ロジック
- [ ] スコア計算システム
- [ ] 複雑な鳴き（カン）の実装
- [ ] AI対戦モード
- [ ] 戦績の保存とランキング
- [ ] UIの高度なカスタマイズ（牌の視覚的表現など）
- [ ] 複数部屋での同時マッチング
- [ ] 音声・効果音の追加- [ ] イカサマ機能（ツモ順固定・壁牌操作・手牌すり替え等のインフラ済み）
## 技術スタック

### フロントエンド
- Next.js 14
- React 18
- TypeScript
- CSS Modules

### バックエンド
- Node.js
- Express.js
- WebSocket (ws)
- UUID

## ライセンス

MIT

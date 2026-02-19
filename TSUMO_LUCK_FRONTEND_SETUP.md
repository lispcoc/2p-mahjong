# ツモ運フロントエンド実装ガイド

## 概要

フロントエンドにツモ運レベル選択UI を追加しました。ユーザーは部屋作成時にレベル 0-3 を選択でき、その設定がゲーム中に自動的に適用されます。

## 実装内容

### 1. **部屋作成画面（HomePage.tsx）**

#### 追加された要素

- **ツモ運レベルスライダー**：0-3の値を選択可能
- **動的説明文**：選択レベルの説明を表示
- **デフォルト値**：レベル 1（軽い補正）

#### UI要素

```tsx
// スライダーコントロール
<input
  type="range"
  min={0}
  max={3}
  value={tsumoLuck}
  onChange={(e) => setTsumoLuck(Number(e.target.value))}
/>

// 説明表示
{tsumoLuck === 0 && '完全ランダムに牌を引きます'}
{tsumoLuck === 1 && '30%の確率で実用的な牌を引きやすくなります'}
{tsumoLuck === 2 && '50%の確率で実用的な牌を引きやすくなります'}
{tsumoLuck === 3 && '70%の確率で実用的な牌を引きやすくなります'}
```

#### データフロー

```
ユーザーが「部屋を作成」
    ↓
ルール設定モーダルを表示
    ↓
ユーザーがツモ運レベル 0-3 を選択
    ↓
「OK」をクリック
    ↓
API呼び出し: POST /api/rooms
  {
    initialScore: 25000,
    wallTiles: 44,
    oneRoundMatch: false,
    tsumoLuck: 1  ← 選択したレベル
  }
    ↓
room創成成功 → GamePageへ遷移する前に
sessionStorage.setItem('mahjong-tsumoLuck', '1')
```

### 2. **ゲームページ（GamePage.tsx）**

#### sessionStorage からの読み込み

```tsx
// GamePageマウント時
const savedTsumoLuck = sessionStorage.getItem('mahjong-tsumoLuck')
if (savedTsumoLuck) {
  tsumoLuckValue = parseInt(savedTsumoLuck, 10)
  joinPayload.tsumoLuck = tsumoLuckValue
  setTsumoLuck(tsumoLuckValue)
}
```

#### WebSocketメッセージ送信

```json
{
  "type": "join",
  "payload": {
    "roomId": "ABC123",
    "playerName": "Player1",
    "tsumoLuck": 1
  }
}
```

#### localStorage への永続化

ゲーム開始時（gameStart メッセージ受信時）：

```tsx
const sessionData = {
  userId: payload.userId,
  roomId: payload.roomId,
  playerName: payload.playerName,
  tsumoLuck: tsumoLuck,
  timestamp: Date.now(),
}
localStorage.setItem('mahjong-session', JSON.stringify(sessionData))
```

### 3. **再接続時の動作**

ゲーム再接続時は localStorage から tsumoLuck を復元：

```tsx
if (savedSession && savedSession.tsumoLuck) {
  tsumoLuckValue = savedSession.tsumoLuck
  joinPayload.tsumoLuck = tsumoLuckValue
}
```

## 使用フロー

### 1. 新規ルーム作成

```
ホーム画面
  ↓
「部屋を作成」ボタン
  ↓
ルール設定モーダル表示
  ├─ 初期持ち点: 25000
  ├─ ツモ牌の枚数: 44
  ├─ ツモ運レベル: [スライダー 0-3]
  │  ├─ 0: なし
  │  ├─ 1: 軽い (30%)
  │  ├─ 2: 中程度 (50%)
  │  └─ 3: 強い (70%)
  └─ 1局勝負: [チェックボックス]
  ↓
「OK」をクリック
  ↓
ゲーム開始
```

### 2. 既存ルーム参加

```
ホーム画面
  ↓
「ルーム一覧」から選択 または ID入力
  ↓
ゲーム参加
  ↓
デフォルト値 1 を使用
   （将来: 参加前の確認モーダルで変更可能）
```

## 技術仕様

### State管理

| State変数 | 型 | 初期値 | 用途 |
|---|---|---|---|
| `tsumoLuck` | number | 1 | 現在選択中のレベル（0-3） |
| | （GamePage） | 0 | サーバーから受け取ったレベル |

### Storage キー

| キー | 用途 | 有効期間 |
|---|---|---|
| `mahjong-tsumoLuck` | sessionStorage: 新規ルーム作成時のレベル一時保存 | ウィンドウを閉じるまで |
| `mahjong-session` | localStorage: ゲーム復帰用セッション（tsumoLuck含む） | 24時間 |

### API エンドポイント

#### POST /api/rooms

リクエスト：
```json
{
  "initialScore": 25000,
  "wallTiles": 44,
  "oneRoundMatch": false,
  "tsumoLuck": 1
}
```

レスポンス：
```json
{
  "roomId": "ABC123"
}
```

#### WebSocket: join メッセージ

送信：
```json
{
  "type": "join",
  "payload": {
    "roomId": "ABC123",
    "playerName": "Player1",
    "tsumoLuck": 1
  }
}
```

受信：
```json
{
  "type": "gameStart",
  "payload": {
    "userId": "user-123",
    "roomId": "ABC123",
    "playerName": "Player1",
    "players": [...],
    "gameState": {...}
  }
}
```

## コンポーネント変更一覧

### HomePage.tsx

```tsx
// State追加
const [tsumoLuck, setTsumoLuck] = useState(1)

// API呼び出し時
body: JSON.stringify({
  initialScore: sanitizedInitialScore,
  wallTiles: sanitizedWallTiles,
  oneRoundMatch: oneRoundMatch,
  tsumoLuck: tsumoLuck,  ← 追加
})

// モーダル内UI
<input
  type="range"
  min={0}
  max={3}
  value={tsumoLuck}
  onChange={(e) => setTsumoLuck(Number(e.target.value))}
/>
```

### GamePage.tsx

```tsx
// State追加
const [tsumoLuck, setTsumoLuck] = useState(0)

// sessionStorageから読み込み
const savedTsumoLuck = sessionStorage.getItem('mahjong-tsumoLuck')
if (savedTsumoLuck) {
  tsumoLuckValue = parseInt(savedTsumoLuck, 10)
  joinPayload.tsumoLuck = tsumoLuckValue
}

// join メッセージに追加
joinPayload.tsumoLuck = tsumoLuckValue

// localStorage保存時
const sessionData = {
  userId: payload.userId,
  roomId: payload.roomId,
  playerName: payload.playerName,
  tsumoLuck: tsumoLuck,  ← 追加
  timestamp: Date.now(),
}
```

## 動作確認チェックリスト

- [ ] ホーム画面で「部屋を作成」ボタンがモーダル を表示
- [ ] モーダルにツモ運レベルスライダーが表示
- [ ] スライダーを 0-3 で操作可能
- [ ] スライダー下に説明文が動的に表示
- [ ] 「OK」をクリックで room 作成 + GamePage遷移
- [ ] ゲーム開始時に sessionStorage から tsumoLuck を読み込み
- [ ] WebSocket join メッセージに tsumoLuck が含まれている
- [ ] ゲーム再接続時に localStorage から tsumoLuck を復元
- [ ] console 出力で「📊 Using tsumoLuck from sessionStorage: X」が見える

## ブラウザ DevTools での確認

### Application タブ

**sessionStorage**
```
mahjong-tsumoLuck: "1"
```

**localStorage**
```
mahjong-session: {
  "userId": "user-123",
  "roomId": "ABC123",
  "playerName": "Player1",
  "tsumoLuck": 1,
  "timestamp": 1708329600000
}
```

### Console タブ

```
📊 Using tsumoLuck from sessionStorage: 1
💾 Attempting to save session to localStorage: {userId, roomId, playerName, tsumoLuck, timestamp}
```

## 今後の拡張

1. **参加時の選択UI**：既存ルームに参加するプレイヤーも tsumoLuck を選択できるモーダルを追加

2. **設定の動的変更**：ゲーム進行中に tsumoLuck を変更できる機能

3. **統計表示**：各レベルの使用頻度やゲーム結果を表示

4. **AI対戦**: CPU相手を選択する際に、CPU の tsumoLuck レベルを設定

## トラブルシューティング

### tsumoLuck がサーバーに送信されない

**原因**：sessionStorage または localStorage にデータがない

**解決方法**：
1. DevTools → Application → sessionStorage確認
2. 部屋作成時のコンソール出力（「📊 Using tsumoLuck...」）を確認
3. ネットワークタブで join メッセージの payload を確認

### サーバーエラー「tsumoLuck must be 0-3」

**原因**：無効な値がサーバーに送信されている

**解決方法**：
1. homepage で setTsumoLuck が正しく呼ばれているか確認
2. セッションストレージをクリア: `sessionStorage.clear()`
3. ページをリロード

### ゲーム再接続時に tsumoLuck が失われる

**原因**：localStorage の TTL（24時間）を超過している

**解決方法**：
- 新しい部屋を作成するか、ゲーム再開前にリロード

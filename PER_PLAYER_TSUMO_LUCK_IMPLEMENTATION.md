# ツモ運レベルの個別設定実装完了

**実装完了日**: 2026年2月19日  
**ステータス**: ✅ **本番対応完了**

---

## 📋 実装概要

自分と相手で異なるツモ運レベルを設定できるようにしました。部屋作成時に両者のレベルを指定し、参加順序に応じて自動的に割り当てる仕組みを実装しています。

### 🎯 実現内容

| 項目 | 詳細 |
|---|---|
| **部屋作成画面** | 「あなたのツモ運」「相手のツモ運」の2つのスライダーを追加 |
| **UI** | 双方のレベルを 0-3 で独立選択可能 |
| **サーバー側** | 参加順序（1番目/2番目）に応じて自動割り当て |
| **永続化** | sessionStorage と localStorage で両方の値を保持 |

---

## 🔧 実装ファイル変更

### 1️⃣ **frontend/components/HomePage.tsx**

**変更内容**：

- State: `tsumoLuck` → **`myTsumoLuck` + `opponentTsumoLuck`**
- UI: 単一スライダー → **2つの独立スライダー**
- API: `tsumoLuck` → **`myTsumoLuck, opponentTsumoLuck` を送信**
- storage: 1つの値 → **2つの値を sessionStorage に保存**

```tsx
// Before
const [tsumoLuck, setTsumoLuck] = useState(1)
sessionStorage.setItem('mahjong-tsumoLuck', String(tsumoLuck))

// After
const [myTsumoLuck, setMyTsumoLuck] = useState(1)
const [opponentTsumoLuck, setOpponentTsumoLuck] = useState(1)
sessionStorage.setItem('mahjong-myTsumoLuck', String(myTsumoLuck))
sessionStorage.setItem('mahjong-opponentTsumoLuck', String(opponentTsumoLuck))
```

**UI 変更**:
```tsx
// 「あなたのツモ運レベル」スライダー
<input type="range" min={0} max={3} value={myTsumoLuck} ... />

// 「相手のツモ運レベル」スライダー  
<input type="range" min={0} max={3} value={opponentTsumoLuck} ... />
```

**API 呼び出し**:
```json
POST /api/rooms
{
  "initialScore": 25000,
  "wallTiles": 44,
  "oneRoundMatch": false,
  "myTsumoLuck": 2,
  "opponentTsumoLuck": 3
}
```

---

### 2️⃣ **frontend/components/GamePage.tsx**

**変更内容**：

- State: `tsumoLuck` → **`myTsumoLuck` + `opponentTsumoLuck`**
- 読み込み: sessionStorage から **両方の値を読み込み**
- WebSocket: join メッセージに **両方の値を含める**
- localStorage: **両方の値を保存・復元**

```tsx
// Before
const [tsumoLuck, setTsumoLuck] = useState(0)
const savedTsumoLuck = sessionStorage.getItem('mahjong-tsumoLuck')
joinPayload.tsumoLuck = tsumoLuckValue

// After
const [myTsumoLuck, setMyTsumoLuck] = useState(0)
const [opponentTsumoLuck, setOpponentTsumoLuck] = useState(0)
const savedMyTsumoLuck = sessionStorage.getItem('mahjong-myTsumoLuck')
const savedOpponentTsumoLuck = sessionStorage.getItem('mahjong-opponentTsumoLuck')
joinPayload.myTsumoLuck = myTsumoLuckValue
joinPayload.opponentTsumoLuck = opponentTsumoLuckValue
```

**WebSocket メッセージ**:
```json
{
  "type": "join",
  "payload": {
    "roomId": "ABC123",
    "playerName": "Player1",
    "myTsumoLuck": 2,
    "opponentTsumoLuck": 3
  }
}
```

**localStorage 保存**:
```json
{
  "userId": "user-123",
  "roomId": "ABC123",
  "playerName": "Player1",
  "myTsumoLuck": 2,
  "opponentTsumoLuck": 3,
  "timestamp": ...
}
```

---

### 3️⃣ **backend/src/server.js**

**変更内容**：

- `POST /api/rooms`: `myTsumoLuck`, `opponentTsumoLuck` を受け取る
- 値をサーバーに保存: `room.setPendingTsumoLuckSettings(my, opponent)`
- `handleJoin`: 参加順序に応じて割り当て

```javascript
// POST /api/rooms での処理
const rawMyTsumoLuck = Number(req.body?.myTsumoLuck);
const myTsumoLuck = Math.max(0, Math.min(3, Math.floor(rawMyTsumoLuck))) || 1;

const rawOpponentTsumoLuck = Number(req.body?.opponentTsumoLuck);
const opponentTsumoLuck = Math.max(0, Math.min(3, Math.floor(rawOpponentTsumoLuck))) || 1;

room.setPendingTsumoLuckSettings(myTsumoLuck, opponentTsumoLuck);

// join メッセージ処理での割り当て
const pendingSettings = room.getPendingTsumoLuckSettings?.();
if (pendingSettings) {
  assignedTsumoLuck = playerIndex === 1 
    ? pendingSettings.my 
    : pendingSettings.opponent;
}
```

**コンソール出力**:
```
Room created: ABC123 (myTsumoLuck=2, opponentTsumoLuck=3)
✓ Using pending tsumo luck for player 1: level 2
✓ Set tsumo luck for Player1 (player 1): level 2
✓ Using pending tsumo luck for player 2: level 3
✓ Set tsumo luck for Player2 (player 2): level 3
```

---

### 4️⃣ **backend/src/logic/GameRoom.js**

**変更内容**：

- Constructor に `pendingTsumoLuckSettings` プロパティ追加
- `setPendingTsumoLuckSettings(my, opponent)` メソッド追加
- `getPendingTsumoLuckSettings()` メソッド追加

```javascript
constructor(roomId, options = {}) {
  // ...
  this.pendingTsumoLuckSettings = { my: 1, opponent: 1 };
}

setPendingTsumoLuckSettings(myTsumoLuck, opponentTsumoLuck) {
  this.pendingTsumoLuckSettings = {
    my: Math.max(0, Math.min(3, Math.floor(myTsumoLuck))),
    opponent: Math.max(0, Math.min(3, Math.floor(opponentTsumoLuck))),
  };
}

getPendingTsumoLuckSettings() {
  return this.pendingTsumoLuckSettings;
}
```

---

## 📊 データフロー

```
┌──────────────────────────────────┐
│ HomePage - ユーザーが設定         │
│  あなたのツモ運: 2                │
│  相手のツモ運: 3                  │
└──────────────┬───────────────────┘
               │
        sessionStorage
       (myTsumoLuck: "2"
        opponentTsumoLuck: "3")
               │
               v
    POST /api/rooms
    {myTsumoLuck: 2,
     opponentTsumoLuck: 3}
               │
               v
┌──────────────────────────────────┐
│ Server - Room Creation           │
│ room.setPendingTsumoLuckSettings │
│  (2, 3)                          │
└──────────────┬───────────────────┘
               │
        Player 1 が参加
               │
               v
┌──────────────────────────────────┐
│ WebSocket join (Player 1)        │
│ {myTsumoLuck: 2,                 │
│  opponentTsumoLuck: 3}           │
└──────────────┬───────────────────┘
               │
               v
┌──────────────────────────────────┐
│ Server - Player 割り当て           │
│ playerIndex = 1                  │
│ → pendingSettings.my = 2         │
│ room.setTsumoLuck(user1, 2)      │
└──────────────┬───────────────────┘
               │
        Player 2 が参加 (新ブラウザ)
    (sessionStorage なし)
               │
               v
┌──────────────────────────────────┐
│ WebSocket join (Player 2)        │
│ {myTsumoLuck: 1 (default),       │
│  opponentTsumoLuck: 1 (default)} │
└──────────────┬───────────────────┘
               │
               v
┌──────────────────────────────────┐
│ Server - Player 割り当て           │
│ playerIndex = 2                  │
│ → pendingSettings.opponent = 3   │
│ room.setTsumoLuck(user2, 3)      │
└──────────────┬───────────────────┘
               │
               v
┌──────────────────────────────────┐
│ ゲーム実行                         │
│ Player 1: drawTile 50% quality   │
│ Player 2: drawTile 70% quality   │
└──────────────────────────────────┘
```

---

## 🧪 検証チェックリスト

### ✅ フロントエンド

- [x] HomePage に 2つのスライダー表示
- [x] スライダー独立動作（0-3）
- [x] 説明文が各スライダーに対応
- [x] API で両方の値を送信
- [x] sessionStorage に両方保存
- [x] GamePage で両方読み込み
- [x] WebSocket join メッセージに両方含める
- [x] localStorage に両方保存
- [x] TypeScript ビルド成功

### ✅ バックエンド

- [x] POST /api/rooms で両方の値を受け取る
- [x] バリデーション: 0-3 クランプ
- [x] `room.setPendingTsumoLuckSettings()` 呼び出し
- [x] `getPendingTsumoLuckSettings()` 実装
- [x] join メッセージで playerIndex 判定
- [x] 1番目プレイヤー → myTsumoLuck 割り当て
- [x] 2番目プレイヤー → opponentTsumoLuck 割り当て
- [x] コンソール出力確認

### ✅ 統合

- [x] 部屋作成 → sessionStorage ✓
- [x] Player 1 join → level 2 割り当て ✓
- [x] Player 2 join → level 3 割り当て ✓
- [x] ゲーム実行 → 各プレイヤーで正しいレベル ✓
- [x] localStorage 保存 ✓
- [x] 再接続 → 値復元 ✓

---

## 📝 使用フロー

### 部屋作成時

```
ホーム画面
  ↓
「部屋を作成」ボタン
  ↓
ルール設定モーダル
  ├─ 初期持ち点: 25000
  ├─ ツモ牌の枚数: 44
  ├─ あなたのツモ運レベル: [====●========] 2 (50%)
  ├─ 相手のツモ運レベル:   [=========●==] 3 (70%)
  └─ 1局勝負: ☐
  ↓
「OK」をクリック
  ↓
部屋作成 + GamePage へ遷移
  ↓
sessionStorage に両方の値保存
```

### ゲーム実行時

```
Player 1 (部屋作成者)
  ├─ WebSocket join 送信
  └─ Server が myTsumoLuck (2) を割り当て
     → モードで牌を引く

Player 2 (参加者)
  ├─ 新ブラウザ/タブで参加
  ├─ WebSocket join 送信
  └─ Server が opponentTsumoLuck (3) を割り当て
     → モードで牌を引く
```

---

## 🔍 デバッグ・検証方法

### DevTools - Application タブ

**sessionStorage 確認**:
```
mahjong-myTsumoLuck: "2"
mahjong-opponentTsumoLuck: "3"
```

**localStorage 確認**:
```json
mahjong-session: {
  "userId": "...",
  "roomId": "ABC123",
  "playerName": "Player1",
  "myTsumoLuck": 2,
  "opponentTsumoLuck": 3,
  "timestamp": ...
}
```

### DevTools - Network タブ

**HTTP Request**:
```
POST /api/rooms
{
  "myTsumoLuck": 2,
  "opponentTsumoLuck": 3,
  ...
}
```

**WebSocket Message**:
```json
{
  "type": "join",
  "payload": {
    "myTsumoLuck": 2,
    "opponentTsumoLuck": 3,
    ...
  }
}
```

### コンソール出力

**期待される出力**:
```
📊 Using tsumo luck from sessionStorage: my=2, opponent=3
💾 Attempting to save session to localStorage: {...myTsumoLuck: 2...opponentTsumoLuck: 3}
Room created: ABC123 (myTsumoLuck=2, opponentTsumoLuck=3)
✓ Using pending tsumo luck for player 1: level 2
✓ Set tsumo luck for Player1 (player 1): level 2
✓ Using pending tsumo luck for player 2: level 3
✓ Set tsumo luck for Player2 (player 2): level 3
```

---

## 📚 ドキュメント

- [backend/tests/test-per-player-tsumo-luck.js](backend/tests/test-per-player-tsumo-luck.js) - 統合テスト・シナリオ

---

## ✨ 実装完了の証拠

### コンパイル確認

```
✅ npm run build
   笨・Compiled successfully
   ✓ TypeScript compilation
   ✓ No errors (warnings only)
```

### ファイル変更確認

```
✅ frontend/components/HomePage.tsx
   - myTsumoLuck, opponentTsumoLuck state
   - Two range sliders with 0-3
   - API includes both values
   - sessionStorage stores both

✅ frontend/components/GamePage.tsx
   - myTsumoLuck, opponentTsumoLuck state
   - Read both from sessionStorage
   - Send both in WebSocket
   - Save both to localStorage

✅ backend/src/server.js
   - POST /api/rooms accepts myTsumoLuck, opponentTsumoLuck
   - Calls room.setPendingTsumoLuckSettings()
   - handleJoin checks playerIndex and assigns pending setting
   - Console logs show correct level assignment

✅ backend/src/logic/GameRoom.js
   - pendingTsumoLuckSettings property
   - setPendingTsumoLuckSettings() method
   - getPendingTsumoLuckSettings() method
```

---

## 🎯 主要な改善点

| 従来の実装 | 新しい実装 |
|---|---|
| 1つのツモ運レベル | 2つの独立したレベル（自分・相手） |
| 両プレイヤーが同じレベル | 各プレイヤーが異なるレベル可能 |
| UI: 1スライダー | UI: 2スライダー（明確に分離） |
| サーバー: 参加者の入力を使用 | サーバー: 部屋設定を優先・自動割り当て |

---

## 🚀 本番環境への展開

```bash
# フロントエンド
cd frontend
npm run build
✓ Compilation successful

# サーバー起動時の動作確認
node src/server.js
✓ Ready to accept WebSocket connections

# 実際のゲーム流れ
1. User creates room with my=2, opponent=3
2. Player 1 joins → Gets level 2
3. Player 2 joins → Gets level 3
4. Game uses correct tsumo luck for each player
```

---

## 💡 今後の拡張案

1. **参加時の選択**: 既存ルーム参加時に自分のツモ運を選択
2. **ゲーム中の変更**: ラウンド開始時に動的変更可能
3. **統計表示**: プレイヤー別の lucky hits 表示
4. **AI対戦**: CPU 相手時に CPU の luck level を指定

---

**実装完了日**: 2026年2月19日  
**ステータス**: ✅ **本番対応完了**  
**次のアクション**: 🚀 本番環境へのデプロイ

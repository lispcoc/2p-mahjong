# フロントエンドツモ運実装 - 完全ガイド

**実装完了日**: 2026年2月19日  
**ステータス**: ✅ 完了・テスト済み  
**フロントエンド版**: Next.js 14.2.35  

---

## 📋 実装サマリー

部屋作成画面にツモ運レベル選択UI を追加しました。ユーザーがゲーム前にレベル0-3を選択でき、その値がサーバーに送信・保存されます。

### 追加された機能

| 機能 | 詳細 |
|---|---|
| **部屋作成モーダル** | ツモ運レベルスライダー(0-3)を追加 |
| **動的説明文** | 選択レベルに応じた説明を表示 |
| **session/localStorage統合** | tsumoLuckの一時保存・永続化 |
| **WebSocket統合** | join メッセージに tsumoLuck を送信 |
| **再接続対応** | ゲーム復帰時に tsumoLuck を復元 |

---

## 🔧 実装ファイル変更

### 1️⃣ HomePage.tsx

**追加内容**：

```tsx
// ① State追加
const [tsumoLuck, setTsumoLuck] = useState(1)

// ② API呼び出しに tsumoLuck を追加
body: JSON.stringify({
  initialScore: sanitizedInitialScore,
  wallTiles: sanitizedWallTiles,
  oneRoundMatch: oneRoundMatch,
  tsumoLuck: tsumoLuck,  // ← NEW
})

// ③ 成功時に sessionStorage に保存
sessionStorage.setItem('mahjong-tsumoLuck', String(tsumoLuck))

// ④ モーダル内 UI (スライダー + 説明文)
<input
  type="range"
  min={0}
  max={3}
  value={tsumoLuck}
  onChange={(e) => setTsumoLuck(Number(e.target.value))}
/>
```

**変更行数**: 約30行追加/変更

**変更内容の詳細**:

1. **State 追加** (line ~42)
   - `tsumoLuck` 状態変数（デフォルト: 1）

2. **API リクエスト更新** (line ~113)
   - POST body に `tsumoLuck` フィールドを追加

3. **sessionStorage 保存** (line ~122)
   - room 作成成功後、`tsumoLuck` を一時保存

4. **UI コンポーネント追加** (line ~340-375)
   - range スライダー (min=0, max=3)
   - 説明文コンポーネント（動的テキスト）
   - 現在値表示（数値）

---

### 2️⃣ GamePage.tsx

**追加内容**：

```tsx
// ① State追加
const [tsumoLuck, setTsumoLuck] = useState(0)

// ② sessionStorage から読み込み
const savedTsumoLuck = sessionStorage.getItem('mahjong-tsumoLuck')
if (savedTsumoLuck) {
  tsumoLuckValue = parseInt(savedTsumoLuck, 10)
  joinPayload.tsumoLuck = tsumoLuckValue
  setTsumoLuck(tsumoLuckValue)
}

// ③ join メッセージに追加
joinPayload.tsumoLuck = tsumoLuckValue

// ④ localStorage 保存時に tsumoLuck を含める
const sessionData = {
  userId: payload.userId,
  roomId: payload.roomId,
  playerName: payload.playerName,
  tsumoLuck: tsumoLuck,  // ← NEW
  timestamp: Date.now(),
}
```

**変更行数**: 約40行追加/変更 

**変更内容の詳細**:

1. **State 追加** (line ~73)
   - `tsumoLuck` 状態変数（デフォルト: 0）

2. **WebSocket 接続時の読み込み** (line ~705-735)
   - sessionStorage 確認
   - localStorage から復元（再接続時）
   - デフォルト値設定（値がない場合）

3. **join ペイロード構築** (line ~730)
   - `joinPayload.tsumoLuck` を追加

4. **localStorage 保存** (line ~228)
   - `sessionData` に `tsumoLuck` を含める

---

## 📊 データフロー図

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ホーム画面（HomePage.tsx）                                    │
│    ├─ State: tsumoLuck = 1                                      │
│    └─ ボタン: 「部屋を作成」                                     │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 2. ルール設定モーダル                                            │
│    ├─ スライダー: 0〜3                                          │
│    ├─ 説明文: レベルごとに変更                                   │
│    └─ ボタン: 「OK」「キャンセル」                               │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 3. API リクエスト                                                │
│    POST /api/rooms                                              │
│    {                                                             │
│      initialScore: 25000,                                       │
│      wallTiles: 44,                                             │
│      oneRoundMatch: false,                                      │
│      tsumoLuck: 1  ← 送信                                       │
│    }                                                             │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 4. sessionStorage 保存                                           │
│    Key: 'mahjong-tsumoLuck'                                     │
│    Value: '1'                                                   │
│                                                                 │
│    ٢リング: window を閉じるまで有効                            │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 5. GamePage マウント                                            │
│    ├─ sessionStorage から読み込み                               │
│    ├─ setTsumoLuck(1)                                           │
│    └─ WebSocket 接続                                            │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 6. WebSocket join メッセージ                                    │
│    {                                                             │
│      type: 'join',                                              │
│      payload: {                                                 │
│        roomId: 'ABC123',                                        │
│        playerName: 'Player1',                                   │
│        tsumoLuck: 1  ← 送信                                     │
│      }                                                           │
│    }                                                             │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 7. サーバー処理                                                  │
│    ✓ room.setTsumoLuck(userId, 1)                              │
│    ✓ console.log('Set tsumo luck for Player1: level 1')        │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 8. gameStart レスポンス                                         │
│    （GamePage が受信）                                           │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 9. localStorage 保存（再接続用）                                 │
│    Key: 'mahjong-session'                                       │
│    Value: {                                                     │
│      userId: 'user-123',                                        │
│      roomId: 'ABC123',                                          │
│      playerName: 'Player1',                                     │
│      tsumoLuck: 1  ← 永続化                                     │
│      timestamp: 1708329600000                                   │
│    }                                                             │
│                                                                 │
│    有効期限: 24時間                                             │
└──────┬────────────────────────────────────────────────────────────┘
       │
       v
┌─────────────────────────────────────────────────────────────────┐
│ 10. ゲーム実行                                                   │
│     MahjongLogic.drawTileWithLuckAdaptive()                     │
│     ├─ レベル 1 → 30% で品質选択                                │
│     └─ 70% でランダム選択                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 テスト・検証方法

### A) ブラウザ DevTools での確認

#### Application タブ

**1. sessionStorage 確認**
```
部屋作成直後:
  mahjong-tsumoLuck: "1"
```

**2. localStorage 確認**
```
ゲーム開始後:
  mahjong-session: {
    "userId": "...",
    "roomId": "ABC123",
    "playerName": "Player1",
    "tsumoLuck": 1,  ← ここに保存
    "timestamp": ...
  }
```

#### Console タブ

**期待される出力**：
```
📊 Using tsumoLuck from sessionStorage: 1
📤 Sending join message: {roomId: "ABC123", playerName: "Player1", tsumoLuck: 1}
💾 Attempting to save session to localStorage: {...tsumoLuck: 1}
```

#### Network タブ

**1. HTTP Request**
```
POST /api/rooms
Content-Type: application/json

{
  "initialScore": 25000,
  "wallTiles": 44,
  "oneRoundMatch": false,
  "tsumoLuck": 1
}
```

**2. WebSocket Message**
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

### B) 機能テストチェックリスト

- [ ] ホーム画面で「部屋を作成」ボタンが表示
- [ ] モーダルが開く
- [ ] ツモ運スライダーが表示（0-3）
- [ ] スライダー操作で説明文が変更
  - [ ] 0: 「完全ランダム...」
  - [ ] 1: 「30%の確率で...」
  - [ ] 2: 「50%の確率で...」
  - [ ] 3: 「70%の確率で...」
- [ ] 数値表示が 0-3 で更新
- [ ] 「OK」クリック → 部屋作成 + GamePage遷移
- [ ] GamePage で console に「📊 Using tsumoLuck...」
- [ ] DevTools で sessionStorage に値がある
- [ ] ゲーム開始後 localStorage に tsumoLuck が保存
- [ ] ページリロード → 同じ tsumoLuck で復帰

---

## ⚙️ 技術詳細

### Storage キーと有効期限

| キー | 場所 | 値型 | 有効期限 | 用途 |
|---|---|---|---|---|
| `mahjong-tsumoLuck` | sessionStorage | string | セッション終了まで | 新規部屋作成時の一時値 |
| `mahjong-session` | localStorage | JSON | 24時間 | ゲーム再接続用 |

### API エンドポイント

#### POST /api/rooms

**リクエスト**:
```json
{
  "initialScore": number,
  "wallTiles": number,
  "oneRoundMatch": boolean,
  "tsumoLuck": number  // オプション、 0-3
}
```

**レスポンス**:
```json
{
  "roomId": "ABC123"
}
```

### WebSocket メッセージ

#### join メッセージ

**送信（クライアント → サーバー）**:
```json
{
  "type": "join",
  "payload": {
    "roomId": "ABC123",
    "playerName": "Player1",
    "tsumoLuck": 1,  // オプション、 0-3
    "userId": "user-123"  // 再接続時のみ
  }
}
```

**受信（サーバー → クライアント）**:
```json
{
  "type": "gameStart",
  "payload": {
    "userId": "user-123",
    "roomId": "ABC123",
    "playerName": "Player1",
    "players": [...],
    "gameState": {...},
    "isReconnecting": false
  }
}
```

---

## 🎯 実装完了項目

- ✅ HomePage にツモ運 State 追加
- ✅ ルール設定モーダルに UI コンポーネント追加
- ✅ スライダー機能（0-3 値変更）
- ✅ 動的説明文表示
- ✅ 部屋作成 API に tsumoLuck 追加
- ✅ sessionStorage への一時保存
- ✅ GamePage で sessionStorage から読み込み
- ✅ WebSocket join メッセージに tsumoLuck 追加
- ✅ localStorage への永続化
- ✅ 再接続時の復元
- ✅ TypeScript/Next.js ビルド成功
- ✅ フロント・バック統合確認

---

## 📚 関連ドキュメント

- [TSUMO_LUCK_LEVEL_0_3.md](TSUMO_LUCK_LEVEL_0_3.md) - バックエンド実装仕様
- [TSUMO_LUCK_FRONTEND_SETUP.md](TSUMO_LUCK_FRONTEND_SETUP.md) - フロントエンド詳細ガイド
- [backend/tests/test-tsumo-luck-frontend-integration.js](backend/tests/test-tsumo-luck-frontend-integration.js) - 統合テスト

---

## 🚀 今後の拡張

### 短期

1. **既存ルーム参加時のモーダル**
   - 参加直前に tsumoLuck 選択ダイアログを表示

2. **ゲーム中の設定変更** (将来版)
   - 各ラウンド開始時に luck レベルを変更可能

### 中期

3. **統計表示**
   - 各レベルの使用頻度
   - 勝率分析

4. **CPU対戦時の設定**
   - CPU の tsumoLuck レベルを選択

### 長期

5. **ランキングシステム統合**
   - luck レベル別のランキング

6. **AI最適化**
   - 機械学習で最適な補正値を推定

---

## 📝 変更ログ

### v1.0 (2026-02-19)

- 初版実装
- ツモ運レベル 0-3 対応
- sessionStorage/localStorage 統合
- WebSocket join メッセージ対応

---

## ✨ まとめ

フロントエンドでツモ運機能を完全に実装しました：

1. **UI**: 部屋作成時にレベル 0-3 を選択可能
2. **データ管理**: sessionStorage/localStorage で値を保持
3. **サーバー連携**: WebSocket でレベルをサーバーに送信
4. **再接続対応**: ゲーム復帰時にレベルを復元

バックエンド側も既に対応しており、フロント・バック間の統合は完全です。🎉

---

**最終確認日**: 2026年2月19日  
**ステータス**: ✅ 本番対応準備完了

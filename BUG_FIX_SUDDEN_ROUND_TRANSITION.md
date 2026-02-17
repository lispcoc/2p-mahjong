# バグ修正: 局が突然終了して次の局にいきなり移行する現象

## 問題説明
ゲーム局が終了すると、ユーザーが結果を読む時間もなく、いきなり次の局に移行してしまう現象が発生していました。

## 根本原因

### タイミングのミスマッチ
フロントエンドとバックエンドのタイマーが連動することで発生していました：

1. **フロントエンド(useGameConnection.ts)**
   - `gameFinished`メッセージを受け取ると、**5秒後に自動的に`nextRound`アクションを送信**
   - ユーザーが結果を読む前に自動進行

2. **バックエンド(GameRoom.js)**
   - ゲーム終了時に10秒のauto-readyタイマーを開始
   - `nextRound`アクションを受け取るとCPUプレイヤーも自動的に準備完了状態に
   - 両プレイヤーが準備完了すると即座に次の局を開始

### 発火順序
```
1. ゲーム終了
   ↓
2. gameFinishedを全プレイヤーに放送
   ↓
3. フロントエンド: 5秒タイマー開始
   ↓
4. 5秒経過 → フロントエンドが自動的にnextRoundを送信
   ↓
5. バックエンド: nextRoundを受け取る
   - 人間プレイヤーを準備完了状態に
   - CPU プレイヤーも自動的に準備完了状態に
   ↓
6. 両プレイヤーが準備完了 → 即座に次の局を開始
   ↓
7. ユーザーが気付く前に新しいゲームが始まる 😱
```

## 修正内容

### 1. フロントエンドの自動nextRound機能を削除
**ファイル:** [frontend/hooks/useGameConnection.ts](frontend/hooks/useGameConnection.ts)

**変更点:**
- 5秒のauto-readyタイマーを完全に削除
- ユーザーが「次の局へ」ボタンを**手動でクリック**することを要求するように変更

```typescript
// 修正前: 5秒後に自動進行
const timerId = window.setTimeout(() => {
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    wsRef.current.send(
      JSON.stringify({
        type: 'action',
        payload: { type: 'nextRound' },
      })
    )
  }
}, 5000)

// 修正後: ユーザーの手動操作を待つ
setAutoNextTimer(null)
```

### 2. UI メッセージを更新
**ファイル:** [frontend/components/Modals/ScoreResultModal.tsx](frontend/components/Modals/ScoreResultModal.tsx)

**変更点:**
- "5秒後に自動的に次の局へ進みます" → "ボタンをクリックして次の局へ進んでください"

```tsx
// 修正前
'5秒後に自動的に次の局へ進みます'

// 修正後
'ボタンをクリックして次の局へ進んでください'
```

## 修正後の動作フロー

```
1. ゲーム終了
   ↓
2. gameFinishedを全プレイヤーに放送
   ↓
3. ユーザーが結果を読む
   ↓
4. ユーザーが「次の局へ」ボタンをクリック
   ↓
5. フロントエンドがnextRoundアクションを送信
   ↓
6. バックエンド側で両プレイヤーが準備完了確認後、次の局を開始
```

**メリット:**
- ✅ ユーザーが結果を確認する十分な時間がある
- ✅ ユーザーが明示的にボタンをクリックすることで、意図的な操作を要求
- ✅ ゲームの流れが自然で、予測可能になる

## テスト方法

1. バックエンドとフロントエンドを起動
2. ゲームをプレイして、ゲーム局を終了させる
3. 以下を確認:
   - ✅ スコア結果画面が表示される
   - ✅ "ボタンをクリックして次の局へ進んでください" というメッセージが表示
   - ✅ ユーザーが「次の局へ」ボタンをクリックするまで、次の局が開始されない
   - ✅ ボタンをクリック後に新しい局が開始される

## 修正日時
2026/2/17

## 関連ファイル
- frontend/hooks/useGameConnection.ts
- frontend/components/Modals/ScoreResultModal.tsx
- backend/src/logic/GameRoom.js (確認のみ、修正なし)
- backend/src/server.js (確認のみ、修正なし)

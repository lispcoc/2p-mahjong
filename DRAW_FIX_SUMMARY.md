# 流局時のゲーム突然終了バグ修正

## 問題
対局が突然流局になり、結果画面も表示されず、いきなり次の局に移行してしまう

## 原因
牌が尽きて流局(draw)となる際に、複数の場所で以下の問題が発生していました:

1. **drawForTurn()での不完全なフィニッシュ処理**
   - 牌が尽きた時に `finished: true` を返していただけで、その後の ゲーム終了処理がchainされていなかった
   - リーチ中の自動ツモ切り後にdrawが発生する場合、その結果が伝搬されていなかった

2. **handleDiscard()での流局検出漏れ**
   - リーチ中の自動ツモ切り後に相手プレイヤーの自動ドロー処理で流局が発生した場合、その `finished` フラグが返却されていなかった

3. **GameRoom.handlePlayerAction()での不十分なログ**
   - 流局時のエラーハンドリングが不足していた
   - 例外発生時にゲーム状態が不正なままになる可能性があった

4. **server.js での例外ハンドリング不足**
   - gameFinished broadcastの際に例外が発生すると、プレイヤーに結果が通知されずゲームが宙ぶらりんになっていた
   - CPU callback内でも同様の問題があった

## 修正内容

### 1. MahjongLogic.js - drawForTurn() の改善
```javascript
// 牌が尽きた時の詳細な返却値
if (this.wall.length === 0) {
  console.log(`[drawForTurn] ⚠️ WALL EXHAUSTED: Wall has no more tiles, game ending in draw`);
  this.finished = true;
  return { 
    success: true, 
    finished: true, 
    message: 'Draw - no more tiles',
    isDraw: true,  // ← 流局フラグを追加
    tileCount: ... // ← 診断情報
  };
}

// リーチ中の自動ツモ切り後に流局が発生した場合を処理
if (this.players[userId].riichi) {
  const canWin = this.isWinningHand(userId);
  if (!canWin) {
    const result = this.handleDiscard(userId, tileId);
    // ← ディスカード後の流局を反映させる
    if (result.finished) {
      return result;
    }
    return { success: true, autoDiscard: true, discardResult: result };
  }
}
```

### 2. MahjongLogic.js - handleDiscard() の改善
リーチ中の自動ツモ切り後、相手プレイヤーが自動ドロー処理を行う際に流局が発生した場合、その `finished` フラグを返却するようにした:

```javascript
// Auto-draw if no pung is possible
if (!this.pendingPungFor && otherPlayerId) {
  const drawResult = this.drawForTurn(otherPlayerId);
  if (drawResult?.finished) {
    console.log(`[handleDiscard] 🏁 Following auto-draw resulted in finished state during riichi`);
    return {
      success: true,
      finished: true,
      message: drawResult.message,
      isDraw: drawResult.isDraw,  // ← 流局フラグを伝搬
      autoDiscard: true,
    };
  }
}
```

### 3. GameRoom.js - handlePlayerAction() の改善
ゲーム終了時の処理をtry-catchで保護し、詳細なログを追加:

```javascript
if (result.finished) {
  console.log(`[GameRoom.handlePlayerAction] 🏁 Game finished detected, message: "${result.message}"`);
  this.status = 'finished';
  this.lastResult = result;
  
  try {
    // 局の結果を履歴に保存
    const roundResult = {
      round: this.currentRound,
      winner: this.gameLogic.getWinner(),
      winType: result.message,
      scoreResult: result.scoreResult,
      scores: {},
      previousScores: {},
      isDraw: result.isDraw === true,  // ← 流局フラグを保存
    };
    
    // ... スコア計算 ...
    
    this.roundHistory.push(roundResult);
    console.log(`[GameRoom.handlePlayerAction] ✅ Round history saved: ${roundResult.winType}, winner: ${roundResult.winner || 'none (draw)'}`);
  } catch (err) {
    console.error(`[GameRoom.handlePlayerAction] ❌ Error while processing finished game state:`, err);
  }
}
```

### 4. server.js - handleAction() - gameFinishedブロードキャストの改善
例外ハンドリングを追加し、流局フラグを含める:

```javascript
if (room.isFinished()) {
  try {
    const roundHistory = room.getRoundHistory();
    const latestRound = roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;
    const winType = result.message || latestRound?.winType || '';
    const scoreResult = result.scoreResult || latestRound?.scoreResult || null;
    const isDraw = result.isDraw === true || latestRound?.isDraw === true || false;

    const finishedPayload = {
      winner: room.getWinner(),
      scores: room.getScores(),
      scoreResult: scoreResult,
      winType: winType,
      isDraw: isDraw,  // ← フロントエンドで流局を判定できるように
      currentRound: room.getCurrentRound(),
      nextRoundReadyCount: room.getNextRoundReadyCount(),
      totalPlayers: room.players.size,
    };

    console.log(`[🔵 ${requestId}] 📢 Broadcasting gameFinished to all players in room ${roomId}`);
    broadcastToRoom(roomId, {
      type: 'gameFinished',
      payload: finishedPayload,
    });
  } catch (err) {
    console.error(`[🔵 ${requestId}] ❌ Error while broadcasting gameFinished:`, err);
    console.error(`[🔵 ${requestId}] Error details:`, err.message, err.stack);
  }
}
```

### 5. server.js - executeCPUTurnIfNeeded() の改善
CPU callback内でもゲーム終了時の処理を適切に行うようにした:

```javascript
if (room.isFinished()) {
  console.log(`[🔵 CPU CALLBACK] ✅ gameFinished detected in CPU callback`);
  
  try {
    const roundHistory = room.getRoundHistory();
    const latestRound = roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;
    const winType = room.lastResult?.message || latestRound?.winType || '';
    const scoreResult = room.lastResult?.scoreResult || latestRound?.scoreResult || null;
    const isDraw = room.lastResult?.isDraw === true || latestRound?.isDraw === true || false;

    const finishedPayload = {
      winner: room.getWinner(),
      scores: room.getScores(),
      scoreResult: scoreResult,
      winType: winType,
      isDraw: isDraw,  // ← 流局フラグ
      currentRound: room.getCurrentRound(),
      nextRoundReadyCount: room.getNextRoundReadyCount(),
      totalPlayers: room.players.size,
    };
    
    if (room.isGameOver()) {
      finishedPayload.gameOver = true;
      finishedPayload.finalResults = room.getRoundHistory();
    }
    
    console.log(`[🔵 CPU CALLBACK] 📢 Broadcasting gameFinished`);
    broadcastToRoom(roomId, {
      type: 'gameFinished',
      payload: finishedPayload,
    });
  } catch (err) {
    console.error(`[🔵 CPU CALLBACK] ❌ Error while broadcasting gameFinished:`, err);
  }
}
```

## テスト方法
1. ゲームをプレイして、牌が自然に尽きるシーン(流局)を待つ
2. 結果画面が正しく表示されることを確認
3. ログに "Game finished detected" と "gameFinished broadcast complete" が出力されることを確認
4. `isDraw: true` のpayloadがクライアントに送信されることを確認

## 関連ログ出力例
```
[🏁 Game finished detected, message: "Draw - no more tiles"
✅ Round history saved: Draw - no more tiles, winner: none (draw)
📢 Broadcasting gameFinished to all players in room 0F2AFED3
finishedPayload: {..., "isDraw": true, ... }
✅ gameFinished broadcast complete
```

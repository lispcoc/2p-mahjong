#!/usr/bin/env node

const GameRoom = require('../src/logic/GameRoom');

// ログ出力抑制（必要な部分のみ出力）
const originalLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  
  // 出力するログ
  if (msg.includes('[wall]') ||
      msg.includes('[dealTiles]') ||
      msg.includes('[drawTileWithLuckAdaptive]') ||
      msg.includes('[drawForTurn]') ||
      msg.includes('[calculateWinScore]') ||
      msg.includes('ターン') ||
      msg.includes('手牌') ||
      msg.includes('ツモ和了') ||
      msg.includes('和了') ||
      msg.includes('流局') ||
      msg.includes('役') ||
      msg.includes('終了')) {
    originalLog(...args);
  }
};

function runOneRound() {
  return new Promise((resolve) => {
    const room = new GameRoom('test-room', {
      initialScore: 25000,
      wallTiles: 87,
      testMode: true
    });

    // CPU同士を追加
    room.addPlayer('cpu1', 'CPU-1', null, true);
    room.addPlayer('cpu2', 'CPU-2', null, true);

    // ゲーム開始
    room.start();

    let turnCount = 0;
    const maxTurns = 300;

    const playGame = () => {
      if (room.status !== 'playing') {
        // ゲーム終了
        const winner = room.gameLogic.getWinner();
        
        console.log(`[終了] ターン数: ${turnCount}, ステータス: ${room.status}, 勝者: ${winner || 'なし'}`);
        
        if (winner) {
          // 和了の場合
          const scoreResult = room.gameLogic.calculateWinScore(winner, room.gameLogic.players[winner].drawnTile, true);
          const yaku = scoreResult.yaku || [];
          resolve({
            winner: winner,
            winnerName: room.players.get(winner).playerName,
            yaku: yaku,
            score: scoreResult.score || 0
          });
        } else {
          // 流局の場合
          resolve({
            winner: null,
            winnerName: null,
            yaku: [],
            score: 0
          });
        }
        return;
      }

      turnCount++;

      if (turnCount > maxTurns) {
        resolve({
          winner: null,
          winnerName: null,
          yaku: [],
          score: 0
        });
        return;
      }

      const currentPlayerId = room.gameLogic.getCurrentTurn();
      const playerData = room.gameLogic.players[currentPlayerId];

      // ツモ
      if (playerData.drawnTile === null) {
        const drawResult = room.gameLogic.drawForTurn(currentPlayerId);
        if (drawResult && drawResult.finished) {
          room.status = 'finished';
          playGame();
          return;
        }
      }

      // 和了判定
      if (playerData.hand.length === 14 && room.gameLogic.isWinningHand(currentPlayerId)) {
        console.log(`[ターン ${turnCount}] ${currentPlayerId} が和了可能！`);
        const winResult = room.gameLogic.handleWin(currentPlayerId);
        if (winResult.success) {
          room.status = 'finished';
          playGame();
          return;
        }
      }

      // 捨て牌
      const handLength = playerData.hand.length;
      const discardTileIndex = Math.floor(Math.random() * (handLength - 1));
      const discardTile = playerData.hand[discardTileIndex];
      const discardResult = room.gameLogic.handleDiscard(currentPlayerId, `${discardTile.suit}_${discardTile.number}`);

      if (discardResult && discardResult.finished) {
        room.status = 'finished';
        playGame();
        return;
      }

      // 次のターンへ
      setTimeout(playGame, 0);
    };

    playGame();
  });
}

async function main() {
  console.log('========== デバッグモード：1ラウンドのみ実行 ==========\n');
  
  const result = await runOneRound();
  
  console.log('\n========== ゲーム終了 ==========\n');
  console.log(`勝者: ${result.winner || 'なし'}`);
  if (result.winner) {
    console.log(`役: ${result.yaku.map(y => y.name).join('、') || '役なし'}`);
  }
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});

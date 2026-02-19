const GameRoom = require('./src/logic/GameRoom');

/**
 * 偶然役テスト（デバッグモード）
 * CPU同士の対戦を1ラウンド実行して、処理を確認します
 */

class AccidentalYakuDebug {
  async runSingleRound() {
    console.log('\n========== デバッグモード：1ラウンドのみ実行 ==========\n');

    const room = new GameRoom('test-room', {
      initialScore: 25000,
      wallTiles: 87,
      testMode: true
    });

    // CPU同士を追加
    room.addPlayer('cpu1', 'CPU-1', null, true);
    room.addPlayer('cpu2', 'CPU-2', null, true);

    console.log('✓ プレイヤーを追加');
    console.log(`  - CPU-1`);
    console.log(`  - CPU-2`);

    // ゲーム開始
    room.start();
    console.log('✓ ゲーム開始');
    console.log(`  初期ステータス: ${room.status}`);

    const maxTurns = 500;
    let turnCount = 0;

    console.log('\n========== ゲーム進行 ==========\n');

    const playGame = () => {
      return new Promise((resolve) => {
        const executeNextTurn = () => {
          if (room.status !== 'playing') {
            console.log(`\n[終了] ステータス: ${room.status}`);
            
            // ゲーム状態から結果を取得
            const winner = room.gameLogic.getWinner();
            const gameLogic = room.gameLogic;
            
            console.log(`勝者: ${winner ? room.players.get(winner).playerName : 'なし'}`);
            
            if (winner) {
              // 和了の場合
              console.log('勝ち方: 和了');
              const winInfo = {
                hand: gameLogic.players[winner].hand,
                melds: gameLogic.players[winner].melds,
                winningTile: gameLogic.players[winner].drawnTile,
                isTsumo: true,
                isRon: false
              };
              const scoreResult = gameLogic.calculateWinScore(winner, winInfo.winningTile, true);
              console.log(`scoreResult: ${JSON.stringify(scoreResult, null, 2)}`);
              
              const yaku = scoreResult.yaku || [];
              console.log(`\n役数: ${yaku.length}`);
              if (yaku.length > 0) {
                yaku.forEach(y => console.log(`  - ${y.name} (${y.han}飜)`));
              }
              
              resolve({
                success: true,
                yaku: yaku
              });
            } else {
              // 流局の場合
              console.log('勝ち方: 流局');
              resolve({
                success: true,
                yaku: []
              });
            }
            return;
          }

          turnCount++;

          if (turnCount > maxTurns) {
            console.log(`\n[タイムアウト] ${maxTurns}ターンを超過`);
            room.status = 'finished';
            executeNextTurn();
            return;
          }

          // 現在のプレイヤー
          const currentPlayerId = room.gameLogic.getCurrentTurn();
          const playerName = room.players.get(currentPlayerId).playerName;
          const playerData = room.gameLogic.players[currentPlayerId];
          const handSize = playerData.hand.length;
          const wallCount = room.gameLogic.wall.length;

          if (turnCount % 50 === 0) {
            console.log(`[ターン ${turnCount}] ${playerName}: 手牌${handSize}枚, 壁${wallCount}枚`);
          }

          // 手牌にツモ牌がない場合はツモを実行
          if (playerData.drawnTile === null) {
            const drawResult = room.gameLogic.drawForTurn(currentPlayerId);
            if (drawResult && drawResult.finished) {
              console.log(`\n[ターン ${turnCount}] ${playerName} が流局でゲーム終了`);
              console.log(`  メッセージ: ${drawResult.message}`);
              room.status = 'finished';
              executeNextTurn();
              return;
            }
          }

          // 和了可能かチェック
          if (playerData.hand.length === 14 && room.gameLogic.isWinningHand(currentPlayerId)) {
            console.log(`\n[ターン ${turnCount}] ${playerName} が和了可能な手牌を持っています`);
            const winResult = room.gameLogic.handleWin(currentPlayerId);
            if (winResult.success) {
              console.log(`  和了成功！`);
              console.log(`  scoreResult: ${JSON.stringify(winResult.scoreResult, null, 2)}`);
              room.status = 'finished';
              executeNextTurn();
              return;
            } else {
              console.log(`  和了失敗: ${winResult.message}`);
            }
          }

          // 捨て牌を実行
          const handLength = playerData.hand.length;
          const discardTileIndex = Math.floor(Math.random() * (handLength - 1));
          const discardTile = playerData.hand[discardTileIndex];
          const discardResult = room.gameLogic.handleDiscard(currentPlayerId, `${discardTile.suit}_${discardTile.number}`);

          if (discardResult && discardResult.finished) {
            console.log(`\n[ターン ${turnCount}] ${playerName} が捨て牌後にゲーム終了`);
            console.log(`  メッセージ: ${discardResult.message}`);
            room.status = 'finished';
            executeNextTurn();
            return;
          }

          // 次のターンへ
          setImmediate(executeNextTurn);
        };

        executeNextTurn();
      });
    };

    const result = await playGame();
    
    if (result.success) {
      console.log('\n✓ 正常に終了');
    } else {
      console.log('\n❌ エラー：処理が正常に完了しませんでした');
    }
  }
}

// テスト実行
const debug = new AccidentalYakuDebug();
debug.runSingleRound().catch(err => {
  console.error('❌ テスト中にエラーが発生しました:', err);
  process.exit(1);
});

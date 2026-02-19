#!/usr/bin/env node

const GameRoom = require('./src/logic/GameRoom');

function findWinningTile(player, gameLogic) {
  // プレイヤーの手牌をコピー
  const hand = player.hand.map(t => ({ suit: t.suit, number: t.number }));
  
  // すべての牌タイプをチェック
  const allSuits = ['man', 'pin', 'sou', 'honor'];
  const allNumbers = {
    'man': [1, 2, 3, 4, 5, 6, 7, 8, 9],
    'pin': [1, 2, 3, 4, 5, 6, 7, 8, 9],
    'sou': [1, 2, 3, 4, 5, 6, 7, 8, 9],
    'honor': [1, 2, 3, 4, 5, 6, 7] // 東南西北白發中
  };

  for (const suit of allSuits) {
    for (const num of allNumbers[suit]) {
      // テスト用に疑似タイルを追加
      hand.push({ suit, number: num });
      
      // Tile オブジェクトに変換
      const Tile = require('./src/logic/Tile');
      const testHand = hand.map(t => new Tile(t.suit, t.number));
      
      // 和了判定
      if (testHand.length === 14 && gameLogic.checkValidMeldStructure(testHand)) {
        return { suit, number: num };
      }
      
      // 疑似タイルを削除
      hand.pop();
    }
  }
  
  return null;
}

async function testIppatsumari() {
  console.log('========== テスト：一発（イッパツ）==========\n');
  
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
  
  // 最初のプレイヤーを取得
  const p1Id = 'cpu1';
  const p1Data = room.gameLogic.players[p1Id];
  
  console.log(`プレイヤー: ${p1Id}`);
  console.log(`初期手牌数: ${p1Data.hand.length}`);
  
  // 和了可能な牌を探す
  console.log('\n和了可能な牌を探索中...');
  const winningTile = findWinningTile(p1Data, room.gameLogic);
  
  if (!winningTile) {
    console.log('❌ 和了可能な牌が見つかりませんでした');
    return null;
  }
  
  console.log(`✓ 和了可能な牌を発見: ${winningTile.suit}_${winningTile.number}`);
  
  // リーチを宣言
  console.log('\n【ステップ1】リーチを宣言');
  const riichiResult = room.gameLogic.declareRiichi(p1Id);
  if (!riichiResult.success) {
    console.log('❌ リーチ宣言に失敗');
    return null;
  }
  
  const riichiTurn = room.gameLogic.players[p1Id].riichiTurn;
  console.log(`✓ リーチ宣言完了（ターン: ${riichiTurn}）`);
  
  // 次のターンに牌をツモ
  console.log('\n【ステップ2】次のターンで和了牌をツモ');
  
  // 最初のターンのプレイを進める
  const currentTurn = room.gameLogic.getCurrentTurn();
  room.gameLogic.drawForTurn(currentTurn);
  room.gameLogic.handleDiscard(currentTurn, 'man_1');
  room.gameLogic.nextTurn();
  
  // P1のターンを迎える
  room.gameLogic.drawForTurn(p1Id);
  room.gameLogic.nextTurn();
  
  // P1をもう一度ツモ（ここが一発の直後）
  const winResult = room.gameLogic.handleWin(p1Id);
  
  if (!winResult.success) {
    console.log('❌ 和了に失敗');
    return null;
  }
  
  console.log(`✓ 和了成功`);
  
  // 役を確認
  const scoreResult = room.gameLogic.calculateWinScore(p1Id, winningTile, true);
  console.log(`\n役: ${scoreResult.yaku.map(y => y.name).join('、') || '役なし'}`);
  
  if (scoreResult.yaku.some(y => y.name === '一発')) {
    console.log('✅ 【一発】を検出！');
    return true;
  } else {
    console.log('❌ 【一発】を検出できませんでした');
    return false;
  }
}

async function main() {
  const results = [];
  
  // 一発テスト
  results.push(await testIppatsumari());
  
  // 結果サマリー
  console.log('\n\n========== テスト結果 ==========');
  console.log(`一発: ${results[0] ? '✅ 成功' : '❌ 失敗'}`);
}

main().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});

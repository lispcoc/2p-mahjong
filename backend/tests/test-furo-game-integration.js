/**
 * ゲーム実践テスト: AIプレイヤーの副露改善確認
 * 実際のゲームプレイで改善が機能しているか検証
 */

const GameRoom = require('../src/logic/GameRoom');
const Tile = require('../src/logic/Tile');
const MahjongLogic = require('../src/logic/MahjongLogic');

console.log('\n' + '='.repeat(70));
console.log('📈 AI副露改善 - ゲーム実践テスト');
console.log('='.repeat(70) + '\n');

// テストシナリオ: AIが無謀な副露をしないか確認
function testAvoidsDestructiveFuro() {
  console.log('【テスト1】無謀な副露（役破壊）を回避するか？\n');
  
  const room = new GameRoom('test-room', { testMode: true });
  
  // プレイヤー追加
  room.addPlayer('player1', 'Human', null, false);
  room.addPlayer('cpu1', 'CPU', null, true);
  
  // ゲーム開始
  room.start();
  
  // AIプレイヤーを取得
  const cpuUserId = Array.from(room.players.keys()).find(id => 
    room.players.get(id).isCPU
  );
  
  if (!cpuUserId) {
    console.log('❌ CPU プレイヤーが見つかりません\n');
    return false;
  }

  const gameLogic = room.gameLogic;
  
  // CPU手牌を明確に設定（テンパイに向かっている手）
  const cpuHand = [
    new Tile('m', 1), new Tile('m', 2), new Tile('m', 3),
    new Tile('m', 5), new Tile('m', 6), new Tile('m', 7),
    new Tile('m', 8), new Tile('m', 9),
    new Tile('p', 1), new Tile('p', 2), new Tile('p', 3),
    new Tile('s', 1), new Tile('s', 1), // 対子
  ];

  try {
    // ゲーム状態を設定
    gameLogic.playerHands[cpuUserId] = cpuHand.slice();
    
    // AIの副露判定をテスト
    const aiPlayer = room.aiPlayers.get(cpuUserId);
    
    // 無関係な字牌をポンしようとする場合
    const discardedTile = new Tile('honor', 1);
    const shouldPung = aiPlayer.shouldPung(cpuHand, discardedTile, []);
    
    console.log(`CPU手牌: ${cpuHand.map(t => `${t.suit}${t.number}`).join(' ')}`);
    console.log(`捨てられた牌: honor-1（無関係な字牌）`);
    console.log(`ポン判定: ${shouldPung ? 'ポンする（❌悪い）' : 'ポンしない（✅良い）'}`);
    
    if (shouldPung === false) {
      console.log('\n✅ 合格: 無謀な副露を正しく回避しました\n');
      return true;
    } else {
      console.log('\n❌ 失敗: 無謀な副露をしてしまいました\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ エラー: ${error.message}\n`);
    return false;
  }
}

// テストシナリオ2: 良い副露をするか確認
function testPungsWhenBeneficial() {
  console.log('【テスト2】役に有利な副露をするか？\n');
  
  const room = new GameRoom('test-room2', { testMode: true });
  
  // プレイヤー追加
  room.addPlayer('player2', 'Human', null, false);
  room.addPlayer('cpu2', 'CPU', null, true);
  
  // ゲーム開始
  room.start();
  
  const cpuUserId = Array.from(room.players.keys()).find(id => 
    room.players.get(id).isCPU
  );
  
  if (!cpuUserId) {
    console.log('❌ CPU プレイヤーが見つかりません\n');
    return false;
  }

  const gameLogic = room.gameLogic;
  
  // ホンイツ（混一色）を目指す手を設定
  const cpuHand = [
    new Tile('p', 2), new Tile('p', 3), new Tile('p', 4),
    new Tile('p', 5), new Tile('p', 5), new Tile('p', 6),
    new Tile('p', 7), new Tile('p', 8), new Tile('p', 9),
    new Tile('p', 1), new Tile('p', 2), new Tile('p', 3),
  ];

  try {
    gameLogic.playerHands[cpuUserId] = cpuHand.slice();
    const aiPlayer = room.aiPlayers.get(cpuUserId);
    
    // 同じスーツ（筒子）をポンしようとする場合
    const discardedTile = new Tile('p', 4);
    const shouldPung = aiPlayer.shouldPung(cpuHand, discardedTile, []);
    
    console.log(`CPU手牌: ${cpuHand.map(t => `${t.suit}${t.number}`).join(' ')}`);
    console.log(`捨てられた牌: p-4（同じ筒子スーツ、ホンイツ構築）`);
    console.log(`ポン判定: ${shouldPung ? 'ポンする（✅良い）' : 'ポンしない（❌悪い）'}`);
    
    if (shouldPung === true) {
      console.log('\n✅ 合格: 役に有利な副露を正しく選択しました\n');
      return true;
    } else {
      console.log('\n❌ 失敗: 役に有利な副露をしませんでした\n');
      return false;
    }
  } catch (error) {
    console.log(`❌ エラー: ${error.message}\n`);
    return false;
  }
}

// テスト実行
let passed = 0;
let failed = 0;

const test1Result = testAvoidsDestructiveFuro();
if (test1Result) passed++; else failed++;

const test2Result = testPungsWhenBeneficial();
if (test2Result) passed++; else failed++;

// 結果表示
console.log('='.repeat(70));
console.log(`📊 結果: ${passed}/2 テスト合格`);
console.log('='.repeat(70));

if (passed === 2) {
  console.log('\n🎉 副露改善が機能しています！\n');
} else {
  console.log(`\n⚠️  ${failed}個のテストが失敗しました\n`);
}

const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

// テスト1: 捨牌フリテン - 自分の捨て牌に待ち牌がある場合
function testDiscardFuriten() {
  console.log('\n========== テスト1: 捨牌フリテン ==========');
  
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  
  // プレイヤー1の手牌を設定（3索待ちテンパイ）
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2), // 12索
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), // 555萬
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 234筒
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 東東東
    new Tile('sou', 7), new Tile('sou', 7), // 77索（雀頭）
  ];
  
  // プレイヤー1が3索を捨てる（待ち牌を捨てる）
  logic.players['player1'].discards.push(new Tile('sou', 3));
  
  // プレイヤー2が3索を捨てる
  const tile3sou = new Tile('sou', 3);
  
  // フリテンチェック
  const isFuriten = logic.isFuriten('player1', tile3sou);
  console.log(`フリテン判定: ${isFuriten}`);
  console.log(`期待値: true`);
  
  if (isFuriten) {
    console.log('✅ テスト1成功: 捨牌フリテンが正しく検出されました');
  } else {
    console.log('❌ テスト1失敗: 捨牌フリテンが検出されませんでした');
  }
}

// テスト2: 同巡フリテン - ロンを見逃した場合
function testTempFuriten() {
  console.log('\n========== テスト2: 同巡フリテン ==========');
  
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  
  // プレイヤー1の手牌を設定（3索待ちテンパイ）
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2), // 12索
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), // 555萬
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 234筒
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 東東東
    new Tile('sou', 7), new Tile('sou', 7), // 77索（雀頭）
  ];
  
  logic.currentTurnIndex = 1;
  logic.lastDiscard = new Tile('sou', 3);
  logic.lastDiscardBy = 'player2';
  logic.ronPossibleFor = 'player1';
  logic.ronTile = new Tile('sou', 3);
  
  // ロンを見逃す（drawを選択）
  const result = logic.handleDraw('player1');
  
  console.log(`ロン見逃し後のtempFuriten: ${logic.players['player1'].tempFuriten}`);
  console.log(`期待値: true`);
  
  if (logic.players['player1'].tempFuriten) {
    console.log('✅ テスト2成功: 同巡フリテンが正しく設定されました');
  } else {
    console.log('❌ テスト2失敗: 同巡フリテンが設定されませんでした');
  }
  
  // 次の牌を捨てた時にリセットされるかテスト  
  logic.players['player1'].hand.push(new Tile('man', 1)); // 手牌を14枚に
  logic.handleDiscard('player1', 'man_1');
  
  console.log(`捨て牌後のtempFuriten: ${logic.players['player1'].tempFuriten}`);
  console.log(`期待値: false`);
  
  if (!logic.players['player1'].tempFuriten) {
    console.log('✅ テスト2-2成功: 同巡フリテンが正しくリセットされました');
  } else {
    console.log('❌ テスト2-2失敗: 同巡フリテンがリセットされませんでした');
  }
}

// テスト3: リーチ後フリテン - リーチ後にロンを見逃した場合（永続）
function testRiichiPassFuriten() {
  console.log('\n========== テスト3: リーチ後フリテン ==========');
  
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  
  // プレイヤー1をリーチ状態に
  logic.players['player1'].riichi = true;
  
  // プレイヤー1の手牌を設定（3索待ちテンパイ）
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2), // 12索
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), // 555萬
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 234筒
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 東東東
    new Tile('sou', 7), new Tile('sou', 7), // 77索（雀頭）
  ];
  
  logic.currentTurnIndex = 1;
  logic.lastDiscard = new Tile('sou', 3);
  logic.lastDiscardBy = 'player2';
  logic.ronPossibleFor = 'player1';
  logic.ronTile = new Tile('sou', 3);
  
  // リーチ後にロンを見逃す
  const result = logic.handleDraw('player1');
  
  console.log(`ロン見逃し後のriichiPassFuriten: ${logic.players['player1'].riichiPassFuriten}`);
  console.log(`期待値: true`);
  
  if (logic.players['player1'].riichiPassFuriten) {
    console.log('✅ テスト3成功: リーチ後フリテンが正しく設定されました（永続）');
  } else {
    console.log('❌ テスト3失敗: リーチ後フリテンが設定されませんでした');
  }
  
  // 次の牌を捨ててもリーチ後フリテンは永続
  logic.players['player1'].hand.push(new Tile('man', 1)); // 手牌を14枚に
  logic.handleDiscard('player1', 'man_1');
  
  console.log(`捨て牌後のriichiPassFuriten: ${logic.players['player1'].riichiPassFuriten}`);
  console.log(`期待値: true（永続）`);
  
  if (logic.players['player1'].riichiPassFuriten) {
    console.log('✅ テスト3-2成功: リーチ後フリテンは永続的に維持されます');
  } else {
    console.log('❌ テスト3-2失敗: リーチ後フリテンが解除されてしまいました');
  }
}

// テスト4: ロン判定でフリテンが適用されるか
function testRonWithFuriten() {
  console.log('\n========== テスト4: ロン判定でフリテンが適用されるか ==========');
  
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  
  // プレイヤー1の手牌を設定（3索待ちテンパイ）
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2), // 12索
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), // 555萬
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 234筒
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 東東東
    new Tile('sou', 7), new Tile('sou', 7), // 77索（雀頭）
  ];
  
  // プレイヤー1が3索を既に捨てている（待ち牌を捨てている）
  logic.players['player1'].discards.push(new Tile('sou', 3));
  
  const tile3sou = new Tile('sou', 3);
  
  // canWinWithTileでロン判定（フリテンなのでfalseになるはず）
  const canWin = logic.canWinWithTile('player1', tile3sou, true);
  
  console.log(`フリテン状態でのロン可否: ${canWin}`);
  console.log(`期待値: false`);
  
  if (!canWin) {
    console.log('✅ テスト4成功: フリテン時はロンできません');
  } else {
    console.log('❌ テスト4失敗: フリテンでもロンできてしまいます');
  }
}

// テスト5: ツモはフリテンに関係なく和了可能
function testTsumoWithFuriten() {
  console.log('\n========== テスト5: ツモはフリテン関係なし ==========');
  
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  
  // プレイヤー1の手牌を設定（3索待ちテンパイ）
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2), // 12索
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5), // 555萬
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4), // 234筒
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1), // 東東東
    new Tile('sou', 7), new Tile('sou', 7), // 77索（雀頭）
  ];
  
  // プレイヤー1が3索を既に捨てている（フリテン状態）
  logic.players['player1'].discards.push(new Tile('sou', 3));
  
  const tile3sou = new Tile('sou', 3);
  
  // canWinWithTileでツモ判定（isRon=false、フリテンでもtrueになるはず）
  const canWin = logic.canWinWithTile('player1', tile3sou, false);
  
  console.log(`フリテン状態でのツモ可否: ${canWin}`);
  console.log(`期待値: true`);
  
  if (canWin) {
    console.log('✅ テスト5成功: フリテン状態でもツモは可能です');
  } else {
    console.log('❌ テスト5失敗: フリテンでツモができません');
  }
}

// 全テスト実行
console.log('==========================================');
console.log('     フリテン機能テスト');
console.log('==========================================');

testDiscardFuriten();
testTempFuriten();
testRiichiPassFuriten();
testRonWithFuriten();
testTsumoWithFuriten();

console.log('\n==========================================');
console.log('     テスト完了');
console.log('==========================================\n');

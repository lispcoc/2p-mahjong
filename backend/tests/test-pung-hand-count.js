const MahjongLogic = require('./src/logic/MahjongLogic');
const Tile = require('./src/logic/Tile');

console.log('\n=== ポン後の手牌数テスト ===\n');

// テストケース: プレイヤーAが牌を捨てて、プレイヤーBがポンする
const game = new MahjongLogic(['playerA', 'playerB']);
game.initialize();

// 手動で手牌を設定
// プレイヤーAの手牌（ポンされる側）
game.players['playerA'].hand = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
  new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
  new Tile('sou', 4), new Tile('sou', 5), new Tile('sou', 6),
  new Tile('sou', 7), new Tile('sou', 8)
];

// プレイヤーBの手牌（ポンする側）
game.players['playerB'].hand = [
  new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
  new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
  new Tile('sou', 8), new Tile('sou', 8), // ポンできる牌
  new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
  new Tile('honor', 2), new Tile('honor', 3), new Tile('honor', 4)
];

console.log('初期状態:');
console.log(`プレイヤーAの手牌: ${game.players['playerA'].hand.length}枚`);
console.log(`プレイヤーBの手牌: ${game.players['playerB'].hand.length}枚`);
console.log(`プレイヤーAの捨て牌: ${game.players['playerA'].discards.length}枚`);
console.log(`プレイヤーBの捨て牌: ${game.players['playerB'].discards.length}枚`);
console.log(`現在のターン: ${game.getCurrentTurn()}`);

// プレイヤーAがsou_8を捨てる
console.log('\n[アクション] プレイヤーAがsou_8を捨てる');
const discardResult = game.processAction('playerA', { type: 'discard', tileId: 'sou_8' });
console.log(`結果: ${discardResult.success ? '成功' : '失敗'}`);
if (!discardResult.success) {
  console.log(`エラー: ${discardResult.message}`);
}

console.log('\n捨て牌後の状態:');
console.log(`プレイヤーAの手牌: ${game.players['playerA'].hand.length}枚`);
console.log(`プレイヤーBの手牌: ${game.players['playerB'].hand.length}枚`);
console.log(`プレイヤーAの捨て牌: ${game.players['playerA'].discards.length}枚`);
console.log(`  - 捨て牌: ${game.players['playerA'].discards.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーBの捨て牌: ${game.players['playerB'].discards.length}枚`);
console.log(`現在のターン: ${game.getCurrentTurn()}`);
console.log(`ポン可能: ${game.getPendingPungFor() || 'なし'}`);

// プレイヤーBがポンする
console.log('\n[アクション] プレイヤーBがポンする');
const pungResult = game.processAction('playerB', { type: 'pung' });
console.log(`結果: ${pungResult.success ? '成功' : '失敗'} - ${pungResult.message}`);

console.log('\nポン後の状態:');
console.log(`プレイヤーAの手牌: ${game.players['playerA'].hand.length}枚`);
console.log(`  - 手牌: ${game.players['playerA'].hand.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーBの手牌: ${game.players['playerB'].hand.length}枚`);
console.log(`  - 手牌: ${game.players['playerB'].hand.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーAの捨て牌: ${game.players['playerA'].discards.length}枚`);
console.log(`  - 捨て牌: ${game.players['playerA'].discards.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーBの捨て牌: ${game.players['playerB'].discards.length}枚`);
console.log(`プレイヤーBのメルド: ${game.players['playerB'].melds.length}組`);
console.log(`  - メルド: ${game.players['playerB'].melds.map(m => m.map(t => t.toString()).join('-')).join(', ')}`);
console.log(`現在のターン: ${game.getCurrentTurn()}`);

console.log('\n=== 検証結果 ===');
console.log(`✓ プレイヤーAの手牌が13枚? ${game.players['playerA'].hand.length === 13 ? 'OK' : 'NG (期待: 13枚, 実際: ' + game.players['playerA'].hand.length + '枚)'}`);
console.log(`✓ プレイヤーBの手牌が12枚? ${game.players['playerB'].hand.length === 12 ? 'OK' : 'NG (期待: 12枚, 実際: ' + game.players['playerB'].hand.length + '枚)'}`);
console.log(`✓ プレイヤーAの捨て牌が0枚? ${game.players['playerA'].discards.length === 0 ? 'OK' : 'NG (期待: 0枚, 実際: ' + game.players['playerA'].discards.length + '枚)'}`);
console.log(`✓ プレイヤーBのメルドが1組? ${game.players['playerB'].melds.length === 1 ? 'OK' : 'NG (期待: 1組, 実際: ' + game.players['playerB'].melds.length + '組)'}`);
console.log(`✓ 現在のターンがプレイヤーB? ${game.getCurrentTurn() === 'playerB' ? 'OK' : 'NG (期待: playerB, 実際: ' + game.getCurrentTurn() + ')'}`);

// プレイヤーBがポン後に牌を捨てる
console.log('\n[アクション] プレイヤーBがman_5を捨てる');
const discard2Result = game.processAction('playerB', { type: 'discard', tileId: 'man_5' });
console.log(`結果: ${discard2Result.success ? '成功' : '失敗'} - ${discard2Result.message || ''}`);

console.log('\nプレイヤーBの捨て牌後の状態:');
console.log(`プレイヤーAの手牌: ${game.players['playerA'].hand.length}枚`);
console.log(`  - 手牌: ${game.players['playerA'].hand.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーBの手牌: ${game.players['playerB'].hand.length}枚`);
console.log(`  - 手牌: ${game.players['playerB'].hand.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーAの捨て牌: ${game.players['playerA'].discards.length}枚`);
console.log(`  - 捨て牌: ${game.players['playerA'].discards.map(t => t.toString()).join(', ')}`);
console.log(`プレイヤーBの捨て牌: ${game.players['playerB'].discards.length}枚`);
console.log(`  - 捨て牌: ${game.players['playerB'].discards.map(t => t.toString()).join(', ')}`);
console.log(`現在のターン: ${game.getCurrentTurn()}`);

console.log('\n=== 最終検証結果 ===');
console.log(`✓ プレイヤーAの手牌が13枚? ${game.players['playerA'].hand.length === 13 ? 'OK' : 'NG (期待: 13枚, 実際: ' + game.players['playerA'].hand.length + '枚)'}`);
console.log(`✓ プレイヤーBの手牌が11枚? ${game.players['playerB'].hand.length === 11 ? 'OK' : 'NG (期待: 11枚, 実際: ' + game.players['playerB'].hand.length + '枚)'}`);
console.log(`✓ プレイヤーBの捨て牌が1枚? ${game.players['playerB'].discards.length === 1 ? 'OK' : 'NG (期待: 1枚, 実際: ' + game.players['playerB'].discards.length + '枚)'}`);
console.log(`✓ 現在のターンがプレイヤーA? ${game.getCurrentTurn() === 'playerA' ? 'OK' : 'NG (期待: playerA, 実際: ' + game.getCurrentTurn() + ')'}`);

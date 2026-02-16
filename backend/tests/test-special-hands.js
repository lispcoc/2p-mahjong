const MahjongLogic = require('./src/logic/MahjongLogic');
const ScoreCalculator = require('./src/logic/ScoreCalculator');
const Tile = require('./src/logic/Tile');

console.log('=== 特殊手型テスト ===\n');

const calculator = new ScoreCalculator();
const game = new MahjongLogic(['player1', 'player2']);

// ==========================================
// テスト1: 七対子（Seven Pairs）
// ==========================================
console.log('【テスト1: 七対子（チートイツ）】');
const chiitoitsu = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6), new Tile('honor', 6),
];

// Check if can win
game.players['player1'].hand = chiitoitsu;
game.players['player1'].melds = [];
const canWinChiitoitsu = game.isWinningHand('player1');
console.log('和了判定:', canWinChiitoitsu ? '✓ 和了可能' : '✗ 和了不可');

// Calculate score
const scoreResult1 = calculator.calculateScore({
  hand: chiitoitsu,
  melds: [],
  winningTile: new Tile('honor', 6),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});
console.log('役:', scoreResult1.yaku.map(y => y.name).join(', '));
console.log('飜数:', scoreResult1.han, '符:', scoreResult1.fu);
console.log('点数:', scoreResult1.score, '点（' + scoreResult1.scoreType + '）');
console.log();

// ==========================================
// テスト2: 国士無双（Thirteen Orphans）
// ==========================================
console.log('【テスト2: 国士無双（こくしむそう）】');
const kokushi = [
  new Tile('man', 1), new Tile('man', 1),  // ペア
  new Tile('man', 9),
  new Tile('pin', 1),
  new Tile('pin', 9),
  new Tile('sou', 1),
  new Tile('sou', 9),
  new Tile('honor', 1), // 東
  new Tile('honor', 2), // 南
  new Tile('honor', 3), // 西
  new Tile('honor', 4), // 北
  new Tile('honor', 5), // 白
  new Tile('honor', 6), // 發
  new Tile('honor', 7), // 中
];

// Check if can win
game.players['player1'].hand = kokushi;
game.players['player1'].melds = [];
const canWinKokushi = game.isWinningHand('player1');
console.log('和了判定:', canWinKokushi ? '✓ 和了可能' : '✗ 和了不可');

// Calculate score
const scoreResult2 = calculator.calculateScore({
  hand: kokushi,
  melds: [],
  winningTile: new Tile('man', 1),
  isTsumo: true,
  isRon: false,
  riichi: false,
  menzen: true
});
console.log('役:', scoreResult2.yaku.map(y => y.name).join(', '));
console.log('飜数:', scoreResult2.han, '符:', scoreResult2.fu);
console.log('点数:', scoreResult2.score, '点（' + scoreResult2.scoreType + '）');
console.log();

// ==========================================
// テスト3: 七対子（副露がある場合は和了不可）
// ==========================================
console.log('【テスト3: 七対子（副露がある場合）】');
game.players['player1'].hand = chiitoitsu.slice(0, 11); // 11枚
game.players['player1'].melds = [[new Tile('honor', 7), new Tile('honor', 7), new Tile('honor', 7)]]; // 1メルド
const canWinChiitoitsuWithMelds = game.isWinningHand('player1');
console.log('和了判定:', canWinChiitoitsuWithMelds ? '✓ 和了可能' : '✗ 和了不可（副露があるため）');
console.log();

// ==========================================
// テスト4: 国士無双（副露がある場合は和了不可）
// ==========================================
console.log('【テスト4: 国士無双（副露がある場合）】');
game.players['player1'].hand = kokushi.slice(0, 11); // 11枚
game.players['player1'].melds = [[new Tile('honor', 7), new Tile('honor', 7), new Tile('honor', 7)]]; // 1メルド
const canWinKokushiWithMelds = game.isWinningHand('player1');
console.log('和了判定:', canWinKokushiWithMelds ? '✓ 和了可能' : '✗ 和了不可（副露があるため）');
console.log();

// ==========================================
// テスト5: 不完全な七対子（6対+1枚）
// ==========================================
console.log('【テスト5: 不完全な七対子（6対+1枚）】');
const incompleteChiitoitsu = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6),
  new Tile('honor', 7),
];
game.players['player1'].hand = incompleteChiitoitsu;
game.players['player1'].melds = [];
const canWinIncomplete = game.isWinningHand('player1');
console.log('和了判定:', canWinIncomplete ? '✓ 和了可能' : '✗ 和了不可（不完全なため）');
console.log();

console.log('=== テスト完了 ===');

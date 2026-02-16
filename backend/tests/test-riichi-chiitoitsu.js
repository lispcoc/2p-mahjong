#!/usr/bin/env node

const MahjongLogic = require('./src/logic/MahjongLogic');
const Tile = require('./src/logic/Tile');

console.log('\n========================================');
console.log('七対子（チートイツ）の立直テスト');
console.log('========================================\n');

// 関数: テストタイルを作成
function createTestHand() {
  // 七対子の6対+1枚（待ちが見つかるように）
  // m1m1 m2m2 m3m3 p1p1 p2p2 s1s1 s2
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 2),
    new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 1),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 1), new Tile('sou', 1),
    new Tile('sou', 2)  // 13枚
  ];
  return hand;
}

// テスト用のゲームロジックを作成
const logic = new MahjongLogic(['player1', 'player2']);

// プレイヤーを作成
const players = {
  'player1': { name: 'Player1', hand: createTestHand(), melds: [], score: 24000 }
};

logic.players = logic.players || {};
Object.assign(logic.players, {
  'player1': {
    ...logic.players['player1'],
    hand: createTestHand(),
    melds: [],
    score: 24000
  }
});

console.log('--- テスト1：七対子のゲットウィニングタイル ---');
const hand = players['player1'].hand;
console.log('Hand:', hand.map(t => t.toString()).join(' '));
console.log('Hand length:', hand.length);

const winningTiles = logic.getWinningTiles(hand, []);
console.log('Winning tiles found:', winningTiles.length);
if (winningTiles.length > 0) {
  console.log('Winning tiles:', winningTiles.map(t => t.display).join(', '));
} else {
  console.log('❌ ERROR: No winning tiles found!');
}

// Test 2: checkValidMeldStructure（通常の手型）
console.log('\n--- テスト2：通常の手型（対照）---');
const regularHand = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
  new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
  new Tile('honor', 1)  // 13枚
];
console.log('Hand:', regularHand.map(t => t.toString()).join(' '));
const regularWinningTiles = logic.getWinningTiles(regularHand, []);
console.log('Winning tiles found:', regularWinningTiles.length);
if (regularWinningTiles.length > 0) {
  console.log('Winning tiles:', regularWinningTiles.map(t => t.display).join(', '));
}

// Test 3: declareRiichiの動作確認
console.log('\n--- テスト3：declareRiichiメソッド ---');
logic.players = {
  'player1': {
    name: 'Player1',
    hand: createTestHand(),
    melds: [],
    score: 24000,
    riichi: false,
    discards: [],
    riichiTurn: -1,
    riichiDiscardIndex: -1
  }
};

const result = logic.declareRiichi('player1', 12); // 最後のタイル（s2）を捨てる
console.log('Riichi declaration result:', result);

console.log('\n========================================\n');

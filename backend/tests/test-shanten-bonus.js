/**
 * シャンテン改善ボーナスのテスト
 */
const MahjongLogic = require('../src/logic/MahjongLogic');

const game = new MahjongLogic(['p1', 'p2'], { tsumoLuckSettings: { p1: 3, p2: 0 } });

// === Test 1: 聴牌手 ===
console.log('=== Test 1: 聴牌手 (3m待ち) ===');
const tenpaiHand = [
  { suit: 'man', number: 1 }, { suit: 'man', number: 2 },
  { suit: 'pin', number: 2 }, { suit: 'pin', number: 3 }, { suit: 'pin', number: 4 },
  { suit: 'sou', number: 5 }, { suit: 'sou', number: 6 }, { suit: 'sou', number: 7 },
  { suit: 'man', number: 7 }, { suit: 'man', number: 8 }, { suit: 'man', number: 9 },
  { suit: 'honor', number: 1 }, { suit: 'honor', number: 1 },
];

let start = Date.now();
const r1 = game.analyzeShantenImprovement(tenpaiHand, []);
const t1 = Date.now() - start;
console.log('  アガリ牌:', [...r1.winningTileKeys]);
console.log('  聴牌進行:', [...r1.tenpaiAdvancingKeys]);
console.log('  処理時間:', t1, 'ms');
console.log('  結果:', r1.winningTileKeys.has('man_3') ? 'OK' : 'NG');

// === Test 2: 1シャンテン手 ===
console.log('\n=== Test 2: 1シャンテン手 ===');
const oneShanten = [
  { suit: 'man', number: 1 }, { suit: 'man', number: 2 },
  { suit: 'pin', number: 2 }, { suit: 'pin', number: 3 }, { suit: 'pin', number: 4 },
  { suit: 'sou', number: 5 }, { suit: 'sou', number: 6 }, { suit: 'sou', number: 7 },
  { suit: 'man', number: 7 }, { suit: 'man', number: 8 }, { suit: 'man', number: 9 },
  { suit: 'honor', number: 1 }, { suit: 'honor', number: 2 },
];

start = Date.now();
const r2 = game.analyzeShantenImprovement(oneShanten, []);
const t2 = Date.now() - start;
console.log('  アガリ牌:', [...r2.winningTileKeys]);
console.log('  聴牌進行:', [...r2.tenpaiAdvancingKeys]);
console.log('  処理時間:', t2, 'ms');
const has3m = r2.tenpaiAdvancingKeys.has('man_3');
const has1z = r2.tenpaiAdvancingKeys.has('honor_1');
console.log('  3mで聴牌に進む:', has3m ? 'OK' : 'NG');
console.log('  1z(東)で聴牌に進む:', has1z ? 'OK' : 'NG');

// === Test 3: 接続性ボーナス ===
console.log('\n=== Test 3: 接続性ボーナス ===');
const hand3 = [
  { suit: 'man', number: 4 }, { suit: 'man', number: 5 }, { suit: 'man', number: 6 },
  { suit: 'pin', number: 1 }, { suit: 'pin', number: 2 },
];
console.log('  5m (トイツ+隣接):', game.getConnectivityBonus({ suit: 'man', number: 5 }, hand3));
console.log('  3m (隣接):', game.getConnectivityBonus({ suit: 'man', number: 3 }, hand3));
console.log('  9s (孤立):', game.getConnectivityBonus({ suit: 'sou', number: 9 }, hand3));
console.log('  3p (隣接):', game.getConnectivityBonus({ suit: 'pin', number: 3 }, hand3));

// === Test 4: スコア比較 (聴牌手でアガリ牌 vs 無関係牌) ===
console.log('\n=== Test 4: スコア比較 ===');
const shantenAnalysis = game.analyzeShantenImprovement(tenpaiHand, []);

const winTile = { suit: 'man', number: 3 };
let scoreWin = game.getTileScoreWithHandAnalysis(winTile, tenpaiHand);
if (shantenAnalysis.winningTileKeys.has('man_3')) scoreWin += 50;

const badTile = { suit: 'sou', number: 9 };
let scoreBad = game.getTileScoreWithHandAnalysis(badTile, tenpaiHand);
scoreBad += game.getConnectivityBonus(badTile, tenpaiHand);

console.log('  3m (アガリ牌) スコア:', scoreWin);
console.log('  9s (無関係牌) スコア:', scoreBad);
console.log('  比率:', (scoreWin / scoreBad).toFixed(1) + 'x');

// === Test 5: パフォーマンス (深いシャンテン) ===
console.log('\n=== Test 5: パフォーマンス ===');
const deepHand = [
  { suit: 'man', number: 1 }, { suit: 'man', number: 3 },
  { suit: 'pin', number: 2 }, { suit: 'pin', number: 5 }, { suit: 'pin', number: 8 },
  { suit: 'sou', number: 1 }, { suit: 'sou', number: 4 }, { suit: 'sou', number: 7 },
  { suit: 'man', number: 6 }, { suit: 'man', number: 9 },
  { suit: 'honor', number: 1 }, { suit: 'honor', number: 3 }, { suit: 'honor', number: 5 },
];
start = Date.now();
const r5 = game.analyzeShantenImprovement(deepHand, []);
const t5 = Date.now() - start;
console.log('  深いシャンテン処理時間:', t5, 'ms');
console.log('  聴牌進行牌数:', r5.tenpaiAdvancingKeys.size);
console.log('  許容範囲 (<200ms):', t5 < 200 ? 'OK' : 'WARN (' + t5 + 'ms)');

console.log('\n========================================');
console.log('テスト完了');
console.log('========================================');

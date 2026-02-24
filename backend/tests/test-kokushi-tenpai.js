const TenpaiChecker = require('../src/logic/TenpaiChecker');
const Tile = require('../src/logic/Tile');

console.log('=== 国士無双の聴牌判定テスト ===\n');

// ==========================================
// テスト1: 国士無双の聴牌（12種類+1枚の手）
// ==========================================
console.log('【テスト1: 国士無双の聴牌 - 白（honor 5）がない】');
const kokushiTenpai = [
  new Tile('man', 1), new Tile('man', 9),
  new Tile('pin', 1), new Tile('pin', 9),
  new Tile('sou', 1), new Tile('sou', 9),
  new Tile('honor', 1), // 東
  new Tile('honor', 2), // 南
  new Tile('honor', 3), // 西
  new Tile('honor', 4), // 北
  new Tile('honor', 6), // 發
  new Tile('honor', 7), // 中
  new Tile('man', 1),   // 萬子の1がペア
];

console.log('手牌の枚数:', kokushiTenpai.length);
const winners1 = TenpaiChecker.getWinningTiles(kokushiTenpai, []);
console.log('和了牌:', winners1.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners1.length);
console.log('期待値: 白（honor 5） のみ');
console.log();

// ==========================================
// テスト2: 国士無双の聴牌（別パターン - 中がない）
// ==========================================
console.log('【テスト2: 国士無双の聴牌 - 中（honor 7）がない】');
const kokushiTenpai2 = [
  new Tile('man', 1), new Tile('man', 9),
  new Tile('pin', 1), new Tile('pin', 9),
  new Tile('sou', 1), new Tile('sou', 9),
  new Tile('honor', 1), // 東
  new Tile('honor', 2), // 南
  new Tile('honor', 3), // 西
  new Tile('honor', 4), // 北
  new Tile('honor', 5), // 白
  new Tile('honor', 6), // 發
  new Tile('honor', 1), // 東がペア
];

console.log('手牌の枚数:', kokushiTenpai2.length);
const winners2 = TenpaiChecker.getWinningTiles(kokushiTenpai2, []);
console.log('和了牌:', winners2.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners2.length);
console.log('期待値: 中（honor 7） のみ');
console.log();

// ==========================================
// テスト3: 不完全な国士無双（聴牌ではない）
// ==========================================
console.log('【テスト3: 不完全な国士無双（聴牌ではない）】');
const notKokushiTenpai = [
  new Tile('man', 1), new Tile('man', 9),
  new Tile('pin', 1), new Tile('pin', 9),
  new Tile('sou', 1), new Tile('sou', 9),
  new Tile('honor', 1), // 東
  new Tile('honor', 2), // 南
  new Tile('honor', 3), // 西
  new Tile('honor', 4), // 北
  new Tile('honor', 5), // 白
  new Tile('honor', 6), // 發
  // 中がなく、別の牌が2枚ある
  new Tile('man', 2),   // ターミナルではない牌
];

console.log('手牌の枚数:', notKokushiTenpai.length);
const winners3 = TenpaiChecker.getWinningTiles(notKokushiTenpai, []);
console.log('和了牌:', winners3.length === 0 ? 'なし' : winners3.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners3.length);
console.log('期待値: 0 (国士無双の聴牌ではない)');
console.log();

// ==========================================
// テスト4: isKokushi の直接テスト
// ==========================================
console.log('【テスト4: isKokushi メソッドの直接テスト】');
const perfectKokushi = [
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

const isKokushi = TenpaiChecker.isKokushi(perfectKokushi);
console.log('国士無双判定:', isKokushi ? '✓ TRUE' : '✗ FALSE');
console.log('期待値: TRUE');
console.log();

console.log('=== テスト完了 ===');

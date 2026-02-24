const TenpaiChecker = require('../src/logic/TenpaiChecker');
const Tile = require('../src/logic/Tile');

console.log('=== 七対子の聴牌判定テスト ===\n');

// ==========================================
// テスト1: 七対子の聴牌（6対+1枚の手）
// ==========================================
console.log('【テスト1: 七対子の聴牌 - 6対+1枚の手】');
const chiitoitsuTenpai = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6),
];

const winners1 = TenpaiChecker.getWinningTiles(chiitoitsuTenpai, []);
console.log('和了牌:', winners1.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners1.length);
console.log('期待値: 白（honor 6） のみ');
console.log();

// ==========================================
// テスト2: 七対子の聴牌（別パターン）
// ==========================================
console.log('【テスト2: 七対子の聴牌 - 別パターン】');
const chiitoitsuTenpai2 = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('honor', 1),
];

const winners2 = TenpaiChecker.getWinningTiles(chiitoitsuTenpai2, []);
console.log('和了牌:', winners2.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners2.length);
console.log('期待値: 東（honor 1） のみ');
console.log();

// ==========================================
// テスト3: 完全でない手（聴牌ではない）
// ==========================================
console.log('【テスト3: 完全でない手（聴牌ではない）】');
const notTenpai = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 2), new Tile('man', 2),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 1), new Tile('pin', 1),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('sou', 1),
  new Tile('honor', 1),
  new Tile('honor', 2), // 4对+3枚 → 聴牌形ではない
];

const winners3 = TenpaiChecker.getWinningTiles(notTenpai, []);
console.log('和了牌:', winners3.length === 0 ? 'なし' : winners3.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners3.length);
console.log('期待値: 0 (聴牌ではない)');
console.log();

// ==========================================
// テスト4: 通常の和了形（3面+2対）との併存チェック
// ==========================================
console.log('【テスト4: 通常の和了形との併存チェック】');
const mixedTenpai = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('honor', 1),
  new Tile('honor', 2), // 3面+2対＋2枚 → 通常の聴牌形
];

const winners4 = TenpaiChecker.getWinningTiles(mixedTenpai, []);
console.log('和了牌:', winners4.length === 0 ? 'なし（聴牌形ではない）' : winners4.map(t => `${t.display}(${t.count})`).join(', '));
console.log('和了牌数:', winners4.length);
console.log('注: この手牌（3面+2対+2枚）は聴牌形ではないため、和了牌なし');
console.log();

// ==========================================
// テスト5: 結合テスト - TenpaiChecker.isChiitoitsu の直接テスト
// ==========================================
console.log('【テスト5: isChiitoitsu メソッドの直接テスト】');
const perfectChiitoitsu = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6), new Tile('honor', 6),
];

const isChiitoitsu = TenpaiChecker.isChiitoitsu(perfectChiitoitsu);
console.log('七対子判定:', isChiitoitsu ? '✓ TRUE' : '✗ FALSE');
console.log('期待値: TRUE');
console.log();

console.log('=== テスト完了 ===');

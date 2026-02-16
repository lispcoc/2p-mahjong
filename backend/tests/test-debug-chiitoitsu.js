const TenpaiChecker = require('./src/logic/TenpaiChecker');
const Tile = require('./src/logic/Tile');

console.log('=== 七対子の聴牌判定デバッグテスト ===\n');

// テスト1: 七対子の聴牌（6対+1対の手）
console.log('【テスト1: 手牌の確認】');
const chiitoitsuTenpai = [
  new Tile('man', 1), new Tile('man', 1),
  new Tile('man', 3), new Tile('man', 3),
  new Tile('pin', 2), new Tile('pin', 2),
  new Tile('pin', 5), new Tile('pin', 5),
  new Tile('sou', 4), new Tile('sou', 4),
  new Tile('sou', 7), new Tile('sou', 7),
  new Tile('honor', 6),
];

console.log('手牌の枚数:', chiitoitsuTenpai.length);
console.log('手牌:', chiitoitsuTenpai.map(t => `${t.suit}${t.number}`).join(', '));
console.log();

// テスト2: honor 6（白）を追加して和了形をテスト
console.log('【テスト2: honor 6（白）を追加して和了形テスト】');
const testHand1 = chiitoitsuTenpai.concat([new Tile('honor', 6)]);
console.log('テスト手牌の枚数:', testHand1.length);
const isChiitoitsu1 = TenpaiChecker.isChiitoitsu(testHand1);
console.log('七対子判定:', isChiitoitsu1);
console.log('期待値: TRUE（6対+1対になる）');
console.log();

// テスト3: honor 7（北）を追加して和了形をテスト
console.log('【テスト3: honor 7（北）を追加して和了形テスト】');
const testHand2 = chiitoitsuTenpai.concat([new Tile('honor', 7)]);
console.log('テスト手牌の枚数:', testHand2.length);
const isChiitoitsu2 = TenpaiChecker.isChiitoitsu(testHand2);
console.log('七対子判定:', isChiitoitsu2);
console.log('期待値: FALSE（6対+1ペアになるが、最後の1枚が異なる）');
console.log();

// テスト4: getChiitoitsuWinningTiles の直接テスト
console.log('【テスト4: getChiitoitsuWinningTiles の直接テスト】');
const tileCount = {};
chiitoitsuTenpai.forEach((tile) => {
  const key = `${tile.suit}_${tile.number}`;
  tileCount[key] = (tileCount[key] || 0) + 1;
});
console.log('タイルカウント:', tileCount);
const chiitoitsuWinners = TenpaiChecker.getChiitoitsuWinningTiles(chiitoitsuTenpai, tileCount);
console.log('七対子の和了牌:', chiitoitsuWinners.map(t => `${t.display}`).join(', '));
console.log('七対子の和了牌数:', chiitoitsuWinners.length);
console.log('期待値: honor 6（白） のみ');
console.log();

// テスト5: getWinningTiles の全体テスト
console.log('【テスト5: getWinningTiles の全体テスト】');
const allWinners = TenpaiChecker.getWinningTiles(chiitoitsuTenpai, []);
console.log('すべての和了牌:', allWinners.map(t => `${t.display}`).join(', '));
console.log('すべての和了牌数:', allWinners.length);
console.log();

console.log('=== テスト完了 ===');

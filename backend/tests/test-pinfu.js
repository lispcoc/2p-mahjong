const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');

// テストケース: 99m123566778p234s + 8pロン
const calculator = new ScoreCalculator();

// 手牌を作成
const hand = [
  new Tile('manzu', 9),
  new Tile('manzu', 9),
  new Tile('pinzu', 1),
  new Tile('pinzu', 2),
  new Tile('pinzu', 3),
  new Tile('pinzu', 5),
  new Tile('pinzu', 6),
  new Tile('pinzu', 6),
  new Tile('pinzu', 7),
  new Tile('pinzu', 7),
  new Tile('pinzu', 8),
  new Tile('souzu', 2),
  new Tile('souzu', 3),
  new Tile('souzu', 4),
];

console.log('手牌:', hand.map(t => t.toString()).join(' '));
console.log('合計:', hand.length, '枚');

// 待ちの分析
console.log('\n【待ちの分析】');
console.log('筒子部分: 1-2-3-5-6-6-7-7-8');
console.log('面子構成:');
console.log('  - 99m (雀頭)');
console.log('  - 123p (順子)');
console.log('  - 567p (順子) または 678p (順子)');
console.log('  - 67p (残り) --> この部分が重要');
console.log('  - 234s (順子)');
console.log('\n56677p の分解:');
console.log('  パターン1: 567p + 67p (67pは5pまたは8pを待つ = 両面待ち!)');
console.log('  パターン2: 678p + 56p (56pは4pまたは7pを待つ)');
console.log('\n8pでロンした場合: 567p + 678p となり、両面待ちでアガリ');
console.log('5pでロンした場合: 567p + 567p となり、両面待ちでアガリ');
console.log('\n結論: この手は 5p/8p の両面待ち');

// スコア計算
const winInfo = {
  hand: hand,
  melds: [],
  winningTile: new Tile('pinzu', 8),
  isTsumo: false,
  isRon: true
};

const result = calculator.calculateScore(winInfo);
console.log('\n【スコア計算結果】');
console.log('役:', result.yaku.map(y => `${y.name}(${y.han}飜)`).join(', '));
console.log('飜数:', result.han);
console.log('符:', result.fu);
console.log('得点:', result.score);
console.log('\n判定:', result.valid ? '和了' : result.error);

// 平和の条件チェック
console.log('\n【平和の条件】');
console.log('1. 門前である: ✓ (メルド0枚)');
console.log('2. 全て順子である: ✓ (刻子なし)');
console.log('3. 雀頭が役牌でない: ✓ (9萬は役牌でない)');
console.log('4. 両面待ちである: ✓ (5p/8pの両面待ち)');
console.log('\n結論: 平和が付くべき！');

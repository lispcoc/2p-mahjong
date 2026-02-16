const Tile = require('./src/logic/Tile');
const ScoreCalculator = require('./src/logic/ScoreCalculator');

// テストケース: 12223456m345789p
const calculator = new ScoreCalculator();

// 手牌を作成（アガリ後の14枚）
const hand = [
  new Tile('manzu', 1),
  new Tile('manzu', 2),
  new Tile('manzu', 2),
  new Tile('manzu', 2),
  new Tile('manzu', 3),
  new Tile('manzu', 4),
  new Tile('manzu', 5),
  new Tile('manzu', 6),
  new Tile('pinzu', 3),
  new Tile('pinzu', 4),
  new Tile('pinzu', 5),
  new Tile('pinzu', 7),
  new Tile('pinzu', 8),
  new Tile('pinzu', 9),
];

console.log('手牌: 12223456m345789p');
console.log('合計:', hand.length, '枚\n');

console.log('【面子構成の分析】');
console.log('萬子: 1-2-2-2-3-4-5-6');
console.log('筒子: 3-4-5-7-8-9\n');
console.log('考えられる構成:');
console.log('  - 雀頭: 22m');
console.log('  - 順子1: 123m');
console.log('  - 順子2: 456m');
console.log('  - 順子3: 345p');
console.log('  - 順子4: 789p\n');

// 複数の和了牌パターンをテスト
const testPatterns = [
  { tile: new Tile('manzu', 3), desc: '3m (123m の 1-2-[3] 両面待ち)' },
  { tile: new Tile('manzu', 6), desc: '6m (456m の 4-5-[6] 両面待ち)' },
  { tile: new Tile('pinzu', 3), desc: '3p (345p の [3]-4-5 両面待ち)' },
  { tile: new Tile('pinzu', 5), desc: '5p (345p の 3-4-[5] 両面待ち)' },
  { tile: new Tile('pinzu', 7), desc: '7p (789p の [7]-8-9 ペンチャン)' },
  { tile: new Tile('pinzu', 9), desc: '9p (789p の 7-8-[9] ペンチャン)' },
];

testPatterns.forEach(pattern => {
  console.log(`\n=== ${pattern.desc} でロン ===`);
  
  const winInfo = {
    hand: hand,
    melds: [],
    winningTile: pattern.tile,
    isTsumo: false,
    isRon: true
  };
  
  const result = calculator.calculateScore(winInfo);
  
  if (result.valid) {
    console.log('役:', result.yaku.map(y => `${y.name}(${y.han}飜)`).join(', '));
    console.log('得点:', result.score, '点');
    
    const hasPinfu = result.yaku.some(y => y.name === '平和');
    console.log('平和:', hasPinfu ? '✓' : '✗');
  } else {
    console.log('判定:', result.error);
  }
});

console.log('\n【結論】');
console.log('両面待ちでアガれば平和が付きます');
console.log('ペンチャン待ちの場合は平和が付きません');

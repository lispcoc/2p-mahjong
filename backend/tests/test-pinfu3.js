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

// 複数の和了牌パターンをテスト
const testPatterns = [
  { tile: new Tile('manzu', 3), desc: '3m' },
  { tile: new Tile('manzu', 6), desc: '6m' },
  { tile: new Tile('pinzu', 9), desc: '9p' },
];

testPatterns.forEach(pattern => {
  console.log(`\n=== ${pattern.desc} でロン ===`);
  
  // 面子構成を確認
  const combinations = calculator.findAllCombinations(hand);
  console.log(`面子構成数: ${combinations.length}`);
  
  combinations.forEach((combo, idx) => {
    console.log(`\n構成 ${idx + 1}:`);
    console.log(`  雀頭: ${combo.pair.number}${combo.pair.suit === 'manzu' ? 'm' : 'p'}`);
    
    combo.melds.forEach((meld, meldIdx) => {
      const isSeq = calculator.isSequence(meld);
      const sorted = [...meld].sort((a, b) => a.number - b.number);
      const tiles = sorted.map(t => `${t.number}${t.suit === 'manzu' ? 'm' : 'p'}`).join('-');
      
      const hasWin = meld.some(t => t.suit === pattern.tile.suit && t.number === pattern.tile.number);
      console.log(`    ${tiles} (${isSeq ? '順子' : '刻子'})${hasWin ? ' ← 和了牌' : ''}`);
      
      if (hasWin && isSeq) {
        const nums = sorted.map(t => t.number);
        const winIndex = nums.indexOf(pattern.tile.number);
        
        let waitType = '';
        if (winIndex === 1) {
          waitType = '嵌張';
        } else if (winIndex === 0) {
          if (nums[0] === 7 && nums[1] === 8 && nums[2] === 9) {
            waitType = 'ペンチャン（7-8-9の7）';
          } else {
            waitType = '両面';
          }
        } else {
          if (nums[0] === 1 && nums[1] === 2 && nums[2] === 3) {
            waitType = 'ペンチャン（1-2-3の3）';
          } else {
            waitType = '両面';
          }
        }
        
        console.log(`      → 待ち: ${waitType}`);
      }
    });
  });
  
  const winInfo = {
    hand: hand,
    melds: [],
    winningTile: pattern.tile,
    isTsumo: false,
    isRon: true
  };
  
  const result = calculator.calculateScore(winInfo);
  
  console.log(`\n結果:`);
  if (result.valid) {
    console.log('  役:', result.yaku.map(y => `${y.name}(${y.han}飜)`).join(', '));
    console.log('  得点:', result.score, '点');
  } else {
    console.log('  判定:', result.error);
  }
});

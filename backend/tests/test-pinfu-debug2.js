const Tile = require('./src/logic/Tile');
const ScoreCalculator = require('./src/logic/ScoreCalculator');

// テストケース: 99m123566778p234s + 8pロン
const calculator = new ScoreCalculator();

// 手牌を作成（アガリ後の14枚）
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

const winningTile = new Tile('pinzu', 8);

console.log('=== 面子分解テスト ===\n');

// 面子構成を探す
const combinations = calculator.findAllCombinations(hand);

console.log(`見つかった組み合わせ数: ${combinations.length}\n`);

combinations.forEach((combo, idx) => {
  console.log(`組み合わせ ${idx + 1}:`);
  console.log(`  雀頭: ${combo.pair.number}${combo.pair.suit === 'manzu' ? 'm' : combo.pair.suit === 'pinzu' ? 'p' : 's'}`);
  console.log(`  面子:`);
  
  combo.melds.forEach((meld, meldIdx) => {
    const isSeq = calculator.isSequence(meld);
    const tiles = meld.map(t => `${t.number}${t.suit === 'manzu' ? 'm' : t.suit === 'pinzu' ? 'p' : 's'}`).join('-');
    console.log(`    ${meldIdx + 1}. ${tiles} (${isSeq ? '順子' : '刻子'})`);
  });
  
  // 全て順子か
  const allSeq = combo.melds.every(m => calculator.isSequence(m));
  console.log(`  全て順子: ${allSeq ? 'はい' : 'いいえ'}`);
  
  // 雀頭が役牌か
  const isYakuhai = combo.pair.suit === 'honor' && combo.pair.number >= 5 && combo.pair.number <= 7;
  console.log(`  雀頭が役牌: ${isYakuhai ? 'はい' : 'いいえ'}`);
  
  // 両面待ちか
  if (allSeq && !isYakuhai) {
    const isRyanmen = calculator.checkRyanmenWaitInMelds(combo.melds, winningTile);
    console.log(`  両面待ち: ${isRyanmen ? 'はい' : 'いいえ'}`);
    
    if (!isRyanmen) {
      // 詳細調査
      console.log(`\n  詳細調査:`);
      combo.melds.forEach(meld => {
        const hasWin = meld.some(t => t.suit === winningTile.suit && t.number === winningTile.number);
        if (hasWin && calculator.isSequence(meld)) {
          const sorted = [...meld].sort((a, b) => a.number - b.number);
          console.log(`    和了牌を含む順子: ${sorted[0].number}-${sorted[1].number}-${sorted[2].number}`);
          console.log(`    和了牌: ${winningTile.number}`);
          
          if (sorted[0].number === winningTile.number) {
            console.log(`    → 順子の最小値でアガリ`);
            if (winningTile.number >= 3 && sorted[2].number !== 3) {
              console.log(`    → 両面待ちと判定すべき`);
            } else {
              console.log(`    → ペンチャン待ち`);
            }
          } else if (sorted[2].number === winningTile.number) {
            console.log(`    → 順子の最大値でアガリ`);
            if (winningTile.number <= 7 && sorted[0].number !== 7) {
              console.log(`    → 両面待ちと判定すべき`);
            } else {
              console.log(`    → ペンチャン待ち`);
            }
          } else {
            console.log(`    → 嵌張待ち`);
          }
        }
      });
    }
  }
  console.log('');
});

// 実際のスコア計算
const winInfo = {
  hand: hand,
  melds: [],
  winningTile: winningTile,
  isTsumo: false,
  isRon: true
};

const result = calculator.calculateScore(winInfo);
console.log('=== 最終結果 ===');
console.log('役:', result.yaku.length > 0 ? result.yaku.map(y => `${y.name}(${y.han}飜)`).join(', ') : 'なし');
console.log('判定:', result.valid ? '和了' : result.error);

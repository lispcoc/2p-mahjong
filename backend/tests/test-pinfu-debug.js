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

console.log('=== デバッグ: 平和判定 ===\n');

// 13枚の手牌を作成（8pを除く）
const tiles13 = [];
let skipOne = false;
for (let tile of hand) {
  if (!skipOne && tile.suit === winningTile.suit && tile.number === winningTile.number) {
    skipOne = true;
    continue;
  }
  tiles13.push(tile);
}

console.log('アガリ前の手牌 (13枚):');
const grouped = {};
tiles13.forEach(t => {
  const suit = t.suit === 'manzu' ? 'm' : t.suit === 'pinzu' ? 'p' : 's';
  if (!grouped[suit]) grouped[suit] = [];
  grouped[suit].push(t.number);
});
Object.keys(grouped).sort().forEach(suit => {
  console.log(`  ${suit}: ${grouped[suit].sort((a,b) => a-b).join(' ')}`);
});
console.log('');

// 牌を数える
const counts = {};
tiles13.forEach(tile => {
  const key = `${tile.suit}-${tile.number}`;
  counts[key] = (counts[key] || 0) + 1;
});

console.log('牌の枚数:');
Object.keys(counts).sort().forEach(key => {
  const [suit, num] = key.split('-');
  const suitName = suit === 'manzu' ? '萬' : suit === 'pinzu' ? '筒' : '索';
  console.log(`  ${num}${suitName}: ${counts[key]}枚`);
});
console.log('');

// 雀頭候補を探す
console.log('雀頭候補:');
for (let key in counts) {
  if (counts[key] >= 2) {
    const [suit, num] = key.split('-');
    const suitName = suit === 'manzu' ? '萬' : suit === 'pinzu' ? '筒' : '索';
    const isYakuhai = suit === 'honor' && parseInt(num) >= 5;
    console.log(`  ${num}${suitName} (${counts[key]}枚) - 役牌: ${isYakuhai ? 'はい' : 'いいえ'}`);
    
    // この対子を雀頭として扱い、残りが全て順子か確認
    const remaining = { ...counts };
    remaining[key] -= 2;
    
    console.log(`    残りの牌で順子を作れるか確認中...`);
    const canForm = calculator.canFormAllSequences(remaining);
    console.log(`    結果: ${canForm ? '可能' : '不可能'}`);
    
    if (canForm) {
      // 待ちが両面待ちか確認
      const isRyanmen = calculator.checkRyanmenWait(tiles13, winningTile);
      console.log(`    両面待ちか: ${isRyanmen ? 'はい' : 'いいえ'}`);
      
      // 詳細な待ち判定
      if (!isRyanmen) {
        const num = winningTile.number;
        console.log(`\n    詳細: 和了牌は ${num}筒`);
        
        let hasPrev2 = false, hasPrev1 = false, hasNext1 = false, hasNext2 = false;
        tiles13.forEach(tile => {
          if (tile.suit === winningTile.suit) {
            if (tile.number === num - 2) { hasPrev2 = true; console.log(`      ${num-2}筒がある`); }
            if (tile.number === num - 1) { hasPrev1 = true; console.log(`      ${num-1}筒がある`); }
            if (tile.number === num + 1) { hasNext1 = true; console.log(`      ${num+1}筒がある`); }
            if (tile.number === num + 2) { hasNext2 = true; console.log(`      ${num+2}筒がある`); }
          }
        });
        
        console.log(`      前側: ${hasPrev2 && hasPrev1 ? '両面形がある' : 'なし'}`);
        console.log(`      後側: ${hasNext1 && hasNext2 ? '両面形がある' : 'なし'}`);
      }
    }
    console.log('');
  }
}

// 実際のスコア計算
const winInfo = {
  hand: hand,
  melds: [],
  winningTile: winningTile,
  isTsumo: false,
  isRon: true
};

const result = calculator.calculateScore(winInfo);
console.log('\n=== 最終結果 ===');
console.log('役:', result.yaku.length > 0 ? result.yaku.map(y => `${y.name}(${y.han}飜)`).join(', ') : 'なし');
console.log('判定:', result.valid ? '和了' : result.error);

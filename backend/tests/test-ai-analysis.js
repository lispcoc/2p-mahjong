const AIPlayer = require('./src/logic/AIPlayer');
const Tile = require('./src/logic/Tile');

// テスト2で詳しい分析: 通常モード（戦略的な打ち方）
console.log('=== AI Strategy Analysis ===');

const testHand = [
  new Tile('man', 1), // index 0
  new Tile('man', 1), // index 1
  new Tile('man', 2), // index 2
  new Tile('man', 3), // index 3
  new Tile('pin', 1), // index 4
  new Tile('pin', 2), // index 5
  new Tile('pin', 3), // index 6
  new Tile('sou', 1), // index 7
  new Tile('sou', 2), // index 8
  new Tile('sou', 3), // index 9
  new Tile('honor', 1), // index 10
  new Tile('honor', 2), // index 11
  new Tile('man', 9), // index 12 - drawn tile (孤立した牌)
];

const aiNormal = new AIPlayer(false);

// 各牌をディスカードした場合のスコアを計算して表示
console.log('Hand tiles:');
testHand.forEach((tile, idx) => {
  console.log(`  [${idx}] ${tile.suit}_${tile.number}`);
});

console.log('\nEvaluation scores for each discard:');
const scores = [];
for (let i = 0; i < testHand.length; i++) {
  const score = aiNormal.evaluateDiscardMove(testHand, i, {});
  scores.push({ index: i, tile: `${testHand[i].suit}_${testHand[i].number}`, score });
  console.log(`  [${i}] ${testHand[i].suit}_${testHand[i].number}: score = ${score}`);
}

// ソートして最高スコアを表示
scores.sort((a, b) => b.score - a.score);
console.log('\nRanked by score:');
scores.slice(0, 5).forEach((s, idx) => {
  console.log(`  ${idx + 1}. [${s.index}] ${s.tile}: ${s.score}`);
});

const selectedIndex = aiNormal.chooseDiscard(testHand, 12, false);
console.log(`\n✓ Selected to discard: [${selectedIndex}] ${testHand[selectedIndex].suit}_${testHand[selectedIndex].number}`);

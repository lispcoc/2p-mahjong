const Tile = require('./src/logic/Tile');
const AIPlayer = require('./src/logic/AIPlayer');

// Test case from Problem 1: Should discard 六索 instead of 白
const hand1 = [
  new Tile('man', 2), new Tile('pin', 7), new Tile('honor', 5), // 二萬、七筒、白
  new Tile('pin', 7), new Tile('honor', 6), new Tile('honor', 3), // 七筒、發、中
  new Tile('honor', 4), new Tile('honor', 3), new Tile('honor', 3), // 東、發、發
  new Tile('pin', 2), new Tile('man', 3), new Tile('honor', 1), // 二筒、三萬、西
  new Tile('sou', 6), new Tile('man', 3) // 六索、三萬（追加分まで14枚）
];

// Remove the last tile to make it 13
const testHand = hand1.slice(0, 13);

console.log('=== Tile Classes Before Override ===');
const ai = new AIPlayer();

testHand.forEach((tile, idx) => {
  const className = ai.classifyTile(tile);
  const baseScore = ai.getTileClassScore(className);
  console.log(`${idx}: ${tile.toString()} (${className}) - base: ${baseScore}`);
});

console.log('\n=== Evaluating Best Discard (with last tile drawn at index 12) ===');
const discardTileIndex = ai.chooseDiscard(testHand, 12, false, {});
const bestTile = testHand[discardTileIndex];
console.log(`Best tile to discard index: ${discardTileIndex}`);
console.log(`Best tile to discard: ${bestTile.toString()}`);

// Test all tiles with scores
console.log('\n=== All Tile Scores ===');
const scores = {};
testHand.forEach((tile, idx) => {
  const handCopy = testHand.filter((_, i) => i !== idx);
  const score = ai.evaluateDiscardMove(tile, handCopy, {});
  scores[tile.toString()] = score;
  const className = ai.classifyTile(tile);
  const baseScore = ai.getTileClassScore(className);
  console.log(`${tile.toString()}: efficiency=${score} (class=${className}, base=${baseScore})`);
});

const sortedTiles = Object.entries(scores)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

console.log('\n=== Top 5 Tiles to Discard ===');
sortedTiles.forEach((entry, idx) => {
  console.log(`${idx+1}. ${entry[0]}: ${entry[1]}`);
});

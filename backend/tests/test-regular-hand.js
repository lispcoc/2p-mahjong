#!/usr/bin/env node

const MahjongLogic = require('./src/logic/MahjongLogic');
const Tile = require('./src/logic/Tile');

console.log('\n========== 通常の手型を使った検証 ==========\n');

const logic = new MahjongLogic(['player1', 'player2']);

// より有効な通常の手型（13枚）
const regularHand = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
  new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
  new Tile('sou', 1), new Tile('sou', 1),
  new Tile('honor', 1), new Tile('honor', 1)
];

console.log('Regular hand (13):');
console.log(regularHand.map(t => t.toString()).join(' '));

// 直接checkValidMeldStructureをテスト
console.log('\n--- checkValidMeldStructure Test ---');
const testTile1 = new Tile('man', 7);
const testHand1 = regularHand.concat([testTile1]);
console.log(`Adding m7: ${logic.checkValidMeldStructure(testHand1)}`);

const testTile2 = new Tile('sou', 2);
const testHand2 = regularHand.concat([testTile2]);
console.log(`Adding s2: ${logic.checkValidMeldStructure(testHand2)}`);

// getWinningTilesで試す
console.log('\n--- getWinningTiles Test ---');
const winningTiles = logic.getWinningTiles(regularHand, []);
console.log(`Winning tiles found: ${winningTiles.length}`);
if (winningTiles.length > 0) {
  console.log('Winning tiles:');
  winningTiles.forEach(t => {
    console.log(`  - ${t.display} (${t.suit}_${t.number})`);
  });
} else {
  console.log('No winning tiles found');
}

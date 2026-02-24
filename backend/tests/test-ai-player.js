const AIPlayer = require('../src/logic/AIPlayer');
const Tile = require('../src/logic/Tile');

// テスト1: ツモ切りモード
console.log('=== Test 1: Tsumo-kiri Mode ===');
const aiTsumo = new AIPlayer(true); // ツモ切りモード有効

const testHand1 = [
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('pin', 1),
  new Tile('pin', 2),
  new Tile('pin', 3),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
  new Tile('honor', 1),
  new Tile('honor', 2),
  new Tile('honor', 3),
  new Tile('man', 4), // drawn tile
];

const drawnIndex1 = 12;
const selectedIndex1 = aiTsumo.chooseDiscard(testHand1, drawnIndex1, false);
console.log(`✓ Tsumo-kiri: Selected index ${selectedIndex1} (Expected: ${drawnIndex1})`);
console.log(`  ${selectedIndex1 === drawnIndex1 ? 'PASS' : 'FAIL'}`);

// テスト2: 通常モード（戦略的な打ち方）
console.log('\n=== Test 2: Strategic Mode ===');
const aiNormal = new AIPlayer(false); // 通常モード

const testHand2 = [
  new Tile('man', 1),
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('pin', 1),
  new Tile('pin', 2),
  new Tile('pin', 3),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
  new Tile('honor', 1),
  new Tile('honor', 2),
  new Tile('man', 9), // drawn tile (孤立した牌)
];

const drawnIndex2 = 12;
const selectedIndex2 = aiNormal.chooseDiscard(testHand2, drawnIndex2, false);
console.log(`✓ Strategic mode: Selected index ${selectedIndex2}`);
console.log(`  Selected tile: ${testHand2[selectedIndex2].suit}_${testHand2[selectedIndex2].number}`);
console.log(`  Drawn tile was at index ${drawnIndex2} (${testHand2[drawnIndex2].suit}_${testHand2[drawnIndex2].number})`);
if (selectedIndex2 === drawnIndex2) {
  console.log('  Note: Chose to keep the drawn tile instead');
} else {
  console.log('  Note: Chose to discard a different tile');
}

// テスト3: リーチ中は固定（ツモ切り同然）
console.log('\n=== Test 3: Riichi Mode ===');
const selectedIndex3 = aiNormal.chooseDiscard(testHand2, drawnIndex2, true); // riichi=true
console.log(`✓ Riichi: Selected index ${selectedIndex3} (Expected: ${drawnIndex2})`);
console.log(`  ${selectedIndex3 === drawnIndex2 ? 'PASS' : 'FAIL'}`);

// テスト4: モード切り替え
console.log('\n=== Test 4: Mode Toggle ===');
console.log(`Initial mode (normal): ${aiNormal.getTsumoKiriMode()}`);
aiNormal.setTsumoKiriMode(true);
console.log(`After setTsumoKiriMode(true): ${aiNormal.getTsumoKiriMode()}`);
const selectedIndex4 = aiNormal.chooseDiscard(testHand2, drawnIndex2, false);
console.log(`✓ After toggle to tsumo-kiri: ${selectedIndex4 === drawnIndex2 ? 'PASS' : 'FAIL'}`);

console.log('\n=== All Tests Complete ===');

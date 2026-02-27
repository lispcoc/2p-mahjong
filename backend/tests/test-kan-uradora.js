/**
 * カン裏ドラのテスト
 * 槓（カン）宣言時に裏ドラ表示牌が追加されることを確認
 */

const { assert, assertEqual, section, report } = require('./test-helper');
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

section('カン裏ドラの実装テスト');

// Test 1: addNewDora が裏ドラも追加することを確認
(function testAddNewDoraAddsUraDora() {
  console.log('\n--- Test 1: addNewDora() が裏ドラも追加する ---');
  
  const game = new MahjongLogic(['p1', 'p2']);
  game.initialize();
  game.dealTiles();
  
  // 初期状態: ドラ1組、裏ドラ1組
  assertEqual(game.doraIndicators.length, 1, '初期ドラ表示牌は1枚');
  assertEqual(game.uraDoraIndicators.length, 1, '初期裏ドラ表示牌は1枚');
  assertEqual(game.doraTiles.length, 1, '初期ドラは1枚');
  assertEqual(game.uraDoraTiles.length, 1, '初期裏ドラは1枚');
  
  // 1回目のカン: ドラ・裏ドラ各+1
  game.addNewDora();
  assertEqual(game.doraIndicators.length, 2, 'カン1回目: ドラ表示牌が2枚');
  assertEqual(game.uraDoraIndicators.length, 2, 'カン1回目: 裏ドラ表示牌が2枚');
  assertEqual(game.doraTiles.length, 2, 'カン1回目: ドラが2枚');
  assertEqual(game.uraDoraTiles.length, 2, 'カン1回目: 裏ドラが2枚');
  
  // 2回目のカン: ドラ・裏ドラ各+1
  game.addNewDora();
  assertEqual(game.doraIndicators.length, 3, 'カン2回目: ドラ表示牌が3枚');
  assertEqual(game.uraDoraIndicators.length, 3, 'カン2回目: 裏ドラ表示牌が3枚');
  assertEqual(game.doraTiles.length, 3, 'カン2回目: ドラが3枚');
  assertEqual(game.uraDoraTiles.length, 3, 'カン2回目: 裏ドラが3枚');
  
  // 3回目のカン: ドラ・裏ドラ各+1 (2人麻雀の最大)
  game.addNewDora();
  assertEqual(game.doraIndicators.length, 4, 'カン3回目: ドラ表示牌が4枚');
  assertEqual(game.uraDoraIndicators.length, 4, 'カン3回目: 裏ドラ表示牌が4枚');
  assertEqual(game.doraTiles.length, 4, 'カン3回目: ドラが4枚');
  assertEqual(game.uraDoraTiles.length, 4, 'カン3回目: 裏ドラが4枚');
})();

// Test 2: 裏ドラ表示牌と裏ドラタイルの対応が正しいことを確認
(function testUraDoraTilesMatchIndicators() {
  console.log('\n--- Test 2: 裏ドラ表示牌と裏ドラタイルの対応 ---');
  
  const game = new MahjongLogic(['p1', 'p2']);
  game.initialize();
  game.dealTiles();
  
  // 3回カンして全裏ドラを追加
  game.addNewDora();
  game.addNewDora();
  game.addNewDora();
  
  // 各裏ドラが表示牌の「次の牌」であることを確認
  for (let i = 0; i < game.uraDoraIndicators.length; i++) {
    const indicator = game.uraDoraIndicators[i];
    const doraTile = game.uraDoraTiles[i];
    const expected = game.getNextTile(indicator);
    
    assert(
      doraTile.suit === expected.suit && doraTile.number === expected.number,
      'uraDora ' + (i + 1) + ': indicator ' + indicator.toString() + ' -> tile ' + doraTile.toString() + ' (expected: ' + expected.toString() + ')'
    );
  }
})();

// Test 3: candidateUraDoraIndicators から正しい順番で追加されることを確認
(function testUraDoraCandidateOrder() {
  console.log('\n--- Test 3: 候補配列から正しい順序で裏ドラが追加される ---');
  
  const game = new MahjongLogic(['p1', 'p2']);
  game.initialize();
  game.dealTiles();
  
  // 初期裏ドラは候補の0番目
  assert(
    game.uraDoraIndicators[0] === game.candidateUraDoraIndicators[0],
    'initial uraDora indicator = candidate[0]'
  );
  
  // カン1回目: 候補の1番目
  game.addNewDora();
  assert(
    game.uraDoraIndicators[1] === game.candidateUraDoraIndicators[1],
    'kan 1: uraDora indicator = candidate[1]'
  );
  
  // カン2回目: 候補の2番目
  game.addNewDora();
  assert(
    game.uraDoraIndicators[2] === game.candidateUraDoraIndicators[2],
    'kan 2: uraDora indicator = candidate[2]'
  );
  
  // カン3回目: 候補の3番目
  game.addNewDora();
  assert(
    game.uraDoraIndicators[3] === game.candidateUraDoraIndicators[3],
    'kan 3: uraDora indicator = candidate[3]'
  );
})();

// Test 4: getDora() がカン裏ドラを含めて正しく返すことを確認
(function testGetDoraIncludesKanUraDora() {
  console.log('\n--- Test 4: getDora() にカン裏ドラが含まれる ---');
  
  const game = new MahjongLogic(['p1', 'p2']);
  game.initialize();
  game.dealTiles();
  
  let dora = game.getDora();
  assertEqual(dora.uraIndicators.length, 1, 'initial: getDora().uraIndicators = 1');
  assertEqual(dora.uraTiles.length, 1, 'initial: getDora().uraTiles = 1');
  
  game.addNewDora();
  dora = game.getDora();
  assertEqual(dora.uraIndicators.length, 2, 'after kan 1: getDora().uraIndicators = 2');
  assertEqual(dora.uraTiles.length, 2, 'after kan 1: getDora().uraTiles = 2');
  assertEqual(dora.indicators.length, 2, 'after kan 1: getDora().indicators = 2');
  assertEqual(dora.tiles.length, 2, 'after kan 1: getDora().tiles = 2');
})();

// Test 5: ドラと裏ドラの枚数が常に同期していることを確認
(function testDoraAndUraDoraCountSync() {
  console.log('\n--- Test 5: ドラ数と裏ドラ数の同期 ---');
  
  const game = new MahjongLogic(['p1', 'p2']);
  game.initialize();
  game.dealTiles();
  
  for (let i = 0; i < 3; i++) {
    assertEqual(
      game.doraIndicators.length,
      game.uraDoraIndicators.length,
      'after ' + i + ' kan: doraCount(' + game.doraIndicators.length + ') = uraDoraCount(' + game.uraDoraIndicators.length + ')'
    );
    game.addNewDora();
  }
  assertEqual(
    game.doraIndicators.length,
    game.uraDoraIndicators.length,
    'after 3 kan: doraCount(' + game.doraIndicators.length + ') = uraDoraCount(' + game.uraDoraIndicators.length + ')'
  );
})();

report();

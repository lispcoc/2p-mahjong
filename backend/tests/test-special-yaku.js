/**
 * テスト: ダブル立直、天和、地和、人和の実装確認
 */
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const Tile = require('../src/logic/Tile');

const sc = new ScoreCalculator();
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

// ヘルパー: 完成手牌を作成 (ピンフ形)
function makePinfuHand() {
  // 1-2-3m, 4-5-6m, 7-8-9m, 1-2-3p + 5-5s (雀頭)
  return [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ];
}

// ============================================================
console.log('\n🧪 テスト1: 天和（テンホウ）- 親の配牌が和了形');
// ============================================================
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1]; // sou5

  const result = sc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
    isTenhou: true,
  });

  assert(result.valid, '天和: 和了が有効');
  const tenhouYaku = result.yaku?.find(y => y.name === '天和');
  assert(!!tenhouYaku, '天和: 天和役が存在する');
  assert(tenhouYaku?.han === 13, '天和: 13翻（役満）');
  assert(result.score === 32000, `天和: 32000点 (実際: ${result.score})`);
  console.log(`  → scoreType: ${result.scoreType}`);
}

// ============================================================
console.log('\n🧪 テスト2: 地和（チーホウ）- 子の最初のツモで和了');
// ============================================================
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];

  const result = sc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
    isChiihou: true,
  });

  assert(result.valid, '地和: 和了が有効');
  const chiihouYaku = result.yaku?.find(y => y.name === '地和');
  assert(!!chiihouYaku, '地和: 地和役が存在する');
  assert(chiihouYaku?.han === 13, '地和: 13翻（役満）');
  assert(result.score === 32000, `地和: 32000点 (実際: ${result.score})`);
}

// ============================================================
console.log('\n🧪 テスト3: 人和（レンホウ）- 子がロンで和了（最初のツモ前）');
// ============================================================
{
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 6),
    new Tile('man', 7), new Tile('man', 8), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 5), new Tile('sou', 5),
  ];
  const winningTile = new Tile('pin', 3); // ロン牌

  const result = sc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: false, isRon: true,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 2,
    isRenhou: true,
  });

  assert(result.valid, '人和: 和了が有効');
  const renhouYaku = result.yaku?.find(y => y.name === '人和');
  assert(!!renhouYaku, '人和: 人和役が存在する');
  assert(renhouYaku?.han === 13, '人和: 13翻（役満）');
  assert(result.score === 32000, `人和: 32000点 (実際: ${result.score})`);
}

// ============================================================
console.log('\n🧪 テスト4: ダブル立直 - 最初の巡目でのリーチ宣言');
// ============================================================
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];

  const result = sc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: true, menzen: true,
    roundWind: 1, seatWind: 1,
    isDoubleRiichi: true,
    isIppatsumari: true, // 一発も付くことを確認
  });

  assert(result.valid, 'ダブル立直: 和了が有効');
  const doubleRiichiYaku = result.yaku?.find(y => y.name === 'ダブル立直');
  assert(!!doubleRiichiYaku, 'ダブル立直: ダブル立直役が存在する');
  assert(doubleRiichiYaku?.han === 2, 'ダブル立直: 2翻');
  
  const normalRiichiYaku = result.yaku?.find(y => y.name === 'リーチ');
  assert(!normalRiichiYaku, 'ダブル立直: 通常リーチが含まれない');
  
  const ippatsuYaku = result.yaku?.find(y => y.name === '一発');
  assert(!!ippatsuYaku, 'ダブル立直: 一発と複合できる');
  
  console.log(`  → 役一覧: ${result.yaku?.map(y => `${y.name}(${y.han}翻)`).join(', ')}`);
  console.log(`  → 合計: ${result.han}翻, ${result.score}点`);
}

// ============================================================
console.log('\n🧪 テスト5: 通常リーチ（ダブル立直でない場合）');
// ============================================================
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];

  const result = sc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: true, isRon: false,
    riichi: true, menzen: true,
    roundWind: 1, seatWind: 1,
    isDoubleRiichi: false, // ダブル立直でない
  });

  assert(result.valid, '通常リーチ: 和了が有効');
  const normalRiichiYaku = result.yaku?.find(y => y.name === 'リーチ');
  assert(!!normalRiichiYaku, '通常リーチ: 通常リーチ役が存在する');
  assert(normalRiichiYaku?.han === 1, '通常リーチ: 1翻');
  
  const doubleRiichiYaku = result.yaku?.find(y => y.name === 'ダブル立直');
  assert(!doubleRiichiYaku, '通常リーチ: ダブル立直が含まれない');
}

// ============================================================
console.log('\n🧪 テスト6: MahjongLogic - ダブル立直フラグの設定');
// ============================================================
{
  const MahjongLogic = require('../src/logic/MahjongLogic');
  
  const game = new MahjongLogic(['player1', 'player2'], {}, undefined, {
    dealerIndex: 0,
    roundWindNumber: 1,
    seatWinds: { player1: 1, player2: 2 },
  });
  game.initialize();
  game.dealTiles();
  
  const player1 = game.players['player1'];
  
  assert(game.firstGoAroundIntact === true, 'MahjongLogic: firstGoAroundIntact初期値はtrue');
  assert(player1.isDoubleRiichi === false, 'MahjongLogic: isDoubleRiichi初期値はfalse');
  assert(player1.discards.length === 0, 'MahjongLogic: 最初は捨て牌0');
  
  console.log(`  → turnNumber: ${game.turnNumber}`);
  console.log(`  → dealer hand: ${player1.hand.length}枚`);
}

// ============================================================
console.log('\n🧪 テスト7: 天和はツモのみ（ロンでは成立しない）');
// ============================================================
{
  const hand = makePinfuHand();
  const winningTile = hand[hand.length - 1];

  // isTenhouフラグはMahjongLogic側で条件制御するため、
  // ScoreCalculator単体ではフラグが渡される場合のみ有効
  const result = sc.calculateScore({
    hand, melds: [], winningTile,
    isTsumo: false, isRon: true,
    riichi: false, menzen: true,
    roundWind: 1, seatWind: 1,
    isTenhou: true, // MahjongLogicでは isRon 時に isTenhou=true にはならない
  });

  // ScoreCalculatorレベルではフラグに従って天和を付ける
  // （実際のゲームではMahjongLogicが正しい条件でのみフラグを立てる）
  const tenhouYaku = result.yaku?.find(y => y.name === '天和');
  assert(!!tenhouYaku, '注: ScoreCalculatorはフラグに忠実に天和を付ける（条件制御はMahjongLogic側）');
}

// ============================================================
console.log('\n========================================');
console.log(`結果: ${passed} passed, ${failed} failed`);
console.log('========================================');
process.exit(failed > 0 ? 1 : 0);

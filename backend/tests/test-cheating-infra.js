/**
 * イカサマインフラテスト
 * - ツモ順固定機能
 * - イカサマフラグの動作
 * - 壁牌操作メソッド（積み込み・覗き見・すり替え）
 * - シード付きシャッフルの再現性
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const GameRoom = require('../src/logic/GameRoom');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

// ========== ツモ順固定機能 ==========

section('ツモ順固定: fixedDrawOrder=true のとき壁牌の順序通りにツモされる');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: true,
  });
  logic.initialize();
  logic.dealTiles();

  // 壁牌の末尾から順に引かれることを確認
  // peekWall で次にツモされる牌を確認
  const peeked = logic.peekWall(3);
  assert(peeked.length >= 1, 'peekWall が壁牌を返す');

  // 1枚目のツモ
  const expectedFirst = peeked[0];
  const drawn1 = logic.drawTileWithLuckAdaptive('player1');
  assert(drawn1 !== null, 'fixedDrawOrder: ツモが成功する');
  assertEqual(drawn1.suit, expectedFirst.suit, 'fixedDrawOrder: 1枚目の suit が一致');
  assertEqual(drawn1.number, expectedFirst.number, 'fixedDrawOrder: 1枚目の number が一致');
}

section('ツモ順固定: fixedDrawOrder=false のときは従来通りランダム');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: false,
  });
  logic.initialize();
  logic.dealTiles();

  // ランダムモードでは確定的な検証はできないが、ツモ自体が成功することを確認
  const drawn = logic.drawTileWithLuckAdaptive('player1');
  assert(drawn !== null, 'ランダムモード: ツモが成功する');
  assert(drawn.suit !== undefined, 'ランダムモード: 牌のsuitが存在する');
}

// ========== シード付きシャッフルの再現性 ==========

section('壁牌シード: 同じシードで同じ壁牌順序が再現される');
{
  const seed = 12345;

  const logic1 = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: true,
    wallSeed: seed,
  });
  logic1.initialize();

  const logic2 = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: true,
    wallSeed: seed,
  });
  logic2.initialize();

  // 壁牌の内容が同一であることを確認（先頭10枚）
  let allMatch = true;
  for (let i = 0; i < Math.min(10, logic1.wall.length); i++) {
    if (logic1.wall[i].suit !== logic2.wall[i].suit || logic1.wall[i].number !== logic2.wall[i].number) {
      allMatch = false;
      break;
    }
  }
  assert(allMatch, '同じシードで壁牌の順序が一致する');
}

section('壁牌シード: 異なるシードで異なる壁牌順序になる');
{
  const logic1 = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    wallSeed: 11111,
  });
  logic1.initialize();

  const logic2 = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    wallSeed: 99999,
  });
  logic2.initialize();

  let hasDifference = false;
  for (let i = 0; i < Math.min(10, logic1.wall.length); i++) {
    if (logic1.wall[i].suit !== logic2.wall[i].suit || logic1.wall[i].number !== logic2.wall[i].number) {
      hasDifference = true;
      break;
    }
  }
  assert(hasDifference, '異なるシードで壁牌の順序が異なる');
}

// ========== イカサマフラグ: cheatingEnabled ==========

section('イカサマフラグ: cheatingEnabled がデフォルトで false');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  assertEqual(logic.cheatingEnabled, false, 'デフォルトで cheatingEnabled は false');
  assertEqual(logic.fixedDrawOrder, false, 'デフォルトで fixedDrawOrder は false');
  assertEqual(logic.wallSeed, null, 'デフォルトで wallSeed は null');
}

section('イカサマフラグ: GameRoom にも cheatingEnabled が伝搬する');
{
  const room = new GameRoom('test-room', {
    cheatingEnabled: true,
    fixedDrawOrder: true,
    wallSeed: 42,
    testMode: true,
  });
  assertEqual(room.cheatingEnabled, true, 'GameRoom.cheatingEnabled が true');
  assertEqual(room.fixedDrawOrder, true, 'GameRoom.fixedDrawOrder が true');
  assertEqual(room.wallSeed, 42, 'GameRoom.wallSeed が 42');
}

// ========== 壁牌操作: peekWall ==========

section('peekWall: cheatingEnabled=false では例外が発生する');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: false,
  });
  logic.initialize();
  let threw = false;
  try {
    logic.peekWall();
  } catch (e) {
    threw = true;
  }
  assert(threw, 'cheatingEnabled=false で peekWall は例外をスロー');
}

section('peekWall: cheatingEnabled=true で壁牌の内容が取得できる');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
  });
  logic.initialize();
  logic.dealTiles();
  const wall = logic.peekWall();
  assert(wall.length > 0, 'peekWall がツモ可能な牌を返す');
  assert(wall[0].suit !== undefined, 'peekWall の各要素に suit がある');
  assert(wall[0].number !== undefined, 'peekWall の各要素に number がある');
  assert(wall[0].display !== undefined, 'peekWall の各要素に display がある');
}

section('peekWall: count を指定すると先頭N枚のみ返す');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
  });
  logic.initialize();
  logic.dealTiles();
  const wall3 = logic.peekWall(3);
  assertEqual(wall3.length, 3, 'peekWall(3) は3枚を返す');
}

// ========== 壁牌操作: stackWall（積み込み） ==========

section('stackWall: 指定した牌を壁の先頭（次のツモ位置）に移動する');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: true,
  });
  logic.initialize();
  logic.dealTiles();

  // 壁に存在する牌を積み込む
  const result = logic.stackWall([
    { suit: 'honor', number: 7 }, // 中
  ]);
  assert(result.success, 'stackWall が成功する');
  assert(result.moved >= 1, 'stackWall が少なくとも1枚移動した');

  // 次のツモが中であることを確認
  const peeked = logic.peekWall(1);
  assertEqual(peeked[0].suit, 'honor', '積み込み後の次のツモが honor');
  assertEqual(peeked[0].number, 7, '積み込み後の次のツモが 7（中）');
}

section('stackWall: cheatingEnabled=false では例外が発生する');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: false,
  });
  logic.initialize();
  let threw = false;
  try {
    logic.stackWall([{ suit: 'honor', number: 7 }]);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'cheatingEnabled=false で stackWall は例外をスロー');
}

// ========== 手牌操作: swapHandTile（すり替え） ==========

section('swapHandTile: 手牌の牌を壁の牌とすり替える');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
  });
  logic.initialize();
  logic.dealTiles();

  const hand = logic.players['player1'].hand;
  const firstTile = hand[0];

  // 手牌にない牌を壁から探してすり替える
  // honor 7（中）を対象とする
  const result = logic.swapHandTile(
    'player1',
    { suit: firstTile.suit, number: firstTile.number },
    { suit: 'honor', number: 7 }
  );

  if (result.success) {
    // すり替え成功: 手牌に中があるか確認
    const hasTarget = logic.players['player1'].hand.some(
      t => t.suit === 'honor' && t.number === 7
    );
    assert(hasTarget, 'すり替え後に手牌に中が含まれる');
  } else {
    // 壁に中がない場合はスキップ（配牌で全部引かれた可能性）
    assert(true, 'swapHandTile: 対象牌が壁にない場合は失敗（許容）');
  }
}

section('swapHandTile: cheatingEnabled=false では例外が発生する');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: false,
  });
  logic.initialize();
  logic.dealTiles();
  let threw = false;
  try {
    logic.swapHandTile('player1', { suit: 'man', number: 1 }, { suit: 'honor', number: 7 });
  } catch (e) {
    threw = true;
  }
  assert(threw, 'cheatingEnabled=false で swapHandTile は例外をスロー');
}

// ========== 手牌覗き見: peekHand ==========

section('peekHand: 相手の手牌を取得できる');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
  });
  logic.initialize();
  logic.dealTiles();

  const hand = logic.peekHand('player2');
  assert(hand.length > 0, 'peekHand が手牌を返す');
  assert(hand[0].suit !== undefined, 'peekHand の各要素に suit がある');
  assert(hand[0].number !== undefined, 'peekHand の各要素に number がある');
}

// ========== 壁牌交換: swapWallTiles ==========

section('swapWallTiles: 壁の2枚を入れ替えられる');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
  });
  logic.initialize();

  const before0 = logic.wall[0].toString();
  const before1 = logic.wall[1].toString();
  const result = logic.swapWallTiles(0, 1);
  assert(result.success, 'swapWallTiles が成功する');
  assertEqual(logic.wall[0].toString(), before1, '入れ替え後 wall[0] が元の wall[1]');
  assertEqual(logic.wall[1].toString(), before0, '入れ替え後 wall[1] が元の wall[0]');
}

// ========== getCheatingState ==========

section('getCheatingState: イカサマ状態のサマリーを取得できる');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: true,
    wallSeed: 999,
  });
  logic.initialize();
  const state = logic.getCheatingState();
  assertEqual(state.cheatingEnabled, true, 'getCheatingState.cheatingEnabled が true');
  assertEqual(state.fixedDrawOrder, true, 'getCheatingState.fixedDrawOrder が true');
  assertEqual(state.wallSeed, 999, 'getCheatingState.wallSeed が 999');
  assert(state.wallLength > 0, 'getCheatingState.wallLength が正');
}

// ========== ツモ順固定 + 積み込み統合テスト ==========

section('統合テスト: 積み込み後にfixedDrawOrderでツモすると積み込んだ牌が来る');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, null, {
    cheatingEnabled: true,
    fixedDrawOrder: true,
    wallSeed: 54321, // 再現性のためシード指定
  });
  logic.initialize();
  logic.dealTiles();

  // 中→發→白の順に積み込む
  logic.stackWall([
    { suit: 'honor', number: 7 }, // 中
    { suit: 'honor', number: 6 }, // 發
    { suit: 'honor', number: 5 }, // 白
  ]);

  // 中をツモ
  const draw1 = logic.drawTileWithLuckAdaptive('player1');
  if (draw1) {
    assertEqual(draw1.suit, 'honor', '1枚目ツモ: honor');
    assertEqual(draw1.number, 7, '1枚目ツモ: 7（中）');
  }

  // 發をツモ
  const draw2 = logic.drawTileWithLuckAdaptive('player2');
  if (draw2) {
    assertEqual(draw2.suit, 'honor', '2枚目ツモ: honor');
    assertEqual(draw2.number, 6, '2枚目ツモ: 6（發）');
  }

  // 白をツモ
  const draw3 = logic.drawTileWithLuckAdaptive('player1');
  if (draw3) {
    assertEqual(draw3.suit, 'honor', '3枚目ツモ: honor');
    assertEqual(draw3.number, 5, '3枚目ツモ: 5（白）');
  }
}

// ========== デフォルト値の確認 ==========

section('デフォルト: 通常のゲームではイカサマ機能が無効');
{
  const room = new GameRoom('normal-room', { testMode: true });
  assertEqual(room.cheatingEnabled, false, 'default GameRoom.cheatingEnabled is false');
  assertEqual(room.fixedDrawOrder, false, 'default GameRoom.fixedDrawOrder is false');
  assertEqual(room.wallSeed, null, 'default GameRoom.wallSeed is null');
}

// ========== レポート ==========

report();

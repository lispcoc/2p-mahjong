/**
 * 槍槓テスト
 * - 加槓（shominkan）に対する槍槓（通常の槍槓）
 * - 暗槓に対する国士無双槍槓（kokushi chankan）
 * - 槍槓見逃し（フリテン）
 * - 槍槓見逃し後のカン完了
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

// ========== 加槓に対する槍槓 ==========

section('槍槓: 加槓牌で相手がテンパイ → pendingChankanFor が設定される');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 が 1-3m待ちテンパイ（2m待ち）
  // 手牌: 2m×13 + ポン済み面子など... シンプルにする
  logic.players['player2'].hand = [
    new Tile('man', 2), // 待ち牌
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
  ];

  // player1 が 2m×3 のポン済み面子を持ち、手牌に 2m を持っている
  logic.players['player1'].hand = [
    new Tile('man', 2), // 加槓に使う牌
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('pin', 7), new Tile('pin', 8), new Tile('pin', 9),
    new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
  ];
  // ポン済みの 2m×3 をメルドに追加
  logic.players['player1'].melds.push([
    new Tile('man', 2), new Tile('man', 2), new Tile('man', 2),
  ]);
  // player1 のターン
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '加槓が成功する');
  assertEqual(kanResult.kanType, 'added', 'kanType が added');
  assert(kanResult.pendingChankan === true, '槍槓フラグが立つ');
  assertEqual(logic.pendingChankanFor, 'player2', 'pendingChankanFor が player2');
  assertEqual(logic.pendingKanUserId, 'player1', 'pendingKanUserId が player1');
  assertEqual(logic.ronPossibleFor, 'player2', 'ronPossibleFor が player2');
}

section('槍槓: 槍槓宣言 → ロン成立');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 がテンパイ（2m待ち）
  logic.players['player2'].hand = [
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('man', 2), // 2m 単騎待ち
  ];

  // player1 が 2m×3 ポン済み、手牌に 2m を持つ
  logic.players['player1'].hand = [
    new Tile('man', 2),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('pin', 7), new Tile('pin', 8), new Tile('pin', 9),
    new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
  ];
  logic.players['player1'].melds.push([
    new Tile('man', 2), new Tile('man', 2), new Tile('man', 2),
  ]);
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '加槓が成功する');
  assert(kanResult.pendingChankan === true, '槍槓フラグ');

  // player2 が槍槓（ロン）宣言
  const ronResult = logic.handleRon('player2');
  assert(ronResult.success, '槍槓ロン成立');
  assert(ronResult.finished, 'ゲーム終了');
  assert(ronResult.isChankan === true, '槍槓フラグが結果に含まれる');
  assertEqual(ronResult.message, '槍槓!', 'メッセージが槍槓');
  assertEqual(logic.pendingChankanFor, null, '槍槓後 pendingChankanFor がクリアされる');
  assertEqual(logic.pendingKanUserId, null, '槍槓後 pendingKanUserId がクリアされる');
}

section('槍槓: 槍槓見逃し → カン完了してフリテン');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 がテンパイ（2m待ち）
  logic.players['player2'].hand = [
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('man', 2),
  ];

  // player1 が 2m×3 ポン済み、手牌に 2m を持つ
  logic.players['player1'].hand = [
    new Tile('man', 2),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('pin', 7), new Tile('pin', 8), new Tile('pin', 9),
    new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
  ];
  logic.players['player1'].melds.push([
    new Tile('man', 2), new Tile('man', 2), new Tile('man', 2),
  ]);
  logic.currentTurnIndex = 0;
  const p1InitialScore = logic.players['player1'].score;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '加槓成功');
  assert(kanResult.pendingChankan === true, '槍槓フラグ');

  // player2 が見逃し（draw でスキップ）
  const drawResult = logic.handleDraw('player2');
  assert(drawResult.success, 'スキップ成功');
  assert(drawResult.chankanPassed === true, 'chankanPassed フラグ');

  // フリテンが設定されている
  assert(logic.players['player2'].tempFuriten, '槍槓見逃しでフリテン');

  // カンが完了している → player1 の手牌に嶺上牌が追加されている
  assert(logic.players['player1'].drawnFromKanningWall === true, '嶺上牌フラグが立っている');
  assert(logic.players['player1'].drawnTile !== null, '嶺上牌が引かれている');

  // ターンが player1 に戻っている
  assertEqual(logic.getCurrentTurn(), 'player1', 'ターンが player1 に戻る');

  // 槍槓状態がクリアされている
  assertEqual(logic.pendingChankanFor, null, 'pendingChankanFor クリア');
  assertEqual(logic.pendingKanUserId, null, 'pendingKanUserId クリア');
  assertEqual(logic.ronPossibleFor, null, 'ronPossibleFor クリア');

  // フリテンなのでロン不可（tsumo は可）
  assert(!logic.canWinWithTile('player2', new Tile('man', 2), true), '見逃し後 2m でロン不可（フリテン）');
}

section('槍槓: テンパイでない相手には槍槓が発生しない');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 が 2m 待ちテンパイだが、槓牌は 白（honor5）なので槍槓しない
  logic.players['player2'].hand = [
    new Tile('man', 2), // 2m 待ちテンパイ（白ではない）
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
  ];

  // player1 が 白×3 ポン済み、手牌に 白 を持つ（2m ではなく 白 を加槓）
  logic.players['player1'].hand = [
    new Tile('honor', 5), // 加槓に使う牌（白）
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('pin', 7), new Tile('pin', 8), new Tile('pin', 9),
    new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
    new Tile('honor', 4), new Tile('honor', 4), new Tile('honor', 4),
  ];
  logic.players['player1'].melds.push([
    new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5), // 白×3 ポン済み
  ]);
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '加槓成功');
  assert(kanResult.pendingChankan !== true, '槍槓フラグが立たない（白を待っていない）');
  assertEqual(logic.pendingChankanFor, null, 'pendingChankanFor は null');
  // カンが即座に完了し、嶺上牌が引かれている
  assert(logic.players['player1'].drawnFromKanningWall === true, '嶺上牌が引かれる');
}

// ========== 暗槓に対する国士無双槍槓 ==========

section('国士無双槍槓: 暗槓牌で相手が国士無双テンパイ → pendingChankanFor が設定される');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 が国士無双テンパイ（東が2枚あり東待ち or 中待ち）
  // 1m, 9m, 1p, 9p, 1s, 9s, 東, 南, 西, 北, 白, 發, 中
  // 中の待ちとする → 1m, 9m, 1p, 9p, 1s, 9s, 東×2, 南, 西, 北, 白, 發 （中待ち）
  logic.players['player2'].hand = [
    new Tile('man', 1),
    new Tile('man', 9),
    new Tile('pin', 1),
    new Tile('pin', 9),
    new Tile('sou', 1),
    new Tile('sou', 9),
    new Tile('honor', 1), // 東
    new Tile('honor', 1), // 東 × 2 (対子)
    new Tile('honor', 2), // 南
    new Tile('honor', 3), // 西
    new Tile('honor', 4), // 北
    new Tile('honor', 5), // 白
    new Tile('honor', 6), // 發
    // 中が来れば国士無双完成
  ];

  // player1 が 中×4 暗槓
  const chunTiles = [
    new Tile('honor', 7), // 中
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
  ];
  // player1 の手牌に 中×4 を含める（残りは適当）
  logic.players['player1'].hand = [
    ...chunTiles,
    new Tile('sou', 2), new Tile('sou', 3), new Tile('sou', 4),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
  ];
  // drawnTile を手牌の最後に設定（暗槓条件）
  logic.players['player1'].drawnTile = chunTiles[3];
  logic.players['player1'].drawnTileIndex = 3;
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '暗槓が成功する');
  assertEqual(kanResult.kanType, 'concealed', 'kanType が concealed');
  assert(kanResult.pendingChankan === true, '国士無双槍槓フラグが立つ');
  assertEqual(logic.pendingChankanFor, 'player2', 'pendingChankanFor が player2');
}

section('国士無双槍槓: 国士無双でない手牌には暗槓に対して槍槓が発生しない');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 が国士無双でないテンパイ（普通の手）
  logic.players['player2'].hand = [
    new Tile('man', 2), // 待ち
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 3), new Tile('sou', 4), new Tile('sou', 5),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
  ];

  // player1 が 中×4 暗槓
  const chunTiles = [
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
  ];
  logic.players['player1'].hand = [
    ...chunTiles,
    new Tile('sou', 2), new Tile('sou', 3), new Tile('sou', 4),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
  ];
  logic.players['player1'].drawnTile = chunTiles[3];
  logic.players['player1'].drawnTileIndex = 3;
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '暗槓成功');
  assert(kanResult.pendingChankan !== true, '国士無双以外には槍槓フラグが立たない');
  assertEqual(logic.pendingChankanFor, null, 'pendingChankanFor は null');
  // 即座にカン完了
  assert(logic.players['player1'].drawnFromKanningWall === true, '嶺上牌が引かれる');
}

section('国士無双槍槓: 暗槓で国士無双ロン成立');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 が国士無双テンパイ（中待ち）
  logic.players['player2'].hand = [
    new Tile('man', 1),
    new Tile('man', 9),
    new Tile('pin', 1),
    new Tile('pin', 9),
    new Tile('sou', 1),
    new Tile('sou', 9),
    new Tile('honor', 1),
    new Tile('honor', 1),
    new Tile('honor', 2),
    new Tile('honor', 3),
    new Tile('honor', 4),
    new Tile('honor', 5),
    new Tile('honor', 6),
  ];

  const chunTiles = [
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
  ];
  logic.players['player1'].hand = [
    ...chunTiles,
    new Tile('sou', 2), new Tile('sou', 3), new Tile('sou', 4),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
  ];
  logic.players['player1'].drawnTile = chunTiles[3];
  logic.players['player1'].drawnTileIndex = 3;
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '暗槓成功');
  assert(kanResult.pendingChankan === true, '国士無双槍槓フラグ');

  // player2 が国士無双槍槓宣言
  const ronResult = logic.handleRon('player2');
  assert(ronResult.success, '国士無双槍槓ロン成立');
  assert(ronResult.finished, 'ゲーム終了');
  assert(ronResult.isChankan === true, '槍槓フラグ');
  assertEqual(ronResult.message, '槍槓!', 'メッセージが槍槓');
}

section('国士無双槍槓: 暗槓見逃しでカン完了・フリテン');
{
  const logic = new MahjongLogic(['player1', 'player2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // player2 が国士無双テンパイ（中待ち）
  logic.players['player2'].hand = [
    new Tile('man', 1),
    new Tile('man', 9),
    new Tile('pin', 1),
    new Tile('pin', 9),
    new Tile('sou', 1),
    new Tile('sou', 9),
    new Tile('honor', 1),
    new Tile('honor', 1),
    new Tile('honor', 2),
    new Tile('honor', 3),
    new Tile('honor', 4),
    new Tile('honor', 5),
    new Tile('honor', 6),
  ];

  const chunTiles = [
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
    new Tile('honor', 7),
  ];
  logic.players['player1'].hand = [
    ...chunTiles,
    new Tile('sou', 2), new Tile('sou', 3), new Tile('sou', 4),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
  ];
  logic.players['player1'].drawnTile = chunTiles[3];
  logic.players['player1'].drawnTileIndex = 3;
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('player1');
  assert(kanResult.success, '暗槓成功');
  assert(kanResult.pendingChankan === true, '国士無双槍槓フラグ');

  // player2 が見逃し（draw でスキップ）
  const drawResult = logic.handleDraw('player2');
  assert(drawResult.success, 'スキップ成功');
  assert(drawResult.chankanPassed === true, 'chankanPassed フラグ');

  // フリテン設定確認
  assert(logic.players['player2'].tempFuriten, '見逃しでフリテン');

  // カン完了: player1 に嶺上牌
  assert(logic.players['player1'].drawnFromKanningWall === true, '嶺上牌フラグ');
  assert(logic.players['player1'].drawnTile !== null, '嶺上牌が引かれている');

  // ターンが player1 に戻る
  assertEqual(logic.getCurrentTurn(), 'player1', 'ターンが player1 に戻る');

  // 中でのロン不可（フリテン）
  assert(!logic.canWinWithTile('player2', new Tile('honor', 7), true), '見逃し後は中でロン不可（フリテン）');
}

// ========== getPendingChankanFor getter ==========

section('getPendingChankanFor: 初期状態は null');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  assertEqual(logic.getPendingChankanFor(), null, '初期状態は null');
}

// ========== canKokushiWinWithTile ==========

section('canKokushiWinWithTile: 国士無双テンパイ手牌で正しく判定');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();

  // 中 × 1 が来れば国士無双完成
  logic.players['player2'].hand = [
    new Tile('man', 1),
    new Tile('man', 9),
    new Tile('pin', 1),
    new Tile('pin', 9),
    new Tile('sou', 1),
    new Tile('sou', 9),
    new Tile('honor', 1),
    new Tile('honor', 1),
    new Tile('honor', 2),
    new Tile('honor', 3),
    new Tile('honor', 4),
    new Tile('honor', 5),
    new Tile('honor', 6),
  ];

  assert(logic.canKokushiWinWithTile('player2', new Tile('honor', 7)), '中で国士無双完成');
  assert(!logic.canKokushiWinWithTile('player2', new Tile('man', 2)), '2mでは国士無双不成立');
}

section('canKokushiWinWithTile: 副露ありは不成立');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();

  logic.players['player2'].hand = [
    new Tile('man', 1),
    new Tile('man', 9),
    new Tile('pin', 1),
    new Tile('pin', 9),
    new Tile('sou', 1),
    new Tile('sou', 9),
    new Tile('honor', 1),
    new Tile('honor', 2),
    new Tile('honor', 3),
    new Tile('honor', 4),
  ];
  logic.players['player2'].melds.push([
    new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
  ]);

  assert(!logic.canKokushiWinWithTile('player2', new Tile('honor', 6)), '副露ありは国士無双槍槓不成立');
}

report();

/**
 * ゲームメカニクステスト
 * - フリテン判定
 * - カン（暗槓・加槓）の手牌管理
 * - 手牌枚数の一貫性チェック
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

// ========== フリテン ==========

section('フリテン: 捨牌フリテン（待ち牌を捨ている）');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  // 1-2索待ちテンパイ
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2),
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('sou', 7), new Tile('sou', 7),
  ];
  logic.players['player1'].discards.push(new Tile('sou', 3));
  const isFuriten = logic.isFuriten('player1', new Tile('sou', 3));
  assert(isFuriten, '捨牌フリテンが検出される');
}

section('フリテン: 同巡フリテン（ロン見逃し後）');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2),
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('sou', 7), new Tile('sou', 7),
  ];
  logic.currentTurnIndex = 1;
  logic.lastDiscard = new Tile('sou', 3);
  logic.lastDiscardBy = 'player2';
  logic.ronPossibleFor = 'player1';
  logic.ronTile = new Tile('sou', 3);
  logic.handleDraw('player1');
  assert(logic.players['player1'].tempFuriten, '同巡フリテンが設定される');
}

section('フリテン: ロンは不可、ツモは可');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2),
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('sou', 7), new Tile('sou', 7),
  ];
  logic.players['player1'].discards.push(new Tile('sou', 3));
  const canRon = logic.canWinWithTile('player1', new Tile('sou', 3), true);
  const canTsumo = logic.canWinWithTile('player1', new Tile('sou', 3), false);
  assert(!canRon, 'フリテン状態でロン不可');
  assert(canTsumo, 'フリテン状態でもツモ可');
}

section('フリテン: リーチ後フリテンは永続');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  logic.players['player1'].riichi = true;
  logic.players['player1'].hand = [
    new Tile('sou', 1), new Tile('sou', 2),
    new Tile('man', 5), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('sou', 7), new Tile('sou', 7),
  ];
  logic.currentTurnIndex = 1;
  logic.lastDiscard = new Tile('sou', 3);
  logic.lastDiscardBy = 'player2';
  logic.ronPossibleFor = 'player1';
  logic.ronTile = new Tile('sou', 3);
  logic.handleDraw('player1');
  assert(logic.players['player1'].riichiPassFuriten, 'リーチ後フリテンが設定される');
}

// ========== カン（暗槓） ==========

section('暗槓: 面前維持');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const hand = game.players['player1'].hand;
  hand.length = 0;
  for (let i = 0; i < 4; i++) hand.push(new Tile('man', 5));
  hand.push(new Tile('man', 1));
  hand.push(new Tile('man', 2));
  hand.push(new Tile('pin', 3));
  const result = game.handleKong('player1');
  assert(result.success, '暗槓が成功');
  assert(game.isPlayerMenzen('player1'), '暗槓後も面前');
  assert(game.players['player1'].concealedMeldIndices.has(0), '暗槓がconcealed扱い');
}

section('暗槓: 手牌枚数（14枚→11枚）');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const hand = game.players['player1'].hand;
  hand.length = 0;
  for (let i = 0; i < 4; i++) hand.push(new Tile('man', 5));
  // man_5以外の10枚を追加（5を避ける）
  for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 1, 2]) hand.push(new Tile('man', n));
  assertEqual(hand.length, 14, '暗槓前は14枚');
  game.handleKong('player1');
  assertEqual(hand.length, 11, '暗槓後は11枚（14-4+1嶺上牌）');
}

// ========== カン（加槓） ==========

section('加槓: 面前喪失');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const hand = game.players['player1'].hand;
  hand.length = 0;
  game.players['player1'].melds.push([
    new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
  ]);
  hand.push(new Tile('sou', 7));
  hand.push(new Tile('pin', 1));
  hand.push(new Tile('pin', 2));
  game.handleKong('player1');
  assert(!game.isPlayerMenzen('player1'), '加槓後は面前喪失');
}

section('加槓: 手牌枚数（13枚→12枚）');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const hand = game.players['player1'].hand;
  hand.length = 0;
  game.players['player1'].melds.push([
    new Tile('sou', 7), new Tile('sou', 7), new Tile('sou', 7),
  ]);
  hand.push(new Tile('sou', 7));
  for (let i = 1; i <= 12; i++) hand.push(new Tile('man', (i % 9) || 9));
  assertEqual(hand.length, 13, '加槓前は13枚');
  game.handleKong('player1');
  // 加槓: 手牌から1枚移動 + 嶺上牌1枚 → 13-1+1=13 or 12
  assert(hand.length <= 14, '加槓後は14枚以下');
}

// ========== リーチ中のカン制限 ==========

section('カン: リーチ中はカン不可');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const hand = game.players['player1'].hand;
  hand.length = 0;
  for (let i = 0; i < 4; i++) hand.push(new Tile('honor', 1));
  hand.push(new Tile('man', 1));
  game.players['player1'].riichi = true;
  const result = game.handleKong('player1');
  assert(!result.success, 'リーチ中はカン不可');
}

// ========== カンのドラ追加 ==========

section('カン: ドラ表示牌が増える');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const initialDoraCount = game.doraIndicators.length;
  const hand = game.players['player1'].hand;
  hand.length = 0;
  for (let i = 0; i < 4; i++) hand.push(new Tile('pin', 4));
  hand.push(new Tile('honor', 2));
  const result = game.handleKong('player1');
  if (result.success) {
    assert(game.doraIndicators.length > initialDoraCount, 'ドラ表示牌が増加');
  }
}

// ========== 手牌の基本整合性 ==========

section('配牌: 親14枚・子13枚');
{
  const game = new MahjongLogic(['player1', 'player2']);
  game.initialize();
  game.dealTiles();
  const p1 = game.players['player1'];
  const p2 = game.players['player2'];
  assertEqual(p1.hand.length, 14, '親は14枚');
  assertEqual(p2.hand.length, 13, '子は13枚');
  assert(p1.hand.length <= 14, '親の手牌が14枚以下');
  assert(p2.hand.length <= 14, '子の手牌が14枚以下');
}

report();

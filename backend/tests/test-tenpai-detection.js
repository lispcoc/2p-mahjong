/**
 * 聴牌判定テスト
 * - 七対子の聴牌・待ち牌検出
 * - 国士無双の聴牌・待ち牌検出
 * - 通常手の待ち牌検出（七対子パターン含む）
 */
const TenpaiChecker = require('../src/logic/TenpaiChecker');
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

// ========== 七対子の聴牌判定 ==========

section('七対子: 6対+1枚 → 聴牌');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 4), new Tile('sou', 4),
    new Tile('sou', 7), new Tile('sou', 7),
    new Tile('honor', 6),
  ];
  const winners = TenpaiChecker.getWinningTiles(hand, []);
  assertEqual(winners.length, 1, '待ち牌が1種類');
  assert(winners.some(t => t.suit === 'honor' && t.number === 6), '待ち牌が發(honor 6)');
}

section('七対子: 別パターン（東待ち）');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 2),
    new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 1),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 1), new Tile('sou', 1),
    new Tile('honor', 1),
  ];
  const winners = TenpaiChecker.getWinningTiles(hand, []);
  assertEqual(winners.length, 1, '待ち牌が1種類');
  assert(winners.some(t => t.suit === 'honor' && t.number === 1), '待ち牌が東(honor 1)');
}

section('七対子: 聴牌ではない手（4対+3枚）');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 2),
    new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 1),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 1),
    new Tile('honor', 1),
    new Tile('honor', 2),
  ];
  const winners = TenpaiChecker.getWinningTiles(hand, []);
  assertEqual(winners.length, 0, '聴牌ではない（待ち牌なし）');
}

section('七対子: isChiitoitsu 完成形判定');
{
  const perfect = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('pin', 5), new Tile('pin', 5),
    new Tile('sou', 4), new Tile('sou', 4),
    new Tile('sou', 7), new Tile('sou', 7),
    new Tile('honor', 6), new Tile('honor', 6),
  ];
  assert(TenpaiChecker.isChiitoitsu(perfect), '7対完成形が正しく判定');
}

// ========== 国士無双の聴牌判定 ==========

section('国士無双: 白待ち（12種揃い+1萬ペア）');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 9),
    new Tile('sou', 1), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 4),
    new Tile('honor', 6), new Tile('honor', 7),
    new Tile('man', 1),
  ];
  const winners = TenpaiChecker.getWinningTiles(hand, []);
  assert(winners.length >= 1, '待ち牌が存在');
  assert(winners.some(t => t.suit === 'honor' && t.number === 5), '待ち牌に白(honor 5)');
}

section('国士無双: 中待ち');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 9),
    new Tile('sou', 1), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 6),
    new Tile('honor', 1),
  ];
  const winners = TenpaiChecker.getWinningTiles(hand, []);
  assert(winners.length >= 1, '待ち牌が存在');
  assert(winners.some(t => t.suit === 'honor' && t.number === 7), '待ち牌に中(honor 7)');
}

section('国士無双: 不完全（中間牌あり → 聴牌なし）');
{
  const hand = [
    new Tile('man', 1), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 9),
    new Tile('sou', 1), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('honor', 3), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 6),
    new Tile('man', 2),
  ];
  const winners = TenpaiChecker.getWinningTiles(hand, []);
  assertEqual(winners.length, 0, '国士崩れは聴牌なし');
}

section('国士無双: isKokushi 完成形判定');
{
  const perfect = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 9), new Tile('pin', 1),
    new Tile('pin', 9), new Tile('sou', 1),
    new Tile('sou', 9), new Tile('honor', 1),
    new Tile('honor', 2), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 5),
    new Tile('honor', 6), new Tile('honor', 7),
  ];
  assert(TenpaiChecker.isKokushi(perfect), '国士完成形が正しく判定');
}

// ========== 通常手の待ち牌検出（MahjongLogic経由） ==========

section('待ち牌検出: 七対子パターン(sou 2待ち)');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 2),
    new Tile('man', 3), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 1),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 1), new Tile('sou', 1),
    new Tile('sou', 2),
  ];
  const winners = logic.getWinningTiles(hand, []);
  assert(winners.length > 0, '待ち牌が存在');
  assert(winners.some(t => t.suit === 'sou' && t.number === 2), '待ち牌にsou 2');
}

section('待ち牌検出: 七対子パターン(honor 3待ち)');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('pin', 1), new Tile('pin', 1),
    new Tile('pin', 2), new Tile('pin', 2),
    new Tile('sou', 1), new Tile('sou', 1),
    new Tile('sou', 2), new Tile('sou', 2),
    new Tile('sou', 3), new Tile('sou', 3),
    new Tile('honor', 3),
  ];
  const winners = logic.getWinningTiles(hand, []);
  assert(winners.length > 0, '待ち牌が存在');
  assert(winners.some(t => t.suit === 'honor' && t.number === 3), '待ち牌にhonor 3');
}

report();

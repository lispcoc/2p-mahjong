/**
 * AI判断テスト
 * - ツモ切りモード / 戦略モード
 * - リーチ中の自動打牌
 * - ポン（副露）判断の改善
 */
const AIPlayer = require('../src/logic/AIPlayer');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

// ========== AIプレイヤー基本動作 ==========

section('AI: ツモ切りモード');
{
  const ai = new AIPlayer(true);
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
    new Tile('man', 4), // 最後にツモった牌
  ];
  const idx = ai.chooseDiscard(hand, 12, false);
  assertEqual(idx, 12, 'ツモ切りモードではツモ牌を打つ');
}

section('AI: 戦略モード（孤立牌を打つ）');
{
  const ai = new AIPlayer(false);
  const hand = [
    new Tile('man', 1), new Tile('man', 1),
    new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('honor', 1), new Tile('honor', 2),
    new Tile('man', 9), // 孤立した端牌
  ];
  const idx = ai.chooseDiscard(hand, 12, false);
  assert(idx >= 0 && idx < hand.length, '有効なインデックスを返す');
}

section('AI: 通常ドラは安易に切らない');
{
  const ai = new AIPlayer(false);
  const hand = [
    new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 2), new Tile('sou', 3), new Tile('sou', 4),
    new Tile('pin', 6), new Tile('pin', 7), new Tile('pin', 8),
    new Tile('sou', 6), new Tile('sou', 7),
    new Tile('man', 2),
  ];
  const idx = ai.chooseDiscard(hand, 12, false, {
    doraIndicators: [new Tile('man', 4)],
    numMelds: 0,
    melds: [],
    wallRemaining: 40,
  });
  const discarded = hand[idx];
  assert(!(discarded.suit === 'man' && discarded.number === 5), '通常ドラを他の孤立牌より先に切らない');
}

section('AI: 非役牌の字牌を役牌より先に整理する');
{
  const ai = new AIPlayer(false);
  const hand = [
    new Tile('honor', 1),
    new Tile('honor', 3),
    new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('pin', 3), new Tile('pin', 4), new Tile('pin', 5),
    new Tile('sou', 6), new Tile('sou', 7), new Tile('sou', 8),
    new Tile('man', 8), new Tile('man', 9),
  ];
  const idx = ai.chooseDiscard(hand, 12, false, {
    doraIndicators: [],
    numMelds: 0,
    melds: [],
    wallRemaining: 40,
    roundWind: 1,
    seatWind: 2,
  });
  const discarded = hand[idx];
  assert(discarded.suit === 'honor' && discarded.number === 3, '役牌の東より先に非役牌の西を切る');
}

section('AI: リーチ中はツモ切り');
{
  const ai = new AIPlayer(false);
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
    new Tile('man', 4),
  ];
  const idx = ai.chooseDiscard(hand, 12, true); // riichi=true
  assertEqual(idx, 12, 'リーチ中はツモ切り');
}

section('AI: モード切り替え');
{
  const ai = new AIPlayer(false);
  assert(!ai.getTsumoKiriMode(), '初期値はfalse');
  ai.setTsumoKiriMode(true);
  assert(ai.getTsumoKiriMode(), 'trueに切り替え');
}

// ========== ポン判断 ==========

section('ポン: テンパイに近い場合はポンする');
{
  const ai = new AIPlayer();
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 4), new Tile('man', 5), new Tile('man', 5),
    new Tile('pin', 1), new Tile('pin', 1),
    new Tile('sou', 2), new Tile('sou', 3), new Tile('sou', 4),
    new Tile('honor', 1),
  ];
  const result = ai.shouldPung(hand, new Tile('man', 5), []);
  assert(result === true, 'テンパイ近くでポン判断');
}

section('ポン: 無謀なポン（手の一体性破壊）は回避');
{
  const ai = new AIPlayer();
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('man', 5), new Tile('man', 6), new Tile('man', 7),
    new Tile('man', 8), new Tile('man', 9),
    new Tile('pin', 1), new Tile('pin', 2),
    new Tile('sou', 1),
  ];
  const result = ai.shouldPung(hand, new Tile('honor', 1), []);
  assert(result === false, '無関係な字牌のポンを回避');
}

section('ポン: バラバラな手ではポンしない');
{
  const ai = new AIPlayer();
  const hand = [
    new Tile('man', 2), new Tile('man', 2),
    new Tile('pin', 5),
    new Tile('sou', 7), new Tile('sou', 8),
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
    new Tile('honor', 4), new Tile('honor', 5), new Tile('honor', 6),
    new Tile('man', 9),
  ];
  const result = ai.shouldPung(hand, new Tile('man', 2), []);
  assert(result === false, 'バラバラ手でのポン回避');
}

report();

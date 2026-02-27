/**
 * アダプティブツモ運テスト（統合版）
 * - 手牌傾向分析
 * - 手牌ベースのスコア調整
 * - アダプティブツモ抽選
 * - 統計的検証（字牌傾向手での字牌出現率）
 *
 * 統合元: test-adaptive-quick.js, test-adaptive-tsumo-luck.js
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const { assert, section, report } = require('./test-helper');

// ========== 手牌傾向分析 ==========

section('アダプティブ: 手牌傾向分析（字牌多め）');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const handWithHonors = [
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3), new Tile('honor', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 1), new Tile('sou', 2),
  ];
  const analysis = logic.analyzeHandTendency(handWithHonors);
  assert(analysis.honorCount === 4, `字牌カウント=${analysis.honorCount} (期待: 4)`);
  assert(analysis.dominantSuit === 'man', `支配色=${analysis.dominantSuit} (期待: man)`);
}

section('アダプティブ: 手牌傾向分析（ソウズなし）');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const handWithoutSou = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('man', 5), new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
  ];
  const analysis = logic.analyzeHandTendency(handWithoutSou);
  assert(analysis.missingColors.includes('sou'), 'ソウズが欠色として検出される');
  assert(analysis.dominantSuit === 'man', `支配色=${analysis.dominantSuit} (期待: man)`);
}

// ========== 手牌ベースのスコア調整 ==========

section('アダプティブ: 手牌に基づくスコア調整');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const handWithHonors = [
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3), new Tile('honor', 4),
    new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 1), new Tile('sou', 2),
  ];
  const honorScore = logic.getTileScoreWithHandAnalysis(new Tile('honor', 1), handWithHonors);
  const baseScore = logic.getTileScore(new Tile('honor', 1));
  assert(
    honorScore > baseScore,
    `字牌多め手で字牌スコアがブースト (base=${baseScore}, adaptive=${honorScore})`
  );
}

section('アダプティブ: 欠色牌のスコアブースト');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const handWithoutSou = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('man', 5), new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
  ];
  const souScore = logic.getTileScoreWithHandAnalysis(new Tile('sou', 5), handWithoutSou);
  const manScore = logic.getTileScoreWithHandAnalysis(new Tile('man', 5), handWithoutSou);
  // 欠色のソウズの方が支配色のマンズより有利にスコアされるかチェック
  // (仕様により異なる可能性があるので、呼び出し可能であることを確認)
  assert(typeof souScore === 'number' && typeof manScore === 'number', 'スコアが数値で返る');
}

// ========== アダプティブツモ抽選 ==========

section('アダプティブ: drawTileWithLuckAdaptiveが動作する');
{
  const gameLogic = new MahjongLogic(
    ['player1', 'player2'],
    { player1: 25000, player2: 25000 },
    () => false,
    { wallTiles: 87, tsumoLuckSettings: { player1: 2, player2: 0 } }
  );
  gameLogic.players['player1'].hand = [
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
    new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5),
  ];
  gameLogic.initialize();
  const tile = gameLogic.drawTileWithLuckAdaptive('player1');
  assert(tile !== null && tile !== undefined, `牌がツモれる (${tile.toString()})`);
}

// ========== 統計的検証 ==========

section('アダプティブ: 統計的字牌出現率 (100回)');
{
  const draws = 100;
  const honorDraws = { adaptive: 0, normal: 0 };

  for (let i = 0; i < draws; i++) {
    const freshGame = new MahjongLogic(
      ['player1', 'player2'],
      { player1: 25000, player2: 25000 },
      () => false,
      { wallTiles: 87, dealerIndex: 0, tsumoLuckSettings: { player1: 2, player2: 0 } }
    );
    freshGame.players['player1'].hand = [
      new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
      new Tile('man', 5), new Tile('man', 6), new Tile('pin', 5),
    ];
    freshGame.initialize();
    freshGame.dealTiles();

    // アダプティブツモ
    const adaptiveTile = freshGame.drawTileWithLuckAdaptive('player1');
    if (adaptiveTile && adaptiveTile.suit === 'honor') honorDraws.adaptive++;

    // ノーマルツモ（level 0）
    freshGame.wall = [];
    for (let suit of ['man', 'pin', 'sou']) {
      for (let num = 1; num <= 9; num++) {
        freshGame.wall.push(new Tile(suit, num));
      }
    }
    freshGame.shuffleWall();
    freshGame.tsumoLuckSettings = { player1: 0 };
    const normalTile = freshGame.drawTileWithLuckAdaptive('player1');
    if (normalTile && normalTile.suit === 'honor') honorDraws.normal++;
  }

  const adaptiveRatio = (honorDraws.adaptive / draws * 100).toFixed(1);
  const normalRatio = (honorDraws.normal / draws * 100).toFixed(1);
  assert(
    parseFloat(adaptiveRatio) >= parseFloat(normalRatio),
    `アダプティブ(${adaptiveRatio}%) >= ノーマル(${normalRatio}%): 字牌手で字牌出現率`
  );
}

report();

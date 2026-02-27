/**
 * ツモ運テスト（統合版）
 * - 牌スコアリング
 * - ツモ運設定（レベル0-3）
 * - GameRoom → MahjongLogic 連携
 * - 統計的ツモ偏りテスト
 *
 * 統合元: test-tsumo-luck.js, test-tsumo-luck-integration.js, test-tsumo-luck-0-3-validation.js
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const GameRoom = require('../src/logic/GameRoom');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

// ========== 牌スコアリング ==========

section('ツモ運: 牌スコアリング');
{
  const logic = new MahjongLogic(['player1', 'player2']);
  const testTiles = [
    { suit: 'man', number: 1, expectedScore: 5 },
    { suit: 'man', number: 2, expectedScore: 10 },
    { suit: 'man', number: 3, expectedScore: 15 },
    { suit: 'man', number: 4, expectedScore: 20 },
    { suit: 'man', number: 5, expectedScore: 20 },
    { suit: 'man', number: 6, expectedScore: 20 },
    { suit: 'man', number: 7, expectedScore: 15 },
    { suit: 'man', number: 8, expectedScore: 10 },
    { suit: 'man', number: 9, expectedScore: 5 },
    { suit: 'honor', number: 1, expectedScore: 12 },
    { suit: 'honor', number: 5, expectedScore: 12 },
  ];
  testTiles.forEach(({ suit, number, expectedScore }) => {
    const tile = new Tile(suit, number);
    const score = logic.getTileScore(tile);
    assertEqual(score, expectedScore, `${suit}_${number}: スコア=${score}`);
  });
}

// ========== ツモ運設定 ==========

section('ツモ運: MahjongLogic設定の反映');
{
  const gameLogic = new MahjongLogic(
    ['player1', 'player2'],
    { player1: 25000, player2: 25000 },
    () => false,
    { tsumoLuckSettings: { player1: 2, player2: 0 } }
  );
  assertEqual(gameLogic.tsumoLuckSettings['player1'], 2, 'Player1のツモ運レベル=2');
  assertEqual(gameLogic.tsumoLuckSettings['player2'], 0, 'Player2のツモ運レベル=0');
}

// ========== レベル0-3検証 ==========

section('ツモ運: GameRoomレベル0-3の設定・取得');
{
  const room = new GameRoom('test-room', { testMode: true });
  [0, 1, 2, 3].forEach(level => {
    room.setTsumoLuck('player1', level);
    assertEqual(room.getTsumoLuck('player1'), level, `レベル${level}の設定・取得`);
  });
}

section('ツモ運: 範囲外の値はクランプ');
{
  const room = new GameRoom('test-room', { testMode: true });
  room.setTsumoLuck('player1', 5);
  assertEqual(room.getTsumoLuck('player1'), 3, 'レベル5→3にクランプ');
}

// ========== GameRoom → MahjongLogic連携 ==========

section('ツモ運: GameRoom→MahjongLogicへの引き継ぎ');
{
  const room = new GameRoom('test-integration', { testMode: true });
  room.addPlayer('player1', 'Alice', null);
  room.addPlayer('player2', 'Bob', null);
  room.setTsumoLuck('player1', 2);
  room.setTsumoLuck('player2', 0);

  const startResult = room.start();
  assert(!!startResult, 'ゲーム開始成功');

  const gl = room.gameLogic;
  assert(!!gl, 'GameLogicが初期化されている');
  assertEqual(gl.tsumoLuckSettings['player1'], 2, 'MahjongLogicにplayer1のレベル2が渡る');
  assertEqual(gl.tsumoLuckSettings['player2'], 0, 'MahjongLogicにplayer2のレベル0が渡る');

  // 牌スコアも正しい
  assertEqual(gl.getTileScore(new Tile('man', 4)), 20, '4m のスコア=20');
  assertEqual(gl.getTileScore(new Tile('man', 1)), 5, '1m のスコア=5');
  assertEqual(gl.getTileScore(new Tile('honor', 3)), 12, '字牌のスコア=12');
}

// ========== 統計的ツモ偏りテスト ==========

section('ツモ運: 統計的ツモ偏り (1000回抽選)');
{
  const testLogic = new MahjongLogic(
    ['player1', 'player2'],
    { player1: 25000, player2: 25000 },
    () => false,
    { wallTiles: 87, tsumoLuckSettings: { player1: 2, player2: 0 } }
  );
  testLogic.initialize();

  const draws = 1000;
  const results = {
    player1: { goodCount: 0 },
    player2: { goodCount: 0 },
  };

  for (let i = 0; i < draws; i++) {
    // player1 (level 2)
    testLogic.wall = [];
    for (let suit of ['man', 'pin', 'sou']) {
      for (let num = 1; num <= 9; num++) {
        testLogic.wall.push(new Tile(suit, num));
      }
    }
    testLogic.shuffleWall();
    if (testLogic.wall.length > 0) {
      const tile1 = testLogic.drawTileWithLuckAdaptive('player1');
      if (testLogic.getTileScore(tile1) >= 20) results.player1.goodCount++;
    }

    // player2 (level 0)
    testLogic.wall = [];
    for (let suit of ['man', 'pin', 'sou']) {
      for (let num = 1; num <= 9; num++) {
        testLogic.wall.push(new Tile(suit, num));
      }
    }
    testLogic.shuffleWall();
    if (testLogic.wall.length > 0) {
      const tile2 = testLogic.drawTileWithLuckAdaptive('player2');
      if (testLogic.getTileScore(tile2) >= 20) results.player2.goodCount++;
    }
  }

  const p1Ratio = (results.player1.goodCount / draws * 100).toFixed(1);
  const p2Ratio = (results.player2.goodCount / draws * 100).toFixed(1);
  assert(
    parseFloat(p1Ratio) > parseFloat(p2Ratio),
    `Level2(${p1Ratio}%) > Level0(${p2Ratio}%): ツモ運レベルで良牌率に差`
  );
}

report();

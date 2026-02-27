/**
 * 一発の鳴き消し判定テスト
 * - リーチ後、鳴きなしで次のツモ→一発有効
 * - リーチ後、ポンが入った→一発無効
 * - リーチ後、大明槓が入った→一発無効
 * - リーチ後、暗槓が入った→一発無効
 * - リーチ後、加槓が入った→一発無効
 * - リーチ後、ツモで和了せず打牌→一発自然消滅
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');
const { assert, assertEqual, section, report } = require('./test-helper');

// ログ抑制
const originalLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('テスト') || msg.includes('✓') || msg.includes('❌') || msg.includes('===') || msg.includes('結果')) {
    originalLog(...args);
  }
};

// ======================================================================
// ヘルパー関数
// ======================================================================

function createLogic() {
  const logic = new MahjongLogic(['player1', 'player2']);
  logic.initialize();
  return logic;
}

function setupRiichiPlayer(logic, playerId) {
  // プレイヤーをリーチ状態にする（直接フラグ設定）
  logic.players[playerId].riichi = true;
  logic.players[playerId].riichiTurn = logic.turnNumber;
  logic.players[playerId].ippatsuValid = true;
}

// ======================================================================
// テスト1：一発フラグの初期状態
// ======================================================================
section('一発: 初期状態ではippatsuValid=false');
{
  const logic = createLogic();
  assert(logic.players['player1'].ippatsuValid === false, 'player1のippatsuValidは初期false');
  assert(logic.players['player2'].ippatsuValid === false, 'player2のippatsuValidは初期false');
}

// ======================================================================
// テスト2：リーチ宣言時にippatsuValid=trueになる
// ======================================================================
section('一発: リーチ宣言でippatsuValid=true');
{
  const logic = createLogic();
  setupRiichiPlayer(logic, 'player1');
  assert(logic.players['player1'].ippatsuValid === true, 'リーチ後ippatsuValid=true');
}

// ======================================================================
// テスト3：ポンで一発が消える
// ======================================================================
section('一発: ポンによる一発消し');
{
  const logic = createLogic();
  
  // player1がリーチ状態
  setupRiichiPlayer(logic, 'player1');
  assert(logic.players['player1'].ippatsuValid === true, 'リーチ直後は一発有効');
  
  // player2がポンできる状態を作る
  // player1の捨て牌をplayer2がポンする
  const ponTile = new Tile('honor', 5); // 發
  logic.players['player2'].hand = [
    new Tile('honor', 5), new Tile('honor', 5),
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('man', 5), new Tile('man', 5),
  ];
  
  // player1が捨てた牌を設定
  logic.lastDiscard = ponTile;
  logic.lastDiscardBy = 'player1';
  logic.pendingPungFor = 'player2';
  logic.players['player1'].discards.push(ponTile);
  
  // player2がポン
  const result = logic.handlePung('player2');
  assert(result.success, 'ポンが成功する');
  assert(logic.players['player1'].ippatsuValid === false, 'ポン後、player1の一発が無効になる');
}

// ======================================================================
// テスト4：大明槓で一発が消える
// ======================================================================
section('一発: 大明槓による一発消し');
{
  const logic = createLogic();
  
  // player1がリーチ状態
  setupRiichiPlayer(logic, 'player1');
  
  // player2が大明槓できる状態を作る（手牌に3枚同じ牌 + 捨て牌1枚）
  const kanTile = new Tile('honor', 6); // 中
  logic.players['player2'].hand = [
    new Tile('honor', 6), new Tile('honor', 6), new Tile('honor', 6),
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('man', 5),
  ];
  
  logic.lastDiscard = kanTile;
  logic.lastDiscardBy = 'player1';
  logic.pendingPungFor = 'player2';
  logic.players['player1'].discards.push(kanTile);
  
  // 嶺上牌を確保
  if (logic.kanningWall.length === 0) {
    logic.kanningWall.push(new Tile('man', 9));
  }
  // ドラ表示牌を確保
  if (logic.doraWall && logic.doraWall.length === 0) {
    logic.doraWall = [new Tile('man', 8)];
  }
  
  const result = logic.attemptDaiminkan('player2');
  assert(result.success, '大明槓が成功する');
  assert(logic.players['player1'].ippatsuValid === false, '大明槓後、player1の一発が無効になる');
}

// ======================================================================
// テスト5：暗槓で一発が消える
// ======================================================================
section('一発: 暗槓による一発消し');
{
  const logic = createLogic();
  
  // player1がリーチ中（相手のplayer2が暗槓する場合）
  setupRiichiPlayer(logic, 'player1');
  
  // player2が暗槓できる手を持つ
  logic.players['player2'].hand = [
    new Tile('man', 9), new Tile('man', 9), new Tile('man', 9), new Tile('man', 9),
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('man', 5),
  ];
  
  // 嶺上牌を確保
  if (logic.kanningWall.length === 0) {
    logic.kanningWall.push(new Tile('pin', 9));
  }
  if (logic.doraWall && logic.doraWall.length === 0) {
    logic.doraWall = [new Tile('man', 8)];
  }
  
  const result = logic.attemptConcealedKan('player2');
  assert(result.success, '暗槓が成功する');
  assert(logic.players['player1'].ippatsuValid === false, '暗槓後、player1の一発が無効になる');
}

// ======================================================================
// テスト6：加槓で一発が消える
// ======================================================================
section('一発: 加槓による一発消し');
{
  const logic = createLogic();
  
  // player1がリーチ中
  setupRiichiPlayer(logic, 'player1');
  
  // player2がポン済みの面子を持ち、手牌に同じ牌がある
  const ponMeld = [new Tile('honor', 7), new Tile('honor', 7), new Tile('honor', 7)];
  logic.players['player2'].melds.push(ponMeld);
  logic.players['player2'].hand = [
    new Tile('honor', 7), // 加槓用
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('man', 5),
  ];
  
  // 嶺上牌を確保
  if (logic.kanningWall.length === 0) {
    logic.kanningWall.push(new Tile('pin', 1));
  }
  if (logic.doraWall && logic.doraWall.length === 0) {
    logic.doraWall = [new Tile('man', 8)];
  }
  
  const result = logic.attemptAddedKan('player2');
  assert(result.success, '加槓が成功する');
  assert(logic.players['player1'].ippatsuValid === false, '加槓後、player1の一発が無効になる');
}

// ======================================================================
// テスト7：ツモ切り（和了せず打牌）で一発が自然消滅
// ======================================================================
section('一発: ツモ切りで一発自然消滅');
{
  const logic = createLogic();
  
  // player1がリーチ状態でツモ切りする
  setupRiichiPlayer(logic, 'player1');
  logic.currentTurnIndex = 0; // player1のターン
  
  // テンパイしていない手牌（和了しないためのダミー手）
  logic.players['player1'].hand = [
    new Tile('man', 1), new Tile('man', 3), new Tile('man', 5),
    new Tile('pin', 2), new Tile('pin', 4), new Tile('pin', 6),
    new Tile('sou', 1), new Tile('sou', 3), new Tile('sou', 5),
    new Tile('honor', 1), new Tile('honor', 2), new Tile('honor', 3),
    new Tile('man', 7),
  ];
  
  // ツモ牌を設定
  const drawnTile = new Tile('man', 7);
  logic.players['player1'].hand.push(drawnTile);
  logic.players['player1'].drawnTile = drawnTile;
  logic.players['player1'].drawnTileIndex = logic.players['player1'].hand.length - 1;
  
  // player2のロン不可を確保するためのダミー手
  logic.players['player2'].hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 1), new Tile('pin', 2), new Tile('pin', 3),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('honor', 4), new Tile('honor', 4),
    new Tile('honor', 5), new Tile('honor', 5),
  ];
  
  assert(logic.players['player1'].ippatsuValid === true, '打牌前は一発有効');
  
  // handleDiscardを呼ぶ（リーチ中の自動ツモ切り）
  logic.handleDiscard('player1');
  
  assert(logic.players['player1'].ippatsuValid === false, '打牌後は一発無効（自然消滅）');
}

// ======================================================================
// テスト8：cancelAllIppatsuが両プレイヤーの一発を消す
// ======================================================================
section('一発: cancelAllIppatsuが両プレイヤーに効く');
{
  const logic = createLogic();
  
  // 両方リーチ状態
  setupRiichiPlayer(logic, 'player1');
  setupRiichiPlayer(logic, 'player2');
  
  assert(logic.players['player1'].ippatsuValid === true, 'player1の一発有効');
  assert(logic.players['player2'].ippatsuValid === true, 'player2の一発有効');
  
  logic.cancelAllIppatsu();
  
  assert(logic.players['player1'].ippatsuValid === false, 'cancelAllIppatsu後、player1の一発無効');
  assert(logic.players['player2'].ippatsuValid === false, 'cancelAllIppatsu後、player2の一発無効');
}

// ======================================================================
// テスト9：ScoreCalculatorへのippatsuValid連携（一発有効時）
// ======================================================================
section('一発: ScoreCalculator連携（一発有効時）');
{
  const scoreCalculator = new ScoreCalculator();
  
  // リーチ+一発の手
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('man', 5), new Tile('man', 5),
  ];
  const winningTile = new Tile('man', 5);
  
  const result = scoreCalculator.calculateScore({
    hand: hand,
    melds: [],
    winningTile: winningTile,
    isTsumo: true,
    isRon: false,
    riichi: true,
    menzen: true,
    roundWind: 0,
    seatWind: 0,
    doraIndicators: [],
    doraTiles: [],
    urahaTiles: [],
    isIppatsumari: true, // 一発有効
    isHaitei: false,
    isRinshan: false
  });
  
  const hasIppatsu = result.yaku.some(y => y.name === '一発');
  assert(hasIppatsu, 'isIppatsumari=trueで一発が検出される');
}

// ======================================================================
// テスト10：ScoreCalculatorへのippatsuValid連携（一発無効時）
// ======================================================================
section('一発: ScoreCalculator連携（一発無効時・鳴き消し後）');
{
  const scoreCalculator = new ScoreCalculator();
  
  const hand = [
    new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
    new Tile('pin', 4), new Tile('pin', 5), new Tile('pin', 6),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1),
    new Tile('man', 5), new Tile('man', 5),
  ];
  const winningTile = new Tile('man', 5);
  
  const result = scoreCalculator.calculateScore({
    hand: hand,
    melds: [],
    winningTile: winningTile,
    isTsumo: true,
    isRon: false,
    riichi: true,
    menzen: true,
    roundWind: 0,
    seatWind: 0,
    doraIndicators: [],
    doraTiles: [],
    urahaTiles: [],
    isIppatsumari: false, // 鳴き消しで一発無効
    isHaitei: false,
    isRinshan: false
  });
  
  const hasIppatsu = result.yaku.some(y => y.name === '一発');
  assert(!hasIppatsu, 'isIppatsumari=falseで一発が検出されない');
}

// ======================================================================

// ログ復元
console.log = originalLog;
report();

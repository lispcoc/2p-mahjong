/**
 * 四開槓（Suukaikan）テスト
 * - 2人が合計4回カンで流局
 * - 1人が4回カンした場合は四槓子の可能性があり流局しない
 * - 搶槓（チャンカン）: 4回目の加槓をロンした場合は流局せず槍槓が優先
 * - 搶槓を見逃した場合の四開槓判定
 */
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');
const { assert, assertEqual, section, report } = require('./test-helper');

/**
 * ヘルパー: player に直接カン面子を追加する（ゲームフロー外での直接セットアップ用）
 */
function addKanMeld(logic, userId, suit, number, opts = {}) {
  const meld = [
    new Tile(suit, number),
    new Tile(suit, number),
    new Tile(suit, number),
    new Tile(suit, number),
  ];
  const meldIndex = logic.players[userId].melds.length;
  logic.players[userId].melds.push(meld);
  if (opts.concealed) {
    logic.players[userId].concealedMeldIndices.add(meldIndex);
  }
  if (opts.daiminkan) {
    logic.players[userId].daiminkanMeldIndices.add(meldIndex);
  }
}

// ========================================
// 1. ヘルパーメソッドのテスト
// ========================================
section('getPlayerKanCount / getTotalKanCount ヘルパー');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // 初期状態: カン0
  assertEqual(logic.getPlayerKanCount('p1'), 0, 'p1 カン数 = 0');
  assertEqual(logic.getPlayerKanCount('p2'), 0, 'p2 カン数 = 0');
  assertEqual(logic.getTotalKanCount(), 0, '合計カン数 = 0');

  // p1 にカン面子を1つ追加
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  assertEqual(logic.getPlayerKanCount('p1'), 1, 'p1 カン数 = 1');
  assertEqual(logic.getTotalKanCount(), 1, '合計カン数 = 1');

  // p2 にカン面子を2つ追加
  addKanMeld(logic, 'p2', 'pin', 5);
  addKanMeld(logic, 'p2', 'sou', 9, { daiminkan: true });
  assertEqual(logic.getPlayerKanCount('p2'), 2, 'p2 カン数 = 2');
  assertEqual(logic.getTotalKanCount(), 3, '合計カン数 = 3');

  // ポン面子は数えない
  logic.players['p1'].melds.push([new Tile('honor', 1), new Tile('honor', 1), new Tile('honor', 1)]);
  assertEqual(logic.getPlayerKanCount('p1'), 1, 'ポン面子はカウントされない');
  assertEqual(logic.getTotalKanCount(), 3, 'ポンを含めても合計 = 3');
}

// ========================================
// 2. checkSuukaikan の基本テスト
// ========================================
section('checkSuukaikan: 合計4カン（2人以上）→ 流局');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 が2回、p2 が2回 = 合計4回
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);
  addKanMeld(logic, 'p2', 'pin', 1, { concealed: true });
  addKanMeld(logic, 'p2', 'pin', 9);

  const result = logic.checkSuukaikan();
  assert(result !== null, '四開槓が検出される');
  assert(result.finished === true, 'finished = true');
  assert(result.isDraw === true, 'isDraw = true');
  assert(result.isSuukaikan === true, 'isSuukaikan = true');
  assert(result.message.includes('四開槓'), 'メッセージに四開槓を含む');
  assert(logic.finished === true, 'logic.finished が true に設定される');
}

section('checkSuukaikan: 合計3カン → 流局しない');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);
  addKanMeld(logic, 'p2', 'pin', 1, { concealed: true });

  const result = logic.checkSuukaikan();
  assert(result === null, '3カンでは四開槓にならない');
}

// ========================================
// 3. 四槓子例外のテスト
// ========================================
section('checkSuukaikan: 1人が4回カン → 四槓子の可能性、流局しない');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 だけが4回カン
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);
  addKanMeld(logic, 'p1', 'pin', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'sou', 1);

  const result = logic.checkSuukaikan();
  assert(result === null, '1人が4回カン → 四槓子のため流局しない');
  assert(logic.finished !== true, 'logic.finished は true にならない');
}

// ========================================
// 4. 暗槓で四開槓トリガーのテスト
// ========================================
section('暗槓で4回目のカン → 四開槓が発生');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 は既に2回カン済み
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);

  // p2 は1回カン済み + 手牌に暗槓できる4枚
  addKanMeld(logic, 'p2', 'pin', 1, { concealed: true });
  logic.players['p2'].hand = [
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
  ];

  // p2 のターン
  logic.currentTurnIndex = 1;

  const kanResult = logic.handleKong('p2');
  assert(kanResult.success, 'カンが成功する');
  assert(kanResult.finished === true, '四開槓で finished = true');
  assert(kanResult.isDraw === true, '四開槓で isDraw = true');
  assert(kanResult.isSuukaikan === true, '四開槓で isSuukaikan = true');
}

// ========================================
// 5. 加槓で四開槓トリガーのテスト（チャンカンなし）
// ========================================
section('加槓で4回目のカン → 四開槓が発生（相手がロンできない場合）');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 は既に2回カン済み
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);

  // p2 は1回カン済み + ポン済み面子 + 手牌に加槓できる1枚
  addKanMeld(logic, 'p2', 'pin', 1, { concealed: true });
  // ポン済みの sou5×3
  logic.players['p2'].melds.push([
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
  ]);
  logic.players['p2'].hand = [
    new Tile('sou', 5), // 加槓に使う
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
  ];

  // p1 の手牌をsou5でロンできないものにする
  logic.players['p1'].hand = [
    new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('honor', 5), new Tile('honor', 5), new Tile('honor', 5),
    new Tile('honor', 6),
  ];

  // p2 のターン
  logic.currentTurnIndex = 1;

  const kanResult = logic.handleKong('p2');
  assert(kanResult.success, '加槓が成功する');
  assert(kanResult.finished === true, '四開槓で finished = true');
  assert(kanResult.isDraw === true, '四開槓で isDraw = true');
  assert(kanResult.isSuukaikan === true, '四開槓で isSuukaikan = true');
}

// ========================================
// 6. 大明槓で四開槓トリガーのテスト
// ========================================
section('大明槓で4回目のカン → 四開槓が発生');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p2 は既に2回カン済み
  addKanMeld(logic, 'p2', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p2', 'man', 9);

  // p1 は1回カン済み + 手牌に3枚（大明槓用）
  addKanMeld(logic, 'p1', 'pin', 1, { concealed: true });
  logic.players['p1'].hand = [
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('honor', 3),
  ];

  // p2 が sou5 を捨てた状態を作る
  logic.lastDiscard = new Tile('sou', 5);
  logic.lastDiscardBy = 'p2';
  logic.pendingPungFor = 'p1';
  logic.players['p2'].discards.push(new Tile('sou', 5));
  logic.players['p2'].discardFlags.push({ isTsumogiri: false });

  // p1 のターン
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('p1');
  assert(kanResult.success, '大明槓が成功する');
  assert(kanResult.finished === true, '四開槓で finished = true');
  assert(kanResult.isDraw === true, '四開槓で isDraw = true');
  assert(kanResult.isSuukaikan === true, '四開槓で isSuukaikan = true');
}

// ========================================
// 7. 搶槓優先テスト: 4回目の加槓でチャンカンが可能
// ========================================
section('搶槓優先: 4回目の加槓で相手がロンできる → 流局せず pendingChankan');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 は2回カン済み
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);

  // p2 は1回カン済み + ポン済み面子 + 手牌に加槓できる牌
  addKanMeld(logic, 'p2', 'pin', 1, { concealed: true });
  // ポン済みの sou5×3
  logic.players['p2'].melds.push([
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
  ]);
  logic.players['p2'].hand = [
    new Tile('sou', 5), // 加槓に使う
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
  ];

  // p1 の手牌を sou5 でロンできるテンパイにする（4s-6s待ち → 5sでチャンカン可能）
  logic.players['p1'].hand = [
    new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 6),
    new Tile('honor', 6), new Tile('honor', 6),
  ];

  // p2 のターン
  logic.currentTurnIndex = 1;

  const kanResult = logic.handleKong('p2');
  assert(kanResult.success, '加槓が成功する');
  assert(kanResult.pendingChankan === true, '槍槓フラグが立つ（四開槓より優先）');
  assert(kanResult.finished !== true, 'まだ finished にならない');
  assertEqual(logic.pendingChankanFor, 'p1', 'p1 がチャンカン可能');
}

// ========================================
// 8. 搶槓を見逃し → 四開槓で流局
// ========================================
section('搶槓見逃し後 → 四開槓チェックで流局');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 は2回カン済み
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);

  // p2 は1回カン済み + ポン済み面子 + 手牌に加槓できる牌
  addKanMeld(logic, 'p2', 'pin', 1, { concealed: true });
  // ポン済みの sou5×3
  logic.players['p2'].melds.push([
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
  ]);
  logic.players['p2'].hand = [
    new Tile('sou', 5), // 加槓に使う
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
    new Tile('honor', 3), new Tile('honor', 3), new Tile('honor', 3),
  ];

  // p1 の手牌: sou5 でロンできるテンパイ
  logic.players['p1'].hand = [
    new Tile('man', 2), new Tile('man', 3), new Tile('man', 4),
    new Tile('pin', 5), new Tile('pin', 6), new Tile('pin', 7),
    new Tile('sou', 1), new Tile('sou', 2), new Tile('sou', 3),
    new Tile('sou', 4), new Tile('sou', 6),
    new Tile('honor', 6), new Tile('honor', 6),
  ];

  // p2 のターン
  logic.currentTurnIndex = 1;

  // 加槓で pendingChankan 発生
  const kanResult = logic.handleKong('p2');
  assert(kanResult.pendingChankan === true, 'チャンカン待ち');

  // p1 がチャンカンを見逃す (draw = パス)
  logic.currentTurnIndex = 0; // p1のターンに
  const drawResult = logic.processAction('p1', { type: 'draw' });
  assert(drawResult.success, 'draw（パス）が成功する');

  // 四開槓で流局するはず
  assert(drawResult.finished === true, '搶槓見逃し後に四開槓で finished = true');
  assert(drawResult.isDraw === true, '搶槓見逃し後に四開槓で isDraw = true');
  assert(drawResult.isSuukaikan === true, '搶槓見逃し後に四開槓で isSuukaikan = true');
}

// ========================================
// 9. 1人が4回カン → 暗槓で四槓子の可能性、流局しない
// ========================================
section('1人で4回暗槓 → 四槓子の可能性あり、流局しない');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 は既に3回カン済み
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9, { concealed: true });
  addKanMeld(logic, 'p1', 'pin', 1, { concealed: true });

  // p1 の手牌に暗槓できる4枚
  logic.players['p1'].hand = [
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
    new Tile('honor', 7), new Tile('honor', 7),
    new Tile('pin', 2),
  ];

  // p1 のターン
  logic.currentTurnIndex = 0;

  const kanResult = logic.handleKong('p1');
  assert(kanResult.success, '暗槓が成功する');
  assert(kanResult.finished !== true, '1人が4回カン → finished にならない（四槓子の可能性）');
  assert(!kanResult.isDraw, '流局にならない');
  assertEqual(kanResult.kanType, 'concealed', 'kanType = concealed');
}

// ========================================
// 10. p1:3カン, p2:0カン → p2 が1回暗槓で四開槓
// ========================================
section('p1:3回カン, p2:1回カン → 四開槓で流局');
{
  const logic = new MahjongLogic(['p1', 'p2'], {}, () => false, { wallTiles: 44 });
  logic.initialize();

  // p1 は3回カン済み
  addKanMeld(logic, 'p1', 'man', 1, { concealed: true });
  addKanMeld(logic, 'p1', 'man', 9);
  addKanMeld(logic, 'p1', 'pin', 1, { concealed: true });

  // p2 の手牌に暗槓できる4枚
  logic.players['p2'].hand = [
    new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5), new Tile('sou', 5),
    new Tile('pin', 2), new Tile('pin', 3), new Tile('pin', 4),
    new Tile('sou', 7), new Tile('sou', 8), new Tile('sou', 9),
  ];

  // p2 のターン
  logic.currentTurnIndex = 1;

  const kanResult = logic.handleKong('p2');
  assert(kanResult.success, '暗槓が成功する');
  assert(kanResult.finished === true, '四開槓で finished = true');
  assert(kanResult.isDraw === true, '四開槓で isDraw = true');
  assert(kanResult.isSuukaikan === true, '四開槓で isSuukaikan = true');
}

report();

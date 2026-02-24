/**
 * ドラの実装を確認するテスト
 */

const Tile = require('../src/logic/Tile');
const ScoreCalculator = require('../src/logic/ScoreCalculator');

console.log('========================================');
console.log('  ドラ実装確認テスト');
console.log('========================================\n');

const scoreCalculator = new ScoreCalculator();

// テスト1: ドラが正しくカウントされるか
console.log('【テスト1】ドラのカウント');
console.log('-'.repeat(40));

// 手牌：一筒x2, 二筒x2, 三筒x2...（簡単な形）
const testHand = [
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('man', 3),
  new Tile('man', 4),
  new Tile('man', 5),
  new Tile('pin', 1),
  new Tile('pin', 2),
  new Tile('pin', 3),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
  new Tile('sou', 4),
  new Tile('sou', 5),
];

// ドラ表示牌を「北」(honor_4)とする => ドラは「白」(honor_5)
const doraIndicator = new Tile('honor', 4);
console.log(`ドラ表示牌: ${doraIndicator.toString()}`);

// テスト: getNextTileメソッドが正しく実装されているか
const nextTile = scoreCalculator.getNextTile(doraIndicator);
console.log(`計算されたドラ: ${nextTile.toString()}`);

// 手牌に「白」(honor_5)を追加
testHand.push(new Tile('honor', 5));
testHand.push(new Tile('honor', 5));
console.log(`手牌: ${testHand.map(t => t.toString()).join(', ')}`);

// countDoraメソッドでカウント
const doraInfo = scoreCalculator.countDora(testHand, [doraIndicator], []);
console.log(`カウント結果: ドラ ${doraInfo.dora} 枚\n`);

// テスト2: ドラを含む和了時の翻数
console.log('【テスト2】ドラを含む役判定');
console.log('-'.repeat(40));

// 役ありで、さらにドラがある手牌（14枚）
// 白白（ペア）+ 一萬二萬三萬 + 四萬五萬六萬 + 七萬八萬九萬 + 一筒二筒三筒
const winHand = [
  new Tile('honor', 5), // 白（ペア1）
  new Tile('honor', 5), // 白（ペア2）
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('man', 4),
  new Tile('man', 5),
  new Tile('man', 6),
  new Tile('man', 7),
  new Tile('man', 8),
  new Tile('man', 9),
  new Tile('pin', 1),
  new Tile('pin', 2),
  new Tile('pin', 3),
];

const winInfo = {
  hand: winHand,
  melds: [],
  winningTile: new Tile('pin', 4), // 四筒で和了
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [doraIndicator],
  doraTiles: [new Tile('honor', 5)],
  urahaTiles: []
};

console.log('和了情報:');
console.log(`  手牌(14枚): ${winHand.map(t => t.toString()).join(', ')}`);
console.log(`  和了牌: ${winInfo.winningTile.toString()}`);
console.log(`  ドラ表示牌: ${doraIndicator.toString()}`);

const scoreResult = scoreCalculator.calculateScore(winInfo);

if (scoreResult.valid) {
  console.log('\n✅ 和了成功');
  console.log(`役: ${scoreResult.yaku.map(y => y.name).join(', ')}`);
  console.log(`翻数: ${scoreResult.han}翻`);
  console.log(`得点: ${scoreResult.score}点`);
} else {
  console.log('\n❌ 和了失敗');
  console.log(`エラー: ${scoreResult.error}`);
}

// テスト3: ドラのみでは和了できないことを確認
console.log('\n【テスト3】ドラのみでは和了できないかの確認');
console.log('-'.repeat(40));

// バラバラの手牌（役がない）を作成
const noYakuHand = [
  new Tile('man', 1),
  new Tile('man', 3),
  new Tile('man', 5),
  new Tile('pin', 2),
  new Tile('pin', 4),
  new Tile('pin', 6),
  new Tile('sou', 1),
  new Tile('sou', 3),
  new Tile('sou', 5),
  new Tile('sou', 7),
  new Tile('sou', 9),
  new Tile('honor', 1),
  new Tile('honor', 3),
  new Tile('honor', 5),
];

const noYakuWinInfo = {
  hand: noYakuHand,
  melds: [],
  winningTile: new Tile('honor', 5),
  isTsumo: false,
  isRon: true,
  riichi: false,
  menzen: true,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [doraIndicator],
  doraTiles: [new Tile('honor', 5)],
  urahaTiles: []
};

console.log('和了情報:');
console.log(`  手牌: ${noYakuHand.map(t => t.toString()).join(', ')}`);
console.log(`  和了牌: ${noYakuWinInfo.winningTile.toString()}`);
console.log(`  ドラ表示牌: ${doraIndicator.toString()}`);

const noYakuResult = scoreCalculator.calculateScore(noYakuWinInfo);

if (!noYakuResult.valid) {
  console.log('\n✅ 正しく和了できませんでした');
  console.log(`エラー: ${noYakuResult.error}`);
} else {
  console.log('\n❌ 和了できてしまいました（エラー）');
  console.log(`役: ${noYakuResult.yaku.map(y => y.name).join(', ')}`);
  console.log(`翻数: ${noYakuResult.han}翻`);
}

// テスト4: 裏ドラの確認
console.log('\n【テスト4】裏ドラの確認（リーチ時）');
console.log('-'.repeat(40));

// 14枚の手牌で、門前ツモ和了の形
// 白白（ペア）+ 一萬二萬三萬 + 四萬五萬六萬 + 七萬八萬九萬 + 一索二索三索
const urahaHand = [
  new Tile('honor', 5), // 白（ペア1）
  new Tile('honor', 5), // 白（ペア2）
  new Tile('man', 1),
  new Tile('man', 2),
  new Tile('man', 3),
  new Tile('man', 4),
  new Tile('man', 5),
  new Tile('man', 6),
  new Tile('man', 7),
  new Tile('man', 8),
  new Tile('man', 9),
  new Tile('sou', 1),
  new Tile('sou', 2),
  new Tile('sou', 3),
];

const urahaWinInfo = {
  hand: urahaHand,
  melds: [],
  winningTile: new Tile('sou', 4), // 四索で和了
  isTsumo: true,
  isRon: false,
  riichi: true, // リーチ状態
  menzen: true,
  roundWind: 1,
  seatWind: 1,
  doraIndicators: [doraIndicator],
  doraTiles: [new Tile('honor', 5)],
  urahaTiles: [new Tile('honor', 5), new Tile('honor', 5)] // 裏ドラ2枚
};

console.log('和了情報:');
console.log(`  手牌(14枚): ${urahaHand.map(t => t.toString()).join(', ')}`);
console.log(`  和了牌: ${urahaWinInfo.winningTile.toString()}`);
console.log(`  リーチ状態: ${urahaWinInfo.riichi}`);
console.log(`  ツモ和了: true`);

const urahaResult = scoreCalculator.calculateScore(urahaWinInfo);

if (urahaResult.valid) {
  console.log('\n✅ ツモ和了成功');
  console.log(`役: ${urahaResult.yaku.map(y => y.name).join(', ')}`);
  const doraYaku = urahaResult.yaku.filter(y => y.isDora);
  console.log(`ドラ関連の役: ${doraYaku.map(y => y.name + '(' + y.han + '翻)').join(', ')}`);
  console.log(`総翻数: ${urahaResult.han}翻`);
  console.log(`得点: ${urahaResult.score}点`);
} else {
  console.log('\n❌ 和了失敗');
  console.log(`エラー: ${urahaResult.error}`);
}

console.log('\n========================================');
console.log('  テスト完了');
console.log('========================================');

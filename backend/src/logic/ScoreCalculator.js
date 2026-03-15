const Tile = require('./Tile');

class ScoreCalculator {
  constructor(options = {}) {
    this.aotenjou = options.aotenjou || false; // 青天井モード（点数上限なし）
    this.kiriagemangan = options.kiriagemangan !== false; // 切り上げ満貫（4翻30符・3翻60符を満貫扱い、デフォルト有効）
    // 基本点数表（切り上げ後の実際の支払い点数）
    this.scoreTable = {
      // [飜数][符] = {ron: ロン時の点数, tsumo: ツモ時の各自の支払い}
      1: {
        20: { ron: 1000, tsumo: 300 },
        30: { ron: 1000, tsumo: 300 },
        40: { ron: 1300, tsumo: 400 },
        50: { ron: 1600, tsumo: 400 },
        60: { ron: 2000, tsumo: 500 },
        70: { ron: 2300, tsumo: 600 },
      },
      2: {
        20: { ron: 1300, tsumo: 400 },
        25: { ron: 1600, tsumo: 400 }, // 七対子
        30: { ron: 2000, tsumo: 500 },
        40: { ron: 2600, tsumo: 700 },
        50: { ron: 3200, tsumo: 800 },
        60: { ron: 3900, tsumo: 1000 },
        70: { ron: 4500, tsumo: 1200 },
      },
      3: {
        20: { ron: 2600, tsumo: 700 },
        25: { ron: 3200, tsumo: 800 },
        30: { ron: 3900, tsumo: 1000 },
        40: { ron: 5200, tsumo: 1300 },
        50: { ron: 6400, tsumo: 1600 },
        60: { ron: 7700, tsumo: 2000 },
      },
      4: {
        20: { ron: 5200, tsumo: 1300 },
        25: { ron: 6400, tsumo: 1600 },
        30: { ron: 7700, tsumo: 2000 },
        40: { ron: 8000, tsumo: 2000 }, // 満貫
      },
      5: { ron: 8000, tsumo: 2000 }, // 満貫
      6: { ron: 12000, tsumo: 3000 }, // 跳満
      7: { ron: 12000, tsumo: 3000 },
      8: { ron: 16000, tsumo: 4000 }, // 倍満
      9: { ron: 16000, tsumo: 4000 },
      10: { ron: 16000, tsumo: 4000 },
      11: { ron: 24000, tsumo: 6000 }, // 三倍満
      12: { ron: 24000, tsumo: 6000 },
      13: { ron: 32000, tsumo: 8000 }, // 役満
    };
  }

  /**
   * 和了の点数を計算
   * @param {Object} winInfo - 和了情報
   * @returns {Object} 点数計算結果
   */
  calculateScore(winInfo) {
    const { hand, melds, concealedMeldIndices = new Set(), winningTile, isTsumo, isRon, riichi, menzen, roundWind, seatWind, doraIndicators = [], doraTiles = [], urahaIndicators = [],  urahaTiles = [], isIppatsumari = false, isHaitei = false, isHoutei = false, isRinshan = false, isDoubleRiichi = false, isTenhou = false, isChiihou = false, isRenhou = false } = winInfo;

    let bestResult = null;
    let maxScore = 0;

    // 副露の数に応じて期待する面子数を計算
    // 合計4面子必要で、副露がn個あれば、手牌からはn個減らした面子を探す
    const expectedMeldCount = 4 - melds.length;

    // 七対子の判定（特殊形、門前のみ）
    if (melds.length === 0 && this.isChiitoitsu(hand)) {
      const yaku = this.detectYaku(hand, melds, winningTile, isTsumo, isRon, riichi, menzen, null, roundWind, seatWind, doraIndicators, doraTiles, urahaIndicators, urahaTiles, isIppatsumari, isHaitei, isHoutei, isRinshan, isDoubleRiichi, isTenhou, isChiihou, isRenhou, concealedMeldIndices);
      const yakumanCount = this.getYakumanCount(yaku);
      const han = yaku.reduce((sum, y) => sum + y.han, 0);

      // ドラのみの場合はスキップ
      const hasNonDoraYaku = yaku.some(y => !y.isDora);

      if (han > 0 && hasNonDoraYaku) {
        const fu = 25; // 七対子は固定25符
        const scoreResult = this.calculateScoreFromHanFu(han, fu, isRon, yakumanCount);
        bestResult = {
          valid: true,
          yaku: yaku,
          han: han,
          fu: fu,
          score: scoreResult.score,
          scoreType: scoreResult.scoreType,
          calculation: this.formatCalculation(yaku, han, fu, scoreResult.score, scoreResult.scoreType, yakumanCount),
          winningTile: winningTile
        };
        maxScore = scoreResult.score;
      }
    }

    // 国士無双の判定（特殊形、門前のみ）
    if (melds.length === 0 && this.isKokushi(hand)) {
      const yaku = this.detectYaku(hand, melds, winningTile, isTsumo, isRon, riichi, menzen, null, roundWind, seatWind, doraIndicators, doraTiles, urahaIndicators, urahaTiles, isIppatsumari, isHaitei, isHoutei, isRinshan, isDoubleRiichi, isTenhou, isChiihou, isRenhou, concealedMeldIndices);
      const yakumanCount = this.getYakumanCount(yaku);
      const han = yaku.reduce((sum, y) => sum + y.han, 0);

      // ドラのみの場合はスキップ
      const hasNonDoraYaku = yaku.some(y => !y.isDora);

      if (han > 0 && hasNonDoraYaku) {
        const fu = 30; // 国士無双は固定30符（実際には満貫以上）
        const scoreResult = this.calculateScoreFromHanFu(han, fu, isRon, yakumanCount);
        bestResult = {
          valid: true,
          yaku: yaku,
          han: han,
          fu: fu,
          score: scoreResult.score,
          scoreType: scoreResult.scoreType,
          calculation: this.formatCalculation(yaku, han, fu, scoreResult.score, scoreResult.scoreType, yakumanCount),
          winningTile: winningTile
        };
        maxScore = scoreResult.score;
      }
    }

    // 通常の和了形を全て試す
    const combinations = this.findAllCombinations(hand, expectedMeldCount);

    // 各和了形で役判定して最高得点を選ぶ
    for (let combination of combinations) {
      const yaku = this.detectYaku(hand, melds, winningTile, isTsumo, isRon, riichi, menzen, combination, roundWind, seatWind, doraIndicators, doraTiles, urahaIndicators, urahaTiles, isIppatsumari, isHaitei, isHoutei, isRinshan, isDoubleRiichi, isTenhou, isChiihou, isRenhou, concealedMeldIndices);
      const han = yaku.reduce((sum, y) => sum + y.han, 0);

      if (han === 0) continue; // 役なしはスキップ

      // ドラのみの場合はスキップ（ドラだけでは和了できない）
      const hasNonDoraYaku = yaku.some(y => !y.isDora);
      if (!hasNonDoraYaku) continue;

      // 役満カウントを取得
      const yakumanCount = this.getYakumanCount(yaku);

      // 符を計算
      const fu = this.calculateFuWithCombination(hand, melds, concealedMeldIndices, winningTile, isTsumo, combination, roundWind, seatWind);

      // 点数を計算
      const scoreResult = this.calculateScoreFromHanFu(han, fu, isRon, yakumanCount);

      if (scoreResult.score > maxScore) {
        maxScore = scoreResult.score;
        bestResult = {
          valid: true,
          yaku: yaku,
          han: han,
          fu: this.roundFu(fu),
          score: scoreResult.score,
          scoreType: scoreResult.scoreType,
          calculation: this.formatCalculation(yaku, han, this.roundFu(fu), scoreResult.score, scoreResult.scoreType, yakumanCount),
          combination: combination,
          winningTile: winningTile
        };
      }
    }

    if (!bestResult) {
      return {
        valid: false,
        error: '役がありません',
        yaku: [],
        han: 0,
        fu: 0,
        score: 0,
        winningTile: winningTile
      };
    }

    return bestResult;
  }

  /**
   * 飜数と符から点数を計算
   * @param {number} han - 飜数
   * @param {number} fu - 符
   * @param {boolean} isRon - ロン和了か
   * @param {number} yakumanCount - 役満の数（0=通常、1=シングル、2=ダブル等）
   */
  calculateScoreFromHanFu(han, fu, isRon, yakumanCount = 0) {
    let score = 0;
    let scoreType = '';

    // 青天井モード: 上限なしで基本点を計算
    if (this.aotenjou) {
      return this.calculateScoreAotenjou(han, fu, isRon, yakumanCount);
    }

    // 役満（ダブル・トリプル対応）
    if (yakumanCount > 0) {
      score = 32000 * yakumanCount;
      if (yakumanCount === 1) {
        scoreType = '役満';
      } else if (yakumanCount === 2) {
        scoreType = 'ダブル役満';
      } else if (yakumanCount === 3) {
        scoreType = 'トリプル役満';
      } else {
        scoreType = `${yakumanCount}倍役満`;
      }
      return { score, scoreType };
    }

    // 二人麻雀では満貫以上は固定点数（ロン・ツモ同じ）
    if (han >= 13) {
      scoreType = '役満';
      score = 32000;
    } else if (han >= 11) {
      scoreType = '三倍満';
      score = 24000;
    } else if (han >= 8) {
      scoreType = '倍満';
      score = 16000;
    } else if (han >= 6) {
      scoreType = '跳満';
      score = 12000;
    } else if (han >= 5) {
      scoreType = '満貫';
      score = 8000;
    } else if (han >= 4 && fu >= 40) {
      scoreType = '満貫';
      score = 8000;
    } else if (this.kiriagemangan && han >= 4 && fu >= 30) {
      scoreType = '満貫'; // 切り上げ満貫（4翻30符）
      score = 8000;
    } else if (han >= 3 && fu >= 70) {
      scoreType = '満貫';
      score = 8000;
    } else if (this.kiriagemangan && han >= 3 && fu >= 60) {
      scoreType = '満貫'; // 切り上げ満貫（3翻60符）
      score = 8000;
    } else {
      // 通常の点数計算
      const roundedFu = this.roundFu(fu);
      if (this.scoreTable[han] && this.scoreTable[han][roundedFu]) {
        score = this.scoreTable[han][roundedFu].ron;
      } else if (this.scoreTable[han] && typeof this.scoreTable[han].ron === 'number') {
        score = this.scoreTable[han].ron;
      } else {
        const basePoints = fu * Math.pow(2, han + 2);
        score = Math.ceil(basePoints * 4 / 100) * 100;
      }
    }

    return { score, scoreType: scoreType || `${han}飜 ${this.roundFu(fu)}符` };
  }

  /**
   * 青天井モード: 点数上限なしで計算
   * 基本点 = 符 × 2^(飜数+2) をそのまま使い、切り上げて点数を算出
   * 役満も13飜として基本点計算する（役満の特別点数は使わない）
   */
  calculateScoreAotenjou(han, fu, isRon, yakumanCount = 0) {
    let effectiveHan = han;
    const roundedFu = this.roundFu(fu);

    // 役満は13飜×役満数として扱う
    if (yakumanCount > 0) {
      effectiveHan = 13 * yakumanCount;
    }

    // 基本点 = 符 × 2^(飜数+2)
    const basePoints = roundedFu * Math.pow(2, effectiveHan + 2);
    // 二人麻雀: ロン = 基本点 × 4（切り上げ）
    const score = Math.ceil(basePoints * 4 / 100) * 100;

    // スコアタイプの表示
    let scoreType = `${effectiveHan}飜 ${roundedFu}符 【青天井】`;

    return { score, scoreType };
  }

  /**
   * 役を判定
   * @param {Array} hand - 手牌
   * @param {Array} melds - 副露
   * @param {Tile} winningTile - 和了牌
   * @param {boolean} isTsumo - ツモ和了か
   * @param {boolean} isRon - ロン和了か
   * @param {boolean} riichi - リーチ状態か
   * @param {boolean} menzen - 門前か
   * @param {Object} combination - 和了形（面子構成）nullの場合は特殊形
   * @param {Array} doraIndicators - ドラ表示牌
   * @param {Array} doraTiles - ドラ
   * @param {Array} urahaTiles - 裏ドラ（リーチ時）
   * @param {boolean} isIppatsumari - 一発判定
   * @param {boolean} isHaitei - 海底撈月判定
   * @param {boolean} isHoutei - 河底撈魚判定
   * @param {boolean} isRinshan - 嶺上開花判定
   * @param {boolean} isDoubleRiichi - ダブル立直判定
   * @param {boolean} isTenhou - 天和判定
   * @param {boolean} isChiihou - 地和判定
   * @param {boolean} isRenhou - 人和判定
   */
  detectYaku(hand, melds, winningTile, isTsumo, isRon, riichi, menzen, combination, roundWind, seatWind, doraIndicators = [], doraTiles = [], urahaIndicators = [], urahaTiles = [], isIppatsumari = false, isHaitei = false, isHoutei = false, isRinshan = false, isDoubleRiichi = false, isTenhou = false, isChiihou = false, isRenhou = false, concealedMeldIndices = new Set()) {
    const yaku = [];
    const allTiles = hand.concat(melds.flat());

    console.log(`[detectYaku] riichi=${riichi}, menzen=${menzen}, isTsumo=${isTsumo}, isRon=${isRon}`);
    console.log(`[detectYaku] isTenhou=${isTenhou}, isChiihou=${isChiihou}, isRenhou=${isRenhou}, isDoubleRiichi=${isDoubleRiichi}`);

    // === 役満チェック ===
    // 複数の役満が重複した場合にダブル・トリプル役満とするため、
    // 全ての役満を収集してから判定する
    const yakumanList = [];

    // 天和（テンホウ）- 親の配牌が和了形（役満）
    if (isTenhou) {
      yakumanList.push({ name: '天和', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 地和（チーホウ）- 子の最初のツモで和了（役満）
    if (isChiihou) {
      yakumanList.push({ name: '地和', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 人和（レンホウ）- 子が最初のツモ前にロンで和了（役満）
    if (isRenhou) {
      yakumanList.push({ name: '人和', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 四槓子（スーカンコ）
    if (this.isSukankou(melds)) {
      yakumanList.push({ name: '四槓子', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 四暗刻（スーアンコー）/ 四暗刻単騎（ダブル役満）
    if (combination && this.isSuuankouWithCombination(combination, isTsumo, winningTile, melds, concealedMeldIndices)) {
      if (this.isSuuankouTanki(combination, winningTile, melds, concealedMeldIndices)) {
        yakumanList.push({ name: '四暗刻単騎', han: 26, isYakuman: true, yakumanValue: 2 });
      } else {
        yakumanList.push({ name: '四暗刻', han: 13, isYakuman: true, yakumanValue: 1 });
      }
    }

    // 大三元（ダイサンゲン）
    if (this.isDaisangen(allTiles)) {
      yakumanList.push({ name: '大三元', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 大四喜（ダイスーシー）- ダブル役満
    if (this.isDaishushi(allTiles)) {
      yakumanList.push({ name: '大四喜', han: 26, isYakuman: true, yakumanValue: 2 });
    }

    // 字一色（ツーイーソー）
    if (this.isTsuuiisou(allTiles)) {
      yakumanList.push({ name: '字一色', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 清老頭（チンロウトウ）
    if (this.isChinroutou(allTiles)) {
      yakumanList.push({ name: '清老頭', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 緑一色（リョクイッショク）
    if (this.isRyokuisshoku(allTiles)) {
      yakumanList.push({ name: '緑一色', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 大車輪（ダイシャリン）
    if (this.isDaisharin(allTiles)) {
      yakumanList.push({ name: '大車輪', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 小四喜（ショウスーシー） - 役満（大四喜と排他）
    if (!this.isDaishushi(allTiles) && this.isShousushi(allTiles)) {
      yakumanList.push({ name: '小四喜', han: 13, isYakuman: true, yakumanValue: 1 });
    }

    // 九蓮宝燈 / 純正九蓮宝燈（ダブル役満）- 門前のみ
    if (menzen && melds.length === 0 && this.isChuurenPoutou(allTiles)) {
      if (this.isJunseiChuurenPoutou(allTiles, winningTile)) {
        yakumanList.push({ name: '純正九蓮宝燈', han: 26, isYakuman: true, yakumanValue: 2 });
      } else {
        yakumanList.push({ name: '九蓮宝燈', han: 13, isYakuman: true, yakumanValue: 1 });
      }
    }

    // 国士無双 / 国士無双十三面待ち（ダブル役満）- 門前のみ・特殊形
    if (!combination && melds.length === 0 && this.isKokushi(hand)) {
      if (this.isKokushiJuusanmen(hand, winningTile)) {
        yakumanList.push({ name: '国士無双十三面', han: 26, isYakuman: true, yakumanValue: 2 });
      } else {
        yakumanList.push({ name: '国士無双', han: 13, isYakuman: true, yakumanValue: 1 });
      }
    }

    // 役満が1つ以上あれば、役満のみを返す（通常役は不要）
    if (yakumanList.length > 0) {
      return yakumanList;
    }

    // === 通常役チェック ===

    // 三槓子（サンカンコ）- 2翻役（役満チェック後に配置して混入を防ぐ）
    if (this.isSankankouWithMelds(melds)) {
      yaku.push({ name: '三槓子', han: 2 });
    }

    // 通常役チェック
    // ツモ（門前のみ）
    if (isTsumo && menzen) {
      yaku.push({ name: 'ツモ', han: 1 });
    }

    // リーチ / ダブル立直（門前のみ）
    if (riichi && (menzen || melds.length === 0)) {
      if (isDoubleRiichi) {
        yaku.push({ name: 'ダブル立直', han: 2 });
        console.log('[detectYaku] ダブル立直役を追加');
      } else {
        yaku.push({ name: 'リーチ', han: 1 });
        console.log('[detectYaku] リーチ役を追加');
      }
    } else if (riichi) {
      console.log(`[detectYaku] リーチ役なし: menzen=${menzen}, melds.length=${melds.length}`);
    }

    // 一発（イッパツ）- リーチ後、初ターンの和了（ロン・ツモ両方対応、門前のみ、リーチ必須）
    // 注：七対子など他の役と複合可能
    if (isIppatsumari && riichi && menzen) {
      yaku.push({ name: '一発', han: 1 });
    }

    // 海底撈月（ハイテイロウゲツ）- 壁の最後の牌でツモ和了（副露があっても成立）
    if (isHaitei && isTsumo) {
      yaku.push({ name: '海底撈月', han: 1 });
    }

    // 河底撈魚（ホウテイロウユイ）- 壁の最後の捨て牌でロン和了（副露があっても成立）
    if (isHoutei && isRon) {
      yaku.push({ name: '河底撈魚', han: 1 });
    }

    // 嶺上開花（リンシャンカイホウ）- カン後、嶺上牌でツモ和了（副露があっても成立）
    if (isRinshan && isTsumo) {
      yaku.push({ name: '嶺上開花', han: 1 });
    }

    // 七対子（チートイツ） - 門前のみ（特殊形なのでcombinationがnull）
    if (!combination && melds.length === 0 && this.isChiitoitsu(hand)) {
      yaku.push({ name: '七対子', han: 2 });
      // 七対子は清一色・混一色・混老頭・断么九・ドラなどと複合する
      // early returnせず、以降のタイルベース判定を続ける
    }

    // 国士無双は役満チェック段階で処理済み（ここには到達しない）

    // 清一色（チンイツ）- 和了形に依存しない
    const chinItsu = this.isChinitsu(allTiles);
    if (chinItsu) {
      yaku.push({ name: '清一色', han: !menzen ? 5 : 6 });
    }

    // 混一色（ホンイツ）- 和了形に依存しない
    const honItsu = !chinItsu && this.isHonitsu(allTiles);
    if (honItsu) {
      yaku.push({ name: '混一色', han: !menzen ? 2 : 3 });
    }

    // 混老頭（ホンロウトウ）- 和了形に依存しない
    if (this.isHonroutou(allTiles) && !this.isChinroutou(allTiles)) {
      yaku.push({ name: '混老頭', han: 2 });
    }

    // 断么九（タンヤオ）- 和了形に依存しない（七対子とも複合）
    if (this.isTanyao(allTiles)) {
      yaku.push({ name: '断么九', han: 1 });
    }

    // 以下、和了形に依存する役（combinationを使用）
    if (!combination) {
      // 和了形がない場合（七対子など）は以下の役は判定しない
      // ただしドラ系は判定する
      const doraCounts = this.countDora(allTiles, doraIndicators, doraTiles);
      if (doraCounts.dora > 0) {
        yaku.push({ name: 'ドラ', han: doraCounts.dora, isDora: true });
      }
      const redDoraCount = this.countRedDora(allTiles);
      if (redDoraCount > 0) {
        yaku.push({ name: '赤ドラ', han: redDoraCount, isDora: true });
      }
      if (riichi) {
        const urahaCounts = this.countDora(allTiles, urahaIndicators, urahaTiles);
        if (urahaCounts.dora > 0) {
          yaku.push({ name: '裏ドラ', han: urahaCounts.dora, isDora: true });
        }
      }
      return yaku;
    }

    // 二盃口（リャンペーコー） - 門前のみ、和了形に依存（暗槓は門前扱い）
    if (menzen && this.isRyanpeikouWithCombination(combination)) {
      yaku.push({ name: '二盃口', han: 3 });
    } else if (menzen && this.checkIipeikouWithCombination(combination)) {
      // 一盃口（二盃口がない場合のみ）
      yaku.push({ name: '一盃口', han: 1 });
    }

    // 一気通貫（イッツー）- 和了形に依存（暗槓は門前扱い）
    const ittsu = this.isIttsuWithCombination(combination, melds);
    if (ittsu) {
      yaku.push({ name: '一気通貫', han: !menzen ? 1 : 2 });
    }

    // 三色同順（サンシキドウジュン）- 和了形に依存（暗槓は門前扱い）
    const sanshoku = this.checkSanshokuWithCombination(combination, melds);
    if (sanshoku) {
      yaku.push({ name: '三色同順', han: !menzen ? 1 : 2 });
    }

    // 三色同刻（サンシキドウコー）- 和了形に依存
    const sanshokuDouko = this.isSanshokuDoukoWithCombination(combination, melds);
    if (sanshokuDouko) {
      yaku.push({ name: '三色同刻', han: 2 });
    }

    // 三暗刻（サンアンコー）- 和了形に依存
    if (this.isSankouWithCombination(combination, isRon, winningTile, melds, concealedMeldIndices)) {
      yaku.push({ name: '三暗刻', han: 2 });
    }

    // 対々和（トイトイホー）- 和了形に依存（副露を含む）
    if (this.isToitoiWithCombination(combination, melds)) {
      yaku.push({ name: '対々和', han: 2 });
    }

    // 小三元（ショウサンゲン）- 和了形に依存しない
    if (this.isShousangen(allTiles)) {
      yaku.push({ name: '小三元', han: 2 });
    }

    // 純全帯么九（ジュンチャン）- 和了形に依存
    const isHonroutou = this.isHonroutou(allTiles);
    const junchan = this.isJunchanWithCombination(combination, melds, allTiles);
    if (junchan) {
      yaku.push({ name: '純全帯么九', han: !menzen ? 2 : 3 });
    }

    // 混全帯么九（チャンタ）- 和了形に依存（混老頭・純チャンとは複合しない）
    if (!junchan && !isHonroutou) {
      const chanta = this.isChantaWithCombination(combination, melds, allTiles);
      if (chanta) {
        yaku.push({ name: '混全帯么九', han: !menzen ? 1 : 2 });
      }
    }

    // 断么九（タンヤオ）は combination guard の前で判定済み

    // 平和（ピンフ） - 門前のみ（ツモ・ロン両方可）、暗槓があると不成立
    if (menzen && melds.length === 0 && this.isPinfuWithCombination(combination, winningTile, roundWind, seatWind)) {
      yaku.push({ name: '平和', han: 1 });
    }

    // 役牌（白發中）- 和了形に依存しない
    const yakuhai = this.countYakuhai(allTiles, roundWind, seatWind);
    yakuhai.forEach(y => yaku.push(y));

    // ドラをカウント（手牌＋副露の全タイル）
    const doraCounts = this.countDora(allTiles, doraIndicators, doraTiles);
    if (doraCounts.dora > 0) {
      yaku.push({ name: 'ドラ', han: doraCounts.dora, isDora: true });
    }

    // 赤ドラをカウント（各赤牌は1翻）
    const redDoraCount = this.countRedDora(allTiles);
    if (redDoraCount > 0) {
      yaku.push({ name: '赤ドラ', han: redDoraCount, isDora: true });
    }

    // リーチ時の裏ドラをカウント
    if (riichi) {
      const urahaCounts = this.countDora(allTiles, urahaIndicators, urahaTiles);
      if (urahaCounts.dora > 0) {
        yaku.push({ name: '裏ドラ', han: urahaCounts.dora, isDora: true });
      }
    }

    return yaku;
  }

  /**
   * タンヤオ判定
   */
  isTanyao(tiles) {
    return tiles.every(tile => {
      if (tile.suit === 'honor') return false;
      return tile.number >= 2 && tile.number <= 8;
    });
  }

  /**
   * 平和判定
   * 条件: 門前・全て順子・雀頭が役牌でない・両面待ち
   */
  isPinfu(hand, winningTile) {
    // 14枚の手牌を面子分解
    const combinations = this.findAllCombinations(hand);

    if (combinations.length === 0) {
      return false; // 和了形でない
    }

    // 各組み合わせについて平和の条件を確認
    for (let combo of combinations) {
      const { pair, melds } = combo;

      // 1. 全て順子か確認（刻子がないか）
      const allSequences = melds.every(meld => this.isSequence(meld));
      if (!allSequences) continue;

      // 2. 雀頭が役牌でないか確認（三元牌・場風・自風）
      if (pair.suit === 'honor') {
        if (pair.number >= 5 && pair.number <= 7) continue; // 白發中は役牌
        // 注意: isPinfu は roundWind/seatWind を受け取らないため、風牌チェックは不完全
        // isPinfuWithCombination を使用すること
      }

      // 3. 両面待ちか確認
      const isRyanmen = this.checkRyanmenWaitInMelds(melds, winningTile);
      if (isRyanmen) {
        return true;
      }
    }

    return false;
  }

  /**
   * 手牌の全ての面子構成を見つける
   */
  /**
   * 手牌の全ての面子構成を見つける
   * @param {Array} tiles - 手牌
   * @param {number} expectedMeldCount - 期待する面子数（デフォルト4）
   */
  findAllCombinations(tiles, expectedMeldCount = 4) {
    const combinations = [];
    const seenPairKeys = new Set();

    // 対子（雀頭）候補を探す
    for (let i = 0; i < tiles.length - 1; i++) {
      const tile1 = tiles[i];
      const pairKey = `${tile1.suit}_${tile1.number}`;

      // 同じ種類の雀頭は一度だけ試す
      if (seenPairKeys.has(pairKey)) continue;

      for (let j = i + 1; j < tiles.length; j++) {
        const tile2 = tiles[j];

        // 同じ牌が2枚あれば雀頭候補
        if (tile1.suit === tile2.suit && tile1.number === tile2.number) {
          seenPairKeys.add(pairKey);

          // 残りの牌で面子を作る（全ての分解を列挙）
          const remaining = tiles.filter((t, idx) => idx !== i && idx !== j);
          const allMeldSets = this.findMelds(remaining);

          for (const melds of allMeldSets) {
            if (melds.length === expectedMeldCount) {
              combinations.push({
                pair: tile1,
                melds: melds
              });
            }
          }

          break; // 同じ雀頭で複数回試さない
        }
      }
    }

    return combinations;
  }

  /**
   * 残りの牌から面子を作る（全ての分解を列挙）
   * @returns {Array<Array<Meld>>} - 分解の一覧（空配列は分解不可脳を意味）
   */
  findMelds(tiles) {
    if (tiles.length === 0) return [[]];
    if (tiles.length % 3 !== 0) return [];

    // 牌をソート
    const sorted = [...tiles].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.number - b.number;
    });

    return this.findAllMeldsRecursive(sorted);
  }

  /**
   * 再帰的に面子の全ての分解を探す
   * 刻子・順子の両方を試し、全ての有効分解を返す
   * @returns {Array<Array<Meld>>} - 分解の一覧
   */
  findAllMeldsRecursive(tiles) {
    if (tiles.length === 0) return [[]];

    const results = [];
    const first = tiles[0];

    // パターン1: 刻子を作る
    if (tiles.length >= 3 &&
        tiles[1].suit === first.suit && tiles[1].number === first.number &&
        tiles[2].suit === first.suit && tiles[2].number === first.number) {
      const remaining = tiles.slice(3);
      const restResults = this.findAllMeldsRecursive(remaining);
      for (const rest of restResults) {
        results.push([[tiles[0], tiles[1], tiles[2]], ...rest]);
      }
    }

    // パターン2: 順子を作る
    if (first.suit !== 'honor' && first.number <= 7) {
      const secondIdx = tiles.findIndex((t, idx) => idx > 0 && t.suit === first.suit && t.number === first.number + 1);
      if (secondIdx >= 0) {
        const thirdIdx = tiles.findIndex((t, idx) => idx > secondIdx && t.suit === first.suit && t.number === first.number + 2);
        if (thirdIdx >= 0) {
          const remaining = tiles.filter((_, idx) => idx !== 0 && idx !== secondIdx && idx !== thirdIdx);
          const restResults = this.findAllMeldsRecursive(remaining);
          for (const rest of restResults) {
            results.push([[first, tiles[secondIdx], tiles[thirdIdx]], ...rest]);
          }
        }
      }
    }

    return results;
  }

  /**
   * 再帰的に面子を探す（旧版、互換性のため残す）
   * 最初に見つかった分解のみ返す<br>
   * @deprecated findAllMeldsRecursiveを使用のこと
   */
  findMeldsRecursive(tiles) {
    const results = this.findAllMeldsRecursive(tiles);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 順子かどうか判定
   */
  isSequence(meld) {
    if (meld.length !== 3) return false;
    const sorted = [...meld].sort((a, b) => a.number - b.number);
    return sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit &&
           sorted[0].suit !== 'honor' &&
           sorted[1].number === sorted[0].number + 1 &&
           sorted[2].number === sorted[1].number + 1;
  }

  /**
   * 面子の中で和了牌が両面待ちだったか確認
   * 同じ和了牌を含む順子が複数ある場合、どれか一つでも両面待ちならtrueを返す
   */
  checkRyanmenWaitInMelds(melds, winningTile) {
    if (winningTile.suit === 'honor') return false;

    // 和了牌を含む順子を全て確認（複数ありうる）
    for (let meld of melds) {
      if (!this.isSequence(meld)) continue;

      const hasWinningTile = meld.some(t =>
        t.suit === winningTile.suit && t.number === winningTile.number
      );

      if (!hasWinningTile) continue;

      const sorted = [...meld].sort((a, b) => a.number - b.number);
      const nums = sorted.map(t => t.number);
      const winNum = winningTile.number;

      // 和了牌の位置を確認
      const winIndex = nums.indexOf(winNum);

      if (winIndex === 1) {
        // 真ん中でアガった → 嵌張待ち → 次の順子へ
        continue;
      }

      // 両端でアガった場合、両面待ちかペンチャン待ちかを判定
      if (nums[0] === 1 && nums[2] === 3 && winNum === 3) {
        continue; // ペンチャン（1-2待ちで3をツモ/ロン） → 次の順子へ
      }
      if (nums[0] === 7 && nums[2] === 9 && winNum === 7) {
        continue; // ペンチャン（8-9待ちで7をツモ/ロン） → 次の順子へ
      }

      // 両面待ちの順子を発見
      return true;
    }

    return false;
  }

  /**
   * 三色同順判定
   */
  checkSanshoku(hand, melds) {
    const allMelds = [...melds];
    const combinations = this.findAllCombinations(hand);

    if (combinations.length > 0) {
      allMelds.push(...combinations[0].melds);
    }

    // 順子のみ抽出
    const sequences = allMelds.filter(meld => this.isSequence(meld));

    // 萬子・筒子・索子で同じ数字の順子があるかチェック
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        for (let k = j + 1; k < sequences.length; k++) {
          const seq1 = [...sequences[i]].sort((a, b) => a.number - b.number);
          const seq2 = [...sequences[j]].sort((a, b) => a.number - b.number);
          const seq3 = [...sequences[k]].sort((a, b) => a.number - b.number);

          const suit1 = seq1[0].suit;
          const suit2 = seq2[0].suit;
          const suit3 = seq3[0].suit;

          // 3つとも異なるスートで、全て数牌（honor以外）
          if (suit1 !== suit2 && suit2 !== suit3 && suit1 !== suit3 &&
              suit1 !== 'honor' && suit2 !== 'honor' && suit3 !== 'honor') {

            // 同じ数字の順子かチェック
            if (seq1[0].number === seq2[0].number && seq2[0].number === seq3[0].number &&
                seq1[1].number === seq2[1].number && seq2[1].number === seq3[1].number &&
                seq1[2].number === seq2[2].number && seq2[2].number === seq3[2].number) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * 一盃口判定
   */
  checkIipeikou(hand) {
    const combinations = this.findAllCombinations(hand);
    if (combinations.length === 0) return false;

    for (let combo of combinations) {
      // 同じ順子のペアを探す
      for (let i = 0; i < combo.melds.length; i++) {
        for (let j = i + 1; j < combo.melds.length; j++) {
          if (this.isSequence(combo.melds[i]) &&
              this.isSequence(combo.melds[j]) &&
              this.areSameMelds(combo.melds[i], combo.melds[j])) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 役牌カウント
   */
  countYakuhai(tiles, roundWind, seatWind) {
    const yaku = [];
    const counts = {};

    tiles.forEach(tile => {
      if (tile.suit === 'honor') {
        const key = tile.number;
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    // 白發中（5,6,7）
    [5, 6, 7].forEach(num => {
      if (counts[num] >= 3) {
        const names = { 5: '白', 6: '發', 7: '中' };
        yaku.push({ name: names[num], han: 1 });
      }
    });

    const windNames = { 1: '東', 2: '南', 3: '西', 4: '北' };
    if (roundWind && counts[roundWind] >= 3) {
      yaku.push({ name: `場風 ${windNames[roundWind] || ''}`.trim(), han: 1 });
    }
    if (seatWind && counts[seatWind] >= 3) {
      yaku.push({ name: `自風 ${windNames[seatWind] || ''}`.trim(), han: 1 });
    }

    return yaku;
  }

  /**
   * 七対子（チートイツ）判定
   */
  isChiitoitsu(hand) {
    if (hand.length !== 14) return false;

    // 各牌の枚数をカウント
    const counts = {};
    for (const tile of hand) {
      const key = `${tile.suit}_${tile.number}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    // 7種類の牌がそれぞれちょうど2枚であることを確認
    // （4枚使い＝同じ牌を2対子として使うのは不可）
    const entries = Object.values(counts);
    if (entries.length !== 7) return false;
    return entries.every(c => c === 2);
  }

  /**
   * 国士無双（こくしむそう）判定
   * 13種類のターミナルとオナー牌のそれぞれ1枚、そのうち1つは2枚
   */
  isKokushi(hand) {
    if (hand.length !== 14) return false;

    // 国士無双に必要な牌の種類
    const requiredTiles = [
      { suit: 'man', number: 1 },
      { suit: 'man', number: 9 },
      { suit: 'pin', number: 1 },
      { suit: 'pin', number: 9 },
      { suit: 'sou', number: 1 },
      { suit: 'sou', number: 9 },
      { suit: 'honor', number: 1 }, // 東
      { suit: 'honor', number: 2 }, // 南
      { suit: 'honor', number: 3 }, // 西
      { suit: 'honor', number: 4 }, // 北
      { suit: 'honor', number: 5 }, // 白
      { suit: 'honor', number: 6 }, // 發
      { suit: 'honor', number: 7 }, // 中
    ];

    const tileCount = {};

    // Count tiles in hand
    for (const tile of hand) {
      const key = `${tile.suit}_${tile.number}`;
      tileCount[key] = (tileCount[key] || 0) + 1;
    }

    let pairCount = 0;
    let requiredCount = 0;

    // Check that all required tiles are present
    for (const required of requiredTiles) {
      const key = `${required.suit}_${required.number}`;
      const count = tileCount[key] || 0;

      if (count !== 1 && count !== 2) {
        return false; // Must have exactly 1 or 2 of each required tile
      }

      if (count === 2) {
        pairCount++;
      }

      requiredCount += count;
    }

    // Must have exactly one pair among the required tiles
    // and total tiles in hand must be 14
    if (pairCount !== 1) {
      return false;
    }

    // Check that no other tiles exist (all 14 tiles must be from required set)
    return requiredCount === 14;
  }

  /**
   * 対々和（トイトイ）判定 - combination版
   */
  isToitoiWithCombination(combination, melds = []) {
    // 手牌の面子が全て刻子か確認
    const handAllPungs = combination.melds.every(meld => {
      return meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2]);
    });

    if (!handAllPungs) return false;

    // 副露の面子も全て刻子か確認（カンは刻子の上位なのでOK）
    const meldsAllPungs = melds.every(meld => {
      return (meld.length === 3 || meld.length === 4) && meld[0].equals(meld[1]) && meld[1].equals(meld[2]);
    });

    return meldsAllPungs;
  }

  /**
   * 対々和（トイトイ）判定 - 旧版（互換性のため残す）
   */
  isToitoi(hand, melds) {
    const combinations = this.findAllCombinations(hand);
    if (combinations.length === 0) return false;

    return combinations.some(combo => this.isToitoiWithCombination(combo));
  }

  /**
   * 三暗刻（サンアンコー）判定 - combination版
   * ロン時は和了牌が刻子を完成させた場合、その刻子は明刻扱いのため暗刻カウントから除く。
   * 暗槓は暗刻としてカウントする。
   */
  isSankouWithCombination(combination, isRon = false, winningTile = null, melds = [], concealedMeldIndices = new Set()) {
    let ankouCount = 0;
    let winTileUsedInTriplet = false;

    // 手牌の刻子をカウント
    combination.melds.forEach(meld => {
      // 刻子かチェック
      if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        ankouCount++;
        // ロン時: 和了牌がこの刻子に含まれる場合、明刻扱いとしてフラグを立てる（1回のみ）
        if (isRon && winningTile && meld[0].equals(winningTile) && !winTileUsedInTriplet) {
          winTileUsedInTriplet = true;
        }
      }
    });

    // 暗槓も暗刻としてカウント
    melds.forEach((meld, idx) => {
      if (meld.length === 4 &&
          meld[0].equals(meld[1]) && meld[1].equals(meld[2]) && meld[2].equals(meld[3]) &&
          concealedMeldIndices && concealedMeldIndices.has(idx)) {
        ankouCount++;
      }
    });

    // ロン時、和了牌が刻子を完成させた場合はその刻子を明刻扱いにする
    if (winTileUsedInTriplet) {
      ankouCount--;
    }

    return ankouCount >= 3;
  }

  /**
   * 四暗刻（スーアンコー）判定 - combination版
   * ツモの場合は常に有効。ロンの場合は単騎待ち（和了牌が雀頭）のみ有効。
   * 双碰待ち（和了牌が刻子の一部）のロンは無効。
   * 暗槓は暗刻としてカウントする。
   */
  isSuuankouWithCombination(combination, isTsumo, winningTile, melds = [], concealedMeldIndices = new Set()) {
    let ankouCount = 0;

    // 手牌の刻子をカウント
    combination.melds.forEach(meld => {
      if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        ankouCount++;
      }
    });

    // 暗槓も暗刻としてカウント
    melds.forEach((meld, idx) => {
      if (meld.length === 4 &&
          meld[0].equals(meld[1]) && meld[1].equals(meld[2]) && meld[2].equals(meld[3]) &&
          concealedMeldIndices && concealedMeldIndices.has(idx)) {
        ankouCount++;
      }
    });

    if (ankouCount !== 4) return false;

    // ツモの場合は常に四暗刻成立
    if (isTsumo) return true;

    // ロンの場合は単騎待ち（和了牌が雀頭を完成させた）のみ有効
    // 双碰待ち（和了牌が刻子の一部）のロンは不可
    if (winningTile && combination.pair) {
      return combination.pair.suit === winningTile.suit &&
             combination.pair.number === winningTile.number;
    }

    return false;
  }

  /**
   * 四暗刻単騎判定
   * 和了牌が雀頭を完成させた場合（単騎待ち）はダブル役満
   * 暗槓は暗刻としてカウントする。
   */
  isSuuankouTanki(combination, winningTile, melds = [], concealedMeldIndices = new Set()) {
    if (!winningTile || !combination || !combination.pair) return false;

    // 全ての面子が暗刻であること（手牌の刻子＋暗槓）
    let ankouCount = 0;
    combination.melds.forEach(meld => {
      if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        ankouCount++;
      }
    });
    // 暗槓も暗刻としてカウント
    melds.forEach((meld, idx) => {
      if (meld.length === 4 &&
          meld[0].equals(meld[1]) && meld[1].equals(meld[2]) && meld[2].equals(meld[3]) &&
          concealedMeldIndices && concealedMeldIndices.has(idx)) {
        ankouCount++;
      }
    });
    if (ankouCount !== 4) return false;

    // 和了牌が雀頭を完成させた = 単騎待ち
    return combination.pair.suit === winningTile.suit &&
           combination.pair.number === winningTile.number;
  }

  /**
   * 国士無双十三面待ち判定
   * 13種全ての么九牌を1枚ずつ持っていて、和了牌が14枚目（どれかの2枚目）
   * つまり和了牌を除くと13種が全て1枚ずつ = 13面待ち
   */
  isKokushiJuusanmen(hand, winningTile) {
    if (!winningTile || hand.length !== 14) return false;

    const requiredTiles = [
      { suit: 'man', number: 1 },
      { suit: 'man', number: 9 },
      { suit: 'pin', number: 1 },
      { suit: 'pin', number: 9 },
      { suit: 'sou', number: 1 },
      { suit: 'sou', number: 9 },
      { suit: 'honor', number: 1 },
      { suit: 'honor', number: 2 },
      { suit: 'honor', number: 3 },
      { suit: 'honor', number: 4 },
      { suit: 'honor', number: 5 },
      { suit: 'honor', number: 6 },
      { suit: 'honor', number: 7 },
    ];

    // 和了牌を除いた13枚を作る
    const handWithoutWin = [...hand];
    const winIdx = handWithoutWin.findIndex(t =>
      t.suit === winningTile.suit && t.number === winningTile.number
    );
    if (winIdx === -1) return false;
    handWithoutWin.splice(winIdx, 1);

    // 残り13枚が全て異なる么九牌かチェック
    if (handWithoutWin.length !== 13) return false;

    const tileCount = {};
    for (const tile of handWithoutWin) {
      const key = `${tile.suit}_${tile.number}`;
      tileCount[key] = (tileCount[key] || 0) + 1;
    }

    // 13種全てが1枚ずつ
    for (const required of requiredTiles) {
      const key = `${required.suit}_${required.number}`;
      if ((tileCount[key] || 0) !== 1) return false;
    }

    return true;
  }

  /**
   * 純正九蓮宝燈判定
   * 9面待ちの九蓮宝燈 = 基本形 1112345678999 に和了牌が1-9のどれか
   * つまり和了牌を除いた13枚が exactly 1112345678999
   */
  isJunseiChuurenPoutou(tiles, winningTile) {
    if (!winningTile || tiles.length !== 14) return false;

    // 全て同じスートであること
    const suit = tiles[0].suit;
    if (suit === 'honor') return false;
    if (!tiles.every(t => t.suit === suit)) return false;
    if (winningTile.suit !== suit) return false;

    // 和了牌を除いた13枚を作る
    const tilesWithoutWin = [...tiles];
    const winIdx = tilesWithoutWin.findIndex(t =>
      t.suit === winningTile.suit && t.number === winningTile.number
    );
    if (winIdx === -1) return false;
    tilesWithoutWin.splice(winIdx, 1);

    // 残り13枚が基本形 1112345678999 であるかチェック
    const counts = {};
    for (let i = 1; i <= 9; i++) counts[i] = 0;
    tilesWithoutWin.forEach(t => counts[t.number]++);

    // 基本形: 1が3枚、2-8が各1枚、9が3枚
    if (counts[1] !== 3 || counts[9] !== 3) return false;
    for (let i = 2; i <= 8; i++) {
      if (counts[i] !== 1) return false;
    }

    return true;
  }

  /**
   * 役満カウントを取得
   * @param {Array} yaku - 役リスト
   * @returns {number} 役満の数（yakumanValueの合計、0=役満なし）
   */
  getYakumanCount(yaku) {
    let count = 0;
    for (const y of yaku) {
      if (y.isYakuman) {
        count += (y.yakumanValue || 1);
      }
    }
    return count;
  }

  /**
   * 一気通貫（イッツー）判定 - combination版
   */
  isIttsuWithCombination(combination, melds) {
    const allMelds = [...melds, ...combination.melds];
    const suits = ['man', 'pin', 'sou'];

    for (let suit of suits) {
      let has123 = false;
      let has456 = false;
      let has789 = false;

      allMelds.forEach(meld => {
        if (this.isSequence(meld)) {
          const sorted = [...meld].sort((a, b) => a.number - b.number);
          if (sorted[0].suit === suit) {
            if (sorted[0].number === 1 && sorted[1].number === 2 && sorted[2].number === 3) {
              has123 = true;
            }
            if (sorted[0].number === 4 && sorted[1].number === 5 && sorted[2].number === 6) {
              has456 = true;
            }
            if (sorted[0].number === 7 && sorted[1].number === 8 && sorted[2].number === 9) {
              has789 = true;
            }
          }
        }
      });

      if (has123 && has456 && has789) return true;
    }

    return false;
  }

  /**
   * 二盃口（リャンペーコー）判定 - combination版
   */
  isRyanpeikouWithCombination(combination) {
    let pairCount = 0;
    const used = new Set();

    for (let i = 0; i < combination.melds.length; i++) {
      if (used.has(i)) continue;

      for (let j = i + 1; j < combination.melds.length; j++) {
        if (used.has(j)) continue;

        if (this.areSameMelds(combination.melds[i], combination.melds[j])) {
          pairCount++;
          used.add(i);
          used.add(j);
          break;
        }
      }
    }

    return pairCount === 2;
  }

  /**
   * 一盃口判定 - combination版
   */
  checkIipeikouWithCombination(combination) {
    // 同じ順子のペアを探す
    for (let i = 0; i < combination.melds.length; i++) {
      for (let j = i + 1; j < combination.melds.length; j++) {
        if (this.isSequence(combination.melds[i]) &&
            this.isSequence(combination.melds[j]) &&
            this.areSameMelds(combination.melds[i], combination.melds[j])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 三色同順判定 - combination版
   */
  checkSanshokuWithCombination(combination, melds) {
    const allMelds = [...melds, ...combination.melds];
    const sequences = allMelds.filter(meld => this.isSequence(meld));

    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        for (let k = j + 1; k < sequences.length; k++) {
          const seq1 = [...sequences[i]].sort((a, b) => a.number - b.number);
          const seq2 = [...sequences[j]].sort((a, b) => a.number - b.number);
          const seq3 = [...sequences[k]].sort((a, b) => a.number - b.number);

          const suit1 = seq1[0].suit;
          const suit2 = seq2[0].suit;
          const suit3 = seq3[0].suit;

          if (suit1 !== suit2 && suit2 !== suit3 && suit1 !== suit3 &&
              suit1 !== 'honor' && suit2 !== 'honor' && suit3 !== 'honor') {

            if (seq1[0].number === seq2[0].number && seq2[0].number === seq3[0].number &&
                seq1[1].number === seq2[1].number && seq2[1].number === seq3[1].number &&
                seq1[2].number === seq2[2].number && seq2[2].number === seq3[2].number) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * 三色同刻（サンシキドーコー）判定 - combination版
   */
  isSanshokuDoukoWithCombination(combination, melds) {
    const allMelds = [...melds, ...combination.melds];
    const pungs = allMelds.filter(meld =>
      (meld.length === 3 || meld.length === 4) && meld[0].equals(meld[1]) && meld[1].equals(meld[2])
    );

    for (let i = 0; i < pungs.length; i++) {
      for (let j = i + 1; j < pungs.length; j++) {
        for (let k = j + 1; k < pungs.length; k++) {
          const num1 = pungs[i][0].number;
          const num2 = pungs[j][0].number;
          const num3 = pungs[k][0].number;

          const suit1 = pungs[i][0].suit;
          const suit2 = pungs[j][0].suit;
          const suit3 = pungs[k][0].suit;

          if (num1 === num2 && num2 === num3 &&
              suit1 !== suit2 && suit2 !== suit3 && suit1 !== suit3 &&
              suit1 !== 'honor' && suit2 !== 'honor' && suit3 !== 'honor') {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 平和（ピンフ）判定 - combination版
   */
  isPinfuWithCombination(combination, winningTile, roundWind, seatWind) {
    // 1. 全て順子か確認
    const allSequences = combination.melds.every(meld => this.isSequence(meld));
    if (!allSequences) return false;

    // 2. 雀頭が役牌でないか確認
    const pair = combination.pair;
    if (pair.suit === 'honor') {
      // 三元牌（白=5, 發=6, 中=7）は不可
      if (pair.number >= 5 && pair.number <= 7) return false;
      // 場風牌は不可
      if (roundWind && pair.number === roundWind) return false;
      // 自風牌は不可
      if (seatWind && pair.number === seatWind) return false;
    }

    // 3. 両面待ちか確認
    return this.checkRyanmenWaitInMelds(combination.melds, winningTile);
  }

  /**
   * 混一色（ホンイツ）判定
   */
  isHonitsu(tiles) {
    const suits = {};
    let hasHonor = false;

    tiles.forEach(tile => {
      if (tile.suit === 'honor') {
        hasHonor = true;
      } else {
        suits[tile.suit] = true;
      }
    });

    const suitCount = Object.keys(suits).length;

    // 1種類の数牌と字牌のみ
    return suitCount === 1 && hasHonor;
  }

  /**
   * 清一色（チンイツ）判定
   */
  isChinitsu(tiles) {
    if (tiles.length === 0) return false;

    const suits = {};
    tiles.forEach(tile => {
      suits[tile.suit] = true;
    });

    const suitCount = Object.keys(suits).length;
    const hasHonor = suits.hasOwnProperty('honor');

    // 1種類の数牌のみ（字牌なし）
    return suitCount === 1 && !hasHonor;
  }

  /**
   * 三暗刻（サンアンコー）判定
   */
  isSanankou(hand, melds) {
    // 手牌から面子を構成
    const combinations = this.findAllCombinations(hand);
    if (combinations.length === 0) return false;

    // 暗刻（手牌の中の刻子）を数える
    for (let combo of combinations) {
      let ankouCount = 0;

      combo.melds.forEach(meld => {
        // 刻子かチェック
        if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
          ankouCount++;
        }
      });

      if (ankouCount >= 3) return true;
    }

    return false;
  }

  /**
   * 四暗刻（スーアンコー）判定
   * ツモの場合は常に有効。ロンの場合は単騎待ちのみ有効。
   * @param {Tile} winningTile - 和了牌（ロン時の単騎判定に使用）
   */
  isSuuankou(hand, melds, isTsumo, winningTile) {
    if (melds.length > 0) return false; // 門前のみ

    const combinations = this.findAllCombinations(hand);
    if (combinations.length === 0) return false;

    // 4つの暗刻があるかチェック
    for (let combo of combinations) {
      let ankouCount = 0;

      combo.melds.forEach(meld => {
        if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
          ankouCount++;
        }
      });

      if (ankouCount === 4) {
        // ツモの場合は常に四暗刻成立
        if (isTsumo) return true;

        // ロンの場合は単騎待ち（和了牌が雀頭）のみ有効
        if (winningTile && combo.pair) {
          if (combo.pair.suit === winningTile.suit &&
              combo.pair.number === winningTile.number) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 一気通貫（イッツー）判定
   */
  isIttsu(hand, melds) {
    // 手牌と副露を合わせて面子を取得
    const allMelds = [...melds];
    const combinations = this.findAllCombinations(hand);

    if (combinations.length > 0) {
      allMelds.push(...combinations[0].melds);
    }

    // 各スートで123-456-789があるかチェック
    const suits = ['man', 'pin', 'sou'];

    for (let suit of suits) {
      let has123 = false;
      let has456 = false;
      let has789 = false;

      allMelds.forEach(meld => {
        if (this.isSequence(meld)) {
          const sorted = [...meld].sort((a, b) => a.number - b.number);
          if (sorted[0].suit === suit) {
            if (sorted[0].number === 1 && sorted[1].number === 2 && sorted[2].number === 3) {
              has123 = true;
            }
            if (sorted[0].number === 4 && sorted[1].number === 5 && sorted[2].number === 6) {
              has456 = true;
            }
            if (sorted[0].number === 7 && sorted[1].number === 8 && sorted[2].number === 9) {
              has789 = true;
            }
          }
        }
      });

      if (has123 && has456 && has789) return true;
    }

    return false;
  }

  /**
   * 二盃口（リャンペーコー）判定
   */
  isRyanpeikou(hand) {
    const combinations = this.findAllCombinations(hand);
    if (combinations.length === 0) return false;

    for (let combo of combinations) {
      let pairCount = 0;
      const used = new Set();

      for (let i = 0; i < combo.melds.length; i++) {
        if (used.has(i)) continue;

        for (let j = i + 1; j < combo.melds.length; j++) {
          if (used.has(j)) continue;

          if (this.areSameMelds(combo.melds[i], combo.melds[j])) {
            pairCount++;
            used.add(i);
            used.add(j);
            break;
          }
        }
      }

      if (pairCount === 2) return true;
    }

    return false;
  }

  /**
   * 三色同刻（サンシキドーコー）判定
   */
  isSanshokuDouko(hand, melds) {
    const allMelds = [...melds];
    const combinations = this.findAllCombinations(hand);

    if (combinations.length > 0) {
      allMelds.push(...combinations[0].melds);
    }

    // 刻子のみ抽出（カンも刻子としてカウント）
    const pungs = allMelds.filter(meld =>
      (meld.length === 3 || meld.length === 4) && meld[0].equals(meld[1]) && meld[1].equals(meld[2])
    );

    // 同じ数字で異なるスートの刻子が3つあるかチェック
    for (let i = 0; i < pungs.length; i++) {
      for (let j = i + 1; j < pungs.length; j++) {
        for (let k = j + 1; k < pungs.length; k++) {
          const num1 = pungs[i][0].number;
          const num2 = pungs[j][0].number;
          const num3 = pungs[k][0].number;

          const suit1 = pungs[i][0].suit;
          const suit2 = pungs[j][0].suit;
          const suit3 = pungs[k][0].suit;

          if (num1 === num2 && num2 === num3 &&
              suit1 !== suit2 && suit2 !== suit3 && suit1 !== suit3 &&
              suit1 !== 'honor' && suit2 !== 'honor' && suit3 !== 'honor') {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 小三元（ショウサンゲン）判定
   */
  isShousangen(tiles) {
    const counts = { 5: 0, 6: 0, 7: 0 }; // 白發中

    tiles.forEach(tile => {
      if (tile.suit === 'honor' && [5, 6, 7].includes(tile.number)) {
        counts[tile.number]++;
      }
    });

    // 2つが刻子（3枚以上）、1つが雀頭（2枚）
    const threeOrMore = Object.values(counts).filter(c => c >= 3).length;
    const exactlyTwo = Object.values(counts).filter(c => c === 2).length;

    return threeOrMore === 2 && exactlyTwo === 1;
  }

  /**
   * 大三元（ダイサンゲン）判定
   */
  isDaisangen(tiles) {
    const counts = { 5: 0, 6: 0, 7: 0 }; // 白發中

    tiles.forEach(tile => {
      if (tile.suit === 'honor' && [5, 6, 7].includes(tile.number)) {
        counts[tile.number]++;
      }
    });

    // 全て刻子（3枚以上）
    return Object.values(counts).every(c => c >= 3);
  }

  /**
   * 大四喜（ダイスウジ）判定
   * 東西南北の4つの風牌が全て刻子
   */
  isDaishushi(tiles) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }; // 東西南北

    tiles.forEach(tile => {
      if (tile.suit === 'honor' && [1, 2, 3, 4].includes(tile.number)) {
        counts[tile.number]++;
      }
    });

    // 全て刻子（3枚以上）
    return Object.values(counts).every(c => c >= 3);
  }

  /**
   * 小四喜（ショウスウジ）判定
   * 東西南北の4つのうち3つが刻子、1つが対子
   */
  isShousushi(tiles) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }; // 東西南北

    tiles.forEach(tile => {
      if (tile.suit === 'honor' && [1, 2, 3, 4].includes(tile.number)) {
        counts[tile.number]++;
      }
    });

    // 3つが刻子（3枚以上）、1つが対子（2枚）
    const threeOrMore = Object.values(counts).filter(c => c >= 3).length;
    const exactlyTwo = Object.values(counts).filter(c => c === 2).length;

    return threeOrMore === 3 && exactlyTwo === 1;
  }

  /**
   * 字一色（ツーイーソー）判定
   */
  isTsuuiisou(tiles) {
    return tiles.every(tile => tile.suit === 'honor');
  }

  /**
   * 混老頭（ホンロウトウ）判定
   */
  isHonroutou(tiles) {
    return tiles.every(tile => {
      if (tile.suit === 'honor') return true;
      return tile.number === 1 || tile.number === 9;
    });
  }

  /**
   * 清老頭（チンロウトウ）判定
   */
  isChinroutou(tiles) {
    return tiles.every(tile => {
      if (tile.suit === 'honor') return false;
      return tile.number === 1 || tile.number === 9;
    });
  }

  /**
   * 2つの面子が同じか判定
   */
  areSameMelds(meld1, meld2) {
    if (meld1.length !== meld2.length) return false;

    const sorted1 = [...meld1].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.number - b.number;
    });

    const sorted2 = [...meld2].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return a.number - b.number;
    });

    for (let i = 0; i < sorted1.length; i++) {
      if (!sorted1[i].equals(sorted2[i])) return false;
    }

    return true;
  }

  /**
   * 符を計算
   */
  /**
   * 符を計算 - combination版
   */
  calculateFuWithCombination(hand, melds, concealedMeldIndices, winningTile, isTsumo, combination, roundWind, seatWind) {
    let fu = 20; // 副底

    // 平和ツモの場合は一律20符（ツモ符なし）
    // 平和の条件: 門前・副露なし・全順子・役牌でない雀頭・両面待ち
    if (isTsumo && melds.length === 0) {
      const allSeq = combination.melds.every(m => this.isSequence(m));
      // 役牌の雀頭チェック: 三元牌（白=5, 發=6, 中=7）と場風・自風
      let pairNotYakuhai = true;
      if (combination.pair.suit === 'honor') {
        if (combination.pair.number >= 5) pairNotYakuhai = false; // 三元牌
        if (roundWind && combination.pair.number === roundWind) pairNotYakuhai = false; // 場風牌
        if (seatWind && combination.pair.number === seatWind) pairNotYakuhai = false; // 自風牌
      }
      const isRyanmen = this.checkRyanmenWaitInMelds(combination.melds, winningTile);
      if (allSeq && pairNotYakuhai && isRyanmen) {
        return 20; // 平和ツモは20符固定
      }
    }

    // ツモ
    if (isTsumo) {
      fu += 2;
    }

    // 門前ロン
    const nonConcealedMeldCount = melds.length - (concealedMeldIndices ? concealedMeldIndices.size : 0);
    if (!isTsumo && nonConcealedMeldCount === 0) {
      fu += 10;
    }

    // 副露の面子の符
    melds.forEach((meld, idx) => {
      if (meld.length === 4 && meld[0].equals(meld[1]) && meld[1].equals(meld[2]) && meld[2].equals(meld[3])) {
        const isYaochu = meld[0].suit === 'honor' || meld[0].number === 1 || meld[0].number === 9;
        const isConcealed = concealedMeldIndices && concealedMeldIndices.has(idx);
        if (isConcealed) {
          // 暗槻
          fu += isYaochu ? 32 : 16;
        } else {
          // 明槻（オープンカン）または加槻
          fu += isYaochu ? 16 : 8;
        }
      } else if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        // 明刻
        const isYaochu = meld[0].suit === 'honor' || meld[0].number === 1 || meld[0].number === 9;
        fu += isYaochu ? 4 : 2;
      }
    });

    // 手牌の面子の符（暗刻）
    // ロン時、和了牌が刻子を完成させた場合（双碰待ち）はその刻子を明刻扱い（1回のみ）
    let ronTripletDeducted = false;
    combination.melds.forEach(meld => {
      if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        const isYaochu = meld[0].suit === 'honor' || meld[0].number === 1 || meld[0].number === 9;
        const isMingkouByRon = !isTsumo &&
          !ronTripletDeducted &&
          winningTile &&
          meld[0].suit === winningTile.suit &&
          meld[0].number === winningTile.number;
        if (isMingkouByRon) {
          // ロンで完成した刻子は明刻扱い
          fu += isYaochu ? 4 : 2;
          ronTripletDeducted = true;
        } else {
          // 暗刻は明刻の倍
          fu += isYaochu ? 8 : 4;
        }
      }
    });

    // 雀頭の符
    if (combination.pair.suit === 'honor') {
      // 三元牌（白=5, 發=6, 中=7）の雀頭: +2符
      if ([5, 6, 7].includes(combination.pair.number)) {
        fu += 2;
      }
      // 場風牌の雀頭: +2符
      if (roundWind && combination.pair.number === roundWind) {
        fu += 2;
      }
      // 自風牌の雀頭: +2符
      if (seatWind && combination.pair.number === seatWind) {
        fu += 2;
      }
      // 連風牌（場風と自風が同じ）の場合は上記で +2 + +2 = +4符になる
    }

    // 待ち形の符
    fu += this.getWaitFu(combination, winningTile);

    // 最低30符
    return Math.max(fu, 30);
  }

  /**
   * 待ち形の符を計算
   * 嵌張（カンチャン）・辺張（ペンチャン）・単騎（タンキ）: +2符
   * 両面（リャンメン）・双碰（シャンポン）: 0符
   */
  getWaitFu(combination, winningTile) {
    // 和了牌が雀頭を完成させた場合（単騎待ち）の可能性をチェック
    const isTankiCandidate = combination.pair.suit === winningTile.suit &&
                             combination.pair.number === winningTile.number;

    // 和了牌が順子内にある場合の待ち形をチェック
    let bestSequenceWaitFu = -1; // -1 = 順子に和了牌なし
    for (const meld of combination.melds) {
      if (!this.isSequence(meld)) continue;

      const hasTile = meld.some(t => t.suit === winningTile.suit && t.number === winningTile.number);
      if (!hasTile) continue;

      const sorted = [...meld].sort((a, b) => a.number - b.number);
      const nums = sorted.map(t => t.number);
      const winNum = winningTile.number;
      const winIndex = nums.indexOf(winNum);

      if (winIndex === 1) {
        // 真ん中 → 嵌張待ち: +2符
        bestSequenceWaitFu = Math.max(bestSequenceWaitFu, 2);
      } else if ((nums[0] === 1 && nums[2] === 3 && winNum === 3) ||
                 (nums[0] === 7 && nums[2] === 9 && winNum === 7)) {
        // 端 → 辺張待ち: +2符
        bestSequenceWaitFu = Math.max(bestSequenceWaitFu, 2);
      } else {
        // 両面待ち: 0符
        bestSequenceWaitFu = Math.max(bestSequenceWaitFu, 0);
      }
    }

    // 和了牌が刻子内にある場合（双碰待ち）の可能性をチェック
    let isShanponCandidate = false;
    for (const meld of combination.melds) {
      if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        if (meld[0].suit === winningTile.suit && meld[0].number === winningTile.number) {
          isShanponCandidate = true;
          break;
        }
      }
    }

    // 複数の解釈がある場合、最も有利な（符が高い）解釈を選ぶ
    let waitFu = 0;

    if (isTankiCandidate) {
      waitFu = Math.max(waitFu, 2); // 単騎: +2符
    }
    if (bestSequenceWaitFu >= 0) {
      waitFu = Math.max(waitFu, bestSequenceWaitFu);
    }
    if (isShanponCandidate) {
      waitFu = Math.max(waitFu, 0); // 双碰: 0符
    }

    return waitFu;
  }

  /**
   * 符を計算 - 旧版（互換性のため残す）
   */
  calculateFu(hand, melds, winningTile, isTsumo) {
    let fu = 20; // 副底

    // ツモ
    if (isTsumo) {
      fu += 2;
    }

    // 門前ロン
    if (!isTsumo && melds.length === 0) {
      fu += 10;
    }

    // 面子の符
    melds.forEach(meld => {
      if (meld.length === 4 && meld[0].equals(meld[1]) && meld[1].equals(meld[2]) && meld[2].equals(meld[3])) {
        // 明槻（オープンカン）または加槻
        const isYaochu = meld[0].suit === 'honor' || meld[0].number === 1 || meld[0].number === 9;
        fu += isYaochu ? 16 : 8;
      } else if (meld.length === 3 && meld[0].equals(meld[1]) && meld[1].equals(meld[2])) {
        // 刻子
        const isYaochu = meld[0].suit === 'honor' || meld[0].number === 1 || meld[0].number === 9;
        fu += isYaochu ? 4 : 2; // 明刻の符（暗刻なら倍）
      }
    });

    // 雀頭の符
    const honorPairs = hand.filter(t => t.suit === 'honor' && [5,6,7].includes(t.number));
    if (honorPairs.length >= 2) {
      fu += 2;
    }

    // 最低30符
    return Math.max(fu, 30);
  }

  /**
   * 符を切り上げ
   */
  roundFu(fu) {
    if (fu === 20) return 20; // 平和ツモ
    if (fu === 25) return 25; // 七対子
    return Math.max(Math.ceil(fu / 10) * 10, 30);
  }

  /**
   * 計算過程をフォーマット
   */
  formatCalculation(yaku, han, fu, score, scoreType, yakumanCount = 0) {
    let text = '【点数計算】\n\n';

    text += '役:\n';
    yaku.forEach(y => {
      if (y.isYakuman) {
        const label = y.yakumanValue === 2 ? 'ダブル役満' : '役満';
        text += `  ${y.name}: ${label}\n`;
      } else {
        text += `  ${y.name}: ${y.han}飜\n`;
      }
    });

    if (yakumanCount > 0) {
      text += `\n${scoreType}\n`;
    } else {
      text += `\n合計: ${han}飜 ${fu}符\n`;
      if (scoreType) {
        text += `\n${scoreType}\n`;
      }
    }

    text += `\n得点: ${score}点`;

    return text;
  }

  /**
   * ドラをカウント
   * @param {Array} hand - 手牌
   * @param {Array} doraIndicators - ドラ表示牌
   * @param {Array} doraTiles - ドラ（オプション、使用していない場合は表示牌から算出）
   * @returns {Object} {dora: ドラの数}
   */
  countDora(hand, doraIndicators, doraTiles) {
    let doraCount = 0;

    // 使用するドラタイルを決定（doraTilesが提供されていたらそれを使う、そうでなければdoraIndicatorsから計算）
    let tilesToCount = [];

    if (doraTiles && doraTiles.length > 0) {
      // MahjongLogicから既に計算されたdoraTilesを使用
      tilesToCount = doraTiles;
    } else if (doraIndicators && doraIndicators.length > 0) {
      // ドラ表示牌から計算（テストや後方互換性のため）
      doraIndicators.forEach(indicator => {
        const nextTile = this.getNextTile(indicator);
        tilesToCount.push(nextTile);
      });
    } else {
      // ドラがない
      return { dora: 0 };
    }

    // 手牌の中でドラの枚数をカウント
    tilesToCount.forEach(doraTile => {
      hand.forEach(handTile => {
        if (handTile.suit === doraTile.suit && handTile.number === doraTile.number) {
          doraCount++;
        }
      });
    });

    return { dora: doraCount };
  }

  /**
   * 赤ドラをカウント
   * @param {Array} tiles - 全タイル（手牌＋副露）
   * @returns {number} 赤ドラの数
   */
  countRedDora(tiles) {
    let count = 0;
    tiles.forEach(tile => {
      if (tile.isRed) {
        count++;
      }
    });
    return count;
  }

  /**
   * 表示牌の次の牌を取得
   * @param {Tile} tile - 表示牌
   * @returns {Tile} 次の牌
   */
  getNextTile(tile) {
    const nextNumber = tile.number === 9 ? 1 : (tile.number === 7 && tile.suit === 'honor' ? 1 : tile.number + 1);
    return new Tile(tile.suit, nextNumber);
  }

  /**
   * 三槓子（サンカンコ）判定
   * 3つの槓（4枚同じ牌）を含む手牌
   * @param {Array} melds - メルド配列
   * @returns {boolean}
   */
  isSankankouWithMelds(melds) {
    let kanCount = 0;

    // メルド内で4要素（槓）のものをカウント
    melds.forEach(meld => {
      if (meld.length === 4 &&
          meld[0].equals(meld[1]) &&
          meld[1].equals(meld[2]) &&
          meld[2].equals(meld[3])) {
        kanCount++;
      }
    });

    return kanCount === 3;
  }

  /**
   * 四槓子（スーカンコ）判定
   * 4つの槓（4枚同じ牌）を含む手牌
   * @param {Array} melds - メルド配列
   * @returns {boolean}
   */
  isSukankou(melds) {
    let kanCount = 0;

    // メルド内で4要素（槓）のものをカウント
    melds.forEach(meld => {
      if (meld.length === 4 &&
          meld[0].equals(meld[1]) &&
          meld[1].equals(meld[2]) &&
          meld[2].equals(meld[3])) {
        kanCount++;
      }
    });

    return kanCount === 4;
  }

  /**
   * 九蓮宝燈（チューレンポウトウ）判定
   * 門前で一種類の数牌のみ、1112345678999+同種の任意1枚
   * @param {Array} tiles - 全牌（手牌のみ、14枚）
   * @returns {boolean}
   */
  isChuurenPoutou(tiles) {
    if (tiles.length !== 14) return false;

    // 全て同じスートで数牌であること
    const suit = tiles[0].suit;
    if (suit === 'honor') return false;
    if (!tiles.every(t => t.suit === suit)) return false;

    // 各数字の枚数をカウント
    const counts = {};
    for (let i = 1; i <= 9; i++) counts[i] = 0;
    tiles.forEach(t => counts[t.number]++);

    // 基本形: 1が3枚以上、2-8が各1枚以上、9が3枚以上
    if (counts[1] < 3 || counts[9] < 3) return false;
    for (let i = 2; i <= 8; i++) {
      if (counts[i] < 1) return false;
    }

    return true;
  }

  /**
   * 混全帯么九（チャンタ）判定 - combination版
   * 全ての面子と雀頭に老頭牌(1,9)または字牌を含む。字牌が必要。
   * 混老頭の場合は適用しない。
   * @param {Object} combination - 和了形
   * @param {Array} melds - 副露
   * @param {Array} allTiles - 全牌
   * @returns {boolean}
   */
  isChantaWithCombination(combination, melds, allTiles) {
    // 字牌が含まれていなければチャンタではない（純チャン）
    const hasHonor = allTiles.some(t => t.suit === 'honor');
    if (!hasHonor) return false;

    // 雀頭が老頭牌or字牌か
    const pair = combination.pair;
    if (pair.suit !== 'honor' && pair.number !== 1 && pair.number !== 9) return false;

    // 全面子（手牌）が老頭牌or字牌を含むか
    for (const meld of combination.melds) {
      if (!this.meldHasTerminalOrHonor(meld)) return false;
    }

    // 全面子（副露）が老頭牌or字牌を含むか
    for (const meld of melds) {
      if (!this.meldHasTerminalOrHonor(meld)) return false;
    }

    return true;
  }

  /**
   * 純全帯么九（ジュンチャン）判定 - combination版
   * 全ての面子と雀頭に老頭牌(1,9)を含む。字牌は不可。
   * @param {Object} combination - 和了形
   * @param {Array} melds - 副露
   * @param {Array} allTiles - 全牌
   * @returns {boolean}
   */
  isJunchanWithCombination(combination, melds, allTiles) {
    // 字牌が含まれていたら純チャンではない
    if (allTiles.some(t => t.suit === 'honor')) return false;

    // 雀頭が1or9か
    const pair = combination.pair;
    if (pair.number !== 1 && pair.number !== 9) return false;

    // 全面子（手牌）が1or9を含むか
    for (const meld of combination.melds) {
      if (!this.meldHasTerminal(meld)) return false;
    }

    // 全面子（副露）が1or9を含むか
    for (const meld of melds) {
      if (!this.meldHasTerminal(meld)) return false;
    }

    return true;
  }

  /**
   * 面子が老頭牌(1,9)または字牌を含むか判定
   * @param {Array} meld - 面子
   * @returns {boolean}
   */
  meldHasTerminalOrHonor(meld) {
    return meld.some(tile =>
      tile.suit === 'honor' || tile.number === 1 || tile.number === 9
    );
  }

  /**
   * 面子が老頭牌(1,9)を含むか判定（字牌は含まない）
   * @param {Array} meld - 面子
   * @returns {boolean}
   */
  meldHasTerminal(meld) {
    return meld.some(tile =>
      tile.suit !== 'honor' && (tile.number === 1 || tile.number === 9)
    );
  }

  /**
   * 緑一色（リョクイッショク）判定
   * 發（honor 6）と2、3、4、6、8の索子のみで構成
   * @param {Array} tiles - 全牌（手牌+メルド）
   * @returns {boolean}
   */
  isRyokuisshoku(tiles) {
    // 許可されている牌：發（honor 6）と 2、3、4、6、8の索子
    const allowedTiles = [
      { suit: 'sou', number: 2 },
      { suit: 'sou', number: 3 },
      { suit: 'sou', number: 4 },
      { suit: 'sou', number: 6 },
      { suit: 'sou', number: 8 },
      { suit: 'honor', number: 6 }, // 發
    ];

    // すべての牌が許可されている牌に含まれるかチェック
    for (const tile of tiles) {
      const isAllowed = allowedTiles.some(allowed =>
        allowed.suit === tile.suit && allowed.number === tile.number
      );
      if (!isAllowed) {
        return false;
      }
    }

    // 少なくとも1枚以上の牌があることを確認
    return tiles.length > 0;
  }

  /**
   * 大車輪（ダイシャリン）判定
   * 筒子の2,3,4,5,6,7,8で構成される特殊な役（清老頭のような扱い）
   * @param {Array} tiles - 全牌（手牌+メルド）
   * @returns {boolean}
   */
  isDaisharin(tiles) {
    // すべての牌が筒子（pin）の2～8に含まれるかチェック
    const isAllValidTile = tiles.every(tile => {
      return tile.suit === 'pin' && tile.number >= 2 && tile.number <= 8;
    });

    if (!isAllValidTile) {
      return false;
    }

    // 2～8の各数字が少なくとも1つ存在するかチェック
    const numberSet = new Set();
    tiles.forEach(tile => {
      if (tile.suit === 'pin' && tile.number >= 2 && tile.number <= 8) {
        numberSet.add(tile.number);
      }
    });

    // 7種類すべてが含まれているか確認
    return numberSet.size === 7;
  }
}

module.exports = ScoreCalculator;

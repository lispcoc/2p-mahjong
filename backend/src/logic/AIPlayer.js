const TenpaiChecker = require('./TenpaiChecker');

/**
 * AIPlayer - CPU麻雀AI
 *
 * 主な改善点:
 *   1. 正確なシャンテン数計算（通常形・七対子・国士）
 *   2. 有効牌（受入）カウントに基づく打牌選択
 *   3. 相手リーチ時の防御（現物・筋・壁）
 *   4. 副露判断のシャンテンベース化
 *   5. 役志向ボーナスによるタイブレーク
 *   6. 難易度設定（easy/normal/hard）
 *   7. 打点評価（ドラ・役・翻数推定）
 *   8. ダマテン戦略（高打点手でのリーチ抑制）
 *   9. ベタオリ（完全防御）モード
 *  10. フリテン確認付きリーチ判断
 *  11. ダブルリーチ検出
 *  12. スコア状況を考慮した戦略
 *  13. 相手リーチ中のカンリスク判断
 *  14. 一発消しポン考慮
 */
class AIPlayer {
  /**
   * @param {boolean} tsumoKiriMode - ツモ切りモード
   * @param {number}  difficulty    - 難易度: 0=easy, 1=normal, 2=hard
   */
  constructor(tsumoKiriMode = false, difficulty = 1) {
    this.tsumoKiriMode = tsumoKiriMode;
    this.difficulty = difficulty; // 0=easy, 1=normal, 2=hard
  }

  // ================================================================
  //  Tile <-> Index   牌インデックス変換
  //
  //  man 1-9 → 0-8, pin 1-9 → 9-17, sou 1-9 → 18-26, honor 1-7 → 27-33
  // ================================================================

  static tileToIndex(tile) {
    switch (tile.suit) {
      case 'man':   return tile.number - 1;
      case 'pin':   return tile.number - 1 + 9;
      case 'sou':   return tile.number - 1 + 18;
      case 'honor': return tile.number - 1 + 27;
      default: return -1;
    }
  }

  static indexToTile(idx) {
    if (idx < 0)  return null;
    if (idx < 9)  return { suit: 'man',   number: idx + 1 };
    if (idx < 18) return { suit: 'pin',   number: idx - 9 + 1 };
    if (idx < 27) return { suit: 'sou',   number: idx - 18 + 1 };
    if (idx < 34) return { suit: 'honor', number: idx - 27 + 1 };
    return null;
  }

  /**
   * 牌配列を34要素カウント配列に変換
   */
  static handToCountArray(tiles) {
    const c = new Array(34).fill(0);
    for (const t of tiles) {
      const i = AIPlayer.tileToIndex(t);
      if (i >= 0) c[i]++;
    }
    return c;
  }

  // ================================================================
  //  Shanten Calculator   シャンテン数計算
  //
  //  -1 = 和了形  0 = テンパイ  1 = イーシャンテン  ...
  // ================================================================

  /**
   * @param {Array<number>} counts  34要素カウント
   * @param {number} numMelds       副露面子数
   */
  static calculateShanten(counts, numMelds = 0) {
    let best = 8;
    best = Math.min(best, AIPlayer._normalShanten(counts, numMelds));
    if (numMelds === 0) {
      best = Math.min(best, AIPlayer._chiitoitsuShanten(counts));
      best = Math.min(best, AIPlayer._kokushiShanten(counts));
    }
    return best;
  }

  static _chiitoitsuShanten(counts) {
    let pairs = 0, kinds = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] >= 1) kinds++;
      if (counts[i] >= 2) pairs++;
    }
    return 6 - pairs + Math.max(0, 7 - kinds);
  }

  static _kokushiShanten(counts) {
    const T = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    let u = 0, p = false;
    for (const i of T) {
      if (counts[i] >= 1) u++;
      if (counts[i] >= 2) p = true;
    }
    return 13 - u - (p ? 1 : 0);
  }

  static _normalShanten(counts, numMelds) {
    const best = { v: 8 };
    AIPlayer._nsr(counts, 0, numMelds, 0, 0, best);
    return best.v;
  }

  /**
   * 再帰シャンテン探索
   * @param {Array<number>} c  牌カウント (in-place 変更→復元)
   * @param {number} p  走査位置 0-33
   * @param {number} m  面子数 (副露込み)
   * @param {number} t  搭子数
   * @param {number} j  雀頭有無 0|1
   * @param {{v:number}} best
   */
  static _nsr(c, p, m, t, j, best) {
    if (best.v <= -1) return;

    const et = Math.min(t, 4 - m);
    const sh = (4 - m) * 2 - et - j;
    if (sh < best.v) best.v = sh;

    if (m > 4) return;
    if (m + t > 4 + 1) return;

    while (p < 34 && c[p] === 0) p++;
    if (p >= 34) return;

    const isHonor = p >= 27;
    const mod = p % 9;

    // ── 面子 ──
    if (c[p] >= 3) {
      c[p] -= 3;
      AIPlayer._nsr(c, p, m + 1, t, j, best);
      c[p] += 3;
    }
    if (!isHonor && mod <= 6 && c[p + 1] >= 1 && c[p + 2] >= 1) {
      c[p]--; c[p + 1]--; c[p + 2]--;
      AIPlayer._nsr(c, p, m + 1, t, j, best);
      c[p]++; c[p + 1]++; c[p + 2]++;
    }

    // ── 雀頭 ──
    if (!j && c[p] >= 2) {
      c[p] -= 2;
      AIPlayer._nsr(c, p, m, t, 1, best);
      c[p] += 2;
    }

    // ── 搭子 ──
    if (c[p] >= 2) {
      c[p] -= 2;
      AIPlayer._nsr(c, p, m, t + 1, j, best);
      c[p] += 2;
    }
    if (!isHonor && mod <= 7 && c[p + 1] >= 1) {
      c[p]--; c[p + 1]--;
      AIPlayer._nsr(c, p, m, t + 1, j, best);
      c[p]++; c[p + 1]++;
    }
    if (!isHonor && mod <= 6 && c[p + 2] >= 1) {
      c[p]--; c[p + 2]--;
      AIPlayer._nsr(c, p, m, t + 1, j, best);
      c[p]++; c[p + 2]++;
    }

    // ── 孤立スキップ ──
    const sv = c[p];
    c[p] = 0;
    AIPlayer._nsr(c, p + 1, m, t, j, best);
    c[p] = sv;
  }

  // ================================================================
  //  Acceptance Count   有効牌（受入）計算
  // ================================================================

  /**
   * シャンテンを下げる牌の種類数・総枚数を返す
   * @param {Array<number>} hc       手牌カウント (13枚想定, in-place 変更→復元)
   * @param {number} numMelds
   * @param {Array<number>} visible  手牌以外の見えている牌カウント (34要素)
   */
  static calculateAcceptance(hc, numMelds, visible) {
    const cur = AIPlayer.calculateShanten(hc, numMelds);
    let types = 0, total = 0;
    for (let i = 0; i < 34; i++) {
      const rem = 4 - hc[i] - (visible ? visible[i] : 0);
      if (rem <= 0) continue;
      hc[i]++;
      if (AIPlayer.calculateShanten(hc, numMelds) < cur) {
        types++;
        total += rem;
      }
      hc[i]--;
    }
    return { types, total };
  }

  // ================================================================
  //  Visible Tiles   見えている牌集計
  // ================================================================

  /**
   * gameState から手牌以外で見えている牌の34要素カウントを生成
   */
  static buildVisibleCounts(gs) {
    const c = new Array(34).fill(0);
    const src = [
      ...(gs.ownDiscards || []),
      ...(gs.opponentDiscards || []),
      ...(gs.ownMelds || []).flat(),
      ...(gs.opponentMelds || []).flat(),
      ...(gs.doraIndicators || []),
    ];
    for (const t of src) {
      if (!t) continue;
      const i = AIPlayer.tileToIndex(t);
      if (i >= 0) c[i]++;
    }
    return c;
  }

  // ================================================================
  //  Dora / Hand Value   ドラ・打点評価
  // ================================================================

  /**
   * ドラ表示牌からドラ牌インデックスを求める
   * 字牌: 東(1)→南(2)→西(3)→北(4)→東(1), 白(5)→發(6)→中(7)→白(5)
   * 数牌: 9→1 (循環)
   */
  static _doraFromIndicator(indicator) {
    if (!indicator) return null;
    if (indicator.suit === 'honor') {
      const n = indicator.number;
      if (n <= 4) return { suit: 'honor', number: (n % 4) + 1 };
      // 三元牌: 白(5)→發(6)→中(7)→白(5)
      return { suit: 'honor', number: ((n - 4) % 3) + 5 };
    }
    return { suit: indicator.suit, number: (indicator.number % 9) + 1 };
  }

  /**
   * 手牌の翻数を簡易推定する（リーチ翻は含まない）
   * 目的: ダマテン判断・押し引き基準に使用
   */
  _estimateHandHan(hand, melds, doraIndicators = []) {
    let han = 0;
    const hc = AIPlayer.handToCountArray(hand);
    const allTiles = [...hand, ...melds.flat()];

    // ── ドラ（通常） ──
    for (const di of doraIndicators) {
      const dora = AIPlayer._doraFromIndicator(di);
      if (!dora) continue;
      const doraIdx = AIPlayer.tileToIndex(dora);
      if (doraIdx >= 0) han += hc[doraIdx];
    }
    // ── 赤ドラ ──
    han += hand.filter(t => t.isRed).length;

    // ── 役牌（副露面子） ──
    for (const m of melds) {
      if (m.length < 3) continue;
      const t = m[0];
      if (t.suit === 'honor') {
        if (t.number >= 5) han += 1; // 三元牌
        else if (t.number <= 2) han += 1; // 場風・自風（簡略2人麻雀）
      }
    }

    // ── 断么九: 全牌2〜8の数牌 ──
    if (allTiles.every(t => t.suit !== 'honor' && t.number >= 2 && t.number <= 8)) {
      han += 1;
    }

    // ── 七対子の潜在力（門前のみ） ──
    if (melds.length === 0) {
      let pairs = 0;
      for (let i = 0; i < 34; i++) if (hc[i] >= 2) pairs++;
      if (pairs >= 5) han += 2;
    }

    return han;
  }

  _isDoraTile(tile, doraIndicators = []) {
    for (const indicator of doraIndicators) {
      const dora = AIPlayer._doraFromIndicator(indicator);
      if (dora && dora.suit === tile.suit && dora.number === tile.number) {
        return true;
      }
    }
    return false;
  }

  _isYakuhaiTile(tile, gameState = {}) {
    if (!tile || tile.suit !== 'honor') return false;
    if (tile.number >= 5) return true;
    return tile.number === gameState.roundWind || tile.number === gameState.seatWind;
  }

  // ================================================================
  //  Furiten Check   フリテン確認
  // ================================================================

  /**
   * 自分の捨て牌に待ち牌が含まれているかを確認（フリテン判定）
   * リーチ前に呼ばれ、フリテンリーチを回避する
   */
  _isFuritenByDiscards(hand, melds, ownDiscards) {
    if (!ownDiscards || ownDiscards.length === 0) return false;
    const discardSet = new Set(ownDiscards.map(d => `${d.suit}-${d.number}`));
    const opts = this.getRiichiOptions(hand, melds);
    for (const opt of opts) {
      for (const wt of opt.waitTiles) {
        if (discardSet.has(`${wt.suit}-${wt.number}`)) return true;
      }
    }
    return false;
  }

  // ================================================================
  //  Betaori (Full Defense)   ベタオリ判断
  // ================================================================

  /**
   * 完全防御（ベタオリ）すべきか判定
   * 相手リーチ時にシャンテン数・スコア差・難易度で判断する
   */
  _isBetaoriAdvised(gameState, shanten) {
    if (this.difficulty === 0) return false; // イージーは守備なし
    if (!gameState.opponentRiichi) return false;
    if (shanten < 0) return false; // 和了形: 必ず和了
    if (shanten === 0) return false; // テンパイ: 原則押し

    const scoreDiff = (gameState.ownScore || 25000) - (gameState.opponentScore || 25000);

    if (this.difficulty === 2) {
      // ハード: 1シャンテン以上でベタオリ検討、大差リードなら確定ベタオリ
      if (shanten >= 2) return true;
      if (shanten >= 1 && scoreDiff > 8000) return true;
      return false;
    }

    // ノーマル: 2シャンテン以上はベタオリ
    return shanten >= 2;
  }

  // ================================================================
  //  Main Discard Logic   打牌選択
  // ================================================================

  /**
   * CPUの捨て牌を決定（エントリポイント）
   */
  chooseDiscard(hand, drawnTileIndex, isRiichi = false, gameState = {}) {
    if (this.tsumoKiriMode) return drawnTileIndex;
    if (isRiichi) return drawnTileIndex;
    if (hand.length < 2 || drawnTileIndex === -1) return drawnTileIndex;

    // イージーモード: 20%の確率でランダム打牌（最悪のシャンテン悪化は回避）
    if (this.difficulty === 0 && Math.random() < 0.20) {
      const hc = AIPlayer.handToCountArray(hand);
      const nm = gameState.numMelds || 0;
      const entries = hand.map((tile, i) => {
        const tc = hc.slice();
        tc[AIPlayer.tileToIndex(tile)]--;
        return { i, sh: AIPlayer.calculateShanten(tc, nm) };
      });
      const minSh = Math.min(...entries.map(e => e.sh));
      const safe = entries.filter(e => e.sh <= minSh + 1);
      return safe[Math.floor(Math.random() * safe.length)].i;
    }

    return this.selectBestDiscard(hand, drawnTileIndex, gameState);
  }

  /**
   * 最善の打牌を選択
   *
   * 評価方針:
   *   1. シャンテン数が最小の打牌を最優先
   *   2. 同シャンテンなら受入枚数（有効牌）で選択
   *   3. テンパイなら待ちの残り枚数で選択
   *   4. 相手リーチ時は安全度を加味（ベタオリモード含む）
   *   5. 役志向で微調整
   */
  selectBestDiscard(hand, drawnTileIndex, gameState = {}) {
    const numMelds = gameState.numMelds || 0;
    const visible = AIPlayer.buildVisibleCounts(gameState);
    const oppRiichi = !!gameState.opponentRiichi;
    const melds = gameState.melds || [];

    // ── ベタオリ判断 ──
    const hc0 = AIPlayer.handToCountArray(hand);
    const curShanten = AIPlayer.calculateShanten(hc0, numMelds);
    const betaori = this._isBetaoriAdvised(gameState, curShanten);

    if (betaori) {
      console.log(`[AI] Betaori mode activated (shanten=${curShanten})`);
    }

    // ── Phase 1: 各打牌のシャンテン数 ──
    const entries = [];
    for (let i = 0; i < hand.length; i++) {
      const hc = AIPlayer.handToCountArray(hand);
      const idx = AIPlayer.tileToIndex(hand[i]);
      hc[idx]--;
      const sh = AIPlayer.calculateShanten(hc, numMelds);
      entries.push({ i, tile: hand[i], sh, hc });
    }
    const bestSh = Math.min(...entries.map(e => e.sh));

    // ── Phase 2: スコアリング ──
    for (const e of entries) {
      let score = 0;

      if (betaori) {
        // ベタオリモード: 安全牌スコアのみ使用（攻撃スコアを無視）
        const safety = this._tileSafety(e.tile, gameState, visible, hand);
        score = safety * 5;
        // シャンテン悪化は小さなペナルティ（追い詰められない限り手を壊さない)
        score -= (e.sh - bestSh) * 200;
      } else {
        // ── 通常攻撃スコア ──
        const shantenBase = [10000, 4000, 2000, 1000, 500, 250, 125, 60, 30];
        score += shantenBase[Math.min(e.sh, 8)] || 0;
        score -= (e.sh - bestSh) * 3000;

        if (e.sh === 0) {
          // テンパイ: 待ち牌の実効残枚数
          const afterHand = hand.filter((_, j) => j !== e.i);
          const wins = TenpaiChecker.getWinningTiles(afterHand, melds);
          let effWaits = 0;
          for (const w of wins) {
            const wi = AIPlayer.tileToIndex(w);
            effWaits += Math.max(0, 4 - e.hc[wi] - visible[wi]);
          }
          score += wins.length * 500;
          score += effWaits * 200;
        } else if (e.sh <= bestSh + 1) {
          // 最良シャンテン or +1 以内: 受入計算
          const acc = AIPlayer.calculateAcceptance(e.hc, numMelds, visible);
          score += acc.types * 200;
          score += Math.min(acc.total, 30) * 30;
        }

        // --- 防御スコア (相手リーチ時) ---
        if (oppRiichi) {
          score += this._tileSafety(e.tile, gameState, visible, hand);
        }

        // --- 役志向ボーナス (±80以内のタイブレーク) ---
        score += this._yakuBonus(hand, e.i, numMelds, gameState);
        score += this._tileValueAdjustment(hand, e.i, gameState);
      }

      e.score = score;
    }

    // ── Phase 3: 最高スコア候補を返す ──
    entries.sort((a, b) => b.score - a.score);
    return entries[0].i;
  }

  // ================================================================
  //  Defense   防御（安全牌評価）
  // ================================================================

  /**
   * 牌の安全度スコア（高い = 安全 = 捨てやすい）
   * 現物 > 壁 > 筋 > 字牌 > 端数牌 > 中張牌
   */
  _tileSafety(tile, gs, visible, hand) {
    const oppDisc = gs.opponentDiscards || [];

    // ── 現物（相手が切った牌）= 100% 安全 ──
    if (oppDisc.some(d => d.suit === tile.suit && d.number === tile.number)) {
      return 2500;
    }

    // ── 壁（4枚全て既知 or 3枚見えれば実質安全）──
    const ti = AIPlayer.tileToIndex(tile);
    const hc = AIPlayer.handToCountArray(hand);
    const totalSeen = hc[ti] + visible[ti];
    if (totalSeen >= 4) return 2500; // 壁（4枚全確認）
    if (totalSeen >= 3) return 1800; // 3枚見えでほぼ安全（残り1枚）

    // ── 字牌: 見えている枚数で段階評価 ──
    if (tile.suit === 'honor') {
      if (totalSeen >= 2) return 1000;
      if (totalSeen >= 1) return 600;
      return 300;
    }

    // ── 筋（スジ安全）──
    if (this._isSuji(tile, oppDisc)) {
      return 1200;
    }

    // ── カベ（数牌で隣接牌が4枚見えていれば索子が通りやすい）──
    if (this._isKabe(tile, gs, visible, hand)) {
      return 900;
    }

    // ── 数牌: 端ほど安全 ──
    const n = tile.number;
    if (n === 1 || n === 9) return 200;
    if (n === 2 || n === 8) return 100;
    // 3,4,6,7はやや危険（嵌張・辺張の待ち牌になりやすい）
    if (n === 3 || n === 7) return -100;
    // 4,5,6は最も危険（両面待ちの中心）
    return -200;
  }

  /**
   * カベ（壁）安全判定
   * 数牌 n に対して、スジを構成する牌の片方が4枚全て見えていれば
   * その牌はロンされない（例：1が4枚見えていれば4は安全）
   */
  _isKabe(tile, gs, visible, hand) {
    if (tile.suit === 'honor') return false;
    const s = tile.suit;
    const n = tile.number;
    const hc = AIPlayer.handToCountArray(hand);

    // n-3 の牌が4枚全て見えている → n は安全（1-4スジ）
    if (n >= 4) {
      const idx = AIPlayer.tileToIndex({ suit: s, number: n - 3 });
      if (idx >= 0 && hc[idx] + visible[idx] >= 4) return true;
    }
    // n+3 の牌が4枚全て見えている → n は安全（スジ）
    if (n <= 6) {
      const idx = AIPlayer.tileToIndex({ suit: s, number: n + 3 });
      if (idx >= 0 && hc[idx] + visible[idx] >= 4) return true;
    }
    return false;
  }

  /**
   * 筋（スジ）安全判定
   * 相手の河に n±3 の牌があれば筋安全
   */
  _isSuji(tile, oppDisc) {
    const s = tile.suit, n = tile.number;
    const partners = [];
    if (n >= 4) partners.push(n - 3);
    if (n <= 6) partners.push(n + 3);
    return partners.some(pn =>
      oppDisc.some(d => d.suit === s && d.number === pn)
    );
  }

  // ================================================================
  //  Yaku Bonus   役志向ボーナス（タイブレーク用）
  // ================================================================

  _yakuBonus(hand, discIdx, numMelds, gameState = {}) {
    let bonus = 0;
    const dt = hand[discIdx];
    const rest = hand.filter((_, j) => j !== discIdx);
    const isYakuhaiHonor = this._isYakuhaiTile(dt, gameState);

    // 断么九志向: 么九牌・字牌を切ると加点
    const thCount = rest.filter(
      t => t.suit === 'honor' || t.number === 1 || t.number === 9
    ).length;
    if (thCount <= 2) {
      if ((dt.suit === 'honor' || dt.number === 1 || dt.number === 9) && !isYakuhaiHonor) {
        bonus += 40;
      }
      if (isYakuhaiHonor) bonus -= 80;
    }

    // 混一色志向: 支配スーツ以外を切ると加点
    if (numMelds <= 1) {
      const sc = {};
      for (const t of rest) {
        if (t.suit !== 'honor') sc[t.suit] = (sc[t.suit] || 0) + 1;
      }
      const vals = Object.entries(sc);
      if (vals.length >= 2) {
        vals.sort((a, b) => b[1] - a[1]);
        const [domSuit, domCnt] = vals[0];
        if (domCnt / rest.length >= 0.65 &&
            dt.suit !== domSuit && dt.suit !== 'honor') {
          bonus += 60;
        }
      }
    }

    return bonus;
  }

  _tileValueAdjustment(hand, discIdx, gameState = {}) {
    const dt = hand[discIdx];
    const rest = hand.filter((_, j) => j !== discIdx);
    const copiesLeft = rest.filter(t => t.suit === dt.suit && t.number === dt.number).length;
    let adjustment = 0;

    if (this._isDoraTile(dt, gameState.doraIndicators || [])) {
      adjustment -= 600 + copiesLeft * 200;
    }

    if (dt.isRed) {
      const hasNormalVersion = rest.some(
        t => t.suit === dt.suit && t.number === dt.number && !t.isRed
      );
      adjustment -= hasNormalVersion ? 500 : 150;
    }

    if (dt.suit === 'honor') {
      if (this._isYakuhaiTile(dt, gameState)) {
        if (copiesLeft >= 1) {
          adjustment -= 700 + copiesLeft * 150;
        } else {
          adjustment -= (gameState.wallRemaining || 0) >= 18 ? 180 : 60;
        }
      } else if (copiesLeft >= 1) {
        adjustment -= 100;
      } else {
        adjustment += 220;
      }
    }

    return adjustment;
  }

  // ================================================================
  //  Furo (Pung) Decision   副露（ポン）判断
  // ================================================================

  /**
   * ポンすべきか判定
   *
   * @param {Array} hand           手牌（13枚、ポン対象2枚含む）
   * @param {Object} discardedTile 相手が切った牌
   * @param {Array}  melds         現在の副露
   * @param {Object} gameState     ゲーム状態（opponentIppatsu等）
   */
  shouldPung(hand, discardedTile, melds = [], gameState = {}) {
    if (!hand || hand.length === 0 || !discardedTile) return false;

    // 大明槓が可能な場合は常にカンを優先（ドラ増加 + 嶺上牌）
    if (this.shouldDaiminkan(hand, discardedTile, melds, gameState)) {
      return false; // ポンせずカンさせる
    }

    const hc = AIPlayer.handToCountArray(hand);
    const ti = AIPlayer.tileToIndex(discardedTile);
    if (hc[ti] < 2) return false;

    const nm = melds.length;
    const shBefore = AIPlayer.calculateShanten(hc, nm);

    // ポン後シミュレーション: 2枚除去 → 11枚 → 最善打牌 → 10枚
    const pc = hc.slice();
    pc[ti] -= 2;
    const nm1 = nm + 1;

    let bestShAfter = 8;
    for (let i = 0; i < 34; i++) {
      if (pc[i] <= 0) continue;
      pc[i]--;
      const s = AIPlayer.calculateShanten(pc, nm1);
      if (s < bestShAfter) bestShAfter = s;
      pc[i]++;
    }

    console.log(`[AIPlayer.shouldPung] ${discardedTile.suit}-${discardedTile.number}: shanten ${shBefore}→${bestShAfter}`);

    // シャンテン悪化 → 一発消し目的で許容するか判断
    if (bestShAfter > shBefore) {
      const oppIppatsu = gameState.opponentIppatsu || false;
      // ノーマル以上: 一発をキャンセルするためにシャンテン+1まで許容
      if (oppIppatsu && this.difficulty >= 1 && bestShAfter <= shBefore + 1) {
        if (this._hasYakuAfterFuro(pc, melds, discardedTile)) {
          console.log('[AIPlayer.shouldPung] ✅ Pong for ippatsu cancellation (with yaku)');
          return true;
        }
      }
      console.log('[AIPlayer.shouldPung] ❌ Shanten worsens');
      return false;
    }

    // シャンテン改善
    if (bestShAfter < shBefore) {
      if (this._hasYakuAfterFuro(pc, melds, discardedTile)) {
        console.log('[AIPlayer.shouldPung] ✅ Shanten improves with viable yaku');
        return true;
      }
      // テンパイ or イーシャンテン到達でも役なしは副露後に和了不能 → 見送り
      if (bestShAfter <= 1) {
        console.log(`[AIPlayer.shouldPung] ❌ Near tenpai (${bestShAfter}) but no yaku path`);
        return false;
      }
      console.log('[AIPlayer.shouldPung] ❌ Shanten improves but far and no yaku');
      return false;
    }

    // シャンテン同等
    if (nm === 0 && shBefore >= 2) {
      console.log('[AIPlayer.shouldPung] ❌ Preserve menzen (riichi potential)');
      return false;
    }
    if (this._hasYakuAfterFuro(pc, melds, discardedTile)) {
      console.log('[AIPlayer.shouldPung] ✅ Same shanten, viable yaku path');
      return true;
    }

    console.log('[AIPlayer.shouldPung] ❌ No clear benefit');
    return false;
  }

  /**
   * 副露後に成立可能な役があるか
   */
  _hasYakuAfterFuro(handCounts, currentMelds, pungTile) {
    // 役牌（三元牌: honor 5=白, 6=發, 7=中）
    if (pungTile.suit === 'honor' && pungTile.number >= 5) return true;

    // 風牌の役牌（東=1, 南=2）：2人麻雀では自風か場風
    if (pungTile.suit === 'honor' && pungTile.number <= 2) return true;

    if (this._canTanyao(handCounts, currentMelds, pungTile)) return true;
    if (this._canHonitsu(handCounts, currentMelds, pungTile)) return true;
    if (this._canToitoi(handCounts, currentMelds)) return true;
    if (this._canSanshokuDoukou(handCounts, currentMelds, pungTile)) return true;
    if (this._canShousangen(handCounts, currentMelds, pungTile)) return true;
    if (this._canChanta(handCounts, currentMelds, pungTile)) return true;

    return false;
  }

  _canTanyao(hc, melds, pt) {
    if (pt.suit === 'honor' || pt.number === 1 || pt.number === 9) return false;
    for (const m of melds) {
      for (const t of m) {
        if (t.suit === 'honor' || t.number === 1 || t.number === 9) return false;
      }
    }
    let thc = 0;
    for (let i = 0; i < 34; i++) {
      if (hc[i] === 0) continue;
      const t = AIPlayer.indexToTile(i);
      if (t.suit === 'honor' || t.number === 1 || t.number === 9) thc += hc[i];
    }
    return thc <= 1;
  }

  _canHonitsu(hc, melds, pt) {
    const suits = new Set();
    for (let i = 0; i < 27; i++) {
      if (hc[i] > 0) {
        suits.add(i < 9 ? 'man' : i < 18 ? 'pin' : 'sou');
      }
    }
    if (pt.suit !== 'honor') suits.add(pt.suit);
    for (const m of melds) {
      for (const t of m) {
        if (t.suit !== 'honor') suits.add(t.suit);
      }
    }
    return suits.size <= 1;
  }

  _canToitoi(hc, melds) {
    for (const m of melds) {
      if (m.length < 3) continue;
      if (!(m[0].suit === m[1].suit && m[0].number === m[1].number &&
            m[1].suit === m[2].suit && m[1].number === m[2].number)) {
        return false;
      }
    }
    let pairs = 0;
    for (let i = 0; i < 34; i++) {
      if (hc[i] >= 2) pairs++;
    }
    return pairs >= 2;
  }

  /**
   * 三色同刻: 同じ数字の刻子を3スーツで揃える
   * ポン牌と既存の副露・手牌から同数字の刻子が3スーツそろう見込みか判定
   */
  _canSanshokuDoukou(hc, melds, pt) {
    if (pt.suit === 'honor') return false;
    const n = pt.number;
    const suits = ['man', 'pin', 'sou'];
    const pungSuits = new Set([pt.suit]);

    // 既存面子に同数字の刻子があるか
    for (const m of melds) {
      if (m.length >= 3 && m[0].suit !== 'honor' && m[0].number === n &&
          m[0].suit === m[1].suit && m[0].suit === m[2].suit) {
        pungSuits.add(m[0].suit);
      }
    }
    // 手牌に同数字の対子以上があるか（刻子に育てられる）
    for (const s of suits) {
      if (!pungSuits.has(s)) {
        const idx = AIPlayer.tileToIndex({ suit: s, number: n });
        if (hc[idx] >= 2) pungSuits.add(s);
      }
    }
    return pungSuits.size >= 3;
  }

  /**
   * 小三元 / 大三元: 三元牌（白・發・中）の刻子2つ以上 + 残り対子
   */
  _canShousangen(hc, melds, pt) {
    const dragons = [5, 6, 7]; // honor番号
    let dragonPungs = 0;
    let dragonPairs = 0;

    // 既存副露の三元牌刻子
    for (const m of melds) {
      if (m.length >= 3 && m[0].suit === 'honor' && dragons.includes(m[0].number)) {
        dragonPungs++;
      }
    }
    // 今回ポン/カンする牌
    if (pt.suit === 'honor' && dragons.includes(pt.number)) {
      dragonPungs++;
    }
    // 手牌に残る三元牌の対子
    for (const d of dragons) {
      const idx = AIPlayer.tileToIndex({ suit: 'honor', number: d });
      // 今回ポンする牌は刻子に使うので対子としてカウントしない
      if (pt.suit === 'honor' && pt.number === d) continue;
      if (hc[idx] >= 2) dragonPairs++;
    }

    // 小三元: 三元牌2刻子 + 1対子, 大三元: 三元牌3刻子
    return dragonPungs >= 2 && (dragonPungs >= 3 || dragonPairs >= 1);
  }

  /**
   * 混全帯么九 (チャンタ): 全ての面子・雀頭に么九牌または字牌を含む
   * ポン牌が么九牌/字牌 かつ 既存副露が全てチャンタ条件を満たし
   * 手牌の中張牌が多くない場合に可能性ありと判断
   */
  _canChanta(hc, melds, pt) {
    // ポン牌自体が么九牌・字牌でなければ不可
    if (pt.suit !== 'honor' && pt.number !== 1 && pt.number !== 9) return false;
    // 既存副露が全てチャンタ条件（么九牌/字牌を含む）を満たしているか
    for (const m of melds) {
      const hasYaochu = m.some(
        t => t.suit === 'honor' || t.number === 1 || t.number === 9
      );
      if (!hasYaochu) return false;
    }
    // 手牌に中張牌（2〜8）が多すぎると成立困難
    let middleCount = 0;
    for (let i = 0; i < 27; i++) {
      if (hc[i] <= 0) continue;
      const t = AIPlayer.indexToTile(i);
      if (t.number >= 2 && t.number <= 8) middleCount += hc[i];
    }
    return middleCount <= 4;
  }

  // ================================================================
  //  Riichi Decision   リーチ判断
  // ================================================================

  getRiichiOptions(hand, melds) {
    const results = TenpaiChecker.checkAllTenpai(hand, melds);
    const options = [];
    for (const [idx, r] of Object.entries(results)) {
      if (!r.isTenpai) continue;
      const wt = r.winningTiles || [];
      options.push({
        index: parseInt(idx, 10),
        waitCount: wt.length,
        totalAvailable: wt.reduce((s, t) => s + (t.count || 0), 0),
        waitTiles: wt,
      });
    }
    options.sort((a, b) => {
      if (b.waitCount !== a.waitCount) return b.waitCount - a.waitCount;
      return b.totalAvailable - a.totalAvailable;
    });
    return options;
  }

  /**
   * リーチ宣言判断
   * 第4引数は省略可（GameRoom から3引数で呼ばれる）
   */
  shouldDeclareRiichi(hand, melds, currentScore, gameState = {}) {
    if (melds.length > 0) return { shouldRiichi: false, discardIndex: -1 };
    if (currentScore < 1000) return { shouldRiichi: false, discardIndex: -1 };

    // ── フリテン確認（ノーマル以上）──
    if (this.difficulty >= 1) {
      if (this._isFuritenByDiscards(hand, melds, gameState.ownDiscards || [])) {
        console.log('[AI] Skip riichi: furiten detected');
        return { shouldRiichi: false, discardIndex: -1 };
      }
    }

    const opts = this.getRiichiOptions(hand, melds);
    if (opts.length === 0) return { shouldRiichi: false, discardIndex: -1 };

    const best = opts[0];

    // 見えている牌を考慮した実効待ち枚数
    let effWaits = best.totalAvailable;
    const vis = AIPlayer.buildVisibleCounts(gameState);
    const anyVisible = vis.some(v => v > 0);
    if (anyVisible) {
      effWaits = 0;
      const afterHand = hand.filter((_, j) => j !== best.index);
      const hc = AIPlayer.handToCountArray(afterHand);
      for (const wt of best.waitTiles) {
        const wi = AIPlayer.tileToIndex(wt);
        effWaits += Math.max(0, 4 - hc[wi] - vis[wi]);
      }
    }

    const wallRem = gameState.wallRemaining || 50;

    // ── イージーモード: 制約なしで即リーチ ──
    if (this.difficulty === 0) {
      if (effWaits >= 1) return { shouldRiichi: true, discardIndex: best.index };
      return { shouldRiichi: false, discardIndex: -1 };
    }

    // ── ダブルリーチ判定（第1打: 自他ともに捨て牌なし）──
    const ownDiscards = gameState.ownDiscards || [];
    const oppDiscards = gameState.opponentDiscards || [];
    const isDoubleRiichi = ownDiscards.length === 0 && oppDiscards.length === 0;
    if (isDoubleRiichi && effWaits >= 1) {
      console.log('[AI] Double riichi!');
      return { shouldRiichi: true, discardIndex: best.index };
    }

    // ── ダマテン判断（ノーマル以上）──
    if (this.difficulty >= 1) {
      const estHan = this._estimateHandHan(hand, melds, gameState.doraIndicators || []);
      // 既に3翻以上推定される手 + 相手リーチなし + 多面待ち → ダマテン選択
      if (estHan >= 3 && !gameState.opponentRiichi && best.waitCount >= 2) {
        console.log(`[AI] Damaten: est ${estHan} han, ${best.waitCount} waits`);
        return { shouldRiichi: false, discardIndex: -1 };
      }
    }

    // ── スコア状況を考慮（ノーマル以上）──
    const scoreDiff = (gameState.ownScore || 0) - (gameState.opponentScore || 0);
    const roundNumber = gameState.roundNumber || 1;
    const totalRounds = gameState.totalRounds || 4;
    const isNearEnd = roundNumber >= totalRounds - 1;

    // 終盤で大差リード + 薄い待ち → ダマ or スキップ
    if (this.difficulty >= 1 && isNearEnd && scoreDiff > 12000 && effWaits < 3) {
      console.log('[AI] Skip riichi: near end + large lead + thin waits');
      return { shouldRiichi: false, discardIndex: -1 };
    }

    // ── 通常リーチ判断 ──
    // 良い待ち → 即リーチ
    if (best.waitCount >= 2 && effWaits >= 4) {
      return { shouldRiichi: true, discardIndex: best.index };
    }
    // 普通の待ち + 山牌十分
    if (effWaits >= 2 && wallRem >= 20) {
      return { shouldRiichi: true, discardIndex: best.index };
    }
    // 薄い待ちでも山牌大量
    if (effWaits >= 1 && wallRem >= 40) {
      return { shouldRiichi: true, discardIndex: best.index };
    }

    return { shouldRiichi: false, discardIndex: -1 };
  }

  // ================================================================
  //  Win / Ron
  // ================================================================

  shouldTakeRon() { return true; }
  shouldWin()     { return true; }

  // ================================================================
  //  Kan Decision   カン判断
  // ================================================================

  shouldKan(hand, melds = [], isRiichi = false, gameState = {}) {
    if (isRiichi) return false;

    const oppRiichi = gameState.opponentRiichi || false;

    // 加槓: 既存ポンに4枚目追加
    if (this.getValidAddedKan(hand, melds).length > 0) {
      // 相手リーチ中は加槓を控える（新ドラが相手に有利・一発消しは加槓でも無効化できるが
      // 新ドラリスクが大きい）
      if (oppRiichi && this.difficulty >= 1) {
        console.log('[AIPlayer.shouldKan] ❌ Skip added kan: opponent riichi risk');
        return false;
      }
      console.log('[AIPlayer.shouldKan] ✅ Added kan (加槓)');
      return true;
    }

    // 暗槓: シャンテン悪化しなければ実行
    const cks = this.getValidConcealedKan(hand);
    if (cks.length > 0) {
      // 相手リーチ中は暗槓も控える（新ドラリスク）
      if (oppRiichi && this.difficulty >= 1) {
        console.log('[AIPlayer.shouldKan] ❌ Skip concealed kan: opponent riichi risk');
        return false;
      }

      const ck = cks[0];
      const ci = AIPlayer.tileToIndex(ck);
      const hc = AIPlayer.handToCountArray(hand);
      const curSh = AIPlayer.calculateShanten(hc, melds.length);

      const ac = hc.slice();
      ac[ci] -= 4;
      const kanSh = AIPlayer.calculateShanten(ac, melds.length + 1);

      if (kanSh <= curSh) {
        console.log(`[AIPlayer.shouldKan] ✅ Concealed kan (暗槓): ${curSh}→${kanSh}`);
        return true;
      }
      console.log(`[AIPlayer.shouldKan] ❌ Concealed kan worsens: ${curSh}→${kanSh}`);
    }

    return false;
  }

  /**
   * 大明槓判断: 相手の捨て牌に対して手牌に3枚あるときカンすべきか
   * カンはドラ1枚増加 + 嶺上牌1枚ツモ → 基本的にシャンテン悪化しなければ実行
   */
  shouldDaiminkan(hand, discardedTile, melds = [], gameState = {}) {
    if (!hand || hand.length === 0 || !discardedTile) return false;

    const hc = AIPlayer.handToCountArray(hand);
    const ti = AIPlayer.tileToIndex(discardedTile);
    if (hc[ti] < 3) return false;

    const oppRiichi = gameState.opponentRiichi || false;

    // ハードモード: 相手リーチ中は大明槓を控える（新ドラが相手に有利なリスク）
    if (oppRiichi && this.difficulty >= 2) {
      console.log('[AIPlayer.shouldDaiminkan] ❌ Skip: opponent riichi risk (hard mode)');
      return false;
    }

    const nm = melds.length;
    const shBefore = AIPlayer.calculateShanten(hc, nm);

    // 大明槓後シミュレーション: 3枚除去 + 1面子増 → 嶺上牌ツモ前の手牌
    const kc = hc.slice();
    kc[ti] -= 3;
    const nm1 = nm + 1;
    const shAfter = AIPlayer.calculateShanten(kc, nm1);

    console.log(`[AIPlayer.shouldDaiminkan] ${discardedTile.suit}-${discardedTile.number}: shanten ${shBefore}→${shAfter}`);

    // シャンテン悪化しなければ大明槓候補 → さらに役の見込みを確認（副露後はリーチ不可）
    if (shAfter <= shBefore) {
      if (this._hasYakuAfterFuro(kc, melds, discardedTile)) {
        console.log('[AIPlayer.shouldDaiminkan] ✅ Daiminkan (大明槓)');
        return true;
      }
      console.log('[AIPlayer.shouldDaiminkan] ❌ No yaku path after daiminkan');
      return false;
    }

    console.log('[AIPlayer.shouldDaiminkan] ❌ Shanten worsens');
    return false;
  }

  getValidConcealedKan(hand) {
    const g = {};
    for (const t of hand) {
      const k = `${t.suit}-${t.number}`;
      (g[k] = g[k] || []).push(t);
    }
    return Object.values(g).filter(a => a.length === 4).map(a => a[0]);
  }

  getValidAddedKan(hand, melds = []) {
    const r = [];
    for (const m of melds) {
      if (m.length !== 3) continue;
      const mt = m[0];
      const match = hand.find(t => t.suit === mt.suit && t.number === mt.number);
      if (match) r.push(match);
    }
    return r;
  }

  // ================================================================
  //  Settings
  // ================================================================

  setTsumoKiriMode(en) { this.tsumoKiriMode = en; }
  getTsumoKiriMode()   { return this.tsumoKiriMode; }

  setDifficulty(d)     { this.difficulty = Math.max(0, Math.min(2, d)); }
  getDifficulty()      { return this.difficulty; }

  // ================================================================
  //  Backward-compatible Helpers  テスト互換ラッパー
  //
  //  旧テストが参照するメソッド。内部実装はシャンテン/受入ベースに
  //  変わったが、テストが壊れないよう互換シグネチャを維持する。
  // ================================================================

  /**
   * 手牌の複合度スコア（テスト互換）
   */
  evaluateHandComplexity(hand) {
    const hc = AIPlayer.handToCountArray(hand);
    const sh = AIPlayer.calculateShanten(hc, 0);
    return Math.max(0, (6 - sh) * 15);
  }

  /**
   * 牌の複合可能性（テスト互換）
   */
  evaluateCombinationPotential(hand, discardedTile) {
    const hc = AIPlayer.handToCountArray(hand);
    const ti = AIPlayer.tileToIndex(discardedTile);
    let potential = 0;

    if (discardedTile.suit === 'honor') {
      const cnt = hc[ti];
      if (cnt >= 2) potential -= 120;
      else if (cnt === 1) potential -= 60;
      else potential += 80;
      return potential;
    }

    const suit = discardedTile.suit;
    const num = discardedTile.number;
    let patternCount = 0;

    if (num >= 2 && num <= 8) {
      const hasM = hand.some(t => t.suit === suit && t.number === num - 1);
      const hasP = hand.some(t => t.suit === suit && t.number === num + 1);
      if (hasM && hasP) { potential -= 100; patternCount++; }
      else if (hasM || hasP) { potential -= 50; patternCount++; }
    }
    if (num <= 7) {
      const hasP1 = hand.some(t => t.suit === suit && t.number === num + 1);
      const hasP2 = hand.some(t => t.suit === suit && t.number === num + 2);
      if (hasP1 && hasP2) { potential -= 80; patternCount++; }
    }
    if (num >= 3) {
      const hasM1 = hand.some(t => t.suit === suit && t.number === num - 1);
      const hasM2 = hand.some(t => t.suit === suit && t.number === num - 2);
      if (hasM1 && hasM2) { potential -= 80; patternCount++; }
    }

    const sameCnt = hand.filter(t => t.suit === suit && t.number === num).length;
    if (sameCnt >= 2) { potential -= 120; patternCount++; }
    else if (sameCnt === 1) { potential -= 50; patternCount++; }

    if (patternCount >= 2) potential -= 100;
    if (patternCount === 0) potential += 100;

    return potential;
  }

  /**
   * リャンメン効率（テスト互換）
   */
  evaluateRyanmenEfficiency(hand, discardedTile) {
    if (discardedTile.suit === 'honor') return 0;
    const suit = discardedTile.suit;
    const num = discardedTile.number;
    let score = 0;

    if (num >= 2 && num <= 8) {
      const hasM = hand.some(t => t.suit === suit && t.number === num - 1);
      const hasP = hand.some(t => t.suit === suit && t.number === num + 1);
      if (hasM && hasP) score += 80;
      else if (hasM || hasP) score += (num >= 4 && num <= 6) ? 30 : 10;
    }

    let adj = 0;
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue;
      const target = num + d;
      if (target >= 1 && target <= 9 &&
          hand.some(t => t.suit === suit && t.number === target)) {
        adj++;
      }
    }
    score += adj * 15;
    return score;
  }

  /**
   * 手牌整形度（テスト互換）
   */
  evaluateHandShape(hand) {
    let score = 0;

    const sc = {};
    hand.forEach(t => { sc[t.suit] = (sc[t.suit] || 0) + 1; });
    const vals = Object.values(sc).sort((a, b) => b - a);
    if (vals[0] >= 7) score += 100;
    else if (vals[0] >= 6) score += 60;
    else if (vals[0] >= 5) score += 30;

    const nonZero = Object.values(sc).filter(c => c > 0).length;
    if (nonZero === 1) score += 150;
    else if (nonZero === 2) score += 80;
    else if (nonZero === 3) score -= 30;
    else score -= 80;

    const nums = {};
    hand.forEach(t => {
      if (t.suit !== 'honor') nums[t.number] = (nums[t.number] || 0) + 1;
    });
    let maxSeq = 0, curSeq = 0;
    for (let i = 1; i <= 9; i++) {
      if ((nums[i] || 0) > 0) { curSeq++; maxSeq = Math.max(maxSeq, curSeq); }
      else curSeq = 0;
    }
    if (maxSeq >= 7) score += 80;
    else if (maxSeq >= 5) score += 50;
    else if (maxSeq >= 3) score += 20;

    return score;
  }

  /**
   * 牌の危険度評価（テスト互換）
   */
  evaluateDanger(tile, gameState = {}) {
    const { opponentRiichi = false, discardedTiles = [] } = gameState;
    if (!opponentRiichi) {
      return tile.suit === 'honor' ? -20 : 0;
    }

    if (discardedTiles.some(d => d.suit === tile.suit && d.number === tile.number)) {
      return 200;
    }
    if (tile.suit === 'honor') return 200;
    if (this._isSuji(tile, discardedTiles)) return 150;

    const n = tile.number;
    if (n >= 4 && n <= 6) return -300;
    if (n === 1 || n === 9) return -50;
    return -150;
  }

  /**
   * ディスカード評価スコア（テスト互換）
   */
  evaluateDiscardMove(hand, discardIndex, gameState = {}) {
    const hc = AIPlayer.handToCountArray(hand);
    const tile = hand[discardIndex];
    const idx = AIPlayer.tileToIndex(tile);
    hc[idx]--;
    const sh = AIPlayer.calculateShanten(hc, 0);

    let score = 0;
    const wins = TenpaiChecker.getWinningTiles(
      hand.filter((_, j) => j !== discardIndex), []
    );
    if (wins.length > 0) {
      score += 10000 + wins.length * 100;
    }

    score += Math.max(0, (6 - sh)) * 500;

    const acc = AIPlayer.calculateAcceptance(hc, 0, null);
    score += acc.types * 50 + acc.total * 10;

    score += this.evaluateDanger(tile, gameState);

    return score;
  }
}

module.exports = AIPlayer;

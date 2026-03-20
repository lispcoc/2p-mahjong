/**
 * settings.js - バックエンド全体の定数・設定値
 * マジックナンバーを一元管理するファイル
 */

module.exports = {
  // ===== サーバー設定 =====
  server: {
    port: 3001, // デフォルトポート
  },

  // ===== ゲームルール設定 =====
  game: {
    maxPlayersPerRoom: 2,       // ルームあたり最大プレイヤー数
    defaultInitialScore: 25000, // デフォルト初期持ち点
    tilesPerPlayer: 13,         // 配牌枚数
    reservedTiles: 22,          // ドラ・嶺上牌などの予約枚数
    dealTilesOffset: 27,        // 配牌分の牌数（13×2 + 親の1枚 = 27）
    riichiDeposit: 1000,        // リーチ供託点
    notenPenaltyAmount: 1500,   // ノーテン罰符（2人麻雀: 聴牌者 +3000 / ノーテン者 -3000）
  },

  // ===== 壁牌設定 =====
  wall: {
    minTiles: 30,   // 最小壁牌枚数
    maxTiles: 136,   // 最大壁牌枚数（全牌数）
    kanningWallSize: 3,       // 嶺上牌枚数
    kanningWallSupplySize: 3, // 嶺上牌補充枚数
    candidateCount: 4,        // ドラ表示牌候補数（カン最大4回分）
  },

  // ===== タイマー設定 =====
  timers: {
    autoActionTimer: {
      minSeconds: 3,       // 自動アクションタイマー最小値（秒）
      maxSeconds: 60,      // 自動アクションタイマー最大値（秒）
      defaultSeconds: 10,  // 自動アクションタイマーデフォルト値（秒）
    },
    autoReadyTimeoutMs: 10000,          // 自動準備完了タイマー（ミリ秒）
    gameOverDeletionMs: 60 * 60 * 1000,  // ゲーム終了後ルーム削除タイマー
    inactivityDeletionMs: 60 * 60 * 1000, // 非アクティブルーム削除タイマー
    disconnectGracePeriodMs: 10 * 60 * 1000, // 切断猶予期間（10分）
  },

  // ===== CPU/AI 遅延設定 =====
  cpuDelays: {
    turnDelayMinMs: 500,          // CPUターン遅延最小値（ミリ秒）
    turnDelayRangeMs: 1000,       // CPUターン遅延幅（ミリ秒）: 実際の遅延 = min + random * range
    drawDelayMs: 300,             // CPUドロー後遅延（ミリ秒）
    pungDelayMs: 300,             // CPUポン後遅延（ミリ秒）
    daiminkanDelayMs: 300,        // CPU大明槓後遅延（ミリ秒）
    kanDelayMs: 100,              // CPUカン後遅延（ミリ秒）
    bothRiichiAutoPlayDelayMs: 500, // 両リーチ自動進行遅延（ミリ秒）
    riichiAutoDiscardDelayMs: 1000, // リーチ中プレイヤーの自動ツモ切り遅延（ミリ秒）
    cpuTurnRecheckDelayMs: 100,   // CPU次ターン再チェック遅延（ミリ秒）
  },

  // ===== 観戦設定 =====
  spectator: {
    showHandsByDefault: false, // 観戦時にプレイヤーの手牌をデフォルトで表示するか
    delayedMode: {
      delayMs: 60 * 1000,           // 遅延観戦の遅延時間（ミリ秒）: 1分
      bufferDurationMs: 60 * 60 * 1000, // バッファの保持期間: 1時間（試合全体を保持）
      dispatchIntervalMs: 500,      // 配信チェック間隔（ミリ秒）
    },
  },

  // ===== イカサマ（チート）設定 =====
  cheating: {
    enabled: false,                 // イカサマ機能有効フラグ（デフォルト無効）
    fixedDrawOrder: false,          // ツモ順固定（true: 壁牌シャッフル後の順序でツモ, false: 従来のランダム抽選）
    skipYakumanRecord: true,        // イカサマ有効時に役満記録をスキップするか
    skipBattleLog: true,            // イカサマ有効時に対戦ログをスキップするか
  },

  // ===== 配牌運（ツモ運）設定 =====
  tsumoLuck: {
    maxLevel: 3,                      // ツモ運最大レベル
    haipaiAttempts: { 1: 1, 2: 5, 3: 10 }, // レベルごとの配牌試行回数
    selectionProbabilities: { 1: 0.3, 2: 0.5, 3: 0.7 }, // レベルごとの有利牌選択確率（シャンテン数無視のフォールバック）
    // シャンテン数グループごとの発動率
    // キー: 0 = テンパイ（0シャンテン）, 1 = 1シャンテン, 2 = 2シャンテン以上
    shantenProbabilities: {
      1: { 0: 0.1, 1: 0.3, 2: 0.3 }, // レベル1: テンパイ10%, 1シャンテン30%, 2シャンテン以上30%
      2: { 0: 0.1, 1: 0.5, 2: 0.5 }, // レベル2: テンパイ10%, 1シャンテン50%, 2シャンテン以上50%
      3: { 0: 0.1, 1: 0.7, 2: 0.7 }, // レベル3: テンパイ10%, 1シャンテン70%, 2シャンテン以上70%
    },
  },
};

/**
 * BattleLogger - 対戦ログの記録・読み込みモジュール
 *
 * - CPU対戦は記録しない（呼び出し元で判断）
 * - ログはJSONL形式（1行1件）で月別ファイルに保存
 * - ファイル名: battle-logs/battle-logs-YYYY-MM.jsonl
 * - 対戦ID形式: YYYYMMDD-{roomId}-{unixtime} (例: 20260313-5432-1741824000000)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'battle-logs');

/**
 * 月別ログファイルのパスを返す
 * @param {Date} [date] - 省略時は現在日時
 */
function getLogFilePath(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return path.join(LOG_DIR, `battle-logs-${yyyy}-${mm}.jsonl`);
}

/**
 * 対戦IDを生成する
 * 形式: YYYYMMDD-{roomId}-{unixtime}
 * @param {string} roomId
 * @param {Date} [date]
 */
function generateBattleId(roomId, date = new Date()) {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const ts = date.getTime();
  return `${yyyymmdd}-${roomId}-${ts}`;
}

/**
 * ルームオブジェクトからルール設定を抽出する
 * @param {object} room - GameRoomインスタンス
 */
function extractRules(room) {
  return {
    gameMode: room.gameMode,
    initialScore: room.initialScore,
    wallTiles: room.wallTiles,
    useRedDora: room.useRedDora || false,
    notenPenalty: room.notenPenalty || false,
    riichiDepositRequired: room.riichiDepositRequired !== false,
    aotenjou: room.aotenjou || false,
    kiriagemangan: room.kiriagemangan !== false,
    ronMultiplier: room.ronMultiplier || 1,
    dealerSelection: room.dealerSelection || 'random',
    transparentHand: room.transparentHand || false,
  };
}

/**
 * roundHistoryの1件をログ用に整形する
 * @param {object} roundEntry - room.roundHistoryの要素
 * @param {Map} playersMap    - room.players (userId -> player)
 */
function formatRound(roundEntry, playersMap) {
  const { roundName, winner, winType, scoreResult, scores, previousScores, isDraw, notenPenalty } = roundEntry;

  // userId -> playerName のマップを構築
  const nameOf = {};
  playersMap.forEach((player, uid) => {
    nameOf[uid] = player.playerName;
  });

  // スコア変動を計算（プレイヤー名をキーにする）
  const scoreChanges = {};
  const playerScores = {};
  for (const uid of Object.keys(scores || {})) {
    const name = nameOf[uid] || uid;
    const prev = (previousScores || {})[uid] ?? 0;
    const curr = (scores || {})[uid] ?? 0;
    scoreChanges[name] = curr - prev;
    playerScores[name] = curr;
  }

  // 和了手情報（流局時はnull）
  let hand = null;
  if (!isDraw && scoreResult && scoreResult.valid !== false) {
    hand = {
      yaku: (scoreResult.yaku || []).map(y => ({
        name: y.name,
        han: y.han,
        isYakuman: y.isYakuman || false,
      })),
      han: scoreResult.han ?? null,
      fu: scoreResult.fu ?? null,
      scoreType: scoreResult.scoreType || null,
    };
  }

  // ノーテン罰符（流局かつnotenPenalty適用時）
  let notenPenaltyLog = null;
  if (notenPenalty) {
    notenPenaltyLog = {
      amount: notenPenalty.amount,
      tenpaiPlayer: nameOf[notenPenalty.tenpaiPlayer] || notenPenalty.tenpaiPlayer,
      notenPlayer: nameOf[notenPenalty.notenPlayer] || notenPenalty.notenPlayer,
    };
  }

  return {
    roundName: roundName || null,
    winner: winner ? (nameOf[winner] || winner) : null,
    winType: winType || (isDraw ? '流局' : null),
    isDraw: isDraw || false,
    scoreChanges,
    scores: playerScores,
    hand,
    notenPenalty: notenPenaltyLog,
  };
}

/**
 * 対戦ログを組み立てて月別JSOLファイルに追記する
 *
 * @param {object}              room                 - GameRoomインスタンス
 * @param {string}              battleId             - 生成済み対戦ID
 * @param {string}              startTime            - ゲーム開始時刻 (ISO string)
 * @param {Map<string,string>}  playerIPs            - userId -> IPアドレス
 * @param {Map<string,string>}  playerFingerprints   - userId -> デバイスフィンガープリント (32桁hex)
 * @returns {object|null} 保存した対戦ログオブジェクト（失敗時はnull）
 */
function saveBattleLog(room, battleId, startTime, playerIPs = new Map(), playerFingerprints = new Map()) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // 参加者情報（CPU除く）
    const players = [];
    room.players.forEach((player, uid) => {
      if (!player.isCPU) {
        players.push({
          userId: uid,
          playerName: player.playerName,
          ip: playerIPs.get(uid) || null,
          fingerprint: playerFingerprints.get(uid) || null,
        });
      }
    });

    // 最終スコア（プレイヤー名をキー）
    const finalScores = {};
    room.players.forEach((player) => {
      finalScores[player.playerName] = player.score;
    });

    // 局ごとの結果
    const rounds = (room.roundHistory || []).map(r => formatRound(r, room.players));

    const battleLog = {
      battleId,
      roomId: room.roomId,
      startTime,
      endTime: new Date().toISOString(),
      players,
      rules: extractRules(room),
      rounds,
      finalScores,
    };

    const filePath = getLogFilePath();
    fs.appendFileSync(filePath, JSON.stringify(battleLog) + '\n', 'utf8');
    console.log(`📊 Battle log saved: ${battleId} → ${path.basename(filePath)}`);
    return battleLog;
  } catch (err) {
    console.error('❌ Failed to save battle log:', err.message);
    return null;
  }
}

/**
 * IPデータベースファイルのパス
 * battle-logs/ip-database.json
 */
const IP_DB_FILE = path.join(LOG_DIR, 'ip-database.json');

/**
 * IPデータベースを更新する
 * IPをキーに、そこから使われた名前・fingerprintを配列で蓄積する
 *
 * @param {string} ip          - プレイヤーのIPアドレス
 * @param {string} playerName  - プレイヤー名
 * @param {string|null} fingerprint - デバイスフィンガープリント (32桁hex) or null
 */
function updateIPDatabase(ip, playerName, fingerprint = null) {
  if (!ip || ip === 'unknown') return;

  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    let db = {};
    if (fs.existsSync(IP_DB_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(IP_DB_FILE, 'utf8'));
      } catch (_) {
        db = {};
      }
    }

    if (!db[ip]) {
      db[ip] = { names: [], fingerprints: [], firstSeen: new Date().toISOString(), lastSeen: null };
    }

    const entry = db[ip];
    entry.lastSeen = new Date().toISOString();

    if (playerName && !entry.names.includes(playerName)) {
      entry.names.push(playerName);
    }

    if (fingerprint && typeof fingerprint === 'string' && /^[0-9a-f]{32}$/i.test(fingerprint)) {
      if (!entry.fingerprints.includes(fingerprint)) {
        entry.fingerprints.push(fingerprint);
      }
    }

    fs.writeFileSync(IP_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Failed to update IP database:', err.message);
  }
}

/**
 * 月別ログファイルを読み込み、全対戦ログの配列を返す
 * @param {number} year
 * @param {number} month - 1〜12
 * @returns {object[]}
 */
function readBattleLogs(year, month) {
  const date = new Date(year, month - 1, 1);
  const filePath = getLogFilePath(date);
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (err) {
    console.error('❌ Failed to read battle logs:', err.message);
    return [];
  }
}

/**
 * ログが存在する月のリストを新しい順で返す (例: ["2026-03", "2026-02"])
 * @returns {string[]}
 */
function listAvailableMonths() {
  if (!fs.existsSync(LOG_DIR)) return [];
  try {
    return fs.readdirSync(LOG_DIR)
      .filter(f => /^battle-logs-\d{4}-\d{2}\.jsonl$/.test(f))
      .map(f => f.replace('battle-logs-', '').replace('.jsonl', ''))
      .sort()
      .reverse();
  } catch (err) {
    return [];
  }
}

module.exports = {
  generateBattleId,
  saveBattleLog,
  readBattleLogs,
  listAvailableMonths,
  updateIPDatabase,
};

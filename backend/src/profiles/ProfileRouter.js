/**
 * プロフィール名簿（自己紹介）の登録・管理 REST API
 *
 * エンドポイント一覧:
 *   GET    /api/profiles          - 一覧取得（簡易情報）
 *   GET    /api/profiles/:id      - 詳細取得
 *   POST   /api/profiles          - 新規登録
 *   PUT    /api/profiles/:id      - 編集（パスワード認証）
 *   DELETE /api/profiles/:id      - 削除（パスワード認証）
 *   DELETE /api/profiles/admin/:id - 削除（管理者認証）
 *   POST   /api/profiles/:id/change-password - パスワード変更
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ─── ファイルパス ────────────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), 'profiles.json');

// ─── ユーティリティ ──────────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'mj-profile-salt').digest('hex');
}

function loadProfiles() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(profiles, null, 2), 'utf8');
}

/** パスワード認証を行い、一致すれば true を返す */
function verifyPassword(profile, password) {
  return profile.passwordHash === hashPassword(password);
}

/** 公開用の簡易プロフィール（パスワードハッシュを除外） */
function toPublicSummary(profile) {
  const { passwordHash, activeHours, bio2, ...summary } = profile;
  return { ...summary, aliases: profile.aliases || [], trip: profile.trip || '' };
}

/** 公開用の詳細プロフィール（パスワードハッシュを除外） */
function toPublicDetail(profile) {
  const { passwordHash, ...rest } = profile;
  return rest;
}

// ─── バリデーション ──────────────────────────────────────────────────────────
const MAX_NAME_LEN     = 30;
const MAX_CATCH_LEN    = 80;
const MAX_BIO_LEN      = 500;
const MAX_TWITTER_LEN  = 50;
const MAX_DISCORD_LEN  = 100;
const MAX_FAVORITE_LEN = 100;
const MIN_PASS_LEN     = 4;
const MAX_PASS_LEN     = 64;
const MAX_TRIP_LEN     = 16;

function validateProfileFields(body, requirePassword = true) {
  const errors = [];

  const name = (body.name || '').trim();
  if (!name) errors.push('名前は必須です');
  else if (name.length > MAX_NAME_LEN) errors.push(`名前は${MAX_NAME_LEN}文字以内にしてください`);

  // trip バリデーション
  const trip = (body.trip || '').trim();
  if (trip.length > 0) {
    if (!trip.startsWith('◆')) errors.push('トリップは「◆」で始まる必要があります');
    else if (trip.length > MAX_TRIP_LEN) errors.push(`トリップは${MAX_TRIP_LEN}文字以内にしてください`);
  }

  // aliases バリデーション
  if (body.aliases !== undefined) {
    if (!Array.isArray(body.aliases)) {
      errors.push('aliasesは配列で指定してください');
    } else {
      const VALID_GENDERS = ['male', 'female', 'other', ''];
      body.aliases.forEach((a, i) => {
        const aName = (a.name || '').trim();
        if (!aName) errors.push(`aliases[${i}].name は必須です`);
        else if (aName.length > MAX_NAME_LEN) errors.push(`aliases[${i}].name は${MAX_NAME_LEN}文字以内にしてください`);
        const aOrigin = (a.origin || '').trim();
        if (aOrigin.length > 50) errors.push(`aliases[${i}].origin は50文字以内にしてください`);
        const aGender = a.gender || '';
        if (!VALID_GENDERS.includes(aGender)) errors.push(`aliases[${i}].gender の値が不正です`);
      });
    }
  }

  if (requirePassword) {
    const password = body.password || '';
    if (!password) errors.push('パスワードは必須です');
    else if (password.length < MIN_PASS_LEN) errors.push(`パスワードは${MIN_PASS_LEN}文字以上にしてください`);
    else if (password.length > MAX_PASS_LEN) errors.push(`パスワードは${MAX_PASS_LEN}文字以内にしてください`);
  }

  const catchphrase = (body.catchphrase || '').trim();
  if (catchphrase.length > MAX_CATCH_LEN) errors.push(`キャッチフレーズは${MAX_CATCH_LEN}文字以内にしてください`);

  const bio = (body.bio || '').trim();
  if (bio.length > MAX_BIO_LEN) errors.push(`自己紹介は${MAX_BIO_LEN}文字以内にしてください`);

  const twitter = (body.twitter || '').trim();
  if (twitter.length > MAX_TWITTER_LEN) errors.push(`X(Twitter)IDは${MAX_TWITTER_LEN}文字以内にしてください`);

  const discord = (body.discord || '').trim();
  if (discord.length > MAX_DISCORD_LEN) errors.push(`Discord IDは${MAX_DISCORD_LEN}文字以内にしてください`);

  const favoriteHand = (body.favoriteHand || '').trim();
  if (favoriteHand.length > MAX_FAVORITE_LEN) errors.push(`好きな役は${MAX_FAVORITE_LEN}文字以内にしてください`);

  return errors;
}

// ─── IP レートリミット ────────────────────────────────────────────────────────
const REGISTER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24時間
const _registeredIps = new Map(); // ip -> timestamp

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/** まだ登録できない場合は残りミリ秒を返す。登録可能なら null を返す */
function getRegisterCooldownRemaining(ip) {
  const last = _registeredIps.get(ip);
  if (!last) return null;
  const remaining = last + REGISTER_COOLDOWN_MS - Date.now();
  return remaining > 0 ? remaining : null;
}

function markRegistered(ip) {
  _registeredIps.set(ip, Date.now());
}

// ─── エンドポイント ──────────────────────────────────────────────────────────

/**
 * GET /api/profiles
 * 登録者一覧（簡易情報）を返す。bio・passwordHash は含まない。
 */
router.get('/', (req, res) => {
  const profiles = loadProfiles();
  res.json(profiles.map(toPublicSummary));
});

/**
 * GET /api/profiles/:id
 * 指定IDのプロフィール詳細（passwordHash を除く）を返す。
 */
router.get('/:id', (req, res) => {
  const profiles = loadProfiles();
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'プロフィールが見つかりません' });
  res.json(toPublicDetail(profile));
});

/**
 * POST /api/profiles
 * 新規登録。
 * Body: { name, password, catchphrase?, bio?, twitter?, discord?, favoriteHand? }
 */
router.post('/', (req, res) => {
  const errors = validateProfileFields(req.body, true);
  if (errors.length > 0) return res.status(400).json({ errors });

  const profiles = loadProfiles();

  // 同名チェック
  const name = req.body.name.trim();
  if (profiles.some(p => p.name === name)) {
    return res.status(409).json({ error: `「${name}」という名前はすでに登録されています` });
  }

  // IP レートリミットチェック
  const ip = getClientIp(req);
  const remaining = getRegisterCooldownRemaining(ip);
  if (remaining !== null) {
    const hours   = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const timeStr = hours > 0 ? `約${hours}時間${minutes}分` : `約${minutes}分`;
    return res.status(429).json({
      error: `同じIPからの登録は24時間に1回までです。次の登録まで${timeStr}お待ちください。`,
    });
  }

  const rawAliases = Array.isArray(req.body.aliases) ? req.body.aliases : [];
  const cleanAliases = rawAliases.map(a => ({
    name:   (a.name   || '').trim(),
    origin: (a.origin || '').trim(),
    gender: (a.gender || ''),
  })).filter(a => a.name);

  const now = new Date().toISOString();
  const newProfile = {
    id:          uuidv4(),
    name,
    gender:      (req.body.gender      || ''),
    origin:      (req.body.origin      || '').trim(),
    bio:         (req.body.bio         || '').trim(),
    activeHours: (req.body.activeHours || '').trim(),
    bio2:        (req.body.bio2        || '').trim(),
    aliases:     cleanAliases,
    trip:        (req.body.trip        || '').trim(),
    passwordHash: hashPassword(req.body.password),
    createdAt:   now,
    updatedAt:   now,
  };

  profiles.push(newProfile);
  saveProfiles(profiles);
  markRegistered(ip);
  console.log(`📋 [profiles] New profile registered: ${name} (ip: ${ip})`);
  res.status(201).json(toPublicDetail(newProfile));
});

/**
 * PUT /api/profiles/:id
 * 編集。パスワード認証が必要。
 * Body: { password, name?, catchphrase?, bio?, twitter?, discord?, favoriteHand? }
 */
router.put('/:id', (req, res) => {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'プロフィールが見つかりません' });

  const profile = profiles[idx];

  // パスワード認証
  if (!req.body.password || !verifyPassword(profile, req.body.password)) {
    return res.status(403).json({ error: 'パスワードが正しくありません' });
  }

  // バリデーション（パスワード入力自体は editモードでは必須だが長さ検証は不要）
  const errors = validateProfileFields({ ...req.body, password: req.body.password }, false);
  if (errors.length > 0) return res.status(400).json({ errors });

  // 名前変更時の重複チェック
  const newName = (req.body.name || profile.name).trim();
  if (newName !== profile.name && profiles.some((p, i) => i !== idx && p.name === newName)) {
    return res.status(409).json({ error: `「${newName}」という名前はすでに登録されています` });
  }

  let updatedAliases = profile.aliases || [];
  if (Array.isArray(req.body.aliases)) {
    updatedAliases = req.body.aliases
      .map(a => ({ name: (a.name || '').trim(), origin: (a.origin || '').trim(), gender: (a.gender || '') }))
      .filter(a => a.name);
  }

  const updated = {
    ...profile,
    name:        newName,
    gender:      req.body.gender      !== undefined ? (req.body.gender      || '')        : profile.gender,
    origin:      req.body.origin      !== undefined ? (req.body.origin      || '').trim() : profile.origin,
    bio:         req.body.bio         !== undefined ? (req.body.bio         || '').trim() : profile.bio,
    activeHours: req.body.activeHours !== undefined ? (req.body.activeHours || '').trim() : profile.activeHours,
    bio2:        req.body.bio2        !== undefined ? (req.body.bio2        || '').trim() : profile.bio2,
    aliases:     updatedAliases,
    trip:        req.body.trip !== undefined ? (req.body.trip || '').trim() : (profile.trip || ''),
    updatedAt:   new Date().toISOString(),
  };

  profiles[idx] = updated;
  saveProfiles(profiles);
  console.log(`📋 [profiles] Profile updated: ${updated.name}`);
  res.json(toPublicDetail(updated));
});

/**
 * DELETE /api/profiles/:id
 * 削除。パスワード認証が必要。
 * Body: { password }
 */
router.delete('/:id', (req, res) => {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'プロフィールが見つかりません' });

  const profile = profiles[idx];
  if (!req.body.password || !verifyPassword(profile, req.body.password)) {
    return res.status(403).json({ error: 'パスワードが正しくありません' });
  }

  profiles.splice(idx, 1);
  saveProfiles(profiles);
  console.log(`📋 [profiles] Profile deleted: ${profile.name}`);
  res.json({ success: true });
});

/**
 * POST /api/profiles/:id/verify-password
 * パスワード検証のみ（変更なし）。
 * Body: { password }
 */
router.post('/:id/verify-password', (req, res) => {
  const profiles = loadProfiles();
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'プロフィールが見つかりません' });

  const { password } = req.body || {};
  if (!password || !verifyPassword(profile, password)) {
    return res.status(403).json({ error: 'パスワードが正しくありません' });
  }
  res.json({ ok: true });
});

/**
 * POST /api/profiles/:id/change-password
 * パスワード変更。現在のパスワードと新しいパスワードが必要。
 * Body: { currentPassword, newPassword }
 */
router.post('/:id/change-password', (req, res) => {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'プロフィールが見つかりません' });

  const profile = profiles[idx];
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !verifyPassword(profile, currentPassword)) {
    return res.status(403).json({ error: '現在のパスワードが正しくありません' });
  }
  if (!newPassword || newPassword.length < MIN_PASS_LEN) {
    return res.status(400).json({ error: `新しいパスワードは${MIN_PASS_LEN}文字以上にしてください` });
  }
  if (newPassword.length > MAX_PASS_LEN) {
    return res.status(400).json({ error: `パスワードは${MAX_PASS_LEN}文字以内にしてください` });
  }

  profiles[idx] = {
    ...profile,
    passwordHash: hashPassword(newPassword),
    updatedAt:    new Date().toISOString(),
  };
  saveProfiles(profiles);
  console.log(`📋 [profiles] Password changed: ${profile.name}`);
  res.json({ success: true });
});

module.exports = router;

/**
 * 外部から adminSessions を注入するための初期化関数。
 * server.js で setAdminSessionsRef(adminSessions) を呼び出すこと。
 */
let _adminSessions = null;
let _adminSessionTtlMs = 8 * 60 * 60 * 1000;

module.exports.setAdminSessionsRef = function (sessionsMap, ttlMs) {
  _adminSessions = sessionsMap;
  if (ttlMs) _adminSessionTtlMs = ttlMs;
};

function isValidAdminSession(token) {
  if (!_adminSessions || !token) return false;
  const session = _adminSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > _adminSessionTtlMs) {
    _adminSessions.delete(token);
    return false;
  }
  return true;
}

/**
 * DELETE /api/profiles/admin/:id
 * 管理者セッションで自由に削除。
 * Authorization: Bearer <token>
 */
router.delete('/admin/:id', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!isValidAdminSession(token)) {
    return res.status(401).json({ error: '管理者認証が必要です' });
  }

  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'プロフィールが見つかりません' });

  const [removed] = profiles.splice(idx, 1);
  saveProfiles(profiles);
  console.log(`📋 [profiles] Admin deleted profile: ${removed.name}`);
  res.json({ success: true });
});

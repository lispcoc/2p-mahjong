'use client'

/**
 * プロフィール関連の共通コンポーネント・ユーティリティ
 * page.tsx / [id]/page.tsx の両方から使用する
 */

import React, { useState, useEffect } from 'react'
import { ProfileDetail, ProfileFormData, AliasEntry } from '../../types/ProfileTypes'

// ── 定数 ─────────────────────────────────────────────────────────────────────

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'

export const GENDER_LABEL: Record<string, string> = { male: '♂', female: '♀', other: '♂♀' }

// ── API ヘルパー ─────────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || (data.errors as string[] | undefined)?.join(', ') || `HTTP ${res.status}`)
  return data
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || (data.errors as string[] | undefined)?.join(', ') || `HTTP ${res.status}`)
  return data
}

export async function apiDelete(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
}

// ── パスワードセッション ──────────────────────────────────────────────────────

// 365日。重要データではないので展開はできるだけ長く設定
const PW_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000
const PW_SESSION_KEY_PREFIX = 'profile_pw_'

interface PwSession { password: string; expiresAt: number }

export function savePwSession(profileId: string, password: string) {
  try {
    const data: PwSession = { password, expiresAt: Date.now() + PW_SESSION_TTL_MS }
    localStorage.setItem(PW_SESSION_KEY_PREFIX + profileId, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function loadPwSession(profileId: string): string | null {
  try {
    const raw = localStorage.getItem(PW_SESSION_KEY_PREFIX + profileId)
    if (!raw) return null
    const data: PwSession = JSON.parse(raw)
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(PW_SESSION_KEY_PREFIX + profileId)
      return null
    }
    return data.password
  } catch { return null }
}

export function clearPwSession(profileId: string) {
  try { localStorage.removeItem(PW_SESSION_KEY_PREFIX + profileId) } catch { /* ignore */ }
}

// ── ユーティリティ ────────────────────────────────────────────────────────────

export const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('ja-JP') } catch { return iso }
}

/** 改行を <br> に変換して描画するヘルパー。maxLines を指定すると超過行を「…」で省略 */
export function Nl2br({ text, className, maxLines }: { text: string; className?: string; maxLines?: number }) {
  const lines = text.split('\n')
  const truncated = maxLines !== undefined && lines.length > maxLines
  const visible = truncated ? lines.slice(0, maxLines) : lines
  return (
    <span className={className}>
      {visible.map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < visible.length - 1 && <br />}
        </React.Fragment>
      ))}
      {truncated && '…'}
    </span>
  )
}

// ── フォームフィールド ────────────────────────────────────────────────────────

/** フォームの入力フィールド */
export function Field({
  label, name, value, onChange, type = 'text', placeholder = '', maxLength, required = false, textarea = false
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  type?: string; placeholder?: string; maxLength?: number; required?: boolean; textarea?: boolean
}) {
  const base = 'w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm'
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name} value={value} onChange={onChange}
          placeholder={placeholder} maxLength={maxLength} rows={4}
          className={base + ' resize-y'}
        />
      ) : (
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} maxLength={maxLength}
          className={base}
        />
      )}
      {maxLength && (
        <p className="text-right text-xs text-gray-400 mt-0.5">{value.length} / {maxLength}</p>
      )}
    </div>
  )
}

// ── URL コピーボタン ──────────────────────────────────────────────────────────

export function CopyUrlButton({ profileId }: { profileId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/profiles/${profileId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded border border-gray-300 transition-colors whitespace-nowrap"
      title="このページのURLをコピー"
    >
      {copied ? '✅ コピーしました' : '🔗 URLコピー'}
    </button>
  )
}

// ── 登録・編集フォーム ────────────────────────────────────────────────────────

/** 登録・編集フォーム */
export function ProfileForm({
  initial, onSubmit, onCancel, submitLabel, isEdit = false, savedPassword
}: {
  initial?: Partial<ProfileFormData>
  onSubmit: (data: ProfileFormData & { currentPassword?: string }) => Promise<void>
  onCancel: () => void
  submitLabel: string
  isEdit?: boolean
  /** 認証済みパスワード（あればパスワード欄を非表示にし自動送信） */
  savedPassword?: string
}) {
  const [form, setForm] = useState<ProfileFormData>({
    name:        initial?.name        || '',
    password:    '',
    gender:      initial?.gender      || 'female',
    origin:      initial?.origin      || '',
    bio:         initial?.bio         || '',
    activeHours: initial?.activeHours || '',
    bio2:        initial?.bio2        || '',
    aliases:     initial?.aliases     || [],
    trip:        initial?.trip        || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAliasChange = (idx: number, field: keyof AliasEntry, value: string) => {
    setForm(prev => {
      const next = [...prev.aliases]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, aliases: next }
    })
  }

  const addAlias = () => {
    setForm(prev => ({ ...prev, aliases: [...prev.aliases, { name: '', origin: '', gender: '' }] }))
  }

  const removeAlias = (idx: number) => {
    setForm(prev => ({ ...prev, aliases: prev.aliases.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit({ ...form, password: savedPassword ?? form.password })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm mb-2">{error}</div>
      )}

      {/* 名前・出身のセット（メイン） */}
      <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 mb-2">メイン キャラクター</p>
        <Field label="名前" name="name" value={form.name} onChange={handleChange} required maxLength={30} placeholder="表示名（30文字以内）" />
        <Field label="出身(作品)" name="origin" value={form.origin} onChange={handleChange} maxLength={50} placeholder="" />
        <div className="mb-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
          <select
            name="gender" value={form.gender}
            onChange={handleChange}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          >
            <option value="female">♀</option>
            <option value="male">♂</option>
            <option value="other">♂♀</option>
          </select>
        </div>
      </div>

      {/* aliases（追加キャラ） */}
      {form.aliases.map((alias, idx) => (
        <div key={idx} className="border border-green-200 rounded-lg p-3 mb-2 bg-green-50 relative">
          <p className="text-xs font-semibold text-green-700 mb-2">キャラクター {idx + 2}</p>
          <button
            type="button"
            onClick={() => removeAlias(idx)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg leading-none font-bold"
            title="削除"
          >×</button>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">名前<span className="text-red-500 ml-1">*</span></label>
            <input
              type="text" value={alias.name} maxLength={30} required
              onChange={e => handleAliasChange(idx, 'name', e.target.value)}
              placeholder="表示名（30文字以内）"
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <p className="text-right text-xs text-gray-400 mt-0.5">{alias.name.length} / 30</p>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">出身(作品)</label>
            <input
              type="text" value={alias.origin} maxLength={50}
              onChange={e => handleAliasChange(idx, 'origin', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <p className="text-right text-xs text-gray-400 mt-0.5">{alias.origin.length} / 50</p>
          </div>
          <div className="mb-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
            <select
              value={alias.gender}
              onChange={e => handleAliasChange(idx, 'gender', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="">―</option>
              <option value="female">♀</option>
              <option value="male">♂</option>
              <option value="other">♂♀</option>
            </select>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addAlias}
        className="w-full border border-dashed border-green-400 text-green-700 hover:bg-green-50 rounded py-1.5 text-sm font-medium mb-2"
      >
        ＋ キャラクターを追加
      </button>

      {!savedPassword && (
        <Field
          label={isEdit ? 'パスワード（認証用）' : 'パスワード'}
          name="password" type="password" value={form.password} onChange={handleChange}
          required maxLength={64}
          placeholder={isEdit ? '変更・削除時に必要なパスワード' : '編集・削除に使うパスワード（4文字以上）'}
        />
      )}
      {savedPassword && isEdit && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5 mb-1">
          ✅ 認証済み（パスワード入力不要）
        </p>
      )}
      <Field label="トリップ" name="trip" value={form.trip} onChange={handleChange} maxLength={16} placeholder="◆XXXXXXXXXX（先頭は◆固定・16文字以内）" />
      <Field label="自己紹介" name="bio" value={form.bio} onChange={handleChange} maxLength={500} placeholder="好きなプレイ、NGなど（任意）" textarea />
      <Field label="活動時間" name="activeHours" value={form.activeHours} onChange={handleChange} maxLength={500} placeholder="主に遅い時間帯、平日は夜など（任意）" textarea />
      <Field label="その他" name="bio2" value={form.bio2} onChange={handleChange} maxLength={500} placeholder="その他アピールしたいこと（任意）" textarea />
      <div className="flex gap-2 pt-2">
        <button
          type="submit" disabled={loading}
          className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50"
        >
          {loading ? '送信中…' : submitLabel}
        </button>
        <button
          type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded text-sm"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}

// ── パスワード変更フォーム ────────────────────────────────────────────────────

export function ChangePasswordForm({ profileId, onDone, onCancel }: { profileId: string; onDone: () => void; onCancel: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiPost(`/api/profiles/${profileId}/change-password`, { currentPassword: current, newPassword: next })
      setSuccess(true)
      setTimeout(onDone, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '変更に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (success) return <p className="text-green-700 text-sm font-bold py-2">✅ パスワードを変更しました</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（4文字以上）</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50">
          {loading ? '変更中…' : 'パスワードを変更'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded text-sm">
          キャンセル
        </button>
      </div>
    </form>
  )
}

// ── 削除確認フォーム ──────────────────────────────────────────────────────────

export function DeleteForm({ profile, onDeleted, onCancel, savedPassword }: {
  profile: ProfileDetail
  onDeleted: () => void
  onCancel: () => void
  savedPassword?: string
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiDelete(`/api/profiles/${profile.id}`, { password: savedPassword ?? password })
      onDeleted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-red-700 text-sm">「{profile.name}」のプロフィールを削除します。この操作は取り消せません。</p>
      {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
      {savedPassword ? (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
          ✅ 認証済み（パスワード入力不要）
        </p>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50">
          {loading ? '削除中…' : '削除する'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded text-sm">
          キャンセル
        </button>
      </div>
    </form>
  )
}

// ── パスワード検証フォーム ────────────────────────────────────────────────────

export function VerifyPasswordForm({
  profileId, profileName, onVerified, onCancel
}: {
  profileId: string
  profileName: string
  onVerified: (password: string) => void
  onCancel: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiPost(`/api/profiles/${profileId}/verify-password`, { password })
      onVerified(password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-gray-700">
        「{profileName}」の編集・削除にはパスワードが必要です。
      </p>
      <p className="text-xs text-gray-400">認証後はこのブラウザで1年間パスワード不要になります。</p>
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          required autoFocus
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50">
          {loading ? '確認中…' : '認証する'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded text-sm">
          キャンセル
        </button>
      </div>
    </form>
  )
}

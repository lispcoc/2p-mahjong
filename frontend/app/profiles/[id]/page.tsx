'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ProfileDetail, ProfileFormData, AliasEntry, Gender } from '../../../types/ProfileTypes'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || `HTTP ${res.status}`)
  return data
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || `HTTP ${res.status}`)
  return data
}

async function apiDelete(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
}

// ── ユーティリティ ───────────────────────────────────────────────────────────

const genderLabel = (g: string) => ({ male: '♂', female: '♀', other: '♂♀' }[g] || '')

const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('ja-JP') } catch { return iso }
}

// ── パスワードセッション・ローカルストレージ ─────────────────────────────────

const PW_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000
const PW_SESSION_KEY_PREFIX = 'profile_pw_'

interface PwSession { password: string; expiresAt: number }

function savePwSession(profileId: string, password: string) {
  try {
    const data: PwSession = { password, expiresAt: Date.now() + PW_SESSION_TTL_MS }
    localStorage.setItem(PW_SESSION_KEY_PREFIX + profileId, JSON.stringify(data))
  } catch { /* ignore */ }
}

function loadPwSession(profileId: string): string | null {
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

function clearPwSession(profileId: string) {
  try { localStorage.removeItem(PW_SESSION_KEY_PREFIX + profileId) } catch { /* ignore */ }
}

// ── フォームフィールド ────────────────────────────────────────────────────────

function Field({
  label, name, value, onChange, type = 'text', placeholder = '', maxLength, required = false, textarea = false
}: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  type?: string; placeholder?: string; maxLength?: number; required?: boolean; textarea?: boolean
}) {
  const base = 'w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm'
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} rows={4}
          className={base + ' resize-y'} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
          className={base} />
      )}
      {maxLength && <p className="text-right text-xs text-gray-400 mt-0.5">{value.length} / {maxLength}</p>}
    </div>
  )
}

// ── 編集フォーム ─────────────────────────────────────────────────────────────

function EditForm({
  profile, onSaved, onCancel, savedPassword
}: {
  profile: ProfileDetail
  onSaved: (updated: ProfileDetail) => void
  onCancel: () => void
  savedPassword?: string
}) {
  const [form, setForm] = useState<ProfileFormData>({
    name: profile.name, password: '',
    gender: profile.gender, origin: profile.origin,
    bio: profile.bio, activeHours: profile.activeHours, bio2: profile.bio2,
    aliases: profile.aliases || [],
    trip: profile.trip || '',
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
      const updated = await apiPut<ProfileDetail>(`/api/profiles/${profile.id}`, {
        ...form,
        password: savedPassword ?? form.password,
      })
      onSaved(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm mb-2">{error}</div>}

      {/* 名前・出身のセット（メイン） */}
      <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 mb-2">メイン キャラクター</p>
        <Field label="名前" name="name" value={form.name} onChange={handleChange} required maxLength={30} />
        <Field label="出身" name="origin" value={form.origin} onChange={handleChange} maxLength={50} />
        <div className="mb-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
          <select name="gender" value={form.gender} onChange={handleChange}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
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
        <Field label="パスワード（認証用）" name="password" type="password" value={form.password} onChange={handleChange} required maxLength={64} placeholder="変更・削除時に必要なパスワード" />
      )}
      {savedPassword && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5 mb-1">
          ✅ 認証済み（パスワード入力不要）
        </p>
      )}
      <Field label="トリップ" name="trip" value={form.trip} onChange={handleChange} maxLength={16} placeholder="◆XXXXXXXXXX（先頭は◆固定・16文字以内）" />
      <Field label="自己紹介" name="bio" value={form.bio} onChange={handleChange} maxLength={500} textarea />
      <Field label="活動時間" name="activeHours" value={form.activeHours} onChange={handleChange} maxLength={500} textarea />
      <Field label="その他" name="bio2" value={form.bio2} onChange={handleChange} maxLength={500} textarea />
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading}
          className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50">
          {loading ? '保存中…' : '変更を保存'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded text-sm">
          キャンセル
        </button>
      </div>
    </form>
  )
}

// ── パスワード変更フォーム ────────────────────────────────────────────────────

function ChangePasswordForm({ profileId, onDone, onCancel }: { profileId: string; onDone: () => void; onCancel: () => void }) {
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
      const res = await fetch(`${BACKEND_URL}/api/profiles/${profileId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '変更に失敗しました')
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

// ── 削除フォーム ─────────────────────────────────────────────────────────────

function DeleteForm({ profile, onDeleted, onCancel, savedPassword }: {
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

function VerifyPasswordForm({
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
      <p className="text-sm text-gray-700">「{profileName}」の編集・削除にはパスワードが必要です。</p>
      <p className="text-xs text-gray-400">認証後はこのブラウザで1年間パスワード不要になります。</p>
      {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          required autoFocus
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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

// ── URL コピーボタン ──────────────────────────────────────────────────────────

function CopyUrlButton({ profileId }: { profileId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/profiles/${profileId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // フォールバック
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded border border-gray-300 transition-colors"
      title="このページのURLをコピー"
    >
      {copied ? '✅ コピーしました' : '🔗 URLをコピー'}
    </button>
  )
}

// ── メインページ ─────────────────────────────────────────────────────────────

export default function ProfileDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [profile, setProfile] = useState<ProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [mode, setMode] = useState<'view' | 'verifyPassword' | 'edit' | 'changePassword' | 'delete'>('view')
  const [successMsg, setSuccessMsg] = useState('')
  const [deleted, setDeleted] = useState(false)
  const [savedPw, setSavedPw] = useState<string | null>(null)
  const [pendingMode, setPendingMode] = useState<'edit' | 'delete'>('edit')

  useEffect(() => {
    if (!id) return
    apiGet<ProfileDetail>(`/api/profiles/${id}`)
      .then(p => {
        setProfile(p)
        setSavedPw(loadPwSession(p.id))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const goEdit = () => {
    if (savedPw) { setMode('edit'); return }
    setPendingMode('edit')
    setMode('verifyPassword')
  }

  const goDelete = () => {
    if (savedPw) { setMode('delete'); return }
    setPendingMode('delete')
    setMode('verifyPassword')
  }

  const handleVerified = (password: string) => {
    if (!profile) return
    savePwSession(profile.id, password)
    setSavedPw(password)
    setMode(pendingMode)
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        読み込み中…
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-500">
        <p className="text-4xl">🀄</p>
        <p className="font-bold">プロフィールが見つかりません</p>
        <Link href="/profiles" className="text-green-700 hover:underline text-sm">← 名簿一覧に戻る</Link>
      </div>
    )
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-500">
        <p className="text-4xl">🗑️</p>
        <p className="font-bold">プロフィールを削除しました</p>
        <Link href="/profiles" className="text-green-700 hover:underline text-sm">← 名簿一覧に戻る</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-green-800 text-white px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold">キャスト名簿</h1>
          <Link href="/profiles" className="text-green-300 hover:text-white text-sm hover:underline">
            ← 一覧に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {successMsg && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded px-4 py-2 mb-4 text-sm">
            ✅ {successMsg}
          </div>
        )}

        {mode === 'view' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            {/* 名前 + URLコピー */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-green-800">{profile.name}</h2>
                {profile.origin && <p className="text-sm text-gray-500">{profile.origin}</p>}
                {profile.trip && <p className="text-xs text-gray-400 font-mono mt-0.5">{profile.trip}</p>}
                {profile.aliases && profile.aliases.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {profile.aliases.map((a, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <span className="font-medium">{a.name}</span>
                        {a.gender && <span className="text-gray-500 ml-1">{genderLabel(a.gender)}</span>}
                        {a.origin && <span className="text-gray-500 ml-1">({a.origin})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <CopyUrlButton profileId={profile.id} />
            </div>

            {profile.bio && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">自己紹介</p>
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {profile.bio}
                </div>
              </div>
            )}

            {profile.activeHours && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">活動時間</p>
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {profile.activeHours}
                </div>
              </div>
            )}

            {profile.bio2 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">自己紹介２</p>
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {profile.bio2}
                </div>
              </div>
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mb-5">
              {profile.gender && (
                <>
                  <dt className="font-medium text-gray-500">性別</dt>
                  <dd className="text-gray-800">{genderLabel(profile.gender)}</dd>
                </>
              )}
              <dt className="font-medium text-gray-500">登録日</dt>
              <dd className="text-gray-500">{formatDate(profile.createdAt)}</dd>
            </dl>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              <button onClick={goEdit}
                className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold py-1.5 px-4 rounded">
                編集{savedPw ? '' : ' 🔒'}
              </button>
              <button onClick={() => setMode('changePassword')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1.5 px-4 rounded">
                パスワード変更
              </button>
              <button onClick={goDelete}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-4 rounded">
                削除{savedPw ? '' : ' 🔒'}
              </button>
              {savedPw && (
                <button
                  onClick={() => { if (!profile) return; clearPwSession(profile.id); setSavedPw(null) }}
                  className="text-xs text-gray-400 hover:text-gray-600 py-1.5 px-2 rounded border border-gray-200 hover:border-gray-400"
                  title="このブラウザの認証情報を削除"
                >
                  🔓 認証解除
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'verifyPassword' && profile && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">パスワードで認証</h2>
            <VerifyPasswordForm
              profileId={profile.id}
              profileName={profile.name}
              onVerified={handleVerified}
              onCancel={() => setMode('view')}
            />
          </div>
        )}

        {mode === 'edit' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">プロフィールを編集</h2>
            <EditForm
              profile={profile}
              onSaved={(updated) => { setProfile(updated); setMode('view'); showSuccess('プロフィールを更新しました') }}
              onCancel={() => setMode('view')}
              savedPassword={savedPw ?? undefined}
            />
          </div>
        )}

        {mode === 'changePassword' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">パスワードを変更</h2>
            <ChangePasswordForm
              profileId={profile.id}
              onDone={() => { setMode('view'); showSuccess('パスワードを変更しました') }}
              onCancel={() => setMode('view')}
            />
          </div>
        )}

        {mode === 'delete' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">プロフィールを削除</h2>
            <DeleteForm
              profile={profile}
              onDeleted={() => setDeleted(true)}
              onCancel={() => setMode('view')}
              savedPassword={savedPw ?? undefined}
            />
          </div>
        )}
      </main>
    </div>
  )
}

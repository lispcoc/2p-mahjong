'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ProfileDetail, ProfileFormData, Gender } from '../../../types/ProfileTypes'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
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
  profile, onSaved, onCancel
}: {
  profile: ProfileDetail
  onSaved: (updated: ProfileDetail) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ProfileFormData>({
    name: profile.name, password: '',
    gender: profile.gender, origin: profile.origin,
    bio: profile.bio, activeHours: profile.activeHours, bio2: profile.bio2,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const updated = await apiPut<ProfileDetail>(`/api/profiles/${profile.id}`, form)
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
      <Field label="名前" name="name" value={form.name} onChange={handleChange} required maxLength={30} />
      <Field label="パスワード（認証用）" name="password" type="password" value={form.password} onChange={handleChange} required maxLength={64} placeholder="変更・削除時に必要なパスワード" />
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
        <select name="gender" value={form.gender} onChange={handleChange}
          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm">
          <option value="female">♀</option>
          <option value="male">♂</option>
          <option value="other">♂♀</option>
        </select>
      </div>
      <Field label="出身" name="origin" value={form.origin} onChange={handleChange} maxLength={50} />
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

function DeleteForm({ profile, onDeleted, onCancel }: { profile: ProfileDetail; onDeleted: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiDelete(`/api/profiles/${profile.id}`, { password })
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
      </div>
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
  const [mode, setMode] = useState<'view' | 'edit' | 'changePassword' | 'delete'>('view')
  const [successMsg, setSuccessMsg] = useState('')
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    if (!id) return
    apiGet<ProfileDetail>(`/api/profiles/${id}`)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

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
              <h2 className="text-2xl font-bold text-green-800">{profile.name}</h2>
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
              {profile.origin && (
                <>
                  <dt className="font-medium text-gray-500">出身</dt>
                  <dd className="text-gray-800">{profile.origin}</dd>
                </>
              )}
              <dt className="font-medium text-gray-500">登録日</dt>
              <dd className="text-gray-500">{formatDate(profile.createdAt)}</dd>
            </dl>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setMode('edit')}
                className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold py-1.5 px-4 rounded">
                編集
              </button>
              <button onClick={() => setMode('changePassword')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1.5 px-4 rounded">
                パスワード変更
              </button>
              <button onClick={() => setMode('delete')}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-4 rounded">
                削除
              </button>
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">プロフィールを編集</h2>
            <EditForm
              profile={profile}
              onSaved={(updated) => { setProfile(updated); setMode('view'); showSuccess('プロフィールを更新しました') }}
              onCancel={() => setMode('view')}
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
            />
          </div>
        )}
      </main>
    </div>
  )
}

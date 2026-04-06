'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ProfileSummary, ProfileDetail, ProfileFormData } from '../../types/ProfileTypes'
import {
  BACKEND_URL, GENDER_LABEL,
  apiGet, apiPost, apiPut, apiDelete,
  savePwSession, loadPwSession, clearPwSession,
  Nl2br, Field, CopyUrlButton,
  ProfileForm, ChangePasswordForm, DeleteForm, VerifyPasswordForm,
} from '../../components/profiles/shared'

// ── 管理者 API ────────────────────────────────────────────────────────────────

async function apiAdminLogin(password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/mjadmin/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'ログインに失敗しました')
  return data.token as string
}

async function apiAdminDeleteProfile(id: string, token: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/profiles/admin/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
}

/** 管理者ログインフォーム */
function AdminLoginForm({ onLogin, onCancel }: { onLogin: (token: string) => void; onCancel: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await apiAdminLogin(password)
      onLogin(token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
      <p className="text-sm text-gray-600">管理者パスワードでログインすると、プロフィールを自由に削除できます。</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">管理者パスワード</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50">
          {loading ? 'ログイン中…' : '管理者ログイン'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded text-sm">
          キャンセル
        </button>
      </div>
    </form>
  )
}

// ── モーダル共通ラッパー ────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── 詳細パネル ───────────────────────────────────────────────────────────────

function DetailPanel({
  profile, onEdit, onDeleted, onClose, adminToken
}: {
  profile: ProfileDetail
  onEdit: (updated: ProfileDetail) => void
  onDeleted: () => void
  onClose: () => void
  adminToken: string | null
}) {
  type Mode = 'view' | 'verifyPassword' | 'edit' | 'delete' | 'changePassword'
  const [mode, setMode] = useState<Mode>('view')
  // LS から認証済みパスワードを復元
  const [savedPw, setSavedPw] = useState<string | null>(() => loadPwSession(profile.id))
  // verifyPassword 後の遷移先
  const [pendingMode, setPendingMode] = useState<'edit' | 'delete'>('edit')

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
    savePwSession(profile.id, password)
    setSavedPw(password)
    setMode(pendingMode)
  }

  const handleEdit = async (data: ProfileFormData & { currentPassword?: string }) => {
    const updated = await apiPut<ProfileDetail>(`/api/profiles/${profile.id}`, data)
    onEdit(updated)
    setMode('view')
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('ja-JP') } catch { return iso }
  }

  const genderLabel = (g: string) => ({ male: '♂', female: '♀', other: '♂♀' }[g] || '')

  return (
    <Modal title="プロフィール詳細" onClose={onClose}>
      {mode === 'view' && (
        <div>
          <div className="mb-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h3 className="text-2xl font-bold text-green-800">{profile.name}</h3>
                {profile.origin && <p className="text-sm text-gray-500">{profile.origin}</p>}
                {profile.trip && <p className="text-xs text-gray-400 font-mono mt-0.5">{profile.trip}</p>}
                {profile.aliases && profile.aliases.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {profile.aliases.map((a, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <span className="font-medium">{a.name}</span>
                        {a.gender && <span className="text-gray-500 ml-1">{GENDER_LABEL[a.gender]}</span>}
                        {a.origin && <span className="text-gray-500 ml-1">({a.origin})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <CopyUrlButton profileId={profile.id} />
                <Link
                  href={`/profiles/${profile.id}`}
                  className="text-xs text-green-700 hover:underline whitespace-nowrap"
                  target="_blank"
                >
                  個別ページ ↗
                </Link>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">自己紹介</p>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {profile.bio}
              </div>
            </div>
          )}

          {profile.activeHours && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">活動時間</p>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {profile.activeHours}
              </div>
            </div>
          )}

          {profile.bio2 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">その他</p>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {profile.bio2}
              </div>
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mb-4">
            {profile.gender && (
              <>
                <dt className="font-medium text-gray-500">性別</dt>
                <dd className="text-gray-800">{genderLabel(profile.gender)}</dd>
              </>
            )}
            <dt className="font-medium text-gray-500">登録日</dt>
            <dd className="text-gray-500">{formatDate(profile.createdAt)}</dd>
          </dl>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
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
                onClick={() => { clearPwSession(profile.id); setSavedPw(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 py-1.5 px-2 rounded border border-gray-200 hover:border-gray-400"
                title="このブラウザの認証情報を削除"
              >
                🔓 認証解除
              </button>
            )}
            {adminToken && (
              <button
                onClick={async () => {
                  if (!confirm(`「${profile.name}」を管理者権限で削除します。よろしいですか？`)) return
                  try {
                    await apiAdminDeleteProfile(profile.id, adminToken)
                    onDeleted()
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : '削除に失敗しました')
                  }
                }}
                className="bg-red-800 hover:bg-red-900 text-white text-xs font-bold py-1.5 px-4 rounded"
              >
                管理者削除
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'verifyPassword' && (
        <VerifyPasswordForm
          profileId={profile.id}
          profileName={profile.name}
          onVerified={handleVerified}
          onCancel={() => setMode('view')}
        />
      )}

      {mode === 'edit' && (
        <ProfileForm
          initial={profile}
          onSubmit={handleEdit}
          onCancel={() => setMode('view')}
          submitLabel="変更を保存"
          isEdit
          savedPassword={savedPw ?? undefined}
        />
      )}

      {mode === 'changePassword' && (
        <ChangePasswordForm
          profileId={profile.id}
          onDone={() => setMode('view')}
          onCancel={() => setMode('view')}
        />
      )}

      {mode === 'delete' && (
        <DeleteForm
          profile={profile}
          onDeleted={onDeleted}
          onCancel={() => setMode('view')}
          savedPassword={savedPw ?? undefined}
        />
      )}
    </Modal>
  )
}

// ── 表形式ビュー ────────────────────────────────────────────────────────────

type SortKey = 'name' | 'gender' | 'origin' | 'bio' | 'updatedAt'

function TableView({
  profiles,
  onRowClick,
}: {
  profiles: ProfileSummary[]
  onRowClick: (id: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(a => !a)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sorted = [...profiles].sort((a, b) => {
    let va: string = a[sortKey] ?? ''
    let vb: string = b[sortKey] ?? ''
    if (sortKey === 'updatedAt') {
      const diff = new Date(va).getTime() - new Date(vb).getTime()
      return sortAsc ? diff : -diff
    }
    if (sortKey === 'gender') {
      va = GENDER_LABEL[va] ?? va
      vb = GENDER_LABEL[vb] ?? vb
    }
    return sortAsc ? va.localeCompare(vb, 'ja') : vb.localeCompare(va, 'ja')
  })

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('ja-JP') } catch { return iso }
  }

  const th = (key: SortKey, label: string, extraClass = '') => {
    const active = sortKey === key
    return (
      <th
        key={key}
        onClick={() => handleSort(key)}
        className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 cursor-pointer select-none whitespace-nowrap hover:bg-gray-200 transition-colors ${extraClass}`}
      >
        {label}
        <span className="ml-1 text-gray-400">
          {active ? (sortAsc ? '▲' : '▼') : '⇅'}
        </span>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            {th('name', '名前', 'w-[100px] min-w-[40px] max-w-[120px]')}
            {th('bio', '自己紹介', 'w-auto')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((profile, idx) => (
            <tr
              key={profile.id}
              onClick={() => onRowClick(profile.id)}
              className={`cursor-pointer hover:bg-green-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <td className="px-2 py-2 border border-gray-200 font-medium text-gray-800 w-[100px] min-w-[40px] max-w-[120px] break-words">
                <div>
                  {profile.name} {GENDER_LABEL[profile.gender] ?? ''}
                </div>
                <div className='text-xs text-gray-500'>
                  ({profile.origin})
                </div>
                {profile.trip && (
                  <div className='text-xs text-gray-400 font-mono mt-0.5'>{profile.trip}</div>
                )}
                {profile.aliases && profile.aliases.length > 0 && profile.aliases.map((a, i) => (
                  <div key={i} className='text-xs text-gray-600'>
                    <p className='mt-1'>
                      {a.name}{a.gender && <span className='text-gray-400 ml-0.5'>{GENDER_LABEL[a.gender]}</span>}
                    </p>
                    <p>
                      {a.origin && <span className='text-gray-400'> ({a.origin})</span>}
                    </p>
                  </div>
                ))}
              </td>
              <td className="px-3 py-2 border border-gray-200 text-gray-600 max-w-[300px]">
                <span className="block">
                  {profile.bio ? <Nl2br text={profile.bio} maxLines={6} /> : ''}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── メインページコンポーネント ───────────────────────────────────────────────

const VIEW_MODE_KEY = 'profiles_view_mode'

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')

  // ローカルストレージから表示モードを復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY)
      if (saved === 'card' || saved === 'table') setViewMode(saved)
    } catch { /* ignore */ }
  }, [])

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === 'card' ? 'table' : 'card'
      try { localStorage.setItem(VIEW_MODE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }

  const fetchProfiles = useCallback(async () => {
    try {
      const data = await apiGet<ProfileSummary[]>('/api/profiles')
      setProfiles(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
      setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const handleCardClick = async (id: string) => {
    try {
      const detail = await apiGet<ProfileDetail>(`/api/profiles/${id}`)
      setSelectedProfile(detail)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    }
  }

  const handleRegister = async (data: ProfileFormData) => {
    const created = await apiPost<ProfileDetail>('/api/profiles', data)
    setProfiles(prev => [created, ...prev])
    setShowRegister(false)
    setSuccessMsg(`「${created.name}」を登録しました！`)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleEdit = (updated: ProfileDetail) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setSelectedProfile(updated)
    setSuccessMsg('プロフィールを更新しました')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleDeleted = () => {
    if (!selectedProfile) return
    setProfiles(prev => prev.filter(p => p.id !== selectedProfile.id))
    setSelectedProfile(null)
    setSuccessMsg('プロフィールを削除しました')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-green-800 text-white px-4 py-3 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-wide">キャスト名簿</h1>
          </div>
          <div className="flex items-center gap-2">
            {adminToken ? (
              <>
                <span className="text-red-300 text-xs font-bold">★ 管理者モード</span>
                <button
                  onClick={() => { setAdminToken(null); setSuccessMsg('管理者モードを終了しました') }}
                  className="text-xs bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAdminLogin(true)}
                className="text-xs text-green-300 hover:text-white"
              >
                管理者
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-1 py-6">
        {/* 成功メッセージ */}
        {successMsg && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded px-4 py-2 mb-4 text-sm">
            ✅ {successMsg}
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded px-4 py-2 mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        {/* 登録ボタン・表示切替 */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-gray-600 text-sm">
            {loading ? '読み込み中…' : `${profiles.length} 人登録済み`}
          </p>
          <div className="flex items-center gap-2">
            {/* 表示モード切替トグル */}
            <button
              onClick={toggleViewMode}
              title={viewMode === 'card' ? '表形式に切り替え' : 'カード形式に切り替え'}
              className="flex items-center gap-1.5 text-xs bg-white border border-gray-300 hover:border-green-500 text-gray-600 hover:text-green-700 px-3 py-1.5 rounded shadow-sm transition-colors"
            >
              {viewMode === 'card' ? (
                <>
                  <span>☰</span>
                  <span>表形式</span>
                </>
              ) : (
                <>
                  <span>⊞</span>
                  <span>カード</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-5 rounded text-sm shadow"
            >
              ＋ 登録する
            </button>
          </div>
        </div>

        {/* プロフィール一覧 */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">読み込み中…</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>まだ登録者がいません</p>
          </div>
        ) : viewMode === 'table' ? (
          <TableView profiles={profiles} onRowClick={handleCardClick} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map(profile => (
              <div
                key={profile.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-green-400 transition-all p-4 group flex flex-col"
              >
                <button
                  onClick={() => handleCardClick(profile.id)}
                  className="text-left flex-1"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-gray-800 group-hover:text-green-700 text-base truncate flex-1">
                      {profile.name}
                    </h3>
                  </div>
                  {profile.origin && (
                    <p className="text-gray-500 text-xs truncate">{profile.origin}</p>
                  )}
                  {profile.trip && (
                    <p className="text-gray-400 text-xs font-mono truncate">{profile.trip}</p>
                  )}
                  {profile.aliases && profile.aliases.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {profile.aliases.map((a, i) => (
                        <p key={i} className="text-xs text-gray-600 truncate">
                          {a.name}{a.gender && <span className="text-gray-400 ml-0.5">{GENDER_LABEL[a.gender]}</span>}{a.origin && <span className="text-gray-400"> ({a.origin})</span>}
                        </p>
                      ))}
                    </div>
                  )}
                  {profile.bio && (
                    <p className="text-gray-600 text-xs mt-2 leading-relaxed">
                      <Nl2br text={profile.bio} maxLines={6} />
                    </p>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 登録モーダル */}
      {showRegister && (
        <Modal title="プロフィールを登録" onClose={() => setShowRegister(false)}>
          <ProfileForm
            onSubmit={handleRegister}
            onCancel={() => setShowRegister(false)}
            submitLabel="登録する"
          />
        </Modal>
      )}

      {/* 詳細パネル */}
      {selectedProfile && (
        <DetailPanel
          profile={selectedProfile}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
          onClose={() => setSelectedProfile(null)}
          adminToken={adminToken}
        />
      )}

      {/* 管理者ログインモーダル */}
      {showAdminLogin && (
        <Modal title="管理者ログイン" onClose={() => setShowAdminLogin(false)}>
          <AdminLoginForm
            onLogin={(token) => { setAdminToken(token); setShowAdminLogin(false); setSuccessMsg('管理者モードでログインしました') }}
            onCancel={() => setShowAdminLogin(false)}
          />
        </Modal>
      )}
    </div>
  )
}

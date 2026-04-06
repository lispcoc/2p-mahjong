'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ProfileDetail, ProfileFormData } from '../../../types/ProfileTypes'
import {
  GENDER_LABEL,
  apiGet, apiPut,
  savePwSession, loadPwSession, clearPwSession,
  formatDate,
  ProfileForm, ChangePasswordForm, DeleteForm, VerifyPasswordForm, CopyUrlButton,
} from '../../../components/profiles/shared'

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
                        {a.gender && <span className="text-gray-500 ml-1">{GENDER_LABEL[a.gender]}</span>}
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
                  <dd className="text-gray-800">{GENDER_LABEL[profile.gender] ?? ''}</dd>
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
            <ProfileForm
              initial={profile}
              onSubmit={async (data) => {
                const updated = await apiPut<ProfileDetail>(`/api/profiles/${profile.id}`, data)
                setProfile(updated)
                setMode('view')
                showSuccess('プロフィールを更新しました')
              }}
              onCancel={() => setMode('view')}
              submitLabel="変更を保存"
              isEdit
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

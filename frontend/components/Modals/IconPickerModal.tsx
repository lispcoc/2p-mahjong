'use client'

import React, { useState, useRef, useEffect } from 'react'

export const ICON_LIBRARY_KEY = 'mahjong-icon-library'
export const ICON_ACTIVE_KEY = 'mahjong-player-icon'

const MAX_ICONS = 12

interface IconPickerModalProps {
  /** 現在選択中のアイコン (data URL or null) */
  activeIcon: string | null
  onSelect: (icon: string | null) => void
  onClose: () => void
}

// ─── 画像圧縮ユーティリティ ─────────────────────────────────────────────────
const compressImage = (dataUrl: string, maxSize = 1024 * 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const targetRatio = 3 / 4
      const currentRatio = width / height
      let srcX = 0, srcY = 0, srcWidth = width, srcHeight = height

      if (currentRatio < targetRatio) {
        srcHeight = Math.round(width / targetRatio)
        srcY = height - srcHeight
        height = srcHeight
      }

      const maxWidth = 512
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas error')); return }
      ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, width, height)

      let quality = 0.95
      let compressed = canvas.toDataURL('image/jpeg', quality)
      while (compressed.length > maxSize && quality > 0.1) {
        quality -= 0.05
        compressed = canvas.toDataURL('image/jpeg', quality)
      }
      if (compressed.length > maxSize) {
        reject(new Error('compress failed'))
        return
      }
      resolve(compressed)
    }
    img.onerror = () => reject(new Error('load error'))
    img.src = dataUrl
  })

// ─── ライブラリ I/O ──────────────────────────────────────────────────────────
export function loadIconLibrary(): string[] {
  try {
    const raw = localStorage.getItem(ICON_LIBRARY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function saveIconLibrary(library: string[]) {
  try {
    localStorage.setItem(ICON_LIBRARY_KEY, JSON.stringify(library))
  } catch {}
}

// ─── コンポーネント ──────────────────────────────────────────────────────────
export function IconPickerModal({ activeIcon, onSelect, onClose }: IconPickerModalProps) {
  const [library, setLibrary] = useState<string[]>(() => {
    const lib = loadIconLibrary()
    // 互換性移行: 旧キー(mahjong-player-icon)に保存済みのアイコンがライブラリ未登録ならば先頭に追加
    try {
      const legacy = localStorage.getItem(ICON_ACTIVE_KEY)
      if (legacy && !lib.includes(legacy)) {
        const migrated = [legacy, ...lib]
        saveIconLibrary(migrated)
        return migrated
      }
    } catch {}
    return lib
  })
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null)
  const [grabIdx, setGrabIdx] = useState<number | null>(null)   // 並べ替え: 掴んでいるインデックス
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Esc キーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ライブラリ変更時に保存
  const updateLibrary = (next: string[]) => {
    setLibrary(next)
    saveIconLibrary(next)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string
      try {
        let dataUrl = raw
        if (file.size > 1024 * 1024) {
          setCompressing(true)
          dataUrl = await compressImage(raw)
          setCompressing(false)
        }
        // 重複チェック
        if (library.includes(dataUrl)) {
          setError('この画像はすでに追加されています')
          return
        }
        const next = [...library, dataUrl]
        updateLibrary(next)
        // 追加したものをすぐに選択
        handleSelect(dataUrl, next)
        setError('')
      } catch {
        setCompressing(false)
        setError('画像の追加に失敗しました。別の画像をお試しください。')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSelect = (icon: string | null, lib = library) => {
    try {
      if (icon) {
        localStorage.setItem(ICON_ACTIVE_KEY, icon)
      } else {
        localStorage.removeItem(ICON_ACTIVE_KEY)
      }
    } catch {}
    onSelect(icon)
    onClose()
  }

  const handleDelete = (idx: number) => {
    const next = library.filter((_, i) => i !== idx)
    updateLibrary(next)
    // 削除したアイコンが現在選択中なら解除
    if (activeIcon === library[idx]) {
      try { localStorage.removeItem(ICON_ACTIVE_KEY) } catch {}
      onSelect(null)
    }
    setConfirmDeleteIdx(null)
    setGrabIdx(null)
  }

  // 並べ替え: grabIdx → toIdx へ移動（他を詰める）
  const handleMove = (toIdx: number) => {
    if (grabIdx === null || grabIdx === toIdx) {
      setGrabIdx(null)
      return
    }
    const next = [...library]
    const [item] = next.splice(grabIdx, 1)
    next.splice(toIdx, 0, item)
    updateLibrary(next)
    setGrabIdx(null)
  }

  const canAdd = library.length < MAX_ICONS && !compressing

  return (
    <div
      className="fixed inset-0 bg-black/70 flex justify-center items-center z-[3000]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,480px)] max-h-[85vh] flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 m-0">アイコンを選択</h2>
          <div className="flex items-center gap-2">
            {library.length > 0 && (
              <button
                onClick={() => { setEditMode(e => !e); setConfirmDeleteIdx(null); setGrabIdx(null) }}
                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                  editMode
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {editMode ? '完了' : '編集'}
              </button>
            )}
            <button
              onClick={() => { setEditMode(false); onClose() }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-xl leading-none"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </div>

        {/* スクロール可能なグリッド */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-4">

            {/* アイコンなし */}
            <button
              onClick={() => {
                if (grabIdx !== null) { setGrabIdx(null); return }  // 掴み中はキャンセル
                if (!editMode) handleSelect(null)
              }}
              disabled={editMode && grabIdx === null}
              className={`relative aspect-square rounded-full flex flex-col items-center justify-center border-4 transition-all focus:outline-none
                ${editMode && grabIdx === null
                  ? 'border-gray-200 bg-gray-50 opacity-40 cursor-default'
                  : grabIdx !== null
                    ? 'border-gray-200 bg-gray-50 hover:border-gray-400'  // 掴み中はキャンセル可
                    : !activeIcon
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-400'}`}
            >
              <span className="text-3xl">{grabIdx !== null ? '↩' : '🚫'}</span>
              <span className="text-[10px] text-gray-500 mt-1 font-medium">{grabIdx !== null ? 'キャンセル' : 'なし'}</span>
              {!activeIcon && grabIdx === null && !editMode && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">✓</span>
              )}
            </button>

            {/* 既存アイコン一覧 */}
            {library.map((icon, idx) => {
              const isActive = activeIcon === icon
              const isConfirming = confirmDeleteIdx === idx
              const isGrabbed = grabIdx === idx
              const isDropTarget = grabIdx !== null && grabIdx !== idx

              return (
                <div key={idx} className="relative aspect-square">
                  {/* メインボタン */}
                  <button
                    onClick={() => {
                      if (isConfirming) return
                      if (!editMode) { handleSelect(icon); return }
                      // 編集モード: 並べ替え操作
                      if (grabIdx === null) {
                        setGrabIdx(idx)  // 掴む
                      } else {
                        handleMove(idx)  // ここへ移動
                      }
                    }}
                    className={`w-full h-full rounded-full border-4 overflow-hidden transition-all focus:outline-none
                      ${!editMode
                        ? isActive
                          ? 'border-green-500 ring-2 ring-green-300'
                          : 'border-gray-200 hover:border-blue-300'
                        : isGrabbed
                          ? 'border-blue-500 ring-4 ring-blue-300 scale-105 shadow-lg'
                          : isDropTarget
                            ? 'border-blue-300 ring-2 ring-blue-200 opacity-70'
                            : 'border-gray-300 opacity-80'
                      }`}
                    style={isGrabbed ? { transform: 'scale(1.08)' } : undefined}
                  >
                    <img
                      src={icon}
                      alt={`アイコン ${idx + 1}`}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </button>

                  {/* 選択チェックマーク（通常モード時のみ） */}
                  {isActive && !editMode && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow pointer-events-none">✓</span>
                  )}

                  {/* 掴み中バッジ */}
                  {isGrabbed && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow pointer-events-none">✥</span>
                  )}

                  {/* ドロップ先インジケーター（他のアイコン） */}
                  {isDropTarget && !isConfirming && (
                    <span className="absolute inset-0 rounded-full border-4 border-dashed border-blue-400 pointer-events-none" />
                  )}

                  {/* 削除ボタン（編集モード・掴み中でない・確認ダイアログなし） */}
                  {editMode && !isConfirming && grabIdx === null && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteIdx(idx) }}
                      className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md active:bg-red-700 focus:outline-none"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  )}

                  {/* 削除確認オーバーレイ */}
                  {isConfirming && (
                    <div className="absolute inset-0 rounded-full bg-black/65 flex flex-col items-center justify-center gap-1.5">
                      <span className="text-white text-[11px] font-bold">削除?</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(idx) }}
                          className="px-2 py-1 bg-red-500 text-white text-[11px] rounded-full font-bold active:bg-red-700 transition-colors"
                        >
                          削除
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteIdx(null) }}
                          className="px-2 py-1 bg-white text-gray-700 text-[11px] rounded-full font-bold active:bg-gray-200 transition-colors"
                        >
                          戻る
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 追加ボタン */}
            {canAdd && !editMode && (
              <label
                className="aspect-square rounded-full border-4 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                title="画像を追加"
              >
                <span className="text-3xl text-gray-400 group-hover:text-blue-400 transition-colors leading-none">＋</span>
                <span className="text-[10px] text-gray-400 group-hover:text-blue-400 mt-1 font-medium">追加</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            {/* 圧縮中 */}
            {compressing && (
              <div className="aspect-square rounded-full border-4 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center">
                <span className="text-2xl animate-spin">⏳</span>
                <span className="text-[10px] text-blue-500 mt-1">処理中</span>
              </div>
            )}
          </div>

          {/* エラー */}
          {error && (
            <p className="mt-3 text-center text-sm text-red-500">{error}</p>
          )}

          {/* 上限メッセージ */}
          {library.length >= MAX_ICONS && (
            <p className="mt-3 text-center text-xs text-gray-400">アイコンは最大{MAX_ICONS}枚まで保存できます。削除してから追加してください。</p>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-400 m-0">
            {grabIdx !== null
              ? '移動先のアイコンをタップしてください'
              : editMode
                ? '「×」で削除 / アイコンをタップして掴み、移動先をタップで並べ替え'
                : 'アイコンをタップして選択・切替、「編集」で削除・並べ替え'}
          </p>
        </div>
      </div>
    </div>
  )
}

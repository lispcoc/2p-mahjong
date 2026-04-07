'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { IconEntry } from '../../types/IconTypes'
import { ICON_ACTIVE_KEY } from '../../types/IconTypes'
import {
  saveIconLibraryV2,
  migrateIconLibrary,
  loadActiveIconId,
  saveActiveIconId,
  saveActiveIconDataUrl,
  precompressForStorage,
  renderIconEntry,
} from '../../utils/iconUtils'
import { IconCropModal } from './IconCropModal'

// ─── 後方互換エクスポート ──────────────────────────────────────────────────────
export const ICON_LIBRARY_KEY = 'mahjong-icon-library'
export { ICON_ACTIVE_KEY }

export function loadIconLibrary(): string[] {
  try {
    const raw = localStorage.getItem(ICON_LIBRARY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch { return [] }
}
export function saveIconLibrary(library: string[]): void {
  try { localStorage.setItem(ICON_LIBRARY_KEY, JSON.stringify(library)) } catch {}
}

const MAX_ICONS = 12
// ─── アイコン表示コンポーネント (CSS 計算版) ─────────────────────────────────
function EntryPreview({ entry, className }: { entry: IconEntry; className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrameSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const imgStyle = useMemo(() => {
    if (!imgSize.w || !imgSize.h || !frameSize.w || !frameSize.h) return undefined
    const baseCover = Math.max(frameSize.w / imgSize.w, frameSize.h / imgSize.h)
    const totalScale = baseCover * entry.scale
    const dw = imgSize.w * totalScale
    const dh = imgSize.h * totalScale
    const left = (frameSize.w - dw) / 2 + entry.offsetX * frameSize.w
    const top  = (frameSize.h - dh) / 2 + entry.offsetY * frameSize.h
    return {
      position: 'absolute' as const,
      left: Math.min(0, Math.max(left, frameSize.w - dw)),
      top:  Math.min(0, Math.max(top,  frameSize.h - dh)),
      width: dw,
      height: dh,
    }
  }, [imgSize, frameSize, entry.scale, entry.offsetX, entry.offsetY])

  return (
    <div ref={frameRef} className={`relative overflow-hidden ${className ?? ''}`}>
      <img
        src={entry.data}
        alt=""
        style={imgStyle ?? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const }}
        onLoad={(e) => setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        draggable={false}
      />
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface IconPickerModalProps {
  /** 現在選択中のアイコン (data URL or null) – 表示のみに使用 */
  activeIcon: string | null
  onSelect: (icon: string | null) => void
  onClose: () => void
}

// ─── メインコンポーネント ────────────────────────────────────────────────────
export function IconPickerModal({ activeIcon, onSelect, onClose }: IconPickerModalProps) {
  const [library, setLibrary] = useState<IconEntry[]>(() => migrateIconLibrary())
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveIconId())

  const [editMode, setEditMode] = useState(false)
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null)
  const [grabIdx, setGrabIdx] = useState<number | null>(null)

  /** クロップモーダル表示用 */
  const [cropState, setCropState] = useState<{
    imageData: string
    initial?: IconEntry
    editIdx: number | null
  } | null>(null)

  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateLibrary = (next: IconEntry[]) => {
    setLibrary(next)
    saveIconLibraryV2(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !cropState) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, cropState])

  // ─── ファイル選択 ───────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string
      try {
        setCompressing(true)
        // localStorage 節約のため常にプレ圧縮
        const precompressed = await precompressForStorage(raw)
        setCompressing(false)
        setCropState({ imageData: precompressed, editIdx: null })
      } catch {
        setCompressing(false)
        setError('画像の読み込みに失敗しました。別の画像をお試しください。')
      }
    }
    reader.readAsDataURL(file)
  }

  // ─── クロップ確定 ───────────────────────────────────────────────────────────
  const handleCropConfirm = async (entry: IconEntry) => {
    const isNew = cropState?.editIdx === null
    const editIdx = cropState?.editIdx ?? null
    setCropState(null)

    let next: IconEntry[]
    if (editIdx === null) {
      next = [...library, entry]
    } else {
      next = library.map((e, i) => (i === editIdx ? entry : e))
    }
    updateLibrary(next)

    // 新規追加 or アクティブなエントリを編集した場合は再レンダリング
    if (isNew || entry.id === activeId) {
      try {
        const rendered = await renderIconEntry(entry, 300)
        saveActiveIconDataUrl(rendered)
        saveActiveIconId(entry.id)
        setActiveId(entry.id)
        onSelect(rendered)
        if (isNew) onClose()
      } catch {
        setError('アイコンの保存に失敗しました。')
      }
    }
  }

  // ─── エントリ選択 ───────────────────────────────────────────────────────────
  const handleSelectEntry = async (entry: IconEntry) => {
    try {
      const rendered = await renderIconEntry(entry, 300)
      saveActiveIconDataUrl(rendered)
      saveActiveIconId(entry.id)
      setActiveId(entry.id)
      onSelect(rendered)
      onClose()
    } catch {
      setError('アイコンの選択に失敗しました。')
    }
  }

  const handleSelectNone = () => {
    if (editMode || grabIdx !== null) { setGrabIdx(null); return }
    try { localStorage.removeItem(ICON_ACTIVE_KEY) } catch {}
    saveActiveIconId(null)
    setActiveId(null)
    onSelect(null)
    onClose()
  }

  // ─── 削除 ───────────────────────────────────────────────────────────────────
  const handleDelete = (idx: number) => {
    const entry = library[idx]
    const next = library.filter((_, i) => i !== idx)
    updateLibrary(next)
    if (entry.id === activeId) {
      try { localStorage.removeItem(ICON_ACTIVE_KEY) } catch {}
      saveActiveIconId(null)
      setActiveId(null)
      onSelect(null)
    }
    setConfirmDeleteIdx(null)
    setGrabIdx(null)
  }

  // ─── 並べ替え ───────────────────────────────────────────────────────────────
  const handleMove = (toIdx: number) => {
    if (grabIdx === null || grabIdx === toIdx) { setGrabIdx(null); return }
    const next = [...library]
    const [item] = next.splice(grabIdx, 1)
    next.splice(toIdx, 0, item)
    updateLibrary(next)
    setGrabIdx(null)
  }

  const canAdd = library.length < MAX_ICONS && !compressing

  return (
    <>
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

          {/* グリッド */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-3 gap-4">

              {/* アイコンなし */}
              <button
                onClick={handleSelectNone}
                disabled={editMode && grabIdx === null}
                className={`relative flex flex-col items-center justify-center border-4 transition-all focus:outline-none rounded-lg overflow-hidden
                  ${editMode && grabIdx === null
                    ? 'border-gray-200 bg-gray-50 opacity-40 cursor-default'
                    : grabIdx !== null
                      ? 'border-gray-200 bg-gray-50 hover:border-gray-400'
                      : !activeId
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-400'}`}
                style={{ aspectRatio: '3 / 4' }}
              >
                <span className="text-3xl">{grabIdx !== null ? '↩' : '🚫'}</span>
                <span className="text-[10px] text-gray-500 mt-1 font-medium">
                  {grabIdx !== null ? 'キャンセル' : 'なし'}
                </span>
                {!activeId && grabIdx === null && !editMode && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">✓</span>
                )}
              </button>

              {/* 既存アイコン一覧 */}
              {library.map((entry, idx) => {
                const isActive = entry.id === activeId
                const isConfirming = confirmDeleteIdx === idx
                const isGrabbed = grabIdx === idx
                const isDropTarget = grabIdx !== null && grabIdx !== idx

                return (
                  <div key={entry.id} className="relative" style={{ aspectRatio: '3 / 4' }}>
                    <button
                      onClick={() => {
                        if (isConfirming) return
                        if (!editMode) { handleSelectEntry(entry); return }
                        if (grabIdx === null) setGrabIdx(idx)
                        else handleMove(idx)
                      }}
                      className={`w-full h-full border-4 overflow-hidden transition-all focus:outline-none rounded-lg
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
                      <EntryPreview entry={entry} className="w-full h-full" />
                    </button>

                    {isActive && !editMode && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow pointer-events-none">✓</span>
                    )}
                    {isGrabbed && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow pointer-events-none">✥</span>
                    )}
                    {isDropTarget && !isConfirming && (
                      <span className="absolute inset-0 rounded-lg border-4 border-dashed border-blue-400 pointer-events-none" />
                    )}

                    {/* トリミング編集ボタン */}
                    {editMode && !isConfirming && grabIdx === null && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCropState({ imageData: entry.data, initial: entry, editIdx: idx })
                        }}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md hover:bg-blue-600 focus:outline-none"
                        aria-label="トリミングを編集"
                        title="表示位置を編集"
                      >
                        ✎
                      </button>
                    )}

                    {/* 削除ボタン */}
                    {editMode && !isConfirming && grabIdx === null && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteIdx(idx) }}
                        className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md active:bg-red-700 focus:outline-none"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    )}

                    {/* 削除確認 */}
                    {isConfirming && (
                      <div className="absolute inset-0 rounded-lg bg-black/65 flex flex-col items-center justify-center gap-1.5">
                        <span className="text-white text-[11px] font-bold">削除?</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(idx) }}
                            className="px-2 py-1 bg-red-500 text-white text-[11px] rounded-full font-bold active:bg-red-700"
                          >
                            削除
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteIdx(null) }}
                            className="px-2 py-1 bg-white text-gray-700 text-[11px] rounded-full font-bold"
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
                  className="border-4 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors group rounded-lg"
                  style={{ aspectRatio: '3 / 4' }}
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

              {compressing && (
                <div
                  className="border-4 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center rounded-lg"
                  style={{ aspectRatio: '3 / 4' }}
                >
                  <span className="text-2xl animate-spin">⏳</span>
                  <span className="text-[10px] text-blue-500 mt-1">処理中</span>
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
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
                  ? '「×」で削除 / 「✎」で表示位置編集 / タップして掴み移動先タップで並べ替え'
                  : 'アイコンをタップして選択・切替、「編集」で削除・並べ替え・トリミング'}
            </p>
          </div>
        </div>
      </div>

      {/* クロップモーダル */}
      {cropState && (
        <IconCropModal
          imageData={cropState.imageData}
          initial={cropState.initial}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropState(null)}
        />
      )}
    </>
  )
}

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { IconEntry } from '../../types/IconTypes'
import { generateIconId } from '../../utils/iconUtils'

interface IconCropModalProps {
  /** 元画像 data URL (未クロップ) */
  imageData: string
  /** 既存エントリ (再編集時) */
  initial?: IconEntry
  /** 確定時コールバック */
  onConfirm: (entry: IconEntry) => void
  onCancel: () => void
}

// ─── 距離計算 ────────────────────────────────────────────────────────────────
function getTouchDist(t1: React.Touch | Touch, t2: React.Touch | Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}
function getTouchCenter(t1: React.Touch | Touch, t2: React.Touch | Touch) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }
}

// ─── コンポーネント ──────────────────────────────────────────────────────────
export function IconCropModal({ imageData, initial, onConfirm, onCancel }: IconCropModalProps) {
  /** ユーザースケール (1.0 = cover ベース) */
  const [scale, setScale] = useState(initial?.scale ?? 1)
  /** フレーム幅に対する割合オフセット */
  const [offsetX, setOffsetX] = useState(initial?.offsetX ?? 0)
  const [offsetY, setOffsetY] = useState(initial?.offsetY ?? 0)
  /** 画像の自然サイズ */
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const frameRef = useRef<HTMLDivElement>(null)

  // ドラッグ状態 (マウス / シングルタッチ)
  const dragRef = useRef<{
    active: boolean
    startX: number; startY: number
    startOffX: number; startOffY: number
  } | null>(null)

  // ピンチ状態 (2本指)
  const pinchRef = useRef<{
    active: boolean
    startDist: number; startScale: number
    startCenterX: number; startCenterY: number
    startOffX: number; startOffY: number
  } | null>(null)

  // state の最新値を event handler 内から参照するための ref
  const stateRef = useRef({ scale, offsetX, offsetY })
  useEffect(() => { stateRef.current = { scale, offsetX, offsetY } }, [scale, offsetX, offsetY])

  // ─── フレームサイズ ─────────────────────────────────────────────────────────
  const getFrameSize = useCallback((): { fw: number; fh: number } => {
    const el = frameRef.current
    if (!el) return { fw: 300, fh: 400 }
    return { fw: el.clientWidth, fh: el.clientHeight }
  }, [])

  // ─── クランプ ───────────────────────────────────────────────────────────────
  const clamp = useCallback((ox: number, oy: number, sc: number) => {
    if (!imgSize.w || !imgSize.h) return { ox, oy }
    const { fw, fh } = getFrameSize()
    const baseCover = Math.max(fw / imgSize.w, fh / imgSize.h)
    const totalScale = baseCover * sc
    const dw = imgSize.w * totalScale
    const dh = imgSize.h * totalScale

    const maxOx = dw > fw ? (dw - fw) / (2 * fw) : 0
    const maxOy = dh > fh ? (dh - fh) / (2 * fh) : 0

    return {
      ox: Math.min(maxOx, Math.max(-maxOx, ox)),
      oy: Math.min(maxOy, Math.max(-maxOy, oy)),
    }
  }, [imgSize, getFrameSize])

  // ─── 画像スタイル計算 ───────────────────────────────────────────────────────
  const calcImgStyle = useCallback((sc = scale, ox = offsetX, oy = offsetY) => {
    if (!imgSize.w || !imgSize.h) return {}
    const { fw, fh } = getFrameSize()
    const baseCover = Math.max(fw / imgSize.w, fh / imgSize.h)
    const totalScale = baseCover * sc
    const dw = imgSize.w * totalScale
    const dh = imgSize.h * totalScale
    const left = (fw - dw) / 2 + ox * fw
    const top  = (fh - dh) / 2 + oy * fh
    return {
      position: 'absolute' as const,
      left: Math.min(0, Math.max(left, fw - dw)),
      top:  Math.min(0, Math.max(top,  fh - dh)),
      width: dw,
      height: dh,
      touchAction: 'none',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      draggable: false,
    }
  }, [imgSize, scale, offsetX, offsetY, getFrameSize])

  // ─── リセット ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    setScale(1)
    setOffsetX(0)
    setOffsetY(0)
  }

  // ─── 確定 ──────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const { ox, oy } = clamp(offsetX, offsetY, scale)
    onConfirm({
      id: initial?.id ?? generateIconId(),
      data: imageData,
      scale,
      offsetX: ox,
      offsetY: oy,
    })
  }

  // ─── ホイールズーム ─────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const { scale: sc, offsetX: ox, offsetY: oy } = stateRef.current
    const newScale = Math.min(8, Math.max(1, sc + delta * sc))
    const { ox: cOx, oy: cOy } = clamp(ox, oy, newScale)
    setScale(newScale)
    setOffsetX(cOx)
    setOffsetY(cOy)
  }, [clamp])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ─── マウスドラッグ ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      startOffX: stateRef.current.offsetX, startOffY: stateRef.current.offsetY,
    }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current?.active) return
      const { fw, fh } = getFrameSize()
      const dx = (e.clientX - dragRef.current.startX) / fw
      const dy = (e.clientY - dragRef.current.startY) / fh
      const { ox, oy } = clamp(
        dragRef.current.startOffX + dx,
        dragRef.current.startOffY + dy,
        stateRef.current.scale,
      )
      setOffsetX(ox)
      setOffsetY(oy)
    }
    const onUp = () => { if (dragRef.current) dragRef.current.active = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [clamp, getFrameSize])

  // ─── タッチ操作 ─────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        active: true,
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        startOffX: stateRef.current.offsetX, startOffY: stateRef.current.offsetY,
      }
      pinchRef.current = null
    } else if (e.touches.length === 2) {
      dragRef.current = null
      const dist = getTouchDist(e.touches[0], e.touches[1])
      const center = getTouchCenter(e.touches[0], e.touches[1])
      pinchRef.current = {
        active: true,
        startDist: dist,
        startScale: stateRef.current.scale,
        startCenterX: center.x,
        startCenterY: center.y,
        startOffX: stateRef.current.offsetX,
        startOffY: stateRef.current.offsetY,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && dragRef.current?.active) {
      const { fw, fh } = getFrameSize()
      const dx = (e.touches[0].clientX - dragRef.current.startX) / fw
      const dy = (e.touches[0].clientY - dragRef.current.startY) / fh
      const { ox, oy } = clamp(
        dragRef.current.startOffX + dx,
        dragRef.current.startOffY + dy,
        stateRef.current.scale,
      )
      setOffsetX(ox)
      setOffsetY(oy)
    } else if (e.touches.length === 2 && pinchRef.current?.active) {
      const dist = getTouchDist(e.touches[0], e.touches[1])
      const ratio = dist / pinchRef.current.startDist
      const newScale = Math.min(8, Math.max(1, pinchRef.current.startScale * ratio))
      const { ox, oy } = clamp(
        pinchRef.current.startOffX,
        pinchRef.current.startOffY,
        newScale,
      )
      setScale(newScale)
      setOffsetX(ox)
      setOffsetY(oy)
    }
  }

  const handleTouchEnd = () => {
    if (dragRef.current) dragRef.current.active = false
    if (pinchRef.current) pinchRef.current.active = false
  }

  // ─── ESC キーで閉じる ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  // ─── ズームボタン ───────────────────────────────────────────────────────────
  const adjustZoom = (delta: number) => {
    const { scale: sc, offsetX: ox, offsetY: oy } = stateRef.current
    const newScale = Math.min(8, Math.max(1, sc + delta))
    const { ox: cOx, oy: cOy } = clamp(ox, oy, newScale)
    setScale(newScale)
    setOffsetX(cOx)
    setOffsetY(cOy)
  }

  // ─── スライダー ─────────────────────────────────────────────────────────────
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value)
    const { ox, oy } = clamp(offsetX, offsetY, newScale)
    setScale(newScale)
    setOffsetX(ox)
    setOffsetY(oy)
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[4000] px-2 py-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800 m-0">表示位置を調整</h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl leading-none"
            aria-label="キャンセル"
          >
            ×
          </button>
        </div>

        {/* クロップフレーム */}
        <div className="relative px-4 pt-4 pb-2 flex justify-center">
          {/* 外枠の説明 */}
          <p className="absolute top-4 left-4 right-4 text-xs text-gray-400 text-center">
            ドラッグ・ピンチで位置・拡大を調整
          </p>

          {/* フレーム */}
          <div
            ref={frameRef}
            className="relative overflow-hidden rounded-lg border-2 border-blue-400 cursor-grab active:cursor-grabbing mt-6"
            style={{ width: '100%', aspectRatio: '3 / 4', maxWidth: 300, margin: '1.5rem auto 0' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* 画像 */}
            {imgSize.w > 0 && (
              <img
                src={imageData}
                alt="プレビュー"
                style={calcImgStyle()}
                onLoad={(e) => {
                  const img = e.currentTarget
                  if (img.naturalWidth && img.naturalHeight) {
                    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
                  }
                }}
                draggable={false}
              />
            )}
            {/* 初回ロード用 (imgSize が 0 の間) */}
            {imgSize.w === 0 && (
              <img
                src={imageData}
                alt="プレビュー"
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={(e) => {
                  const img = e.currentTarget
                  if (img.naturalWidth && img.naturalHeight) {
                    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
                  }
                }}
                draggable={false}
              />
            )}

            {/* コーナーガイド */}
            <div className="pointer-events-none absolute inset-0">
              {/* 四隅のガイドライン */}
              {[
                'top-0 left-0 border-t-2 border-l-2',
                'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2',
                'bottom-0 right-0 border-b-2 border-r-2',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute ${cls} border-white w-6 h-6 opacity-80`}
                />
              ))}
            </div>
          </div>

          {/* スケール表示 */}
          <div className="absolute bottom-3 right-6 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
            {scale.toFixed(2)}×
          </div>
        </div>

        {/* ズームコントロール */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => { e.preventDefault(); adjustZoom(-0.2) }}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg leading-none select-none touch-none"
              aria-label="縮小"
            >
              −
            </button>
            <input
              type="range"
              min="1"
              max="8"
              step="0.05"
              value={scale}
              onChange={handleSlider}
              className="flex-1 h-2 accent-blue-500"
              style={{ cursor: 'pointer' }}
            />
            <button
              onPointerDown={(e) => { e.preventDefault(); adjustZoom(0.2) }}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg leading-none select-none touch-none"
              aria-label="拡大"
            >
              ＋
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-1">スクロール / ピンチでも拡大縮小できます</p>
        </div>

        {/* フッターボタン */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleReset}
            className="flex-none px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium"
          >
            リセット
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold shadow"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  )
}

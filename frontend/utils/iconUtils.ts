/**
 * アイコン操作ユーティリティ
 */

import type { CSSProperties } from 'react'
import {
  IconEntry,
  ICON_LIBRARY_V2_KEY,
  ICON_ACTIVE_KEY,
  ICON_ACTIVE_ID_KEY,
  ICON_LIBRARY_LEGACY_KEY,
} from '../types/IconTypes'

// ─── ライブラリ I/O ───────────────────────────────────────────────────────────

export function loadIconLibraryV2(): IconEntry[] {
  try {
    const raw = localStorage.getItem(ICON_LIBRARY_V2_KEY)
    if (raw) return JSON.parse(raw) as IconEntry[]
  } catch {}
  return []
}

export function saveIconLibraryV2(library: IconEntry[]): void {
  try {
    localStorage.setItem(ICON_LIBRARY_V2_KEY, JSON.stringify(library))
  } catch {}
}

/** 旧ライブラリ (string[]) から V2 形式へマイグレーション */
export function migrateIconLibrary(): IconEntry[] {
  const v2 = loadIconLibraryV2()
  try {
    const legacyRaw = localStorage.getItem(ICON_LIBRARY_LEGACY_KEY)
    if (!legacyRaw) return v2
    const legacy = JSON.parse(legacyRaw) as string[]
    if (!Array.isArray(legacy) || legacy.length === 0) return v2

    // V2 に既存データがない場合のみマイグレーション
    if (v2.length > 0) return v2

    const migrated: IconEntry[] = legacy.map((dataUrl, i) => ({
      id: `legacy-${i}-${Date.now()}`,
      data: dataUrl,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    }))
    saveIconLibraryV2(migrated)

    // 旧アクティブアイコンに一致するエントリを探して activeId を設定
    const oldActive = localStorage.getItem(ICON_ACTIVE_KEY)
    if (oldActive) {
      const match = migrated.find(e => e.data === oldActive)
      if (match) saveActiveIconId(match.id)
    }

    return migrated
  } catch {}
  return v2
}

/** アクティブエントリ ID の読み書き */
export function loadActiveIconId(): string | null {
  try { return localStorage.getItem(ICON_ACTIVE_ID_KEY) } catch { return null }
}
export function saveActiveIconId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ICON_ACTIVE_ID_KEY, id)
    else localStorage.removeItem(ICON_ACTIVE_ID_KEY)
  } catch {}
}

/** アクティブアイコンのレンダリング済み data URL (後方互換) */
export function loadActiveIconDataUrl(): string | null {
  try { return localStorage.getItem(ICON_ACTIVE_KEY) } catch { return null }
}
export function saveActiveIconDataUrl(dataUrl: string | null): void {
  try {
    if (dataUrl) localStorage.setItem(ICON_ACTIVE_KEY, dataUrl)
    else localStorage.removeItem(ICON_ACTIVE_KEY)
  } catch {}
}

// ─── ID 生成 ─────────────────────────────────────────────────────────────────

export function generateIconId(): string {
  return `icon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── 画像リサイズ (プレ圧縮) ──────────────────────────────────────────────────

/**
 * 元画像を保存前に最大解像度にリサイズ (トリミング情報保持のため縦横は変えない)
 * fileSize が閾値以下ならそのまま返す
 */
export function precompressForStorage(dataUrl: string, maxDim = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth <= maxDim && img.naturalHeight <= maxDim) {
        resolve(dataUrl)
        return
      }
      const ratio = maxDim / Math.max(img.naturalWidth, img.naturalHeight)
      const w = Math.round(img.naturalWidth * ratio)
      const h = Math.round(img.naturalHeight * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas error')); return }
      ctx.drawImage(img, 0, 0, w, h)
      // localStorage 節約のため JPEG 0.85 に圧縮
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('load error'))
    img.src = dataUrl
  })
}

// ─── レンダリング ─────────────────────────────────────────────────────────────

/**
 * IconEntry を canvas に描画して data URL を返す (WebSocket 送信用)
 * @param entry  アイコンエントリ
 * @param outW   出力幅 (px)
 * @param outH   出力高さ (px) ※ 省略時は outW * 4/3
 */
export function renderIconEntry(
  entry: IconEntry,
  outW = 300,
  outH = Math.round(outW * 4 / 3),
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas error')); return }

      const { naturalWidth: imgW, naturalHeight: imgH } = img

      // ベースカバースケール: フレームを完全に覆う最小スケール
      const baseCoverScale = Math.max(outW / imgW, outH / imgH)
      const totalScale = baseCoverScale * entry.scale

      const displayW = imgW * totalScale
      const displayH = imgH * totalScale

      // 中心揃え + ユーザーオフセット
      let left = (outW - displayW) / 2 + entry.offsetX * outW
      let top  = (outH - displayH) / 2 + entry.offsetY * outH

      // クランプ: 空白が出ないようにする
      left = Math.min(0, Math.max(left, outW - displayW))
      top  = Math.min(0, Math.max(top,  outH - displayH))

      ctx.drawImage(img, left, top, displayW, displayH)

      // JPEG圧縮
      let quality = 0.92
      let result = canvas.toDataURL('image/jpeg', quality)
      while (result.length > 800 * 1024 && quality > 0.4) {
        quality -= 0.05
        result = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(result)
    }
    img.onerror = () => reject(new Error('load error'))
    img.src = entry.data
  })
}

// ─── CSS スタイル計算 (表示用) ────────────────────────────────────────────────

/**
 * フレーム内に画像を配置するための CSS スタイル値を計算する。
 * イメージを position:absolute で配置するコンテナ (overflow:hidden) 内で使用。
 *
 * @param entry    アイコンエントリ
 * @param imgW     画像の自然幅
 * @param imgH     画像の自然高さ
 * @param frameW   フレーム幅 (px)
 * @param frameH   フレーム高さ (px)
 */
export function calcIconImageStyle(
  entry: IconEntry,
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
): CSSProperties {
  if (!imgW || !imgH || !frameW || !frameH) return {}

  const baseCoverScale = Math.max(frameW / imgW, frameH / imgH)
  const totalScale = baseCoverScale * entry.scale

  const displayW = imgW * totalScale
  const displayH = imgH * totalScale

  let left = (frameW - displayW) / 2 + entry.offsetX * frameW
  let top  = (frameH - displayH) / 2 + entry.offsetY * frameH

  left = Math.min(0, Math.max(left, frameW - displayW))
  top  = Math.min(0, Math.max(top,  frameH - displayH))

  return {
    position: 'absolute',
    left,
    top,
    width: displayW,
    height: displayH,
    pointerEvents: 'none',
    userSelect: 'none',
  }
}

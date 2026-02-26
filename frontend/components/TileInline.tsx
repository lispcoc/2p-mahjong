import React from 'react'
import { Tile } from '../types/GameTypes'
import { getTileKey, getTileText, getTileTextColorClass } from '../utils/TileUtils'
import { getTileImageUrl } from '../utils/tileData'
import { useTextMode } from '../contexts/TextModeContext'

interface TileInlineProps {
  tile: Tile
  height?: number
  width?: number
  className?: string
  faceDown?: boolean
}

/**
 * インライン牌表示コンポーネント（ドラ表示や聴牌ポップアップ用）
 * テキストモード対応
 */
export function TileInline({ tile, height = 50, width, className = '', faceDown = false }: TileInlineProps) {
  const { textMode } = useTextMode()

  if (textMode) {
    const text = faceDown ? '🀫' : getTileText(tile)
    const colorClass = faceDown ? 'text-gray-600' : getTileTextColorClass(tile)
    const fontSize = height >= 48 ? 'text-sm' : height >= 30 ? 'text-xs' : 'text-[10px]'
    const h = `${height}px`
    const w = width ? `${width}px` : `${Math.round(height * 0.7)}px`

    return (
      <span
        className={`inline-flex items-center justify-center bg-white border border-gray-400 rounded-sm select-none font-bold ${colorClass} ${fontSize} ${className}`}
        style={{
          height: h,
          width: w,
          lineHeight: 1.1,
          textAlign: 'center',
          padding: '1px',
        }}
      >
        {text}
      </span>
    )
  }

  const src = faceDown ? getTileImageUrl('pai') : getTileImageUrl(getTileKey(tile))
  return (
    <img
      src={src}
      alt={faceDown ? '牌の裏' : tile.display}
      className={`object-contain ${className}`}
      style={{ height: `${height}px`, ...(width ? { width: `${width}px` } : {}) }}
      onError={(event) => {
        event.currentTarget.src = getTileImageUrl('missing')
      }}
    />
  )
}

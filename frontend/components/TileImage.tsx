import React from 'react'
import { Tile } from '../types/GameTypes'
import { getTileKey, getTileText, getTileTextColorClass } from '../utils/TileUtils'
import { getTileImageUrl } from '../utils/tileData'
import { useTextMode } from '../contexts/TextModeContext'
import { useWhiteMode } from '../contexts/WhiteModeContext'

interface TileImageProps {
  tile: Tile
  onClick?: () => void
  isDrawn?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  isHovered?: boolean
  faceDown?: boolean
  isRotated?: boolean
  scale?: number
}

export function TileImage({
  tile,
  onClick,
  isDrawn = false,
  onMouseEnter,
  onMouseLeave,
  isHovered = false,
  faceDown = false,
  isRotated = false,
  scale = 1,
}: TileImageProps) {
  const { textMode } = useTextMode()
  const { whiteMode } = useWhiteMode()
  const hoverGlow = whiteMode ? '#888888' : '#4CAF50'

  if (textMode) {
    // テキストモード: 文字で牌を表示
    const text = faceDown ? '🀫' : getTileText(tile)
    const colorClass = faceDown ? 'text-gray-600' : getTileTextColorClass(tile)

    // スケール値を考慮した表示サイズ (mobile: 33x47, PC sm+: 45x64)
    // 回転時は幅と高さを入れ替える
    const baseSizesMobile = [33, 47]
    const containerWidth = (isRotated ? baseSizesMobile[1] : baseSizesMobile[0]) * scale
    const containerHeight = (isRotated ? baseSizesMobile[0] : baseSizesMobile[1]) * scale

    return (
      <div
        className={`flex items-center justify-center`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
        }}
      >
        <div
          className={`flex items-center justify-center bg-white border border-gray-400 rounded-sm select-none font-bold ${colorClass}`}
          style={{
            width: '100%',
            height: '100%',
            boxShadow: isDrawn ? '0 0 8px #FFD700' : (isHovered ? `0 0 10px ${hoverGlow}` : '0 2px 4px rgba(0,0,0,0.2)'),
            transform: isRotated ? `rotate(90deg)` : (isDrawn ? `scale(${1.1 * scale})` : `scale(${scale})`),
            transformOrigin: 'center',
            transition: 'all 200ms',
            lineHeight: 1.1,
            textAlign: 'center',
            padding: '1px',
            fontSize: `${isRotated ? 10 * scale : 12 * scale}px`,
          }}
        >
          {text}
        </div>
      </div>
    )
  }

  // 画像モード（従来の動作）
  const src = faceDown ? getTileImageUrl('pai') : getTileImageUrl(getTileKey(tile))

  // スケール値を考慮した表示サイズ (mobile: 33x47, PC sm+: 45x64)
  // 回転時は幅と高さを入れ替える
  const baseSizesMobile = [33, 47]
  const containerWidth = (isRotated ? baseSizesMobile[1] : baseSizesMobile[0]) * scale
  const containerHeight = (isRotated ? baseSizesMobile[0] : baseSizesMobile[1]) * scale

  return (
    <div
      className={`flex items-center justify-center`}
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      <img
        src={src}
        alt={tile.display}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onError={(event) => {
          event.currentTarget.src = getTileImageUrl('missing')
        }}
        style={{
          width: `${baseSizesMobile[0] * scale}px`,
          height: `${baseSizesMobile[1] * scale}px`,
          filter: isDrawn ? 'drop-shadow(0 0 8px #FFD700)' : (isHovered ? `drop-shadow(0 0 10px ${hoverGlow})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'),
          transform: isRotated ? 'rotate(90deg)' : (isDrawn ? 'scale(1.1)' : 'scale(1)'),
          borderRadius: '0px',
          transformOrigin: 'center',
          transition: 'all 200ms',
          cursor: onClick ? 'pointer' : 'default',
        }}
      />
    </div>
  )
}

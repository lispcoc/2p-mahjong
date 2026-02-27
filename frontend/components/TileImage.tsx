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
}: TileImageProps) {
  const { textMode } = useTextMode()
  const { whiteMode } = useWhiteMode()
  const hoverGlow = whiteMode ? '#888888' : '#4CAF50'

  if (textMode) {
    // テキストモード: 文字で牌を表示
    const text = faceDown ? '🀫' : getTileText(tile)
    const colorClass = faceDown ? 'text-gray-600' : getTileTextColorClass(tile)

    // 回転時は占有スペースを入れ替える
    const containerClasses = isRotated
      ? 'w-[47px] h-[33px] sm:w-[64px] sm:h-[45px]'
      : 'w-[33px] h-[47px] sm:w-[45px] sm:h-[64px]'

    return (
      <div
        className={`flex items-center justify-center ${containerClasses}`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <div
          className={`flex items-center justify-center bg-white border border-gray-400 rounded-sm select-none font-bold ${colorClass} ${isRotated ? 'w-[47px] h-[33px] sm:w-[64px] sm:h-[45px] text-[10px] sm:text-xs' : 'w-[33px] h-[47px] sm:w-[45px] sm:h-[64px] text-xs sm:text-sm'}`}
          style={{
            boxShadow: isDrawn ? '0 0 8px #FFD700' : (isHovered ? `0 0 10px ${hoverGlow}` : '0 2px 4px rgba(0,0,0,0.2)'),
            transform: isRotated ? 'rotate(90deg)' : (isDrawn ? 'scale(1.1)' : (isHovered ? 'scale(1.15)' : 'scale(1)')),
            transformOrigin: 'center',
            transition: 'all 200ms',
            lineHeight: 1.1,
            textAlign: 'center',
            padding: '1px',
          }}
        >
          {text}
        </div>
      </div>
    )
  }

  // 画像モード（従来の動作）
  const src = faceDown ? getTileImageUrl('pai') : getTileImageUrl(getTileKey(tile))

  // 回転時は占有スペースを入れ替える (mobile: 33x47, PC sm+: 45x64)
  const containerClasses = isRotated
    ? 'w-[47px] h-[33px] sm:w-[64px] sm:h-[45px]'
    : 'w-[33px] h-[47px] sm:w-[45px] sm:h-[64px]'

  return (
    <div
      className={`flex items-center justify-center ${containerClasses}`}
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
        className={`w-[33px] h-[47px] sm:w-[45px] sm:h-[64px] transition-all duration-200 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        style={{
          filter: isDrawn ? 'drop-shadow(0 0 8px #FFD700)' : (isHovered ? `drop-shadow(0 0 10px ${hoverGlow})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'),
          transform: isRotated ? 'rotate(90deg)' : (isDrawn ? 'scale(1.1)' : (isHovered ? 'scale(1.15)' : 'scale(1)')),
          borderRadius: '0px',
          transformOrigin: 'center',
        }}
      />
    </div>
  )
}

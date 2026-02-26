import React from 'react'
import { Tile } from '../types/GameTypes'
import { getTileKey } from '../utils/TileUtils'

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
  const src = faceDown ? '/tiles/pai.gif' : `/tiles/${getTileKey(tile)}.gif`

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
          event.currentTarget.src = '/tiles/missing.png'
        }}
        className={`w-[33px] h-[47px] sm:w-[45px] sm:h-[64px] transition-all duration-200 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        style={{
          filter: isDrawn ? 'drop-shadow(0 0 8px #FFD700)' : (isHovered ? 'drop-shadow(0 0 10px #4CAF50)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'),
          transform: isRotated ? 'rotate(90deg)' : (isDrawn ? 'scale(1.1)' : (isHovered ? 'scale(1.15)' : 'scale(1)')),
          borderRadius: '0px',
          transformOrigin: 'center',
        }}
      />
    </div>
  )
}

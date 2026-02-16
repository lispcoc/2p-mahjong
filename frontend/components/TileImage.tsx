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

  return (
    <img
      src={src}
      alt={tile.display}
      width={33}
      height={47}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onError={(event) => {
        event.currentTarget.src = '/tiles/missing.png'
      }}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        filter: isDrawn ? 'drop-shadow(0 0 8px #FFD700)' : (isHovered ? 'drop-shadow(0 0 10px #4CAF50)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'),
        transition: 'all 0.2s',
        transform: isRotated ? 'rotate(90deg)' : (isDrawn ? 'scale(1.1)' : (isHovered ? 'scale(1.15)' : 'scale(1)')),
        borderRadius: '0px',
      }}
    />
  )
}

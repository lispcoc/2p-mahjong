import React from 'react'
import { Tile } from '../types/GameTypes'
import { TileImage } from './TileImage'

interface FuroDisplayProps {
  melds: Tile[][]
  layout?: 'vertical' | 'horizontal'
  compact?: boolean
  meldClassName?: string
  wrapperClassName?: string
  seatWindYou?: number  // Your seat wind (1=East, 2=South, 3=West, 4=North)
  seatWindOpponent?: number  // Opponent seat wind
  concealedMeldIndices?: Set<number>  // Indices of concealed kans (暗槓)
}

export function FuroDisplay({ 
  melds, 
  layout = 'horizontal',
  compact = false,
  meldClassName,
  wrapperClassName,
  seatWindYou,
  seatWindOpponent,
  concealedMeldIndices
}: FuroDisplayProps) {
  if (!melds || melds.length === 0) {
    return null
  }

  const defaultWrapperClass = layout === 'vertical' 
    ? 'flex flex-col items-end flex-shrink-0 gap-2 min-w-max'
    : 'flex max-sm:flex-col gap-4'
  
  const finalWrapperClass = wrapperClassName || defaultWrapperClass

  const defaultMeldContainerClass = 'flex gap-px'
  const finalMeldContainerClass = meldClassName || defaultMeldContainerClass

  // Determine if the meld's third tile (from opponent) should be rotated
  // In mahjong, tiles from different directions are rotated differently
  // For 2-player game: opponent's tile is typically rotated 90 degrees
  const shouldRotateOpponentTile = (seatWindYou !== undefined && seatWindOpponent !== undefined)

  return (
    <div className={finalWrapperClass}>
      {melds.map((meld, meldIdx) => (
        <div key={`meld-${meldIdx}`} className={finalMeldContainerClass}>
          {meld.map((tile, tileIdx) => {
            // Determine if this tile should be rotated (opponent's tile)
            // Pung (3 tiles): [hand, hand, opponent] → rotate meld[2]
            // Added Kan (4 tiles): [hand, hand, opponent, hand] → rotate meld[2]
            // Concealed Kan (4 tiles): [hand, hand, hand, hand] → don't rotate (all from hand)
            
            let isRotated = false
            
            if (!concealedMeldIndices?.has(meldIdx)) {
              // Not a concealed kan - check if this is an opponent's tile
              // Opponent's tile is always at index 2 in pung/added-kan
              const isOpponentTile = tileIdx === 2 && meld.length >= 3
              isRotated = isOpponentTile && shouldRotateOpponentTile
            }
            // If it's a concealed kan (concealedMeldIndices.has(meldIdx)),
            // don't rotate any tiles - all are from hand
            
            return (
              <div key={`meld-${meldIdx}-${tileIdx}`} className="inline-block">
                <TileImage tile={tile} isRotated={isRotated} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

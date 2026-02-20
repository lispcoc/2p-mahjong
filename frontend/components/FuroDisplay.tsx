import React from 'react'
import { Tile } from '../types/GameTypes'
import { TileImage } from './TileImage'

interface FuroDisplayProps {
  melds: Tile[][]
  layout?: 'vertical' | 'horizontal'
  compact?: boolean
  meldClassName?: string
  wrapperClassName?: string
}

export function FuroDisplay({ 
  melds, 
  layout = 'horizontal',
  compact = false,
  meldClassName,
  wrapperClassName
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

  return (
    <div className={finalWrapperClass}>
      {melds.map((meld, meldIdx) => (
        <div key={`meld-${meldIdx}`} className={finalMeldContainerClass}>
          {meld.map((tile, tileIdx) => (
            <div key={`meld-${meldIdx}-${tileIdx}`} className="inline-block">
              <TileImage tile={tile} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

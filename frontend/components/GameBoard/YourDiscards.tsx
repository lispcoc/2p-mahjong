import React from 'react'
import { Tile, GameState } from '../../types/GameTypes'
import { TileImage } from '../TileImage'

interface YourDiscardsProps {
  discards: Tile[]
  gameState: GameState
  userId: string
}

export function YourDiscards({ discards, gameState, userId }: YourDiscardsProps) {
  return (
    <div className="w-full mb-3 bg-gray-100 rounded-none p-3 border border-gray-300">
      <div className="flex items-center gap-2.5">
        <strong className="font-bold min-w-[70px] text-gray-600">あなたの河</strong>
        <div className="flex flex-wrap gap-px">
          {discards.length === 0 ? (
            <span className="text-gray-400 text-xs">なし</span>
          ) : (
            discards.map((tile, idx) => {
              const isRiichiDiscard = gameState.riichiDiscards?.[userId] === idx
              return (
                <div 
                  key={`yd-${idx}`} 
                  className={`inline-block ${isRiichiDiscard ? 'rotate-90 my-2' : ''}`}
                  style={{
                    transformOrigin: 'center',
                  }}
                >
                  <TileImage tile={tile} />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

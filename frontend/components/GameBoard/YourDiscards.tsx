import React from 'react'
import { Tile, GameState } from '../../types/GameTypes'
import { TileImage } from '../TileImage'

interface YourDiscardsProps {
  discards: Tile[]
  gameState: GameState
  userId: string
  tileScale?: number
}

export function YourDiscards({ discards, gameState, userId, tileScale = 1 }: YourDiscardsProps) {
  return (
    <div className="w-full mb-3 bg-gray-100 rounded-none p-3 border border-gray-300">
      <div className="flex items-center gap-2.5">
        <strong className="font-bold min-w-[70px] text-gray-600">あなたの河</strong>
        <div className="flex flex-wrap gap-px items-end">
          {discards.length === 0 ? (
            <span className="text-gray-400 text-xs">なし</span>
          ) : (
            discards.map((tile, idx) => {
              const isRiichiDiscard = gameState.riichiDiscards?.[userId] === idx
              return (
                <div
                  key={`yd-${idx}`}
                  className={`inline-block self-end ${isRiichiDiscard ? 'rotate-90' : ''}`}
                  style={{
                    transformOrigin: 'center',
                  }}
                >
                  <TileImage tile={tile} scale={tileScale} />
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

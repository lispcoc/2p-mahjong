import React from 'react'
import { Tile, GameState } from '../../types/GameTypes'
import { TileImage } from '../TileImage'

interface OpponentDiscardsProps {
  discards: Tile[]
  gameState: GameState
  otherUserId?: string
  tileScale?: number
}

export function OpponentDiscards({ discards, gameState, otherUserId, tileScale = 1 }: OpponentDiscardsProps) {
  const otherPlayer = gameState.players.find(p => p.userId === otherUserId)
  const isOtherRiichi = otherPlayer && gameState.riichi && gameState.riichi[otherPlayer.userId]

  return (
    <div className="w-full mb-3 bg-gray-100 rounded-none p-3 border border-gray-300">
      <div className="flex items-center gap-2.5">
        <strong className="font-bold min-w-[70px] text-gray-600">相手の河</strong>
        {isOtherRiichi && (
          <div className="bg-red-500 text-white px-3 py-1 rounded-none text-sm font-bold shadow-md animate-pulse">
            🔴 リーチ中
          </div>
        )}
        <div className="flex flex-wrap gap-px">
          {discards.length === 0 ? (
            <span className="text-gray-400 text-xs">なし</span>
          ) : (
            discards.map((tile, idx) => {
              const isRiichiDiscard = (gameState?.riichiDiscards?.[otherUserId ?? ''] ?? -1) === idx
              return (
                <div
                  key={`od-${idx}`}
                  className={`inline-block ${isRiichiDiscard ? 'rotate-90 my-2' : ''}`}
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

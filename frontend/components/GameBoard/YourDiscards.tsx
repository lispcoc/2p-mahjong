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
    <div style={{
      width: '100%',
      marginBottom: '12px',
      background: '#f7f7f7',
      borderRadius: '0px',
      padding: '12px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <strong style={{ minWidth: '70px', color: '#555' }}>あなたの河</strong>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1px'
        }}>
          {discards.length === 0 ? (
            <span style={{ color: '#999', fontSize: '12px' }}>なし</span>
          ) : (
            discards.map((tile, idx) => {
              const isRiichiDiscard = gameState.riichiDiscards?.[userId] === idx
              return (
                <div 
                  key={`yd-${idx}`} 
                  style={{
                    display: 'inline-block',
                    transform: isRiichiDiscard ? 'rotate(90deg)' : 'none',
                    transformOrigin: 'center',
                    margin: isRiichiDiscard ? '8px 0' : '0'
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

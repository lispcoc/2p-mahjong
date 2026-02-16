import React from 'react'
import { Tile, GameState } from '../../types/GameTypes'
import { TileImage } from '../TileImage'

interface OpponentDiscardsProps {
  discards: Tile[]
  gameState: GameState
  otherUserId?: string
}

export function OpponentDiscards({ discards, gameState, otherUserId }: OpponentDiscardsProps) {
  const otherPlayer = gameState.players.find(p => p.userId === otherUserId)
  const isOtherRiichi = otherPlayer && gameState.riichi && gameState.riichi[otherPlayer.userId]

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
        <strong style={{ minWidth: '70px', color: '#555' }}>相手の河</strong>
        {isOtherRiichi && (
          <div style={{
            backgroundColor: '#ff4444',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '0px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(255,68,68,0.4)',
            animation: 'pulse 2s infinite'
          }}>
            🔴 リーチ中
          </div>
        )}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1px'
        }}>
          {discards.length === 0 ? (
            <span style={{ color: '#999', fontSize: '12px' }}>なし</span>
          ) : (
            discards.map((tile, idx) => {
              const isRiichiDiscard = (gameState?.riichiDiscards?.[otherUserId ?? ''] ?? -1) === idx
              return (
                <div 
                  key={`od-${idx}`} 
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

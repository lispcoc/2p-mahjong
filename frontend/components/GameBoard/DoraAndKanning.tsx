import React from 'react'
import { Tile, GameState } from '../../types/GameTypes'
import { getTileKey } from '../../utils/TileUtils'

interface DoraAndKanningProps {
  gameState: GameState
}

export function DoraAndKanning({ gameState }: DoraAndKanningProps) {
  return (
    <div style={{
      width: '100%',
      marginBottom: '12px',
      background: 'linear-gradient(135deg, #fff9e6 0%, #fffdf7 100%)',
      borderRadius: '0px',
      padding: '16px',
      border: '2px solid #FFD700',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '60px',
      flexWrap: 'wrap'
    }}>
      {/* Dora Indicator */}
      {gameState.dora && gameState.dora.indicators && gameState.dora.indicators.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: '#888', fontWeight: 'bold', minWidth: '70px' }}>ドラ表示牌</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {gameState.dora.indicators.map((tile, idx) => (
              <img
                key={idx}
                src={`/tiles/${getTileKey(tile)}.png`}
                alt={tile.display}
                style={{
                  height: '60px',
                  objectFit: 'contain'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Kanning Wall */}
      {gameState.kanningWall && gameState.kanningWall.remaining > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: '#888', fontWeight: 'bold', minWidth: '70px' }}>嶺上牌</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: gameState.kanningWall.remaining }).map((_, idx) => (
              <img
                key={idx}
                src="/tiles/pai.gif"
                alt="牌の裏"
                style={{
                  height: '60px',
                  objectFit: 'contain'
                }}
              />
            ))}
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
              {gameState.kanningWall.remaining}枚
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

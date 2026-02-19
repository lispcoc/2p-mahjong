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
      gap: '40px',
      flexWrap: 'wrap'
    }}>
      {/* Dora Section */}
      <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
        {/* Dora Indicator & Tile */}
        {gameState.dora && gameState.dora.indicators && gameState.dora.indicators.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            backgroundColor: '#FFFACD',
            borderRadius: '4px',
            border: '1px solid #DAA520'
          }}>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', minWidth: '65px' }}>
              表ドラ表示
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {gameState.dora.indicators.map((tile, idx) => (
                <img
                  key={`dora-ind-${idx}`}
                  src={`/tiles/${getTileKey(tile)}.png`}
                  alt={tile.display}
                  style={{
                    height: '50px',
                    objectFit: 'contain'
                  }}
                />
              ))}
            </div>
            {gameState.dora.tiles && gameState.dora.tiles.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: '#999' }}>→</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {gameState.dora.tiles.map((tile, idx) => (
                    <img
                      key={`dora-tile-${idx}`}
                      src={`/tiles/${getTileKey(tile)}.png`}
                      alt={tile.display}
                      style={{
                        height: '48px',
                        objectFit: 'contain',
                        opacity: 0.8
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Ura Dora Indicator & Tile */}
        {gameState.dora && gameState.dora.uraIndicators && gameState.dora.uraIndicators.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            backgroundColor: '#F0E68C',
            borderRadius: '4px',
            border: '1px solid #CD853F'
          }}>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', minWidth: '65px' }}>
              裏ドラ表示
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {gameState.dora.uraIndicators.map((tile, idx) => (
                <img
                  key={`ura-ind-${idx}`}
                  src={`/tiles/${getTileKey(tile)}.png`}
                  alt={tile.display}
                  style={{
                    height: '50px',
                    objectFit: 'contain'
                  }}
                />
              ))}
            </div>
            {gameState.dora.uraTiles && gameState.dora.uraTiles.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: '#999' }}>→</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {gameState.dora.uraTiles.map((tile, idx) => (
                    <img
                      key={`ura-tile-${idx}`}
                      src={`/tiles/${getTileKey(tile)}.png`}
                      alt={tile.display}
                      style={{
                        height: '48px',
                        objectFit: 'contain',
                        opacity: 0.8
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Kanning Wall */}
      {gameState.kanningWall && gameState.kanningWall.remaining > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          backgroundColor: '#E6F2FF',
          borderRadius: '4px',
          border: '1px solid #4169E1'
        }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', minWidth: '60px' }}>嶺上牌</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: gameState.kanningWall.remaining }).map((_, idx) => (
              <img
                key={`kanning-${idx}`}
                src="/tiles/pai.gif"
                alt="牌の裏"
                style={{
                  height: '50px',
                  objectFit: 'contain'
                }}
              />
            ))}
            <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>
              {gameState.kanningWall.remaining}枚
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

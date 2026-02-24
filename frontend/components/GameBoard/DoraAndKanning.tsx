import React from 'react'
import { Tile, GameState } from '../../types/GameTypes'
import { getTileKey } from '../../utils/TileUtils'

interface DoraAndKanningProps {
  gameState: GameState
}

export function DoraAndKanning({ gameState }: DoraAndKanningProps) {
  return (
    <div className="w-full mb-3 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-none p-4 border-2 border-yellow-400 shadow-md flex justify-center items-center gap-10 flex-wrap">
      {/* Dora Section */}
      <div className="flex gap-[30px] items-center flex-wrap">
        {/* Dora Indicator & Tile */}
        {gameState.dora && gameState.dora.indicators && gameState.dora.indicators.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-yellow-200/80 rounded border border-yellow-600">
            <div className="text-xs text-gray-600 font-bold min-w-[65px]">
              表ドラ表示
            </div>
            <div className="flex gap-1.5 items-center">
              {gameState.dora.indicators.map((tile, idx) => (
                <img
                  key={`dora-ind-${idx}`}
                  src={`/tiles/${getTileKey(tile)}.gif`}
                  alt={tile.display}
                  className="h-[50px] object-contain"
                />
              ))}
            </div>
            {gameState.dora.tiles && gameState.dora.tiles.length > 0 && (
              <>
                <div className="text-xs text-gray-400">→</div>
                <div className="flex gap-1.5 items-center">
                  {gameState.dora.tiles.map((tile, idx) => (
                    <img
                      key={`dora-tile-${idx}`}
                      src={`/tiles/${getTileKey(tile)}.gif`}
                      alt={tile.display}
                      className="h-[48px] object-contain opacity-80"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Ura Dora Indicator & Tile */}
        {gameState.dora && gameState.dora.uraIndicators && gameState.dora.uraIndicators.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-yellow-300/80 rounded border border-yellow-700">
            <div className="text-xs text-gray-600 font-bold min-w-[65px]">
              裏ドラ表示
            </div>
            <div className="flex gap-1.5 items-center">
              {gameState.dora.uraIndicators.map((tile, idx) => (
                <img
                  key={`ura-ind-${idx}`}
                  src={`/tiles/${getTileKey(tile)}.gif`}
                  alt={tile.display}
                  className="h-[50px] object-contain"
                />
              ))}
            </div>
            {gameState.dora.uraTiles && gameState.dora.uraTiles.length > 0 && (
              <>
                <div className="text-xs text-gray-400">→</div>
                <div className="flex gap-1.5 items-center">
                  {gameState.dora.uraTiles.map((tile, idx) => (
                    <img
                      key={`ura-tile-${idx}`}
                      src={`/tiles/${getTileKey(tile)}.gif`}
                      alt={tile.display}
                      className="h-[48px] object-contain opacity-80"
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
        <div className="flex items-center gap-3 p-3 bg-blue-100 rounded border border-blue-600">
          <div className="text-xs text-gray-600 font-bold min-w-[60px]">嶺上牌</div>
          <div className="flex gap-1 items-center">
            {Array.from({ length: gameState.kanningWall.remaining }).map((_, idx) => (
              <img
                key={`kanning-${idx}`}
                src="/tiles/pai.gif"
                alt="牌の裏"
                className="h-[50px] object-contain"
              />
            ))}
            <span className="text-xs text-gray-600 ml-1">
              {gameState.kanningWall.remaining}枚
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

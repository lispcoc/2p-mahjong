import React from 'react'
import { GameState } from '../../types/GameTypes'

interface GameHeaderProps {
  roomId: string
  userId: string
  gameState: GameState
  isGrayscale: boolean
  isAddingCPU: boolean
  onToggleGrayscale: () => void
  onAddCPU: () => void
  onBack: () => void
}

export function GameHeader({
  roomId,
  userId,
  gameState,
  isGrayscale,
  isAddingCPU,
  onToggleGrayscale,
  onAddCPU,
  onBack,
}: GameHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-5">
      <div>
        <h1>ルームID: {roomId}</h1>
        <p>ステータス: {gameState.status} | userId: {userId}</p>
      </div>
      <div className="flex gap-2.5">
        {gameState.status === 'waiting' && gameState.players.length < 2 && (
          <button
            onClick={onAddCPU}
            disabled={isAddingCPU}
            className={`px-4 py-2 text-white border-2 border-white rounded-none font-bold text-sm cursor-pointer transition-all ${isAddingCPU ? 'bg-gray-600 cursor-not-allowed' : 'bg-mahjong-dark-secondary hover:bg-green-800'}`}
          >
            {isAddingCPU ? 'CPU追加中...' : 'CPU追加'}
          </button>
        )}
        <button
          onClick={onToggleGrayscale}
          className="px-4 py-2 bg-mahjong-dark-tertiary text-white border-2 border-white rounded-none font-bold text-sm cursor-pointer hover:bg-green-900"
        >
          {isGrayscale ? '彩度ON' : '彩度OFF'}
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-red-900 text-white border-2 border-white rounded-none font-bold text-sm cursor-pointer hover:bg-red-800"
        >
          戻る
        </button>
      </div>
    </div>
  )
}

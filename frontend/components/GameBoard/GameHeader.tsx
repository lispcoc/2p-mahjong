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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <div>
        <h1>ルームID: {roomId}</h1>
        <p>ステータス: {gameState.status} | userId: {userId}</p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {gameState.status === 'waiting' && gameState.players.length < 2 && (
          <button
            onClick={onAddCPU}
            disabled={isAddingCPU}
            style={{
              padding: '8px 16px',
              backgroundColor: isAddingCPU ? '#555' : '#3d6b20',
              color: 'white',
              border: '2px solid #ffffff',
              borderRadius: '0px',
              cursor: isAddingCPU ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {isAddingCPU ? 'CPU追加中...' : 'CPU追加'}
          </button>
        )}
        <button
          onClick={onToggleGrayscale}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1a2e0a',
            color: 'white',
            border: '2px solid #ffffff',
            borderRadius: '0px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          {isGrayscale ? '彩度ON' : '彩度OFF'}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8b1a1a',
            color: 'white',
            border: '2px solid #ffffff',
            borderRadius: '0px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          戻る
        </button>
      </div>
    </div>
  )
}

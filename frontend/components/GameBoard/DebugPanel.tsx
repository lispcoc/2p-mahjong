import React from 'react'

interface DebugPanelProps {
  wsReadyState: number | undefined
  gameStatus: string
  playersCount: number
  currentTurn?: string
  userId: string
  isYourTurn: boolean
  wall?: number
}

export function DebugPanel({
  wsReadyState,
  gameStatus,
  playersCount,
  currentTurn,
  userId,
  isYourTurn,
  wall,
}: DebugPanelProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-200 border-2 border-yellow-600 border-b-0 rounded-none p-3 text-xs font-mono max-h-[150px] overflow-auto z-[999] shadow-lg">
      <details>
        <summary className="cursor-pointer mb-2 font-bold text-gray-500">
          🔧 デバッグ情報
        </summary>
        <div className="mt-2 whitespace-pre-wrap break-words text-gray-600">
WebSocket: {wsReadyState === 1 ? '✅' : '❌'} | Status: {gameStatus} | Players: {playersCount} | Turn: {currentTurn} | userId: {userId} | yourTurn: {isYourTurn ? '✓' : '✗'} | Wall: {wall}
        </div>
      </details>
    </div>
  )
}

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
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fffacd',
      border: '2px solid #daa520',
      borderBottom: 'none',
      borderRadius: '0px',
      padding: '12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxHeight: '150px',
      overflow: 'auto',
      zIndex: 999,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.15)'
    }}>
      <details>
        <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold', color: '#888' }}>
          🔧 デバッグ情報
        </summary>
        <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#666' }}>
WebSocket: {wsReadyState === 1 ? '✅' : '❌'} | Status: {gameStatus} | Players: {playersCount} | Turn: {currentTurn} | userId: {userId} | yourTurn: {isYourTurn ? '✓' : '✗'} | Wall: {wall}
        </div>
      </details>
    </div>
  )
}

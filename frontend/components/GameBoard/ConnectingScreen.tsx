import React from 'react'
import { getDebugLogs } from '../../utils/DebugUtils'

interface ConnectingScreenProps {
  playerName: string
  roomId: string
  error: string
  wsReadyState: number | undefined
}

export function ConnectingScreen({ playerName, roomId, error, wsReadyState }: ConnectingScreenProps) {
  const debugLogs = getDebugLogs()
  const lastLog = debugLogs[debugLogs.length - 1]?.message || 'No logs yet'

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>ゲームに接続中...</p>
      <div style={{ marginBottom: '15px', fontSize: '14px', fontWeight: 'bold', color: '#2c5f2d' }}>
        最新イベント: {lastLog}
      </div>
      <div style={{ 
        textAlign: 'left', 
        color: '#666', 
        fontSize: '12px',
        background: '#f5f5f5',
        padding: '10px',
        borderRadius: '0px',
        marginBottom: '10px',
        fontFamily: 'monospace',
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        <div><strong>プレイヤー:</strong> {playerName}</div>
        <div><strong>ルーム:</strong> {roomId}</div>
        <div><strong>エラー:</strong> {error || 'なし'}</div>
        <div><strong>WebSocket状態:</strong> {wsReadyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)</div>
        <div><strong>gameState:</strong> ❌ null（待機中）</div>
      </div>
      <details style={{
        marginTop: '10px',
        textAlign: 'left',
        fontSize: '11px',
        fontFamily: 'monospace'
      }}>
        <summary style={{ cursor: 'pointer', marginBottom: '5px' }}>
          📋 デバッグログ ({debugLogs.length}件)
        </summary>
        <div style={{
          background: '#f0f0f0',
          padding: '5px',
          borderRadius: '0px',
          maxHeight: '200px',
          overflow: 'auto',
          fontSize: '10px'
        }}>
          {debugLogs.map((log: any, idx: number) => (
            <div key={idx} style={{ marginBottom: '2px', wordBreak: 'break-word' }}>
              {log.message}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

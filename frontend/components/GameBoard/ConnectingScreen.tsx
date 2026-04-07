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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'ws://localhost:3001'

  return (
    <div className="p-5 text-center">
      <p className="text-lg mb-5">ゲームに接続中...</p>
      <div className="mb-[15px] text-sm font-bold text-green-900">
        最新イベント: {lastLog}
      </div>
      <div className="text-left text-gray-600 text-xs bg-gray-100 p-2.5 rounded-none mb-2.5 font-mono max-h-[200px] overflow-auto">
        <div><strong>プレイヤー:</strong> {playerName}</div>
        <div><strong>ルーム:</strong> {roomId}</div>
        <div><strong>バックエンドURL:</strong> {backendUrl}</div>
        <div><strong>エラー:</strong> {error || 'なし'}</div>
        <div><strong>WebSocket状態:</strong> {wsReadyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)</div>
        <div><strong>gameState:</strong> ❌ null（待機中）</div>
      </div>
      <details className="mt-2.5 text-left text-xs font-mono">
        <summary className="cursor-pointer mb-1.5">
          📋 デバッグログ ({debugLogs.length}件)
        </summary>
        <div className="bg-gray-200 p-1.5 rounded-none max-h-[200px] overflow-auto text-[10px]">
          {debugLogs.map((log: any, idx: number) => (
            <div key={idx} className="mb-0.5 break-words">
              {log.message}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

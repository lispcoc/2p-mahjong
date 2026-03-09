import React, { useState, useEffect } from 'react'

interface MatchHistoryEntry {
  endTime: string
  scores: Record<string, number>
  players: Array<{ userId: string; playerName: string }>
}

interface MatchHistoryModalProps {
  roomId: string
  onClose: () => void
}

export function MatchHistoryModal({ roomId, onClose }: MatchHistoryModalProps) {
  const [history, setHistory] = useState<MatchHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
    fetch(`${backendUrl}/api/rooms/${roomId}/match-history`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setHistory(data.matchHistory ?? [])
        setLoading(false)
      })
      .catch(err => {
        setError(`取得に失敗しました: ${err.message}`)
        setLoading(false)
      })
  }, [roomId])

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return iso
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[2000]">
      <div className="bg-white p-5 rounded-xl max-w-lg w-[95vw] max-h-[85vh] overflow-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0 text-gray-800 text-xl font-bold">対戦履歴</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded cursor-pointer border-none text-sm"
          >
            閉じる
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-500 py-8">履歴がありません</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...history].reverse().map((entry, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 font-medium">
                  終了時刻: {formatTime(entry.endTime)}
                </div>
                <div className="flex">
                  {entry.players.map((player, pIdx) => {
                    const score = entry.scores[player.userId] ?? 0
                    return (
                      <div
                        key={player.userId}
                        className={`flex-1 px-4 py-3 text-center ${pIdx === 0 ? 'border-r border-gray-200' : ''}`}
                      >
                        <div className="text-sm font-bold text-gray-700 mb-1 truncate">{player.playerName}</div>
                        <div className={`text-lg font-bold ${score >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {score.toLocaleString()}点
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useEffect, useState } from 'react'

interface YakumanRecord {
  date: string
  playerName: string
  yakuNames: string
  scoreType: string
}

interface YakumanListModalProps {
  onClose: () => void
}

export function YakumanListModal({ onClose }: YakumanListModalProps) {
  const [records, setRecords] = useState<YakumanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
    fetch(`${backendUrl}/yakumanRecords`)
      .then(res => res.json())
      .then(data => {
        setRecords(Array.isArray(data.records) ? data.records : [])
      })
      .catch(() => setError('役満記録の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
      <div
        className="bg-mahjong-dark-primary p-4 max-w-[95vw] w-[700px] max-h-[85vh] overflow-auto shadow-2xl border-4 border-yellow-400"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-yellow-300 m-0">🏆 役満達成記録</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-2xl leading-none bg-transparent border-0 cursor-pointer px-2"
          >
            ✕
          </button>
        </div>

        {loading && (
          <p className="text-gray-300 text-center py-8">読み込み中...</p>
        )}

        {!loading && error && (
          <p className="text-red-400 text-center py-8">{error}</p>
        )}

        {!loading && !error && records.length === 0 && (
          <p className="text-gray-400 text-center py-8 italic">役満達成記録はまだありません</p>
        )}

        {!loading && !error && records.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-yellow-400">
                <th className="text-left py-2 px-3 text-yellow-300 font-bold w-[110px]">日付</th>
                <th className="text-left py-2 px-3 text-yellow-300 font-bold w-[130px]">プレイヤー</th>
                <th className="text-left py-2 px-3 text-yellow-300 font-bold">役名</th>
                <th className="text-right py-2 px-3 text-yellow-300 font-bold w-[110px]">種別</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-600 ${idx % 2 === 0 ? 'bg-mahjong-dark-secondary/40' : ''}`}
                >
                  <td className="py-2 px-3 text-gray-300">{record.date}</td>
                  <td className="py-2 px-3 text-white font-bold">{record.playerName}</td>
                  <td className="py-2 px-3 text-white">{record.yakuNames}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-yellow-300 font-bold text-xs">{record.scoreType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

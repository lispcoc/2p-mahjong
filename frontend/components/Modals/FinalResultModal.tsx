import React from 'react'
import { GameState } from '../../types/GameTypes'

interface FinalResultModalProps {
  finalResults: any[] | null
  gameState: GameState
  onBack: () => void
  onRequestRematch: () => void
  rematchRequested: boolean
  opponentRematchRequested: boolean
}

export function FinalResultModal({ finalResults, gameState, onBack, onRequestRematch, rematchRequested, opponentRematchRequested }: FinalResultModalProps) {
  if (!finalResults) return null

  return (
    <div className="fixed inset-0 bg-black/85 flex justify-center items-center z-[2000]">
      <div className="bg-white p-[25px] rounded-[12px] max-w-[90vw] w-[1000px] max-h-[90vh] overflow-auto shadow-2xl">
        <h2 className="mt-0 text-[#ff6b6b] text-center text-2xl mb-5">
          ゲーム終了
        </h2>

        {/* Score History Table */}
        <div className="mb-5 overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 border border-gray-300 font-bold text-sm text-center">局</th>
                {gameState?.players && gameState.players.map((player: any) => (
                  <th key={player.userId} className="p-3 border border-gray-300 font-bold text-sm text-center">
                    {player.playerName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finalResults.map((round: any, idx: number) => {
                // Calculate score changes for each player
                const scoreChanges: Record<string, number> = {}
                if (round.previousScores && round.scores) {
                  Object.keys(round.scores).forEach((userId: string) => {
                    const prevScore = round.previousScores[userId] ?? 25000
                    const currentScore = round.scores[userId] ?? 25000
                    scoreChanges[userId] = currentScore - prevScore
                  })
                }
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2.5 border border-gray-300 text-center font-bold">
                      {round.roundName || `${round.round}局`}
                    </td>
                    {gameState?.players && gameState.players.map((player: any) => {
                      const change = scoreChanges[player.userId] ?? 0
                      return (
                        <td 
                          key={player.userId} 
                          className={`p-2.5 border border-gray-300 text-center font-bold ${
                            change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-600'
                          }`}
                        >
                          {change > 0 ? '+' : ''}{change.toLocaleString()}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* Final Score Row */}
              <tr className="bg-yellow-100 border-t-[3px] border-yellow-400">
                <td className="p-3 border border-gray-300 text-center font-bold text-base">
                  最終得点
                </td>
                {gameState?.players && gameState.players.map((player: any) => {
                  const finalScore = gameState?.scores?.[player.userId] ?? 0
                  return (
                    <td 
                      key={player.userId} 
                      className={`p-3 border border-gray-300 text-center font-bold text-base ${
                        finalScore < 0 ? 'text-red-500' : 'text-green-500'
                      }`}
                    >
                      {finalScore.toLocaleString()}点
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {opponentRematchRequested && !rematchRequested && (
            <div className="text-center text-blue-600 font-bold text-sm bg-blue-50 rounded py-2">
              🔄 相手がもう一戦を希望しています！
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onRequestRematch}
              disabled={rematchRequested}
              className={`px-6 py-3 text-base font-bold rounded text-white cursor-pointer flex-1 border-none ${
                rematchRequested
                  ? 'bg-blue-300 cursor-not-allowed'
                  : opponentRematchRequested
                    ? 'bg-blue-600 hover:bg-blue-700 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {rematchRequested ? '相手の同意を待っています...' : '同じメンバーでもう一戦'}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 text-base font-bold rounded bg-green-500 text-white cursor-pointer flex-1 hover:bg-green-600 border-none"
            >
              タイトルに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

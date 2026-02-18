import React from 'react'
import { GameState } from '../../types/GameTypes'

interface FinalResultModalProps {
  finalResults: any[] | null
  gameState: GameState
  onBack: () => void
}

export function FinalResultModal({ finalResults, gameState, onBack }: FinalResultModalProps) {
  if (!finalResults) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '12px',
        maxWidth: '90vw',
        width: '1000px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{
          marginTop: 0,
          color: '#ff6b6b',
          textAlign: 'center',
          fontSize: '24px',
          marginBottom: '20px',
        }}>
          ゲーム終了
        </h2>

        {/* Score History Table */}
        <div style={{
          marginBottom: '20px',
          overflowX: 'auto',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  textAlign: 'center',
                }}>局</th>
                {gameState?.players && gameState.players.map((player: any) => (
                  <th key={player.userId} style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'center',
                  }}>
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
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}>
                      {round.roundName || `${round.round}局`}
                    </td>
                    {gameState?.players && gameState.players.map((player: any) => {
                      const change = scoreChanges[player.userId] ?? 0
                      return (
                        <td key={player.userId} style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: change > 0 ? '#4CAF50' : change < 0 ? '#f44336' : '#666',
                        }}>
                          {change > 0 ? '+' : ''}{change.toLocaleString()}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* Final Score Row */}
              <tr style={{
                backgroundColor: '#fff9e6',
                borderTop: '3px solid #FFD700',
              }}>
                <td style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}>
                  最終得点
                </td>
                {gameState?.players && gameState.players.map((player: any) => {
                  const finalScore = gameState?.scores?.[player.userId] ?? 0
                  return (
                    <td key={player.userId} style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: finalScore < 0 ? '#f44336' : '#4CAF50',
                    }}>
                      {finalScore.toLocaleString()}点
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <button
          onClick={onBack}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          タイトルに戻る
        </button>
      </div>
    </div>
  )
}

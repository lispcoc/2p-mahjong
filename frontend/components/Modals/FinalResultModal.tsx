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
        backgroundColor: '#2d5016',
        padding: '25px',
        borderRadius: '0px',
        maxWidth: '90vw',
        width: '1000px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        border: '3px solid #ffffff',
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

        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#1a2e0a',
          borderRadius: '0px',
          border: '2px solid #ffffff',
          textAlign: 'center',
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff' }}>最終得点</h3>
          {gameState?.players && gameState.players.map((player: any) => (
            <div key={player.userId} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#ffffff',
            }}>
              <span>{player.playerName}</span>
              <span style={{ 
                color: (gameState?.scores?.[player.userId] ?? 0) < 0 ? '#ff6b6b' : '#90ee90' 
              }}>
                {((gameState?.scores?.[player.userId]) ?? 0)?.toLocaleString()}点
              </span>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '20px',
        }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '15px', color: '#ffffff' }}>局の履歴</h3>
          {finalResults.map((round: any, idx: number) => {
            const winnerName = gameState?.players?.find((p: any) => p.userId === round.winner)?.playerName || round.winner
            return (
              <div key={idx} style={{
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: '#3d6b20',
                borderRadius: '0px',
                border: '2px solid #ffffff',
              }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  color: '#ffffff',
                }}>
                  {round.roundName || `第${round.round}局`} - {round.winType}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '5px', color: '#e0e0e0' }}>
                  勝者: {winnerName}
                </div>
                {round.scoreResult && (
                  <div style={{ fontSize: '13px', color: '#a0a0a0' }}>
                    {round.scoreResult.han}飜 {round.scoreResult.fu}符 - {round.scoreResult.score}点
                    {round.scoreResult.yaku && round.scoreResult.yaku.length > 0 && (
                      <div style={{ marginTop: '5px' }}>
                        役: {round.scoreResult.yaku.map((y: any) => `${y.name}(${y.han}飜)`).join(', ')}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: '13px', marginTop: '8px', color: '#e0e0e0' }}>
                  {Object.entries(round.scores).map(([name, score]: [string, any]) => (
                    <span key={name} style={{ marginRight: '15px' }}>
                      {name}: {score?.toLocaleString()}点
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={onBack}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            border: '2px solid #ffffff',
            borderRadius: '0px',
            backgroundColor: '#1a2e0a',
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

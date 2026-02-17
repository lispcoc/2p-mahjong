import React from 'react'
import { GameState } from '../../types/GameTypes'

const windNames: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
}

const getRoundLabel = (state: GameState) => {
  if (state.roundName) return state.roundName
  const wind = windNames[state.roundWind ?? 1] || '東'
  const number = state.roundNumber ?? state.currentRound ?? 1
  return `${wind}${number}局`
}

const getRoundWindLabel = (state: GameState) => {
  return windNames[state.roundWind ?? 1] || '東'
}

const getSeatWindLabel = (state: GameState, userId: string) => {
  const seatWind = state.seatWinds?.[userId]
  return windNames[seatWind ?? 0] || '不明'
}

interface GameInfoProps {
  gameState: GameState
  userId: string
  playerName: string
  otherPlayerName?: string
  otherUserId?: string
  autoDiscardTimeLeft: number | null
}

export function GameInfo({
  gameState,
  userId,
  playerName,
  otherPlayerName,
  otherUserId,
  autoDiscardTimeLeft,
}: GameInfoProps) {
  return (
    <div style={{
      width: '100%',
      marginBottom: '12px',
      background: '#2d5016',
      borderRadius: '0px',
      padding: '16px',
      border: '2px solid #ffffff',
      boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      gap: '20px'
    }}>
      {/* Current Round */}
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        background: '#3d6b20',
        borderRadius: '0px',
        border: '2px solid #ffffff',
        minWidth: '120px'
      }}>
        <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>局数</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
          {getRoundLabel(gameState)}
        </div>
      </div>

      {/* Round/Seat Wind */}
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        background: '#3d6b20',
        borderRadius: '0px',
        border: '2px solid #ffffff',
        minWidth: '140px'
      }}>
        <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>場/自風</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
          場風 {getRoundWindLabel(gameState)} / 自風 {getSeatWindLabel(gameState, userId)}
        </div>
      </div>

      {/* Wall Remaining */}
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        background: '#3d6b20',
        borderRadius: '0px',
        border: '2px solid #ffffff',
        minWidth: '120px'
      }}>
        <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>壁牌</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
          残り {gameState.wall || 0}枚
        </div>
      </div>

      {/* Auto-discard countdown */}
      {autoDiscardTimeLeft !== null && autoDiscardTimeLeft > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          background: autoDiscardTimeLeft <= 3 ? '#3d1a1a' : '#3d2e0a',
          borderRadius: '0px',
          border: `2px solid ${autoDiscardTimeLeft <= 3 ? '#ff6b6b' : '#ffcc66'}`,
          minWidth: '120px',
          animation: autoDiscardTimeLeft <= 3 ? 'pulse 1s infinite' : 'none'
        }}>
          <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>自動ツモ切り</div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: autoDiscardTimeLeft <= 3 ? '#ff6b6b' : '#ffcc66'
          }}>
            {autoDiscardTimeLeft}秒
          </div>
        </div>
      )}

      {/* Scores */}
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        background: '#3d6b20',
        borderRadius: '0px',
        border: '2px solid #ffffff',
        minWidth: '200px'
      }}>
        <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>得点</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-around', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#e0e0e0' }}>あなた ({playerName})</div>
            <div style={{ color: '#90ee90' }}>
              {((gameState?.scores?.[userId]) ?? 25000)?.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#e0e0e0' }}>相手 ({otherPlayerName || '---'})</div>
            <div style={{ color: '#ff6b6b' }}>
              {otherUserId ? ((gameState?.scores?.[otherUserId]) ?? 25000)?.toLocaleString() : '---'}
            </div>
          </div>
        </div>
      </div>

      {/* Riichi Deposits */}
      {(gameState.riichiDeposits ?? 0) > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          background: '#3d6b20',
          borderRadius: '0px',
          border: '2px solid #ffffff',
          minWidth: '100px'
        }}>
          <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>供託</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffcc66' }}>
            {(gameState.riichiDeposits ?? 0).toLocaleString()}点
          </div>
        </div>
      )}
    </div>
  )
}

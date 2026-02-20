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
    <div className="w-full mb-3 bg-mahjong-dark-secondary rounded-none p-4 border-2 border-white shadow-lg flex justify-around items-center gap-5 flex-wrap">
      {/* Current Round */}
      <div className="text-center px-4 py-2 bg-mahjong-dark-secondary rounded-none border-2 border-white min-w-[120px]">
        <div className="text-xs text-gray-300 mb-1">局数</div>
        <div className="text-2xl font-bold text-white">
          {getRoundLabel(gameState)}
        </div>
      </div>

      {/* Round/Seat Wind */}
      <div className="text-center px-4 py-2 bg-mahjong-dark-secondary rounded-none border-2 border-white min-w-[140px]">
        <div className="text-xs text-gray-300 mb-1">場/自風</div>
        <div className="text-sm font-bold text-white">
          場風 {getRoundWindLabel(gameState)} / 自風 {getSeatWindLabel(gameState, userId)}
        </div>
      </div>

      {/* Wall Remaining */}
      <div className="text-center px-4 py-2 bg-mahjong-dark-secondary rounded-none border-2 border-white min-w-[120px]">
        <div className="text-xs text-gray-300 mb-1">壁牌</div>
        <div className="text-2xl font-bold text-white">
          残り {gameState.wall || 0}枚
        </div>
      </div>

      {/* Auto-discard countdown */}
      {autoDiscardTimeLeft !== null && autoDiscardTimeLeft > 0 && (
        <div className={`text-center px-4 py-2 rounded-none border-2 min-w-[120px] ${autoDiscardTimeLeft <= 3 ? 'bg-red-900/50 border-red-400 animate-pulse' : 'bg-yellow-900/50 border-yellow-400'}`}>
          <div className="text-xs text-gray-300 mb-1">自動ツモ切り</div>
          <div className={`text-2xl font-bold ${autoDiscardTimeLeft <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>
            {autoDiscardTimeLeft}秒
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="text-center px-4 py-2 bg-mahjong-dark-secondary rounded-none border-2 border-white min-w-[200px]">
        <div className="text-xs text-gray-300 mb-1">得点</div>
        <div className="text-base font-bold flex justify-around gap-[15px]">
          <div>
            <div className="text-xs text-gray-300">あなた ({playerName})</div>
            <div className="text-green-300">
              {((gameState?.scores?.[userId]) ?? 25000)?.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300">相手 ({otherPlayerName || '---'})</div>
            <div className="text-red-400">
              {otherUserId ? ((gameState?.scores?.[otherUserId]) ?? 25000)?.toLocaleString() : '---'}
            </div>
          </div>
        </div>
      </div>

      {/* Riichi Deposits */}
      {(gameState.riichiDeposits ?? 0) > 0 && (
        <div className="text-center px-4 py-2 bg-mahjong-dark-secondary rounded-none border-2 border-white min-w-[100px]">
          <div className="text-xs text-gray-300 mb-1">供託</div>
          <div className="text-lg font-bold text-yellow-400">
            {(gameState.riichiDeposits ?? 0).toLocaleString()}点
          </div>
        </div>
      )}
    </div>
  )
}

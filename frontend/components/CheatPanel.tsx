'use client'

import React, { useState } from 'react'
import { CheatType, CheatResult, CheatAccusationResult, CHEAT_DEFINITIONS, Tile } from '../types/GameTypes'
import { TileInline } from './TileInline'

interface CheatPanelProps {
  isOpen: boolean
  onClose: () => void
  onCheat: (cheatType: CheatType, params?: any) => void
  onAccuse: () => void
  /** 相手の有効イカサマ数（猶予ターン内のもの） */
  opponentActiveCheatCount: number
  /** 最後のイカサマ結果（覗き見結果など） */
  lastCheatResult: CheatResult | null
  /** 最後の指摘結果 */
  lastAccusationResult: CheatAccusationResult | null
  /** ゲーム進行中か */
  isPlaying: boolean  /** 自分の今局イカサマ実行済み回数 */
  myCheatCount?: number
  /** 自分の今局指摘済み回数 */
  myAccusationCount?: number
  /** 1ゲームあたりのイカサマ実行上限 */
  maxCheats?: number
  /** 1ゲームあたりの指摘上限 */
  maxAccusations?: number}

export function CheatPanel({
  isOpen,
  onClose,
  onCheat,
  onAccuse,
  opponentActiveCheatCount,
  lastCheatResult,
  lastAccusationResult,
  isPlaying,
  myCheatCount = 0,
  myAccusationCount = 0,
  maxCheats = 3,
  maxAccusations = 3,
}: CheatPanelProps) {
  const [showResult, setShowResult] = useState(false)

  if (!isOpen) return null

  const handleCheat = (cheatType: CheatType) => {
    onCheat(cheatType)
    setShowResult(true)
  }

  const handleAccuse = () => {
    onAccuse()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border-2 border-yellow-500 rounded-xl p-4 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-yellow-400 font-bold text-sm flex items-center gap-2">
            イカサマ
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>

        {/* イカサマ選択ボタン */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="text-gray-500 text-[10px] text-right">
            イカサマ実行: 残り{maxCheats - myCheatCount}回
          </div>
          {CHEAT_DEFINITIONS.map((cheat) => {
            const cheatLimitReached = myCheatCount >= maxCheats
            return (
              <button
                key={cheat.type}
                onClick={() => handleCheat(cheat.type)}
                disabled={!isPlaying || cheatLimitReached}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all
                  ${isPlaying && !cheatLimitReached
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-yellow-500 cursor-pointer'
                    : 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <span className="text-lg">{cheat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-bold">{cheat.name}</div>
                  <div className="text-gray-400 text-[10px]">{cheat.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* イカサマ結果表示 */}
        {showResult && lastCheatResult && (
          <div className={`mb-3 p-2.5 rounded-lg border text-xs ${
            lastCheatResult.success
              ? 'bg-green-900/50 border-green-600 text-green-300'
              : 'bg-red-900/50 border-red-600 text-red-300'
          }`}>
            {lastCheatResult.success ? (
              <>
                <div className="font-bold mb-1">イカサマ成功</div>
                {lastCheatResult.data?.tiles && lastCheatResult.data.tiles.length > 0 && (
                  <div>
                    <div className="text-gray-300 mb-1">結果:</div>
                    <div className="flex gap-0.5 flex-wrap">
                      {lastCheatResult.data.tiles.map((tile: Tile, idx: number) => (
                        <TileInline key={idx} tile={tile} height={28} width={20} className="rounded shadow-sm" />
                      ))}
                    </div>
                  </div>
                )}
                {lastCheatResult.data?.message && (
                  <div className="text-gray-300">{lastCheatResult.data.message}</div>
                )}
              </>
            ) : (
              <div>❌ {lastCheatResult.message}</div>
            )}
          </div>
        )}

        {/* 指摘結果表示 */}
        {lastAccusationResult && (
          <div className={`mb-3 p-2.5 rounded-lg border text-xs ${
            lastAccusationResult.caught
              ? 'bg-yellow-900/50 border-yellow-500 text-yellow-300'
              : 'bg-red-900/50 border-red-600 text-red-300'
          }`}>
            <div className="font-bold">{lastAccusationResult.message}</div>
          </div>
        )}

        {/* 区切り線 */}
        <div className="border-t border-gray-700 my-3" />

        {/* イカサマ指摘ボタン */}
        <button
          onClick={handleAccuse}
          disabled={!isPlaying || myAccusationCount >= maxAccusations}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border font-bold text-sm transition-all
            ${isPlaying && myAccusationCount < maxAccusations
              ? 'bg-red-900 border-red-500 text-red-200 hover:bg-red-800 cursor-pointer'
              : 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
          🚨 イカサマ指摘
          {opponentActiveCheatCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {opponentActiveCheatCount}
            </span>
          )}
        </button>
        <div className="text-gray-500 text-[10px] text-center mt-1">
          成功: 相手が満貫払い — 残り{maxAccusations - myAccusationCount}回
        </div>
      </div>
    </div>
  )
}

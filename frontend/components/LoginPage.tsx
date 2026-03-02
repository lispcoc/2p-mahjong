'use client'

import React, { useState } from 'react'
import { useWhiteMode } from '../contexts/WhiteModeContext'

interface LoginPageProps {
  onLogin: (name: string) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('mahjong-playerName') || ''
    } catch {
      return ''
    }
  })
  const [error, setError] = useState('')
  const { whiteMode, toggleWhiteMode } = useWhiteMode()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = playerName.trim()

    if (!trimmedName) {
      setError('プレイヤー名を入力してください')
      return
    }

    if (trimmedName.length > 20) {
      setError('プレイヤー名は20文字以内にしてください')
      return
    }

    setError('')
    onLogin(trimmedName)
  }

  return (
    <div className="flex justify-center items-center h-[100vh] h-[100dvh] overflow-hidden bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] p-5">
      <button
        onClick={toggleWhiteMode}
        className="fixed top-3 right-3 z-50 px-3 py-1.5 text-xs font-bold border-2 border-white rounded cursor-pointer transition-colors bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06]"
      >
        {whiteMode ? '🟢 緑' : '⬜ 白'}
      </button>
      <div className="bg-[#2d5016] border-2 border-white shadow-xl p-4 w-full max-w-[400px]">
        <div className="text-center text-4xl mb-8 text-[#ffffff]">二人麻雀</div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="playerName" className="font-bold text-[#ffffff] text-sm">
              プレイヤー名
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              className="px-4 py-3 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a]"
              autoFocus
            />
          </div>
          {error && <p className="text-[#ff6b6b] text-sm mt-0">{error}</p>}
          <button type="submit" className="px-3 py-3 bg-[#1a2e0a] text-[#ffffff] border-2 border-white text-base font-bold cursor-pointer transition-colors hover:bg-[#0f1a06] active:scale-95">
            開始
          </button>
          <div className="text-xs text-[#ffffff] text-center">
            アカウントは不要です。
          </div>
        </form>
      </div>
    </div>
  )
}

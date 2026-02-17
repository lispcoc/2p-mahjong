'use client'

import React, { useState } from 'react'

interface LoginPageProps {
  onLogin: (name: string) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState('')

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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] p-5">
      <div className="bg-[#2d5016] border-4 border-white shadow-xl p-10 w-full max-w-[400px]">
        <h1 className="text-center text-4xl mb-8 text-[#ffffff] font-bold">二人麻雀</h1>
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
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import React, { useEffect, useState } from 'react'

interface HomePageProps {
  playerName: string
  onCreateRoom: (roomId: string) => void
  onJoinRoom: (roomId: string) => void
  onLogout: () => void
  shouldRefresh?: boolean
  onRefreshed?: () => void
}

interface RoomInfo {
  roomId: string
  status: string
  playersCount: number
}

export default function HomePage({
  playerName,
  onCreateRoom,
  onJoinRoom,
  onLogout,
  shouldRefresh = false,
  onRefreshed,
}: HomePageProps) {
  const defaultInitialScore = 25000
  const defaultWallTiles = 70
  const minWallTiles = 30
  const maxWallTiles = 136
  const [joinRoomId, setJoinRoomId] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [initialScore, setInitialScore] = useState(defaultInitialScore)
  const [wallTiles, setWallTiles] = useState(defaultWallTiles)
  const [oneRoundMatch, setOneRoundMatch] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

  const fetchRooms = async () => {
    setRoomsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL_HTTP}/api/rooms`)
      if (!response.ok) {
        throw new Error('ルーム一覧の取得に失敗しました')
      }
      const data = await response.json()
      setRooms(Array.isArray(data.rooms) ? data.rooms : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ルーム一覧の取得に失敗しました'
      )
    } finally {
      setRoomsLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    // Refresh rooms list when returning from game
    if (shouldRefresh) {
      console.log('🔄 Refreshing room list...')
      fetchRooms()
      onRefreshed?.()
    }
  }, [shouldRefresh, onRefreshed])

  const handleOpenCreateRoomModal = () => {
    setError('')
    setIsRuleModalOpen(true)
  }

  const clampWallTiles = (value: number) => {
    if (!Number.isFinite(value)) return defaultWallTiles
    return Math.min(maxWallTiles, Math.max(minWallTiles, Math.floor(value)))
  }

  const sanitizeInitialScore = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return defaultInitialScore
    return Math.floor(value)
  }

  const handleConfirmCreateRoom = async () => {
    setIsCreating(true)
    setError('')

    try {
      const sanitizedInitialScore = sanitizeInitialScore(initialScore)
      const sanitizedWallTiles = clampWallTiles(wallTiles)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL_HTTP}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialScore: sanitizedInitialScore,
          wallTiles: sanitizedWallTiles,
          oneRoundMatch: oneRoundMatch,
        }),
      })

      if (!response.ok) {
        throw new Error('ルーム作成に失敗しました')
      }

      const data = await response.json()
      setIsRuleModalOpen(false)
      onCreateRoom(data.roomId)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ルーム作成に失敗しました'
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelCreateRoom = () => {
    setIsRuleModalOpen(false)
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedRoomId = joinRoomId.trim().toUpperCase()

    if (!trimmedRoomId) {
      setError('ルームIDを入力してください')
      return
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL_HTTP}/api/rooms/${trimmedRoomId}`
      )

      if (!response.ok) {
        throw new Error('ルームが見つかりません')
      }

      onJoinRoom(trimmedRoomId)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ルーム参加に失敗しました'
      )
    }
  }

  const handleJoinFromList = async (roomId: string) => {
    setError('')
    onJoinRoom(roomId)
  }

  const canJoinRoom = (room: RoomInfo): boolean => {
    // Check if this is the user's current/saved room
    try {
      const savedSession = localStorage.getItem('mahjong-session')
      if (savedSession) {
        const session = JSON.parse(savedSession)
        if (session.roomId === room.roomId && session.playerName === playerName) {
          // Allow joining if it's the user's room (even if full/playing)
          return true
        }
      }
    } catch (err) {
      console.error('Error checking session:', err)
    }

    // Otherwise, only allow joining waiting rooms with available slots
    return room.playersCount < 2 && room.status === 'waiting'
  }

  const getButtonText = (room: RoomInfo): string => {
    // Check if this is the user's current/saved room
    try {
      const savedSession = localStorage.getItem('mahjong-session')
      if (savedSession) {
        const session = JSON.parse(savedSession)
        if (session.roomId === room.roomId && session.playerName === playerName) {
          return '再入室'
        }
      }
    } catch (err) {
      console.error('Error checking session:', err)
    }

    // Otherwise, standard messages
    if (room.playersCount >= 2) return '満員'
    if (room.status !== 'waiting') return '入室不可'
    return '入室'
  }

  return (
    <div className="sm:p-2 flex justify-center items-center min-h-screen bg-gradient-to-br from-[#2d5016] to-[#1a2e0a]">
      <div className="bg-[#2d5016] sm:border-2 border-white shadow-xl p-2 w-full max-w-[500px]">
        <div className="flex justify-between items-center mb-8 pb-5 border-b-2 border-gray-300">
          <h1 className="text-4xl text-[#ffffff] font-bold m-0">二人麻雀</h1>
          <div className="flex flex-col items-end gap-2 text-sm text-[#ffffff]">
            <span>プレイヤー: <strong className="text-[#ffffff] text-base">{playerName}</strong></span>
            <button
              onClick={onLogout}
              className="px-3 py-1 bg-[#1a2e0a] border-2 border-white text-xs text-[#ffffff] cursor-pointer transition-colors hover:bg-[#0f1a06]"
            >
              ログアウト
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg text-[#ffffff] m-0 font-bold">新しい部屋を作成</h2>
            <p className="text-gray-300 text-sm m-0">
              ランダムに生成されたルームIDで新しい部屋を作成できます
            </p>
            <button
              onClick={handleOpenCreateRoomModal}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70 w-full"
            >
              {isCreating ? '作成中...' : '部屋を作成'}
            </button>
          </div>

          <div className="text-center text-gray-400 text-sm relative my-2">
            <span className="relative z-10 bg-[#2d5016] px-3">または</span>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-white"></div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg text-[#ffffff] m-0 font-bold">既存の部屋に参加</h2>
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="ルームID を入力"
                className="flex-1 p-2 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a] uppercase"
                maxLength={8}
              />
              <button type="submit" className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016]">
                参加
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg text-[#ffffff] m-0 font-bold">稼働中のルーム</h2>
              <button
                onClick={fetchRooms}
                className="px-6 py-3 border-2 border-white bg-[#1a2e0a] text-[#ffffff] text-base font-bold cursor-pointer transition-all hover:bg-[#0f1a06] disabled:opacity-60"
                disabled={roomsLoading}
              >
                {roomsLoading ? '更新中...' : '更新'}
              </button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-gray-300 text-sm m-0">現在稼働中のルームはありません</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rooms.map((room) => (
                  <div key={room.roomId} className="flex items-center justify-between gap-3 p-3 border-2 border-white bg-[#3d6b20]">
                    <div className="flex flex-col gap-0">
                      <div className="font-bold text-[#ffffff] text-sm">#{room.roomId}</div>
                      <div className="text-xs text-gray-300">
                        {room.status === 'playing' ? 'プレイ中' : room.status === 'finished' ? '終了' : '待機中'}
                        {' '}・{room.playersCount}/2
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinFromList(room.roomId)}
                      className="px-3 py-1 border-2 border-white bg-[#1a2e0a] text-[#ffffff] cursor-pointer text-xs font-bold transition-all hover:bg-[#0f1a06] disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!canJoinRoom(room)}
                    >
                      {getButtonText(room)}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center p-3 bg-[#2d1a1a] border-2 border-red-400 mt-5">{error}</p>}
      </div>

      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-[520px] border-4 border-white bg-[#2d5016] p-6 shadow-2xl">
            <div className="mb-5 border-b-2 border-gray-300 pb-3">
              <h3 className="text-xl font-bold text-white m-0">ルール設定</h3>
              <p className="text-xs text-gray-300 mt-2 mb-0">持ち点と壁の枚数を設定してください</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs" htmlFor="initialScoreModal">
                  初期持ち点
                </label>
                <input
                  id="initialScoreModal"
                  type="number"
                  min={0}
                  step={100}
                  value={initialScore}
                  onChange={(e) => setInitialScore(Number(e.target.value))}
                  className="px-4 py-3 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs" htmlFor="wallTilesModal">
                  壁の枚数
                </label>
                <input
                  id="wallTilesModal"
                  type="number"
                  min={minWallTiles}
                  max={maxWallTiles}
                  step={1}
                  value={wallTiles}
                  onChange={(e) => setWallTiles(Number(e.target.value))}
                  className="px-4 py-3 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a]"
                />
                <p className="text-xs text-gray-300 m-0">{minWallTiles}〜{maxWallTiles}（通常 {defaultWallTiles}）</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="oneRoundMatchModal"
                  type="checkbox"
                  checked={oneRoundMatch}
                  onChange={(e) => setOneRoundMatch(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="text-gray-300 text-xs cursor-pointer" htmlFor="oneRoundMatchModal">
                  1局勝負（どちらかが和了したらその時点で終了）
                </label>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center p-2 bg-[#2d1a1a] border-2 border-red-400 mt-4">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConfirmCreateRoom}
                disabled={isCreating}
                className="flex-1 px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
              >
                {isCreating ? '作成中...' : 'OK'}
              </button>
              <button
                onClick={handleCancelCreateRoom}
                disabled={isCreating}
                className="flex-1 px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016] disabled:opacity-70"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


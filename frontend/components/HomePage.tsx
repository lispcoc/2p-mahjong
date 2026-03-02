'use client'

import React, { useEffect, useState } from 'react'
import { useWhiteMode } from '../contexts/WhiteModeContext'
import { YakuListModal } from './Modals/YakuListModal'

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
  playerNames: string[]
  createdAt: number
}

export default function HomePage({
  playerName,
  onCreateRoom,
  onJoinRoom,
  onLogout,
  shouldRefresh = false,
  onRefreshed,
}: HomePageProps) {
  const { whiteMode, toggleWhiteMode } = useWhiteMode()
  const defaultInitialScore = 25000
  // wallTiles: 配牌27枚が配られた後、壁に残す牌の枚数
  // 計算: 全牌136枚 - 配牌27枚 - 予約牌22枚 = 最大87枚がツモ可能
  const defaultWallTiles = 44
  const minWallTiles = 30
  const maxWallTiles = 87
  const defaultAutoActionTimerSeconds = 10
  const minAutoActionTimerSeconds = 3
  const maxAutoActionTimerSeconds = 60
  const SETTINGS_STORAGE_KEY = 'mahjong-room-settings'

  const loadSavedSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load saved room settings:', e)
    }
    return null
  }

  const savedSettings = loadSavedSettings()

  const [joinRoomId, setJoinRoomId] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [initialScore, setInitialScore] = useState(savedSettings?.initialScore ?? defaultInitialScore)
  const [wallTiles, setWallTiles] = useState(savedSettings?.wallTiles ?? defaultWallTiles)
  const [gameMode, setGameMode] = useState(savedSettings?.gameMode ?? 'oneRound') // 'oneRound' | 'easternsouthern' | 'endless'
  const [myTsumoLuck, setMyTsumoLuck] = useState(savedSettings?.myTsumoLuck ?? 0)
  const [opponentTsumoLuck, setOpponentTsumoLuck] = useState(savedSettings?.opponentTsumoLuck ?? 0)
  const [autoActionTimerSeconds, setAutoActionTimerSeconds] = useState(savedSettings?.autoActionTimerSeconds ?? defaultAutoActionTimerSeconds)
  const [useRedDora, setUseRedDora] = useState(savedSettings?.useRedDora ?? true)
  const [notenPenalty, setNotenPenalty] = useState(savedSettings?.notenPenalty ?? false)
  const [aotenjou, setAotenjou] = useState(savedSettings?.aotenjou ?? false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isYakuModalOpen, setIsYakuModalOpen] = useState(false)

  const fetchRooms = async () => {
    setRoomsLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`)
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

  const clampAutoActionTimerSeconds = (value: number) => {
    if (!Number.isFinite(value)) return defaultAutoActionTimerSeconds
    return Math.min(maxAutoActionTimerSeconds, Math.max(minAutoActionTimerSeconds, Math.floor(value)))
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
      const sanitizedAutoActionTimerSeconds = clampAutoActionTimerSeconds(autoActionTimerSeconds)
      const wallTilesToSend = sanitizedWallTiles
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialScore: sanitizedInitialScore,
          wallTiles: wallTilesToSend,
          gameMode: gameMode,
          myTsumoLuck: myTsumoLuck,
          opponentTsumoLuck: opponentTsumoLuck,
          autoActionTimerSeconds: sanitizedAutoActionTimerSeconds,
          useRedDora: useRedDora,
          notenPenalty: notenPenalty,
          aotenjou: aotenjou,
        }),
      })

      if (!response.ok) {
        throw new Error('ルーム作成に失敗しました')
      }

      const data = await response.json()
      // Store tsumo luck settings in sessionStorage for GamePage to read
      sessionStorage.setItem('mahjong-myTsumoLuck', String(myTsumoLuck))
      sessionStorage.setItem('mahjong-opponentTsumoLuck', String(opponentTsumoLuck))
      // Save room settings to localStorage for next time
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
          initialScore: sanitizedInitialScore,
          wallTiles: sanitizedWallTiles,
          gameMode,
          myTsumoLuck,
          opponentTsumoLuck,
          autoActionTimerSeconds: sanitizedAutoActionTimerSeconds,
          useRedDora,
          notenPenalty,
          aotenjou,
        }))
      } catch (e) {
        console.error('Failed to save room settings:', e)
      }
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

  const handleResetToDefaults = () => {
    setInitialScore(defaultInitialScore)
    setWallTiles(defaultWallTiles)
    setGameMode('oneRound')
    setMyTsumoLuck(0)
    setOpponentTsumoLuck(0)
    setAutoActionTimerSeconds(defaultAutoActionTimerSeconds)
    setUseRedDora(true)
    setNotenPenalty(false)
    setAotenjou(false)
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(
        `${backendUrl}/api/rooms/${trimmedRoomId}`
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
    <div className="sm:p-2 flex justify-center items-center h-[100vh] h-[100dvh] overflow-hidden bg-gradient-to-br from-[#2d5016] to-[#1a2e0a]">
      <button
        onClick={toggleWhiteMode}
        className="fixed top-3 right-3 z-50 px-3 py-1.5 text-xs font-bold border-2 border-white rounded cursor-pointer transition-colors bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06]"
      >
        {whiteMode ? '🟢 緑' : '⬜ 白'}
      </button>
      <div className="bg-[#2d5016] sm:border-2 border-white shadow-xl p-2 w-full max-w-xl overflow-y-auto max-h-[90dvh] rounded">
        <div className="flex justify-between items-center mb-8 pb-5 border-b-2 border-gray-300">
          <h1 className="text-4xl text-[#ffffff] font-bold m-0">二人麻雀</h1>
          <button
            onClick={() => setIsYakuModalOpen(true)}
            className="px-2 py-1 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016]"
          >
            役一覧を見る
          </button>
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
                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-[#ffffff] text-sm">#{room.roomId}</div>
                      {room.playerNames && room.playerNames.length > 0 && (
                        <div className="text-xs font-bold text-gray-200">
                          {room.playerNames.join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-gray-300">
                        {room.status === 'playing' ? 'プレイ中' : room.status === 'finished' ? '終了' : '待機中'}
                        {' '}・{room.playersCount}/2
                        {room.createdAt && (
                          <span className="ml-1">・{new Date(room.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinFromList(room.roomId)}
                      className="px-6 py-3 border-2 border-white bg-[#1a2e0a] text-[#ffffff] text-base font-bold cursor-pointer transition-all hover:bg-[#0f1a06] disabled:opacity-60"
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

      {isYakuModalOpen && (
        <YakuListModal onClose={() => setIsYakuModalOpen(false)} />
      )}

      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
          <div className="w-full max-w-xl border-2 border-white bg-[#2d5016] p-2 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="mb-5 border-b-2 border-gray-300 pb-3">
              <h3 className="text-xl font-bold text-white m-0">ルール設定</h3>
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
                  step={1000}
                  value={initialScore}
                  onChange={(e) => setInitialScore(Number(e.target.value))}
                  className="px-4 py-3 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs" htmlFor="wallTilesModal">
                  ツモ牌の枚数（配牌を含まない）
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
                <p className="text-xs text-gray-400 m-0 mt-1">配牌26枚と予約牌22枚を除いた、ゲーム進行中にツモできる牌の枚数です</p>
              </div>
              <div className="flex flex-col gap-3 p-3 bg-[#1a2e0a] border border-gray-500 rounded">
                <div>
                  <label className="text-gray-300 text-xs" htmlFor="myTsumoLuckModal">
                    あなたのツモ運レベル
                  </label>
                  <div className="flex gap-2 items-center mt-2">
                    <input
                      id="myTsumoLuckModal"
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={myTsumoLuck}
                      onChange={(e) => setMyTsumoLuck(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-white text-sm font-bold w-12 text-center">{myTsumoLuck}</span>
                  </div>
                  <div className="flex gap-2 justify-between text-xs text-gray-300 mt-1">
                    <span>0: なし</span>
                    <span>1: 軽い</span>
                    <span>2: 中程度</span>
                    <span>3: 強い</span>
                  </div>
                  <div className="text-xs text-gray-400 p-2 bg-[#0f1a06] border border-gray-600 mt-2 rounded">
                    {myTsumoLuck === 0 && '完全ランダムに牌を引きます'}
                    {myTsumoLuck === 1 && '30%の確率で実用的な牌を引きやすくなります'}
                    {myTsumoLuck === 2 && '50%の確率で実用的な牌を引きやすくなります'}
                    {myTsumoLuck === 3 && '70%の確率で実用的な牌を引きやすくなります'}
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-3">
                  <label className="text-gray-300 text-xs" htmlFor="opponentTsumoLuckModal">
                    相手のツモ運レベル
                  </label>
                  <div className="flex gap-2 items-center mt-2">
                    <input
                      id="opponentTsumoLuckModal"
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={opponentTsumoLuck}
                      onChange={(e) => setOpponentTsumoLuck(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-white text-sm font-bold w-12 text-center">{opponentTsumoLuck}</span>
                  </div>
                  <div className="flex gap-2 justify-between text-xs text-gray-300 mt-1">
                    <span>0: なし</span>
                    <span>1: 軽い</span>
                    <span>2: 中程度</span>
                    <span>3: 強い</span>
                  </div>
                  <div className="text-xs text-gray-400 p-2 bg-[#0f1a06] border border-gray-600 mt-2 rounded">
                    {opponentTsumoLuck === 0 && '完全ランダムに牌を引きます'}
                    {opponentTsumoLuck === 1 && '30%の確率で実用的な牌を引きやすくなります'}
                    {opponentTsumoLuck === 2 && '50%の確率で実用的な牌を引きやすくなります'}
                    {opponentTsumoLuck === 3 && '70%の確率で実用的な牌を引きやすくなります'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs" htmlFor="autoActionTimerSecondsModal">
                  ツモ切り・ポン見逃しのタイマー（秒）
                </label>
                <input
                  id="autoActionTimerSecondsModal"
                  type="number"
                  min={minAutoActionTimerSeconds}
                  max={maxAutoActionTimerSeconds}
                  step={1}
                  value={autoActionTimerSeconds}
                  onChange={(e) => setAutoActionTimerSeconds(Number(e.target.value))}
                  className="px-4 py-3 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a]"
                />
                <p className="text-xs text-gray-300 m-0">{minAutoActionTimerSeconds}〜{maxAutoActionTimerSeconds}秒（通常 {defaultAutoActionTimerSeconds}秒）</p>
                <p className="text-xs text-gray-400 m-0 mt-1">ツモ切りまたはポン見逃しの際の自動実行までの待機時間</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">ゲームモード</label>
                <div className="flex flex-col gap-2 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <div className="flex items-center gap-2">
                    <input
                      id="gameMode-oneRound"
                      type="radio"
                      name="gameMode"
                      value="oneRound"
                      checked={gameMode === 'oneRound'}
                      onChange={(e) => setGameMode(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-gray-300 text-xs cursor-pointer" htmlFor="gameMode-oneRound">
                      1局勝負（最初に和了したプレイヤーが勝ち）
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="gameMode-easternsouthern"
                      type="radio"
                      name="gameMode"
                      value="easternsouthern"
                      checked={gameMode === 'easternsouthern'}
                      onChange={(e) => setGameMode(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-gray-300 text-xs cursor-pointer" htmlFor="gameMode-easternsouthern">
                      東南戦
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="gameMode-endless"
                      type="radio"
                      name="gameMode"
                      value="endless"
                      checked={gameMode === 'endless'}
                      onChange={(e) => setGameMode(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-gray-300 text-xs cursor-pointer" htmlFor="gameMode-endless">
                      エンドレス（どちらかが箱割れするまで継続）
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">赤ドラ</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRedDora}
                      onChange={(e) => setUseRedDora(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">赤ドラあり（ピンズ2枚、マンズ・ソウズ各1枚）</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">ノーテン罰符</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notenPenalty}
                      onChange={(e) => setNotenPenalty(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">ノーテン罰符あり</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">青天井</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aotenjou}
                      onChange={(e) => setAotenjou(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">青天井（点数上限なし・満貫以上の丸めなし）</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center p-2 bg-[#2d1a1a] border-2 border-red-400 mt-4">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex gap-3">
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
              <button
                onClick={handleResetToDefaults}
                disabled={isCreating}
                className="w-full px-6 py-2 border-2 border-gray-400 text-sm cursor-pointer transition-all bg-transparent text-gray-300 hover:bg-[#1a2e0a] hover:text-white disabled:opacity-70"
              >
                デフォルト設定に戻す
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


'use client'

import React, { useEffect, useState } from 'react'
import styles from './HomePage.module.css'

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
  const [joinRoomId, setJoinRoomId] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [initialScore, setInitialScore] = useState(25000)

  const fetchRooms = async () => {
    setRoomsLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/rooms')
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

  const handleCreateRoom = async () => {
    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initialScore }),
      })

      if (!response.ok) {
        throw new Error('ルーム作成に失敗しました')
      }

      const data = await response.json()
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

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedRoomId = joinRoomId.trim().toUpperCase()

    if (!trimmedRoomId) {
      setError('ルームIDを入力してください')
      return
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/rooms/${trimmedRoomId}`
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
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>二人麻雀</h1>
          <div className={styles.playerInfo}>
            <span>プレイヤー: <strong>{playerName}</strong></span>
            <button
              onClick={onLogout}
              className={styles.logoutBtn}
            >
              ログアウト
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>新しい部屋を作成</h2>
            <p className={styles.description}>
              ランダムに生成されたルームIDで新しい部屋を作成できます
            </p>
            <div className={styles.formRow}>
              <label className={styles.inputLabel} htmlFor="initialScore">
                初期持ち点
              </label>
              <input
                id="initialScore"
                type="number"
                min={0}
                step={100}
                value={initialScore}
                onChange={(e) => setInitialScore(Number(e.target.value))}
                className={styles.input}
              />
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className={styles.primaryButton}
            >
              {isCreating ? '作成中...' : '部屋を作成'}
            </button>
          </div>

          <div className={styles.divider}>または</div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>既存の部屋に参加</h2>
            <form onSubmit={handleJoinRoom} className={styles.form}>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="ルームID を入力"
                className={styles.input}
                maxLength={8}
              />
              <button type="submit" className={styles.secondaryButton}>
                参加
              </button>
            </form>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>稼働中のルーム</h2>
              <button
                onClick={fetchRooms}
                className={styles.refreshButton}
                disabled={roomsLoading}
              >
                {roomsLoading ? '更新中...' : '更新'}
              </button>
            </div>
            {rooms.length === 0 ? (
              <p className={styles.description}>現在稼働中のルームはありません</p>
            ) : (
              <div className={styles.roomList}>
                {rooms.map((room) => (
                  <div key={room.roomId} className={styles.roomItem}>
                    <div className={styles.roomMeta}>
                      <div className={styles.roomId}>#{room.roomId}</div>
                      <div className={styles.roomStatus}>
                        {room.status === 'playing' ? 'プレイ中' : room.status === 'finished' ? '終了' : '待機中'}
                        {' '}・{room.playersCount}/2
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinFromList(room.roomId)}
                      className={styles.joinButton}
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

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  )
}

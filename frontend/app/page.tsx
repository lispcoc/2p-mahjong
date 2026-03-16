'use client'

import React, { useState, useEffect, useRef } from 'react'
import LoginPage from '../components/LoginPage'
import HomePage from '../components/HomePage'
import GamePage from '../components/GamePage'
import { getCachedFingerprint } from '../utils/fingerprint'

type PageState = 'loading' | 'login' | 'home' | 'game' | 'spectate'

export default function Page() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [playerName, setPlayerName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [roomId, setRoomId] = useState<string>('')
  const [shouldRefreshRooms, setShouldRefreshRooms] = useState(false)
  const sessionCheckDone = useRef(false)

  // フィンガープリントをサーバーに送信する共通ヘルパー（ログイン・再ログイン時）
  const sendFingerprintToServer = async (name: string) => {
    try {
      const fp = await getCachedFingerprint()
      if (!fp || !/^[0-9a-f]{32}$/i.test(fp)) return
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      await fetch(`${backendUrl}/api/fingerprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name, fingerprint: fp }),
      })
      console.log('🔏 Fingerprint sent to server for', name)
    } catch (err) {
      // フィンガープリント送信失敗は致命的ではない
      console.warn('⚠️ Failed to send fingerprint:', err)
    }
  }

  // Check for saved session on mount
  useEffect(() => {
    console.log('🔍 useEffect running, sessionCheckDone:', sessionCheckDone.current)

    // Prevent double execution in React Strict Mode during the same mount
    if (sessionCheckDone.current) {
      console.log('⚠️ Session check already done during this mount, skipping')
      return () => {
        console.log('🧹 Cleanup from skipped check')
      }
    }

    console.log('🔍 Starting session check...')
    sessionCheckDone.current = true

    let shouldGoToLogin = true

    // Check localStorage immediately
    try {
      const savedData = localStorage.getItem('mahjong-session')
      console.log('📦 LocalStorage data:', savedData ? 'found' : 'not found')

      if (savedData) {
        const session = JSON.parse(savedData)
        console.log('🔄 Session data:', session)

        // Check if session is not too old (within 24 hours)
        const sessionAge = Date.now() - (session.timestamp || 0)
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours

        if (sessionAge < maxAge && session.roomId && session.playerName) {
          console.log('✅ Valid session found, restoring...')
          setPlayerName(session.playerName)
          setRoomId(session.roomId)
          setUserId(localStorage.getItem('mahjong-userId') || '')
          setPageState(session.isSpectator ? 'spectate' : 'game')
          console.log('✅ State updated to', session.isSpectator ? 'spectate' : 'game')
          shouldGoToLogin = false
        } else {
          console.log('⏰ Session expired or invalid, clearing...')
          localStorage.removeItem('mahjong-session')
        }
      } else {
        console.log('ℹ️ No saved session')
      }
    } catch (err) {
      console.error('❌ Error checking session:', err)
      localStorage.removeItem('mahjong-session')
    }

    // No valid session - check for saved player name
    if (shouldGoToLogin) {
      const savedName = localStorage.getItem('mahjong-playerName')
      if (savedName) {
        console.log('➡️ No valid session, but found saved playerName, going to home')
        // Generate persistent userId if not yet created
        try {
          if (!localStorage.getItem('mahjong-userId')) {
            localStorage.setItem('mahjong-userId', crypto.randomUUID())
            console.log('🆔 Generated new persistent userId for returning user')
          }
        } catch {}
        setPlayerName(savedName)
        const savedUserId = localStorage.getItem('mahjong-userId') || ''
        setUserId(savedUserId)
        setPageState('home')
        // 再ログイン時もフィンガープリントをサーバーに送信
        sendFingerprintToServer(savedName)
      } else {
        console.log('➡️ No valid session, going to login')
        setPageState('login')
      }
    }

    // Cleanup function - always returned
    return () => {
      console.log('🧹 Cleanup: resetting session check flag')
      sessionCheckDone.current = false
    }
  }, [])

  const handleLogin = (name: string) => {
    setPlayerName(name)
    localStorage.setItem('mahjong-playerName', name)
    // Generate persistent userId on first login (kept until logout)
    try {
      if (!localStorage.getItem('mahjong-userId')) {
        localStorage.setItem('mahjong-userId', crypto.randomUUID())
        console.log('🆔 Generated new persistent userId on login')
      }
    } catch {}
    setUserId(localStorage.getItem('mahjong-userId') || '')
    setPageState('home')
    // ログイン時にフィンガープリントをサーバーに送信（ゲーム入室前でもIP+名前+fpを記録する）
    sendFingerprintToServer(name)
  }

  const handleCreateRoom = async (newRoomId: string) => {
    console.log('🆕 handleCreateRoom called with roomId:', newRoomId)
    // Clean up old session when creating/joining a new room
    const savedData = localStorage.getItem('mahjong-session')
    if (savedData) {
      try {
        const session = JSON.parse(savedData)
        if (session.roomId && session.roomId !== newRoomId && session.userId) {
          console.log('🗑️ Cleaning up old session (different room)')
          // Notify backend to remove the old player (spectators have no player entry)
          if (!session.isSpectator) {
            try {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
              const response = await fetch(
                `${backendUrl}/api/rooms/${session.roomId}/players/${session.userId}`,
                { method: 'DELETE' }
              )
              if (response.ok) {
                console.log('✅ Old player removed from server')
              }
            } catch (err) {
              console.error('Error removing old player:', err)
            }
          }
          localStorage.removeItem('mahjong-session')
        }
      } catch (err) {
        console.error('Error parsing session', err)
        localStorage.removeItem('mahjong-session')
      }
    }

    setRoomId(newRoomId)
    setPageState('game')
    console.log('✅ State updated to game')
  }

  const handleJoinRoom = async (existingRoomId: string) => {
    console.log('🚪 handleJoinRoom called with roomId:', existingRoomId)
    // Clean up old session when joining a different room
    const savedData = localStorage.getItem('mahjong-session')
    if (savedData) {
      try {
        const session = JSON.parse(savedData)
        if (session.roomId && session.roomId !== existingRoomId && session.userId) {
          console.log('🗑️ Cleaning up old session (different room)')
          // Notify backend to remove the old player (spectators have no player entry)
          if (!session.isSpectator) {
            try {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
              const response = await fetch(
                `${backendUrl}/api/rooms/${session.roomId}/players/${session.userId}`,
                { method: 'DELETE' }
              )
              if (response.ok) {
                console.log('✅ Old player removed from server')
              }
            } catch (err) {
              console.error('Error removing old player:', err)
            }
          }
          localStorage.removeItem('mahjong-session')
        }
      } catch (err) {
        console.error('Error parsing session', err)
        localStorage.removeItem('mahjong-session')
      }
    }

    setRoomId(existingRoomId)
    setPageState('game')
    console.log('✅ State updated to game')
  }

  const handleBackToHome = () => {
    if (pageState === 'spectate') {
      // 観戦モードから戻る場合はセッションをクリア
      localStorage.removeItem('mahjong-session')
      console.log('🗑️ Cleared spectator session on back to home')
    } else {
      // Keep session so the user can rejoin the same room from the list
      console.log('ℹ️ Keeping session on back to home')
    }
    // Refresh userId so spectate-button suppression works correctly
    setUserId(localStorage.getItem('mahjong-userId') || '')
    setPageState('home')
    setRoomId('')
    setShouldRefreshRooms(true)
  }

  const handleSpectateRoom = (targetRoomId: string) => {
    console.log('👁️ handleSpectateRoom called with roomId:', targetRoomId)
    // 見学者の場合はセッションをクリアしない
    setRoomId(targetRoomId)
    setPageState('spectate')
  }

  const handleLogout = () => {
    // Clear session and saved player name on logout
    localStorage.removeItem('mahjong-session')
    localStorage.removeItem('mahjong-playerName')
    localStorage.removeItem('mahjong-userId')
    console.log('🗑️ Cleared session, playerName, and userId on logout')

    setPageState('login')
    setPlayerName('')
    setRoomId('')
  }

  // Show loading state while checking for saved session
  if (pageState === 'loading') {
    return (
      <div className="flex justify-center items-center h-[100vh] h-[100dvh] text-2xl">
        🔄 読み込み中...
      </div>
    )
  }

  return (
    <div>
      {pageState === 'login' && <LoginPage onLogin={handleLogin} />}
      {pageState === 'home' && (
        <HomePage
          playerName={playerName}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSpectateRoom={handleSpectateRoom}
          onLogout={handleLogout}
          shouldRefresh={shouldRefreshRooms}
          onRefreshed={() => setShouldRefreshRooms(false)}
        />
      )}
      {pageState === 'game' && (
        <GamePage
          playerName={playerName}
          roomId={roomId}
          onBack={handleBackToHome}
        />
      )}
      {pageState === 'spectate' && (
        <GamePage
          playerName={playerName}
          roomId={roomId}
          onBack={handleBackToHome}
          isSpectator={true}
        />
      )}
    </div>
  )
}

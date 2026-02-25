'use client'

import React, { useState, useEffect, useRef } from 'react'
import LoginPage from '../components/LoginPage'
import HomePage from '../components/HomePage'
import GamePage from '../components/GamePage'

type PageState = 'loading' | 'login' | 'home' | 'game'

export default function Page() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [playerName, setPlayerName] = useState<string>('')
  const [roomId, setRoomId] = useState<string>('')
  const [shouldRefreshRooms, setShouldRefreshRooms] = useState(false)
  const sessionCheckDone = useRef(false)

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
          setPageState('game')
          console.log('✅ State updated to game')
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
    
    // No valid session, go to login
    if (shouldGoToLogin) {
      console.log('➡️ No valid session, going to login')
      setPageState('login')
    }
    
    // Cleanup function - always returned
    return () => {
      console.log('🧹 Cleanup: resetting session check flag')
      sessionCheckDone.current = false
    }
  }, [])

  const handleLogin = (name: string) => {
    setPlayerName(name)
    setPageState('home')
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
          // Notify backend to remove the old player
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
          // Notify backend to remove the old player
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
    // Keep session so the user can rejoin the same room from the list
    console.log('ℹ️ Keeping session on back to home')
    setPageState('home')
    setRoomId('')
    setShouldRefreshRooms(true)
  }

  const handleLogout = () => {
    // Clear session on logout
    localStorage.removeItem('mahjong-session')
    console.log('🗑️ Cleared session on logout')
    
    setPageState('login')
    setPlayerName('')
    setRoomId('')
  }

  // Show loading state while checking for saved session
  if (pageState === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen text-2xl">
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
    </div>
  )
}

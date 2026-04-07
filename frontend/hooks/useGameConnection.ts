import { useEffect, useRef, useCallback, useState } from 'react'
import { GameState } from '../types/GameTypes'
import { debugLog } from '../utils/DebugUtils'
import { getCachedFingerprint } from '../utils/fingerprint'

interface UseGameConnectionProps {
  roomId: string
  playerName: string
  onScoreResult: (result: any) => void
  onFinalResults: (results: any[] | null) => void
  setAutoNextTimer: (timerId: number | null) => void
  isSpectator?: boolean
  isDelayedSpectator?: boolean
}

export function useGameConnection({
  roomId,
  playerName,
  onScoreResult,
  onFinalResults,
  setAutoNextTimer,
  isSpectator = false,
  isDelayedSpectator = false,
}: UseGameConnectionProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const [delayedSpectatorWaiting, setDelayedSpectatorWaiting] = useState(false)
  const [delayMs, setDelayMs] = useState(60000)
  const wsRef = useRef<WebSocket | null>(null)
  const connectionAttempted = useRef(false)

  const handleMessage = useCallback((data: any) => {
    const { type, payload } = data
    debugLog(`📨 Received ${type} message`)
    console.log('📨 Received message:', { type, payload })

    switch (type) {
      case 'spectatorJoined':
        debugLog(`👀 Successfully joined as spectator with userId=${payload.userId}`)
        console.log('👀 Spectator joined - setting states now')
        setUserId(payload.userId)
        {
          const spectatorSession = {
            userId: payload.userId,
            roomId: payload.roomId,
            playerName: payload.spectatorName,
            isSpectator: true,
            isDelayedSpectator: payload.isDelayedMode === true,
            timestamp: Date.now(),
          }
          try { localStorage.setItem('mahjong-session', JSON.stringify(spectatorSession)) } catch {}
        }
        if (payload.delayMs) {
          setDelayMs(payload.delayMs)
        }
        if (payload.delayedModeWaiting) {
          // まだ遅延バッファが溜まっていない待機状態
          setDelayedSpectatorWaiting(true)
          setGameState({
            status: 'waiting',
            players: payload.players || [],
            isSpectatorView: true,
            isDelayedMode: true,
          })
          setMessage(`遅延観戦モードで参加しました。約1分後から観戦が始まります。`)
        } else {
          setDelayedSpectatorWaiting(false)
          setGameState(payload.gameState ? { ...payload.gameState, isSpectatorView: true, isDelayedMode: payload.isDelayedMode === true } : {
            status: 'waiting',
            players: payload.players || [],
            isSpectatorView: true,
            isDelayedMode: payload.isDelayedMode === true,
          })
          if (payload.isDelayedMode) {
            setMessage(`遅延観戦モードで参加しました（1分遅延・手牌公開）`)
          } else {
            setMessage(`観戦モードで参加しました（見学者 ${payload.spectators?.length ?? 1}人）`)
          }
        }
        break
      case 'spectatorJoinedNotify':
        debugLog(`👀 A spectator joined`)
        setGameState((prev) => prev ? { ...prev, spectatorCount: payload.spectatorCount } : prev)
        break
      case 'spectatorLeft':
        debugLog(`👀 A spectator left`)
        setGameState((prev) => prev ? { ...prev, spectatorCount: payload.spectatorCount } : prev)
        break
      case 'joined':
        debugLog(`✅ Successfully joined room with userId=${payload.userId}`)
        console.log('✅ Successfully joined room - setting states now')
        console.log('Payload:', payload)
        setUserId(payload.userId)

        // Save to localStorage for reconnection
        const sessionData = {
          userId: payload.userId,
          roomId: payload.roomId,
          playerName: payload.playerName,
          timestamp: Date.now(),
        }
        console.log('💾 Attempting to save session to localStorage:', sessionData)
        try {
          localStorage.setItem('mahjong-session', JSON.stringify(sessionData))
          console.log('✅ Successfully saved to localStorage')
          // Verify it was saved
          const verification = localStorage.getItem('mahjong-session')
          console.log('🔍 Verification - data in localStorage:', verification ? 'FOUND' : 'NOT FOUND')
          if (verification) {
            console.log('🔍 Verification - parsed data:', JSON.parse(verification))
          }
        } catch (err) {
          console.error('❌ Failed to save to localStorage:', err)
        }

        const initialState: GameState = {
          status: payload.gameState?.status || 'waiting',
          players: payload.players || [],
          currentTurn: payload.gameState?.currentTurn,
          tiles: payload.gameState?.tiles,
          wall: payload.gameState?.wall,
          discards: payload.gameState?.discards,
        }
        debugLog(`Setting gameState to status=${initialState.status}`)
        console.log('Game state initialized:', initialState)
        setGameState(initialState)
        debugLog(`✅ setGameState called`)
        console.log('✅ setGameState called with initialState')

        if (payload.isReconnecting) {
          setMessage('ゲームに再接続しました')
        } else {
          setMessage(
            `${payload.playerName}はゲームに参加しました（${payload.players.length}/2）`
          )
        }
        break
      case 'playerJoined':
        debugLog(`✅ Another player joined`)
        console.log('✅ Another player joined')
        setGameState((prev) => {
          debugLog(`In setGameState callback - prev gameState=${prev?.status || 'null'}`)
          console.log('In setGameState callback - prev:', prev)
          if (!prev) return prev
          return {
            ...prev,
            players: payload.players,
          }
        })
        setMessage(`プレイヤーが参加しました（${payload.players.length}/2）`)
        break
      case 'playerReconnected':
        debugLog(`🔄 Another player reconnected`)
        console.log('🔄 Another player reconnected')
        setGameState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            players: payload.players,
          }
        })
        setMessage(`${payload.playerName}が再接続しました`)
        break
      case 'gameStarted':
        debugLog(`🎮 Game started with status=${payload.status}, players=${payload.players.length}`)
        console.log('🎮 Game started with payload:', payload)
        console.log(`🎮 [DEBUG] tiles data:`, JSON.stringify(payload.tiles, null, 2))
        if (!payload.players || payload.players.length < 2) {
          debugLog(`❌ REJECTED: gameStarted received but only ${payload.players?.length || 0} player(s) - waiting for 2 players`)
          console.warn('⚠️ gameStarted rejected - fewer than 2 players:', payload)
          break
        }
        onScoreResult(null)
        setDelayedSpectatorWaiting(false) // 遅延観戦待機中フラグを解除
        setGameState(payload)
        debugLog(`✅ gameState updated to status=${payload.status}`)
        setMessage('ゲームが始まりました！')
        break
      case 'gameStateUpdate':
        debugLog(`♻️ Game state updated`)
        console.log('♻️ Game state updated', payload)
        console.log(`  canWinFor=${payload.canWinFor}, currentTurn=${payload.currentTurn}, status=${payload.status}`)
        setGameState((prevState) => {
          return {
            ...payload,
            currentRound: payload.currentRound ?? prevState?.currentRound,
            roundWind: payload.roundWind ?? prevState?.roundWind,
            roundNumber: payload.roundNumber ?? prevState?.roundNumber,
            roundName: payload.roundName ?? prevState?.roundName,
            dealerId: payload.dealerId ?? prevState?.dealerId,
            seatWinds: payload.seatWinds ?? prevState?.seatWinds,
            nextRoundReadyCount: payload.nextRoundReadyCount ?? prevState?.nextRoundReadyCount,
            totalPlayers: payload.totalPlayers ?? prevState?.totalPlayers,
          }
        })
        break
      case 'gameFinished':
        debugLog(`🏁 Game finished`)
        console.log('🏁 Game finished - payload:', JSON.stringify(payload, null, 2))
        console.log('🏁 payload.gameOver:', payload?.gameOver)
        console.log('🏁 payload.finalResults:', payload?.finalResults?.length ?? 'undefined/null')

        const noYaku =
          payload?.scoreResult?.valid === false ||
          (typeof payload?.scoreResult?.error === 'string' && payload.scoreResult.error.includes('役がありません'))
        if (noYaku) {
          setError(payload?.scoreResult?.error || '役がありません')
          setAutoNextTimer(null)
          break
        }

        if (payload.gameOver) {
          console.log('🏁 Game Over confirmed! Calling onFinalResults with:', payload.finalResults?.length ?? 'undefined', 'results')
          onFinalResults(payload.finalResults)
          setMessage('ゲーム終了（誰かの点数がマイナスになりました）')
          // Clear session on game over
          localStorage.removeItem('mahjong-session')
          console.log('🗑️ Cleared session on game over')
        } else {
          onScoreResult(payload.scoreResult)
          // 修正: 自動nextRoundを削除し、ユーザーの手動操作を要求
          // ユーザーが結果を読む時間を確保し、いきなりの局移行を防ぐ
          console.log('ℹ️ Removed automatic nextRound - user must manually click "Next Round" button')
          setAutoNextTimer(null)
        }

        setGameState((prevState) => {
          const winnerName = prevState?.players?.find((p: any) => p.userId === payload.winner)?.playerName || payload.winner
          if (!payload.gameOver) {
            setMessage(`${payload.winType || 'ゲーム終了'} 勝者: ${winnerName}`)
          }
          return prevState ? {
            ...prevState,
            status: payload.gameOver ? 'gameOver' : 'finished',
            currentRound: payload.currentRound,
            roundWind: payload.roundWind ?? prevState.roundWind,
            roundNumber: payload.roundNumber ?? prevState.roundNumber,
            roundName: payload.roundName ?? prevState.roundName,
            dealerId: payload.dealerId ?? prevState.dealerId,
            seatWinds: payload.seatWinds ?? prevState.seatWinds,
            nextRoundReadyCount: payload.nextRoundReadyCount,
            totalPlayers: payload.totalPlayers,
          } : prevState
        })
        break
      case 'actionResponse':
        debugLog(`✅ Action response received`)
        console.log('✅ Action response:', payload)
        if (payload.success === false) {
          setError(payload.message || 'アクションに失敗しました')
          if (payload.message && payload.message.includes('役がありません')) {
            setAutoNextTimer(null)
          }
          setTimeout(() => setError(''), 4000)
        } else if (payload.riichi) {
          setMessage(payload.message || 'リーチ宣言しました！')
          setTimeout(() => setMessage(''), 5000)
        }
        break
      case 'error':
        debugLog(`❌ Server error: ${payload.message}`)
        console.error('❌ Server error:', payload.message)
        if (payload.message?.startsWith('banned:')) {
          const reason = payload.message.slice('banned:'.length)
          setError(`⛔ 利用禁止: ${reason}`)
        } else {
          setError(payload.message || 'エラーが発生しました')
        }

        // If room not found or reconnection failed, clear the saved session
        if (payload.message && (payload.message.includes('Room not found') || payload.message.includes('found'))) {
          console.log('🗑️ Clearing invalid session due to room not found')
          localStorage.removeItem('mahjong-session')
          // Optionally redirect back to home after a delay
          setTimeout(() => {
            if (window.confirm('ルームが見つかりません。ホーム画面に戻りますか？')) {
              window.location.reload()
            }
          }, 1000)
        }
        break
      default:
        // pongはサーバー側keepalive応答 - ノイズ発生を防ぎサイレントに無視
        if (type === 'pong') break
        debugLog(`⚠️ Unknown message type: ${type}`)
        console.log('⚠️ Unknown message type:', type)
    }
  }, [onScoreResult, onFinalResults, setAutoNextTimer])

  useEffect(() => {
    console.log('🔵 useGameConnection useEffect running, connectionAttempted:', connectionAttempted.current)

    if (connectionAttempted.current) {
      debugLog(`⚠️ Connection already attempted, skipping duplicate connection`)
      console.log('⚠️ Connection already attempted during this mount, skipping')
      // Still return cleanup function
      return () => {
        console.log('🧹 Cleanup from skipped connection')
        connectionAttempted.current = false
      }
    }

    debugLog('🔵 useEffect running - initializing WebSocket connection')
    console.log('🔵 useEffect running - initializing WebSocket connection')
    connectionAttempted.current = true

    // Check for existing session in localStorage
    let savedSession = null
    try {
      const savedData = localStorage.getItem('mahjong-session')
      if (savedData) {
        savedSession = JSON.parse(savedData)
        console.log('📂 Found saved session:', savedSession)

        // Check if session is for the same room
        if (savedSession.roomId === roomId && savedSession.playerName === playerName) {
          // Check if session is not too old (e.g., within 24 hours)
          const sessionAge = Date.now() - (savedSession.timestamp || 0)
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours

          if (sessionAge < maxAge) {
            console.log('✅ Valid session found, will attempt reconnection')
          } else {
            console.log('⏰ Session expired, starting fresh')
            localStorage.removeItem('mahjong-session')
            savedSession = null
          }
        } else {
          console.log('🔄 Session is for different room/player, starting fresh')
          savedSession = null
        }
      }
    } catch (err) {
      console.error('Error loading saved session:', err)
      savedSession = null
    }

    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'ws://localhost:3001'
    debugLog(`🔌 Attempting WebSocket connection to: ${wsUrl}`)
    console.log('🔌 Attempting WebSocket connection to:', wsUrl)

    const ws = new WebSocket(wsUrl)

    ws.onopen = async () => {
      debugLog('✅ WebSocket connected successfully')
      console.log('✅ WebSocket connected successfully')
      setError('')

      const joinPayload: any = {
        roomId,
        playerName,
      }

      // 見学者モードの場合はフラグを追加
      if (isSpectator) {
        joinPayload.spectator = true
      }

      // 遅延観戦モードの場合はフラグを追加
      if (isDelayedSpectator) {
        joinPayload.spectator = true
        joinPayload.delayedSpectator = true
      }

      // Always include the persistent userId (generated at login, kept until logout)
      // This ensures the same userId is used across all rooms
      let persistentUserId: string | null = null
      try {
        persistentUserId = localStorage.getItem('mahjong-userId')
      } catch {}

      if (persistentUserId) {
        joinPayload.userId = persistentUserId
        debugLog(`🪪 Sending persistent userId=${persistentUserId}`)
        console.log('🪪 Sending persistent userId:', persistentUserId)
      } else if (savedSession && savedSession.userId) {
        // Fallback: use session userId (e.g. for reconnection before migration)
        joinPayload.userId = savedSession.userId
        debugLog(`🔄 Fallback: reconnect with session userId=${savedSession.userId}`)
        console.log('🔄 Fallback reconnection with userId:', savedSession.userId)
      }

      // デバイスフィンガープリントを付与（ホームページ表示時に事前生成済み）
      // getCachedFingerprint() はキャッシュがあれば即時返却、なければ生成する
      // 注意: await中にWebSocketが切断される可能性があるため送信前に状態確認する
      try {
        const fingerprint = await getCachedFingerprint()
        const fpValid = fingerprint && /^[0-9a-f]{32}$/i.test(fingerprint)
        console.log(`🔏 Device fingerprint: ${JSON.stringify(fingerprint)} (length=${fingerprint?.length}, valid=${fpValid})`)
        if (fpValid) {
          joinPayload.fingerprint = fingerprint
        } else {
          console.warn('⚠️ Fingerprint is invalid or empty, will not be sent')
        }
      } catch (fpErr) {
        console.warn('⚠️ Failed to generate fingerprint:', fpErr)
        // フィンガープリント失敗は致命的エラーではないので続行
      }

      // await中にWebSocketが切断されている可能性があるため送信前に状態確認
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ WebSocket closed during fingerprint generation, join message not sent')
        return
      }

      debugLog(`📤 Sending join message: roomId=${roomId}, playerName=${playerName}`)
      console.log('📤 Sending join message:', joinPayload)
      try {
        ws.send(
          JSON.stringify({
            type: 'join',
            payload: joinPayload,
          })
        )
      } catch (sendErr) {
        console.error('❌ Failed to send join message:', sendErr)
      }
    }

    ws.onmessage = (event) => {
      try {
        debugLog(`📥 Raw message received (${event.data.length} bytes)`)
        console.log('📥 Raw WebSocket message received:', event.data)
        const data = JSON.parse(event.data)
        debugLog(`📨 Parsed message type: ${data.type}`)
        handleMessage(data)
      } catch (err) {
        debugLog(`🔴 Error parsing message: ${err}`)
        console.error('🔴 Error parsing message:', err)
      }
    }

    ws.onerror = (event) => {
      debugLog(`❌ WebSocket error: ${event}`)
      console.error('❌ WebSocket error:', event)
      const targetUrl = (event.target as WebSocket)?.url || wsUrl
      setError(`接続エラー: WebSocket接続に失敗しました（${targetUrl}）`)
    }

    ws.onclose = (event) => {
      const codeInfo = `code=${event.code}${event.reason ? ` reason=${event.reason}` : ''}`
      debugLog(`🔌 WebSocket disconnected (${codeInfo})`)
      console.log(`🔌 WebSocket disconnected (${codeInfo}) wasClean=${event.wasClean}`)
      connectionAttempted.current = false
    }

    wsRef.current = ws

    return () => {
      debugLog('🧹 Cleanup: closing WebSocket')
      console.log('🧹 Cleanup: closing WebSocket')
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      connectionAttempted.current = false
    }
  }, [roomId, playerName])

  const sendAction = useCallback((action: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'action',
          payload: action,
        })
      )
    }
  }, [])

  return {
    gameState,
    setGameState,
    error,
    setError,
    message,
    setMessage,
    userId,
    wsRef,
    sendAction,
    delayedSpectatorWaiting,
    delayMs,
  }
}

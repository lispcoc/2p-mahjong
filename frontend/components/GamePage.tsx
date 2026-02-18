'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { TenpaiChecker } from '../utils/TenpaiChecker'
import { Tile, GamePageProps, GameState } from '../types/GameTypes'
import { normalizeTile, getTileKey } from '../utils/TileUtils'
import { TileImage } from './TileImage'
import { DebugPanel } from './GameBoard/DebugPanel'
import { ScoreResultModal } from './Modals/ScoreResultModal'
import { FinalResultModal } from './Modals/FinalResultModal'

// Types are now imported from '../types/GameTypes'

// Utilities and components are now imported from separate files
import { debugLog } from '../utils/DebugUtils'

const windNames: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
}

const getRoundLabel = (state: GameState | null) => {
  if (!state) return '東1局'
  if (state.roundName) return state.roundName
  const wind = windNames[state.roundWind ?? 1] || '東'
  const number = state.roundNumber ?? state.currentRound ?? 1
  return `${wind}${number}局`
}

const getRoundWindLabel = (state: GameState | null) => {
  if (!state) return '東'
  return windNames[state.roundWind ?? 1] || '東'
}

const getSeatWindLabel = (state: GameState | null, userId: string) => {
  if (!state || !userId) return '不明'
  const seatWind = state.seatWinds?.[userId]
  return windNames[seatWind ?? 0] || '不明'
}


export default function GamePage({
  playerName,
  roomId,
  onBack,
}: GamePageProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const [isGrayscale, setIsGrayscale] = useState(false)
  const [autoDrawMode, setAutoDrawMode] = useState(false)
  const [noMeldMode, setNoMeldMode] = useState(false)
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null)
  const [tenpaiInfo, setTenpaiInfo] = useState<{ isTenpai: boolean; winningTiles: any[] } | null>(null)
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [riichiMode, setRiichiMode] = useState(false)
  const [tenpaiInfoMap, setTenpaiInfoMap] = useState<Record<number, { isTenpai: boolean; winningTiles: any[] }>>({})
  const [nextRoundReady, setNextRoundReady] = useState(false)
  const [finalResults, setFinalResults] = useState<any[] | null>(null)
  const [lastWinnerId, setLastWinnerId] = useState<string | null>(null)
  const [lastWinnerHand, setLastWinnerHand] = useState<Tile[]>([])
  const [lastWinnerMelds, setLastWinnerMelds] = useState<Tile[][]>([])
  const [autoDiscardTimeLeft, setAutoDiscardTimeLeft] = useState<number | null>(null) // 自動ツモ切りまでの残り時間
  const [pendingPungTimeLeft, setPendingPungTimeLeft] = useState<number | null>(null) // ポン待ち自動引きまでの残り時間
  // タイマー一時停止用
  const [isTimerPaused, setIsTimerPaused] = useState(false)
  const pausedAutoDiscardTimeLeft = useRef<number | null>(null)
  const pausedPendingPungTimeLeft = useRef<number | null>(null)
  const [isAddingCPU, setIsAddingCPU] = useState(false) // CPU追加中フラグ
  const [showOpponentHand, setShowOpponentHand] = useState(false) // 相手の手牌表示フラグ
  const wsRef = useRef<WebSocket | null>(null)
  const connectionAttempted = useRef(false)  // Prevent multiple connection attempts
  const autoNextTimerRef = useRef<number | null>(null)  // タイマーIDをRefで管理
  const autoDiscardIntervalRef = useRef<number | null>(null)  // カウントダウンインターバルのID
  const autoDiscardTimeoutRef = useRef<number | null>(null)  // 自動ツモ切りのタイマーID
  const autoDiscardKeyRef = useRef<string | null>(null)  // 直近の自動ツモ切り対象
  const pendingPungIntervalRef = useRef<number | null>(null)  // ポン待ち時のカウントダウンインターバルのID
  const noMeldAutoDrawRef = useRef<string | null>(null)  // ノーメルドモード自動ツモの状態フラグ
  const attemptedReconnectUserId = useRef<string | null>(null)  // Track if we tried to reconnect with a specific userId
  const onBackRef = useRef(onBack)
  const opponentActionDelayRef = useRef<number | null>(null)
  const opponentActionHideRef = useRef<number | null>(null)
  const opponentResultDelayRef = useRef<number | null>(null)
  const userIdRef = useRef('')
  const gameStateRef = useRef<GameState | null>(null)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const triggerOpponentActionModal = React.useCallback((text: string) => {
    if (!text) return

    // Clear any existing timers
    if (opponentActionDelayRef.current !== null) {
      clearTimeout(opponentActionDelayRef.current)
      opponentActionDelayRef.current = null
    }

    // Schedule toast with 500ms delay
    opponentActionDelayRef.current = window.setTimeout(() => {
      toast.custom(
        (t) => (
          <div
            className={`flex items-center justify-center px-8 py-6 bg-white border-4 border-[#1a2e0a] rounded-lg shadow-2xl whitespace-nowrap`}>
            <span className="text-8xl font-bold text-[#1a2e0a]">
              {text}
            </span>
          </div>
        ),
        {
          duration: 300,
          position: 'top-center',
        }
      )
    }, 300)
  }, [])

  const scheduleOpponentResultDisplay = React.useCallback((callback: () => void, delayMs: number) => {
    if (opponentResultDelayRef.current !== null) {
      clearTimeout(opponentResultDelayRef.current)
      opponentResultDelayRef.current = null
    }

    if (delayMs <= 0) {
      callback()
      return
    }

    opponentResultDelayRef.current = window.setTimeout(() => {
      callback()
    }, delayMs)
  }, [])

  const getOpponentActionFromState = React.useCallback((prevState: GameState | null, nextState: GameState) => {
    const currentUserId = userIdRef.current
    if (!currentUserId || !prevState) return ''

    const opponent = nextState.players?.find((player) => player.userId !== currentUserId)
      || prevState.players?.find((player) => player.userId !== currentUserId)

    if (!opponent) return ''

    // Check for riichi
    const prevRiichi = prevState.riichi?.[opponent.userId]
    const nextRiichi = nextState.riichi?.[opponent.userId]
    if (!prevRiichi && nextRiichi) {
      return `リーチ`
    }

    const prevMelds = (prevState.tiles?.[opponent.userId]?.melds as Array<Array<Tile | string>>) || []
    const nextMelds = (nextState.tiles?.[opponent.userId]?.melds as Array<Array<Tile | string>>) || []

    if (nextMelds.length > prevMelds.length) {
      return `ポン`
    }

    return ''
  }, [])

  const getOpponentWinText = React.useCallback((winType: string, winnerName: string) => {
    if (winType.includes('ツモ')) return `ツモ`
    if (winType.includes('ロン')) return `ロン`
    return `和了`
  }, [])

  const clearInvalidSession = React.useCallback(() => {
    localStorage.removeItem('mahjong-session')
    setError('')
    setMessage('')
  }, [])

  // Get the other player
  const otherPlayer = gameState?.players?.find(p => p.userId !== userId)

  const handleMessage = React.useCallback((data: any) => {
    const { type, payload } = data
    debugLog(`📨 Received ${type} message`)
    console.log('📨 Received message:', { type, payload })

    switch (type) {
      case 'joined':
        debugLog(`✅ Successfully joined room with userId=${payload.userId}`)
        console.log('✅ Successfully joined room - setting states now')
        console.log('Payload:', payload)

        // Check if reconnection was attempted but failed
        if (attemptedReconnectUserId.current &&
          attemptedReconnectUserId.current !== payload.userId &&
          !payload.isReconnecting) {
          console.warn('⚠️ Reconnection failed - userId changed from', attemptedReconnectUserId.current, 'to', payload.userId)
          console.warn('⚠️ Session expired or room restarted. Clearing old session.')
          clearInvalidSession()
          attemptedReconnectUserId.current = null
        }

        setUserId(payload.userId)
        attemptedReconnectUserId.current = null  // Clear the reconnection attempt

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
          autoDrawMode: payload.gameState?.autoDrawMode,
          noMeldMode: payload.gameState?.noMeldMode,
          riichi: payload.gameState?.riichi,
          riichiDeposits: payload.gameState?.riichiDeposits,
          dora: payload.gameState?.dora,
          kanningWall: payload.gameState?.kanningWall,
          pendingPungFor: payload.gameState?.pendingPungFor,
          canWinFor: payload.gameState?.canWinFor,
        }
        debugLog(`Setting gameState to status=${initialState.status}`)
        console.log('Game state initialized:', initialState)
        setGameState(initialState)

        // Restore autoDrawMode and noMeldMode state for the current player on reconnection
        const userAutoDrawMode = payload.gameState?.autoDrawMode?.[payload.userId]
        const userNoMeldMode = payload.gameState?.noMeldMode?.[payload.userId]
        if (typeof userAutoDrawMode === 'boolean') {
          console.log(`🔄 Restoring autoDrawMode: ${userAutoDrawMode}`)
          setAutoDrawMode(userAutoDrawMode)
        }
        if (typeof userNoMeldMode === 'boolean') {
          console.log(`🔄 Restoring noMeldMode: ${userNoMeldMode}`)
          setNoMeldMode(userNoMeldMode)
        }

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
      case 'gameStarted':
        debugLog(`🎮 Game started with status=${payload.status}, players=${payload.players.length}`)
        console.log('🎮 Game started with payload:', payload)
        console.log(`🎮 [DEBUG] tiles data:`, JSON.stringify(payload.tiles, null, 2))
        // Safety check: only accept gameStarted if 2 players are present
        if (!payload.players || payload.players.length < 2) {
          debugLog(`❌ REJECTED: gameStarted received but only ${payload.players?.length || 0} player(s) - waiting for 2 players`)
          console.warn('⚠️ gameStarted rejected - fewer than 2 players:', payload)
          break
        }
        // 次の局が始まったらUI状態をリセット
        setScoreResult(null)
        setLastWinnerId(null)
        setLastWinnerHand([])
        setLastWinnerMelds([])
        setNextRoundReady(false)
        setRiichiMode(false)
        setTenpaiInfoMap({})
        if (opponentResultDelayRef.current !== null) {
          clearTimeout(opponentResultDelayRef.current)
          opponentResultDelayRef.current = null
        }
        if (autoNextTimerRef.current !== null) {
          clearTimeout(autoNextTimerRef.current)
          autoNextTimerRef.current = null
        }

        // Sync autoDrawMode and noMeldMode for current player
        const currentUserIdForGameStart = userIdRef.current
        if (payload.autoDrawMode?.[currentUserIdForGameStart] !== undefined) {
          setAutoDrawMode(payload.autoDrawMode[currentUserIdForGameStart])
        } else {
          setAutoDrawMode(false)
        }
        if (payload.noMeldMode?.[currentUserIdForGameStart] !== undefined) {
          setNoMeldMode(payload.noMeldMode[currentUserIdForGameStart])
        } else {
          setNoMeldMode(false)
        }

        setGameState(payload)
        debugLog(`✅ gameState updated to status=${payload.status}`)
        setMessage('ゲームが始まりました！')
        break
      case 'gameStateUpdate':
        debugLog(`♻️ Game state updated`)
        console.log('♻️ Game state updated', payload)
        console.log(`  canWinFor=${payload.canWinFor}, currentTurn=${payload.currentTurn}, status=${payload.status}`)
        {
          const prevState = gameStateRef.current
          const actionText = getOpponentActionFromState(prevState, payload)
          if (actionText) {
            triggerOpponentActionModal(actionText)
          }
        }

        // Sync autoDrawMode and noMeldMode for current player
        const currentUserId = userIdRef.current
        if (payload.autoDrawMode?.[currentUserId] !== undefined) {
          setAutoDrawMode(payload.autoDrawMode[currentUserId])
        }
        if (payload.noMeldMode?.[currentUserId] !== undefined) {
          setNoMeldMode(payload.noMeldMode[currentUserId])
        }

        setGameState((prevState) => {
          // 次の局への準備状況が更新された可能性があるので反映
          return {
            ...payload,
            // payloadに含まれていない可能性があるフィールドは前の状態から引き継ぐ
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
        console.log('🏁 Game finished', payload)

        const winnerId = payload.winner || null
        setLastWinnerId(winnerId)

        const opponentWon = winnerId && winnerId !== userIdRef.current
        const isOpponentRonTsumo = opponentWon && /ロン|ツモ/.test(payload.winType || '')
        const resultDelayMs = isOpponentRonTsumo ? 2000 : 0

        if (opponentWon && isOpponentRonTsumo) {
          const winnerName = gameStateRef.current?.players?.find((p) => p.userId === winnerId)?.playerName || '相手'
          const winTypeText = getOpponentWinText(payload.winType || '', winnerName)
          triggerOpponentActionModal(winTypeText)
        }

        const noYaku =
          payload?.scoreResult?.valid === false ||
          (typeof payload?.scoreResult?.error === 'string' && payload.scoreResult.error.includes('役がありません'))
        if (noYaku) {
          setError(payload?.scoreResult?.error || '役がありません')
          if (autoNextTimerRef.current !== null) {
            clearTimeout(autoNextTimerRef.current)
            autoNextTimerRef.current = null
          }
          break
        }

        // 最終結果（ゲームオーバー）かどうかをチェック
        console.log('🏁 [DEBUG] gameFinished - payload.gameOver:', payload.gameOver)
        console.log('🏁 [DEBUG] gameFinished - payload.finalResults:', payload.finalResults)
        if (payload.gameOver) {
          // 最終結果は遅延なしで即座に表示
          console.log('🏁 [DEBUG] Setting finalResults:', payload.finalResults)
          setFinalResults(payload.finalResults)
          setMessage('ゲーム終了（誰かの点数がマイナスになりました）')
        } else {
          // 点数計算結果を保存
          if (payload.scoreResult) {
            // scoreResultがある場合は、winType情報を追加し、isDraw を false に設定
            const resultToShow = {
              ...payload.scoreResult,
              winType: payload.winType || '',
              isDraw: false  // ロン・ツモなど実際の和了は流局ではない
            }
            scheduleOpponentResultDisplay(() => {
              setScoreResult(resultToShow)
            }, resultDelayMs)
          } else if (payload.winner) {
            // 勝者がいる場合は実際の和了（scoreResult がなくても）
            const resultToShow = {
              valid: true,
              score: 0,
              han: 0,
              fu: 0,
              scoreType: payload.winType || '和了',
              yaku: [],
              isDraw: false,  // 勝者がいるなら和了
              winType: payload.winType || ''
            }
            scheduleOpponentResultDisplay(() => {
              setScoreResult(resultToShow)
            }, resultDelayMs)
          } else if (!payload.gameOver) {
            // 勝者もいない場合のみ、流局などの結果として簡易情報を作成
            const resultToShow = {
              valid: true,
              score: 0,
              han: 0,
              fu: 0,
              scoreType: payload.winType || 'ゲーム終了',
              yaku: [],
              isDraw: true,  // 流局・引き分けフラグ
            }
            scheduleOpponentResultDisplay(() => {
              setScoreResult(resultToShow)
            }, resultDelayMs)
          }
          // 自動進行はバックエンドに任せる（両プレイヤーが準備完了したら自動的にgameStartedが来る）
        }

        // gameStateを使って勝者名を取得してからメッセージを設定
        setGameState((prevState) => {
          if (winnerId && prevState?.tiles?.[winnerId]) {
            const winnerTiles = prevState.tiles[winnerId]
            const winnerHand = (winnerTiles?.hand || []).map((tile: any) => normalizeTile(tile))
            const winnerMelds = ((winnerTiles?.melds as Array<Array<Tile | string>>) || [])
              .map((meld) => meld.map((tile) => normalizeTile(tile)))
            const winnerDrawn = winnerTiles?.drawnTile ? normalizeTile(winnerTiles.drawnTile) : null
            setLastWinnerHand(winnerDrawn ? [...winnerHand, winnerDrawn] : winnerHand)
            setLastWinnerMelds(winnerMelds)
          } else {
            setLastWinnerHand([])
            setLastWinnerMelds([])
          }

          const winnerName = prevState?.players?.find((p: any) => p.userId === payload.winner)?.playerName || payload.winner
          if (!payload.gameOver) {
            setMessage(`${payload.winType || 'ゲーム終了'} 勝者: ${winnerName}`)
          }
          // gameStateはそのまま保持（finished状態を維持）
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
          // エラーメッセージを表示
          setError(payload.message || 'アクションに失敗しました')
          if (payload.message && payload.message.includes('役がありません')) {
            if (autoNextTimerRef.current !== null) {
              clearTimeout(autoNextTimerRef.current)
              autoNextTimerRef.current = null
            }
          }
          setTimeout(() => setError(''), 4000) // 4秒後にクリア
        } else if (payload.riichi) {
          // リーチ成功メッセージ
          setMessage(payload.message || 'リーチ宣言しました！')
          setTimeout(() => setMessage(''), 5000) // 5秒後にクリア
        }
        break
      case 'error':
        // Handle both {type, payload: {message}} and {type, message} formats
        const errorMessage = payload?.message || data.message || 'エラーが発生しました'
        debugLog(`❌ Server error: ${errorMessage}`)
        console.error('❌ Server error:', errorMessage, 'Full data:', data)
        const isInvalidSessionError =
          errorMessage.includes('Room not found') ||
          errorMessage.includes('Invalid reconnection') ||
          errorMessage.includes('Invalid message format')

        if (isInvalidSessionError) {
          console.log('🗑️ Clearing invalid session from localStorage')
          clearInvalidSession()
          onBackRef.current()
          break
        }

        setError(errorMessage)
        break
      case 'playerReconnected':
        debugLog(`🔄 Player reconnected: ${payload.playerName}`)
        console.log('🔄 Player reconnected:', payload)
        setMessage(`${payload.playerName}さんが再接続しました`)
        setTimeout(() => setMessage(''), 3000)
        break
      default:
        debugLog(`⚠️ Unknown message type: ${type}`)
        console.log('⚠️ Unknown message type:', type)
    }
  }, [])

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoNextTimerRef.current !== null) {
        clearTimeout(autoNextTimerRef.current)
      }
      if (autoDiscardIntervalRef.current !== null) {
        clearInterval(autoDiscardIntervalRef.current)
      }
      if (pendingPungIntervalRef.current !== null) {
        clearInterval(pendingPungIntervalRef.current)
      }
      if (opponentResultDelayRef.current !== null) {
        clearTimeout(opponentResultDelayRef.current)
      }
      if (opponentActionDelayRef.current !== null) {
        clearTimeout(opponentActionDelayRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Prevent multiple connection attempts due to React StrictMode in development
    if (connectionAttempted.current) {
      debugLog(`⚠️ Connection already attempted, skipping duplicate connection`)
      return
    }

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

    // Connect to WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'ws://localhost:3001'
    debugLog(`🔌 Attempting WebSocket connection to: ${wsUrl}`)
    console.log('🔌 Attempting WebSocket connection to:', wsUrl)

    const ws = new WebSocket(wsUrl)
    connectionAttempted.current = true

    ws.onopen = () => {
      debugLog('✅ WebSocket connected successfully')
      console.log('✅ WebSocket connected successfully')
      setError('')

      const joinPayload: any = {
        roomId,
        playerName,
      }

      // If we have a saved session, include the userId for reconnection
      if (savedSession && savedSession.userId) {
        joinPayload.userId = savedSession.userId
        attemptedReconnectUserId.current = savedSession.userId  // Remember we're trying to reconnect
        debugLog(`🔄 Attempting to reconnect with userId=${savedSession.userId}`)
        console.log('🔄 Attempting reconnection with userId:', savedSession.userId)
      }

      debugLog(`📤 Sending join message: roomId=${roomId}, playerName=${playerName}`)
      console.log('📤 Sending join message:', joinPayload)
      // Send join message
      ws.send(
        JSON.stringify({
          type: 'join',
          payload: joinPayload,
        })
      )
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
      setError(`接続エラー: WebSocket接続に失敗しました（バックエンドを確認してください）`)
    }

    ws.onclose = () => {
      debugLog('🔌 WebSocket disconnected')
      console.log('🔌 WebSocket disconnected')
    }

    wsRef.current = ws

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [roomId, playerName, handleMessage])

  React.useEffect(() => {
    // Debug: log when component is mounted
    debugLog(`Component mounted/updated: roomId=${roomId}, playerName=${playerName}`)
  }, [roomId, playerName])

  const sendAction = React.useCallback((action: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'action',
          payload: action,
        })
      )
    }
  }, [])

  const handleNextRound = React.useCallback(() => {
    // バックエンドに「次の局へ」を伝える
    // バックエンドが両プレイヤーの準備状況を管理し、gameStateUpdateでnextRoundReadyCountが更新される
    sendAction({ type: 'nextRound' })
  }, [sendAction])

  const checkTenpai = React.useCallback((tileIndex: number) => {
    console.log(`🔍 Checking tenpai locally for tile index ${tileIndex}`)
    const hand = gameState?.tiles?.[userId]?.hand || []
    const melds = gameState?.tiles?.[userId]?.melds || []
    console.log(`  Current hand:`, hand)
    console.log(`  Current melds:`, melds)

    if (hand.length === 0) {
      setTenpaiInfo({ isTenpai: false, winningTiles: [] })
      return
    }

    // クライアント側で聴牌判定を実行
    const result = TenpaiChecker.checkTenpaiAfterDiscard(hand, tileIndex, melds)
    console.log(`  Tenpai result:`, result)
    setTenpaiInfo(result)
  }, [gameState, userId])

  // ツモ時に全牌の聴牌情報をローカルで計算
  React.useEffect(() => {
    setRiichiMode(false)
    setTenpaiInfoMap({})

    // 自分のターンでリーチしていない場合、全牌の聴牌チェックをローカルで実行
    const isMyTurn = gameState?.currentTurn === userId
    if (isMyTurn && !gameState?.riichi?.[userId] && gameState?.status === 'playing') {
      const hand = gameState?.tiles?.[userId]?.hand || []
      const melds = gameState?.tiles?.[userId]?.melds || []

      if (hand.length > 0) {
        console.log('🔍 Computing all tenpai checks locally...')
        console.log('  Hand:', hand.map((t: any, i: number) => `[${i}]${t.display}`).join(' '))
        console.log('  Melds:', melds.length)
        const results = TenpaiChecker.checkAllTenpai(hand, melds)
        console.log('🔍 All tenpai results:', results)
        console.log('🔍 Tenpai tiles count:', Object.values(results).filter((r: any) => r.isTenpai).length)
        setTenpaiInfoMap(results)
      }
    }
  }, [gameState?.tiles?.[userId]?.hand?.length, gameState?.currentTurn, gameState?.riichi, userId, gameState?.status])

  const toggleAutoDrawMode = React.useCallback((enabled: boolean) => {
    setAutoDrawMode(enabled)
    sendAction({
      type: 'setAutoDrawMode',
      enabled,
    })
  }, [sendAction])

  const toggleNoMeldMode = React.useCallback((enabled: boolean) => {
    setNoMeldMode(enabled)
    sendAction({
      type: 'setNoMeldMode',
      enabled,
    })
  }, [sendAction])

  const copyHandInfoToClipboard = React.useCallback(async () => {
    if (!gameState || !userId) return

    const tiles = gameState.tiles?.[userId]
    if (!tiles) return

    const hand = tiles.hand as Tile[] || []
    const melds = tiles.melds as Tile[][] || []

    // Format hand in mahjong notation
    const formatHand = (tiles: Tile[]) => {
      const sorted = tiles.slice().sort((a, b) => {
        const suitOrder: Record<string, number> = { man: 0, pin: 1, sou: 2, honor: 3 }
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
          return suitOrder[a.suit] - suitOrder[b.suit]
        }
        return a.number - b.number
      })

      let result = ''
      let currentSuit = ''
      let currentNumbers = ''

      sorted.forEach((tile, idx) => {
        if (tile.suit !== currentSuit) {
          if (currentNumbers) {
            result += currentNumbers + currentSuit.charAt(0)
          }
          currentSuit = tile.suit
          currentNumbers = ''
        }

        if (tile.suit === 'honor') {
          const honorNames = ['', '東', '南', '西', '北', '白', '發', '中']
          result += honorNames[tile.number]
        } else {
          currentNumbers += tile.number
        }
      })

      if (currentNumbers && currentSuit !== 'honor') {
        result += currentNumbers + currentSuit.charAt(0)
      }

      return result
    }

    const handStr = formatHand(hand)
    const meldsStr = melds.length > 0
      ? ' +ポン×' + melds.length + '(' + melds.map(m => formatHand(m)).join(',') + ')'
      : ''

    let info = `【手牌情報】\n`
    info += `手牌: ${handStr}${meldsStr}\n`
    info += `合計: ${hand.length}枚 (メルド${melds.length * 3}枚含めて${hand.length + melds.length * 3}枚)\n`
    info += `\n【聴牌判定】\n`

    // Check tenpai for each tile synchronously using server check
    let hasTenpai = false

    info += `※ 聴牌情報を取得中...\n`
    info += `\nゲーム内で各牌にマウスを乗せると当たり牌が表示されます。\n`
    info += `システムログで詳細を確認できます。\n`

    try {
      await navigator.clipboard.writeText(info)
      alert('手牌情報をクリップボードにコピーしました！\n\n※ 実際の当たり牌を確認するには、ゲーム内で牌にマウスカーソルを乗せてください。')
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('コピーに失敗しました。ブラウザの設定を確認してください。')
    }
  }, [gameState, userId])

  // CPU追加処理
  const handleAddCPU = React.useCallback(async () => {
    if (isAddingCPU) return

    setIsAddingCPU(true)
    setError('')

    try {
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/add-cpu`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'CPU追加に失敗しました')
      }

      const data = await response.json()
      setMessage(`${data.cpuName}が参加しました`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'CPU追加に失敗しました'
      )
    } finally {
      setIsAddingCPU(false)
    }
  }, [roomId, isAddingCPU])

  // 10-second auto-action timer
  React.useEffect(() => {
    if (!gameState || !userId || gameState.status !== 'playing') {
      return;
    }

    if (isTimerPaused) {
      // タイマー一時停止時は現在の残り秒数を保存し、interval/timeoutを止める
      if (pendingPungIntervalRef.current !== null) {
        clearInterval(pendingPungIntervalRef.current);
        pendingPungIntervalRef.current = null;
      }
      if (autoDiscardIntervalRef.current !== null) {
        clearInterval(autoDiscardIntervalRef.current);
        autoDiscardIntervalRef.current = null;
      }
      // 残り時間をrefに保存
      pausedAutoDiscardTimeLeft.current = autoDiscardTimeLeft;
      pausedPendingPungTimeLeft.current = pendingPungTimeLeft;
      return;
    }

    // ...existing code (元のタイマー処理をここにそのまま残す)...
    // ここから下は元のタイマー処理
    const isYourTurn = gameState.currentTurn === userId;
    const drawnTileIndex = isYourTurn
      ? (gameState.tiles?.[userId]?.drawnTileIndex ?? -1)
      : -1;
    const fullHand = (gameState.tiles?.[userId]?.hand as Tile[]) || [];
    const otherPlayer = gameState.players?.find(p => p.userId !== userId);
    const otherUserId = otherPlayer?.userId;
    const otherDiscards = otherUserId
      ? (((gameState.discards?.[otherUserId] as Array<Tile | string>) || []).map(normalizeTile))
      : [];
    const lastOpponentDiscard = otherDiscards.length > 0 ? otherDiscards[otherDiscards.length - 1] : null;
    const pendingPungFor = gameState.pendingPungFor;
    const isNoMeldMode = gameState.noMeldMode?.[userId] === true;

    // Auto-draw immediately when no-meld mode is active and pung is pending
    const shouldAutoDrawDueToNoMeldMode = isYourTurn && pendingPungFor === userId && isNoMeldMode && drawnTileIndex < 0;
    if (shouldAutoDrawDueToNoMeldMode) {
      const stateKey = `${pendingPungFor}_draw`;
      if (noMeldAutoDrawRef.current !== stateKey) {
        console.log('🚫 No-meld mode active - auto-drawing immediately');
        noMeldAutoDrawRef.current = stateKey;
        sendAction({ type: 'draw' });
      }
      return;
    }

    // Reset no-meld auto-draw state when conditions are no longer met
    if (!shouldAutoDrawDueToNoMeldMode) {
      noMeldAutoDrawRef.current = null;
    }

    // Check if player can pung
    const canPung = isYourTurn && pendingPungFor === userId && !!lastOpponentDiscard && !isNoMeldMode && fullHand.filter(
      (tile) => tile.suit === lastOpponentDiscard.suit && tile.number === lastOpponentDiscard.number
    ).length >= 2;

    // Check if player needs to discard
    const canDiscard = isYourTurn && fullHand.length % 3 === 2;

    // Handle pending pung waiting - auto-draw after 10 seconds (unless in no-meld mode)
    if (canPung && !isNoMeldMode) {
      // Start countdown from 10秒 or 一時停止復帰時は残り秒数から
      setPendingPungTimeLeft(pausedPendingPungTimeLeft.current ?? 10);
      pausedPendingPungTimeLeft.current = null;

      // Update countdown every second
      const interval = window.setInterval(() => {
        setPendingPungTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      pendingPungIntervalRef.current = interval;

      const timer = setTimeout(() => {
        // Auto-draw after 10 seconds of pung waiting
        console.log('⏱️ Auto-drawing after pending pung timeout');
        sendAction({ type: 'draw' });
        setPendingPungTimeLeft(null);
      }, (pausedPendingPungTimeLeft.current ?? 10) * 1000);

      return () => {
        clearTimeout(timer);
        if (pendingPungIntervalRef.current !== null) {
          clearInterval(pendingPungIntervalRef.current);
          pendingPungIntervalRef.current = null;
        }
      };
    }

    // Clear pending pung countdown if not applicable
    setPendingPungTimeLeft(null);
    if (pendingPungIntervalRef.current !== null) {
      clearInterval(pendingPungIntervalRef.current);
      pendingPungIntervalRef.current = null;
    }

    // Auto-discard if auto-draw mode is enabled and we have a drawn tile
    if (autoDrawMode && isYourTurn && drawnTileIndex >= 0 && canDiscard) {
      setAutoDiscardTimeLeft(null); // No countdown in auto mode
      if (autoDiscardIntervalRef.current !== null) {
        clearInterval(autoDiscardIntervalRef.current);
        autoDiscardIntervalRef.current = null;
      }
      const drawnTile = fullHand[drawnTileIndex];
      const autoDiscardKey = drawnTile ? `${drawnTile.suit}_${drawnTile.number}_${drawnTileIndex}` : null;
      if (autoDiscardKey && autoDiscardKeyRef.current !== autoDiscardKey) {
        if (autoDiscardTimeoutRef.current !== null) {
          clearTimeout(autoDiscardTimeoutRef.current);
        }
        autoDiscardKeyRef.current = autoDiscardKey;
        autoDiscardTimeoutRef.current = window.setTimeout(() => {
          if (drawnTile) {
            sendAction({ type: 'discard', tileId: `${drawnTile.suit}_${drawnTile.number}` });
          }
        }, 500); // 500ms delay for auto-discard
      }
    } else {
      autoDiscardKeyRef.current = null;
      if (autoDiscardTimeoutRef.current !== null) {
        clearTimeout(autoDiscardTimeoutRef.current);
        autoDiscardTimeoutRef.current = null;
      }
    }

    // Set timer if player needs to discard (10 second fallback)
    if (!autoDrawMode && canDiscard && drawnTileIndex >= 0) {
      // Start countdown from 10秒 or 一時停止復帰時は残り秒数から
      setAutoDiscardTimeLeft(pausedAutoDiscardTimeLeft.current ?? 10);
      pausedAutoDiscardTimeLeft.current = null;

      // Update countdown every second
      const interval = window.setInterval(() => {
        setAutoDiscardTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      autoDiscardIntervalRef.current = interval;

      const timer = setTimeout(() => {
        // Auto-discard the drawn tile after 10 seconds
        const drawnTile = fullHand[drawnTileIndex];
        if (drawnTile) {
          sendAction({ type: 'discard', tileId: `${drawnTile.suit}_${drawnTile.number}` });
        }
        setAutoDiscardTimeLeft(null);
      }, (pausedAutoDiscardTimeLeft.current ?? 10) * 1000);

      return () => {
        clearTimeout(timer);
        if (autoDiscardIntervalRef.current !== null) {
          clearInterval(autoDiscardIntervalRef.current);
          autoDiscardIntervalRef.current = null;
        }
      };
    } else {
      // Clear countdown if conditions are not met
      setAutoDiscardTimeLeft(null);
      if (autoDiscardIntervalRef.current !== null) {
        clearInterval(autoDiscardIntervalRef.current);
        autoDiscardIntervalRef.current = null;
      }
    }
  }, [gameState, userId, autoDrawMode, sendAction, isTimerPaused]);

  if (!gameState) {
    const debugLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]')
    const lastLog = debugLogs[debugLogs.length - 1]?.message || 'No logs yet'

    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] p-5">
        <div className="bg-[#2d5016] border-4 border-white shadow-xl p-10 w-full max-w-2xl">
          <div className="p-5 text-center">
            <p className="text-lg mb-5">ゲームに接続中...</p>
            <div className="mb-4 text-sm font-bold text-green-600">
              最新イベント: {lastLog}
            </div>
            <div className="text-left text-gray-600 text-xs bg-gray-100 p-2 rounded mb-2 font-mono max-h-48 overflow-auto">
              <div><strong>プレイヤー:</strong> {playerName}</div>
              <div><strong>ルーム:</strong> {roomId}</div>
              <div><strong>エラー:</strong> {error || 'なし'}</div>
              <div><strong>WebSocket状態:</strong> {wsRef.current?.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)</div>
              <div><strong>gameState:</strong> {gameState === null ? '❌ null（待機中）' : JSON.stringify(gameState, null, 2)}</div>
            </div>
            <details className="mt-2 text-left text-xs font-mono">
              <summary className="cursor-pointer mb-1">
                📋 デバッグログ ({debugLogs.length}件)
              </summary>
              <div className="bg-gray-100 p-1 rounded max-h-48 overflow-auto text-xs">
                {debugLogs.map((log: any, idx: number) => (
                  <div key={idx} className="mb-0 break-words">
                    {log.message}
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    )
  }

  const isYourTurn = gameState.currentTurn === userId
  const drawnTileIndex = isYourTurn
    ? (gameState.tiles?.[userId]?.drawnTileIndex ?? -1)
    : -1
  const fullHand = (gameState.tiles?.[userId]?.hand as Tile[]) || []
  const displayHandIndices = fullHand
    .map((_, idx) => idx)
    .filter((idx) => !(isYourTurn && drawnTileIndex >= 0 && idx === drawnTileIndex))

  const yourDiscards = ((gameState.discards?.[userId] as Array<Tile | string>) || []).map(normalizeTile)
  const otherUserId = otherPlayer?.userId
  const otherDiscards = otherUserId
    ? (((gameState.discards?.[otherUserId] as Array<Tile | string>) || []).map(normalizeTile))
    : []
  const otherHand = otherUserId
    ? (((gameState.tiles?.[otherUserId]?.hand as Array<Tile | string>) || []).map(normalizeTile))
    : []
  const otherMelds = otherUserId
    ? (((gameState.tiles?.[otherUserId]?.melds as Array<Array<Tile | string>>) || [])
      .map((meld) => meld.map(normalizeTile)))
    : []
  const melds = ((gameState.tiles?.[userId]?.melds as Array<Array<Tile | string>>) || [])
    .map((meld) => meld.map(normalizeTile))

  const totalTiles = fullHand.length + (melds.length * 3)
  // Use backend's canWinFor flag for accurate win detection
  const canWin = isYourTurn && gameState.canWinFor === userId
  const pendingPungFor = gameState.pendingPungFor
  const ronPossibleFor = gameState.ronPossibleFor
  const lastOpponentDiscard = otherDiscards.length > 0 ? otherDiscards[otherDiscards.length - 1] : null
  const isRiichi = gameState.riichi?.[userId] === true
  const isNoMeldMode = gameState.noMeldMode?.[userId] === true
  const canPung = isYourTurn && pendingPungFor === userId && !!lastOpponentDiscard && !isRiichi && !isNoMeldMode && fullHand.filter(
    (tile) => tile.suit === lastOpponentDiscard.suit && tile.number === lastOpponentDiscard.number
  ).length >= 2
  const canRon = isYourTurn && ronPossibleFor === userId
  // ポン後で牌をまだ引いていない状態（fullHand.length % 3 === 2）では牌を引けない
  const canDraw = isYourTurn && drawnTileIndex < 0 && !canRon && !isRiichi && fullHand.length % 3 !== 2

  // 聴牌可能な牌が1つでもあるかチェック
  // 重要: すべての牌の聴牌情報が取得されているか確認してから判定
  const allTenpaiChecked = fullHand.length > 0 && Object.keys(tenpaiInfoMap).length === fullHand.length
  const tenpaiCount = Object.values(tenpaiInfoMap).filter(info => info?.isTenpai).length
  const canDeclareRiichi = allTenpaiChecked && !isRiichi && melds.length === 0 && ((gameState?.scores?.[userId] ?? 0) >= 1000) &&
    tenpaiCount > 0

  // デバッグログ
  if (isYourTurn) {
    const tenpaiCount2 = Object.values(tenpaiInfoMap).filter(info => info?.isTenpai).length
    console.log(`\n🎮 [BUTTON STATE] currentTurn=${gameState.currentTurn}, userId=${userId}`)
    console.log(`  Button state:`)
    console.log(`    - isYourTurn=${isYourTurn}`)
    console.log(`    - drawnTileIndex=${drawnTileIndex}`)
    console.log(`    - fullHand.length=${fullHand.length} (length%3=${fullHand.length % 3})`)
    console.log(`    - canDraw=${canDraw} (isYourTurn=${isYourTurn} && drawnTileIndex<0=${drawnTileIndex < 0} && !canRon=${!canRon} && length%3!==2=${fullHand.length % 3 !== 2})`)
    console.log(`    - ronPossibleFor=${ronPossibleFor}`)
    console.log(`    - canRon=${canRon} (isYourTurn=${isYourTurn} && ronPossibleFor===userId=${ronPossibleFor === userId})`)
    console.log(`    - isNoMeldMode=${isNoMeldMode}`)
    console.log(`    - canPung=${canPung}`)
    console.log(`    - canWin=${canWin}`)
    console.log(`    - isRiichi=${isRiichi}`)
    console.log(`    - canDeclareRiichi=${canDeclareRiichi} (tenpaiCount=${tenpaiCount2})`)
    console.log(`  Hand: ${fullHand.map((t, i) => `[${i}]${t?.display}`).join(' ')}`)
  }

  return (
    <div className={`flex flex-col justify-start items-center min-h-screen bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] sm:pt-1 ${isGrayscale ? 'grayscale' : ''}`}>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="bg-[#2d5016] sm:border-2 border-white shadow-xl sm:p-2 w-full max-w-4xl h-[calc(100vh-16rem)] sm:max-h-[75vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="text-white font-bold text-lg">
            ルームID: {roomId} / ステータス: {gameState.status}
          </div>
          <div className='hidden'>
            userId: {userId}
          </div>
          <div className="flex gap-2 items-center">
            {/* CPU追加ボタン（待機中のみ表示） */}
            {gameState.status === 'waiting' && gameState.players.length < 2 && (
              <button
                onClick={handleAddCPU}
                disabled={isAddingCPU}
                className={`mr-2 px-4 py-2 text-[#ffffff] border-none rounded cursor-pointer font-bold text-sm transition-colors ${isAddingCPU ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {isAddingCPU ? 'CPU追加中...' : '🤖 CPU追加'}
              </button>
            )}
            <button onClick={onBack} className="px-3 py-2 bg-[#1a2e0a] border-2 border-white text-sm text-[#ffffff] cursor-pointer transition-colors hover:bg-[#0f1a06]">
              戻る
            </button>
          </div>
        </div>

        {/* Toast Notification - Server Messages */}
        {error && (
          <div className="fixed top-5 right-5 p-5 bg-red-500 text-[#ffffff] rounded-lg shadow-lg z-[1001] max-w-sm text-sm font-medium" style={{ animation: 'slideIn 0.3s ease-out' }}>
            {error}
          </div>
        )}
        {message && (
          <div className="max-sm:hidden fixed top-5 right-5 p-5 bg-green-500 text-[#ffffff] rounded-lg shadow-lg z-[1001] max-w-sm text-sm font-medium" style={{ animation: 'slideIn 0.3s ease-out' }}>
            {message}
          </div>
        )}

        {/* Game Content */}
        {(gameState.status === 'playing' || gameState.status === 'finished') ? (
          <div className="p-2 text-center bg-[#3d6b20] border-2 border-white rounded-none min-h-52 flex flex-col justify-center items-center">
            <p className={`max-sm:hidden text-lg font-bold ${isYourTurn ? 'text-green-300' : 'text-yellow-300'}`}>
              {gameState.status === 'finished'
                ? 'ゲーム終了'
                : (isYourTurn ? 'あなたの番です' : '相手の番です')
              }
            </p>

            {/* Game Info Center */}
            {/* Current Round */}
            <div className="sm:hidden w-full text-center p-2 bg-white rounded-lg border border-gray-300 flex-1 min-w-24 flex flex-col justify-center">
              <div className="text-xs font-bold text-green-900">
                {getRoundLabel(gameState)} /
                自風 {getSeatWindLabel(gameState, userId)} /
                残り {gameState.wall || 0}枚
                <div>
                  <span className="text-xs text-gray-600">あなた ({playerName}) : </span>
                  <span className="text-green-600">
                    {((gameState?.scores?.[userId]) ?? 25000)?.toLocaleString()}
                  </span>
                  /
                  <span className="text-xs text-gray-600">相手 ({otherPlayer?.playerName || '---'}) : </span>
                  <span className="text-red-500">
                    {otherUserId ? ((gameState?.scores?.[otherUserId]) ?? 25000)?.toLocaleString() : '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent's Hand */}
            <div className="w-full mb-3 rounded-lg p-3 border-0">
              <div className="flex justify-between items-center mb-2">
                {/* CPUの手牌を見るボタン */}
                {otherPlayer?.isCPU && (
                  <button
                    onClick={() => setShowOpponentHand(!showOpponentHand)}
                    className={`px-3 py-1 text-[#ffffff] border-none rounded text-xs font-bold transition-colors ${showOpponentHand ? 'bg-green-600' : 'bg-yellow-500'}`}
                  >
                    {showOpponentHand ? '👁️ 手牌を隠す' : '👁️ 手牌を見る'}
                  </button>
                )}
              </div>
              <div className="flex items-start gap-4 overflow-x-auto">
                {/* 副露（オープンの牌） */}
                {otherMelds.length > 0 && (
                  <div className="flex max-sm:flex-col gap-4">
                    {otherMelds.map((meld, meldIdx) => (
                      <div key={`meld-${meldIdx}`} className="flex gap-px">
                        {meld.map((tile, tileIdx) => (
                          <div key={`meld-${meldIdx}-${tileIdx}`} className="inline-block">
                            <TileImage tile={tile} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* 手牌（裏向きまたは表示） */}
                <div className="flex gap-px flex-wrap">
                  {otherHand.map((tile, idx) => (
                    <div key={`other-hand-${idx}`} className="inline-block">
                      <TileImage
                        tile={tile}
                        faceDown={!showOpponentHand || !otherPlayer?.isCPU}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Opponent's Discards (Kawa) */}
            <div className="w-full mb-3 rounded-lg p-1 border border-gray-300 min-h-28">
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-px">
                  {otherDiscards.length === 0 ? (
                    <span className="text-gray-400 text-xs">なし</span>
                  ) : (
                    otherDiscards.map((tile, idx) => {
                      const isRiichiDiscard = (gameState?.riichiDiscards?.[otherUserId ?? ''] ?? -1) === idx;
                      return (
                        <div
                          key={`od-${idx}`}
                          className="inline-block"
                        >
                          <TileImage
                            tile={tile}
                            isRotated={isRiichiDiscard}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              {/* 相手のリーチ棒表示 */}
              {gameState.players && gameState.players.length > 0 && (() => {
                const otherPlayer = gameState.players.find(p => p.userId !== userId);
                const isOtherRiichi = otherPlayer && gameState.riichi && gameState.riichi[otherPlayer.userId];
                return isOtherRiichi ? (
                  <div className="w-full mt-2 flex items-center gap-2">
                    <img
                      src="/tiles/1000.gif"
                      alt="リーチ棒"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                      }}
                    />
                  </div>
                ) : null;
              })()}
            </div>

            {/* Game Info Center */}
            <div className="max-sm:hidden grid sm:grid-cols-5 w-full mb-1 flex justify-start items-stretch gap-1 flex-wrap">
              {/* Current Round */}
              <div className="text-center px-4 py-2 bg-white rounded-lg border border-gray-300 flex-1 min-w-24 flex flex-col justify-center">
                <div className="text-xs text-gray-500 mb-1">局数</div>
                <div className="text-lg font-bold text-green-900">
                  {getRoundLabel(gameState)}
                </div>
                <div className="text-xs font-bold text-green-900">
                  自風 {getSeatWindLabel(gameState, userId)}
                </div>
              </div>

              {/* Wall Remaining */}
              <div className="text-center px-4 py-2 bg-white rounded-lg border border-gray-300 flex-1 min-w-24 flex flex-col justify-center">
                <div className="text-xs text-gray-500 mb-1">壁牌</div>
                <div className="text-lg font-bold text-green-900">
                  残り {gameState.wall || 0}枚
                </div>
              </div>

              {/* Auto-discard countdown */}
              <div className="text-center px-4 py-2 bg-white rounded-lg border border-gray-300 flex-1 min-w-24 flex flex-col justify-center">
                {pendingPungTimeLeft !== null && pendingPungTimeLeft > 0 ? (
                  <>
                    <div className="text-xs text-gray-500 mb-1">自動ツモ</div>
                    <div className={`text-2xl font-bold ${pendingPungTimeLeft <= 3 ? 'text-blue-500' : 'text-purple-500'}`}>
                      {pendingPungTimeLeft}秒
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-gray-500 mb-1">自動ツモ切り</div>
                    {autoDiscardTimeLeft !== null && autoDiscardTimeLeft > 0 && (
                      <div className={`text-2xl font-bold ${autoDiscardTimeLeft <= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                        {autoDiscardTimeLeft}秒
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Scores */}
              <div className="col-span-2 text-center px-4 py-2 bg-white rounded-lg border border-gray-300 flex-1 min-w-48 flex flex-col justify-center">
                <div className="text-xs text-gray-500 mb-1">得点</div>
                <div className="text-sm font-bold flex justify-around gap-4">
                  <div>
                    <div className="text-xs text-gray-600">あなた ({playerName})</div>
                    <div className="text-green-600">
                      {((gameState?.scores?.[userId]) ?? 25000)?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">相手 ({otherPlayer?.playerName || '---'})</div>
                    <div className="text-red-500">
                      {otherUserId ? ((gameState?.scores?.[otherUserId]) ?? 25000)?.toLocaleString() : '---'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dora and Kanning Wall */}
            <div className="w-full mb-3 flex justify-left items-center flex-wrap">
              {/* Dora Indicator */}
              {gameState.dora && gameState.dora.indicators && gameState.dora.indicators.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {gameState.dora.indicators.map((tile, idx) => (
                      <TileImage
                        key={idx}
                        tile={tile}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Kanning Wall (嶺上牌) - Only show if remaining > 0 */}
              {gameState.kanningWall && gameState.kanningWall.remaining > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex gap-px items-center">
                    {Array.from({ length: gameState.kanningWall.remaining }).map((_, idx) => (
                      <TileImage
                        key={idx}
                        tile={{ suit: 'honor', number: 0, display: '牌の裏' } as Tile}
                        faceDown={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Your Discards (Kawa) */}
            <div className="w-full mb-3 rounded-lg p-1 border border-gray-300 min-h-28">
              {/* 自分のリーチ棒表示 */}
              {(() => {
                const isPlayerRiichi = gameState.riichi && gameState.riichi[userId];
                return isPlayerRiichi ? (
                  <div className="mb-2 flex items-center gap-2">
                    <img
                      src="/tiles/1000.gif"
                      alt="リーチ棒"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                      }}
                    />
                  </div>
                ) : null;
              })()}
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-px">
                  {yourDiscards.length === 0 ? (
                    <span className="text-gray-400 text-xs">なし</span>
                  ) : (
                    yourDiscards.map((tile, idx) => {
                      const isRiichiDiscard = gameState.riichiDiscards?.[userId] === idx;
                      return (
                        <div
                          key={`yd-${idx}`}
                          className="inline-block"
                        >
                          <TileImage
                            tile={tile}
                            isRotated={isRiichiDiscard}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Test Button - Display Opponent Action Modal & Timer Pause */}
            <div className="hidden mb-5 p-4 bg-blue-600 rounded-lg text-center flex flex-wrap gap-2 justify-center items-center">
              <button
                onClick={() => triggerOpponentActionModal('ロン')}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 font-bold"
              >
                ロン表示テスト
              </button>
              <button
                onClick={() => triggerOpponentActionModal('ツモ')}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 font-bold"
              >
                ツモ表示テスト
              </button>
              <button
                onClick={() => triggerOpponentActionModal('ポン')}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 font-bold"
              >
                ポン表示テスト
              </button>
              <button
                onClick={() => triggerOpponentActionModal('リーチ')}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 font-bold"
              >
                リーチ表示テスト
              </button>
              <button
                onClick={() => setIsTimerPaused((prev) => !prev)}
                className={`px-4 py-2 font-bold rounded transition-all ${isTimerPaused ? 'bg-red-500 text-white' : 'bg-white text-blue-700 border-2 border-blue-700'}`}
                style={{ minWidth: '120px' }}
              >
                {isTimerPaused ? '▶ タイマー再開' : '⏸ タイマー一時停止'}
              </button>
              <button
                onClick={copyHandInfoToClipboard}
                className="px-5 py-2 text-sm font-bold border-2 border-blue-700 rounded bg-white text-blue-700 cursor-pointer transition-all hover:bg-blue-50"
              >
                📋 手牌情報をコピー
              </button>
            </div>

          </div>
        ) : gameState.status === 'gameOver' ? (
          // Game Over - Don't show game content, only show final results modal
          <div className="p-8 text-center bg-[#3d6b20] border-2 border-white rounded-none min-h-52 flex flex-col justify-center items-center mb-5 gap-2">
            <p>最終結果を表示中...</p>
            <p className="text-xs text-gray-600">
              finalResults: {finalResults ? `${finalResults.length}局` : 'null/undefined'}
            </p>
            <p className="text-xs text-gray-600">
              コンソールでデバッグログを確認してください
            </p>
          </div>
        ) : (
          <div className="p-8 text-center bg-[#3d6b20] border-2 border-white rounded-none min-h-52 flex flex-col justify-center items-center mb-5">
            <p>ゲーム開始を待機中...</p>
          </div>
        )}

        <div className="hidden">
          <DebugPanel
            wsReadyState={wsRef.current?.readyState}
            gameStatus={gameState.status}
            playersCount={gameState.players?.length || 0}
            currentTurn={gameState.currentTurn}
            userId={userId}
            isYourTurn={isYourTurn}
            wall={gameState.wall}
          />
        </div>
      </div>

      {/* Hand display with tile images and actions - unified horizontal layout */}
      <div className="w-full max-w-4xl p-2 border-white bg-[#2d5016] min-h-60 overflow-y-auto">
        <div className="flex flex-row gap-4 items-start">
          {/* Hand tiles section */}
          <div className="flex gap-3 flex-1 flex-wrap content-start justify-start">
            {gameState.tiles && gameState.tiles[userId]?.hand && gameState.tiles[userId].hand.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-px">
                  {displayHandIndices.map((idx: number) => (
                    <div
                      key={idx}
                      className={`relative cursor-pointer ${riichiMode && !tenpaiInfoMap[idx]?.isTenpai ? 'opacity-30 grayscale' : ''}`}
                      style={{
                        opacity: riichiMode && !tenpaiInfoMap[idx]?.isTenpai ? 0.3 : (idx === drawnTileIndex ? 1 : 0.9),
                      }}
                    >
                      <TileImage
                        tile={fullHand[idx]}
                        onClick={() => {
                          // リーチ中は手牌をクリックできない
                          if (isRiichi) {
                            return;
                          }
                          if (isYourTurn && gameState.status === 'playing') {
                            // リーチモードONの場合、聴牌形になる牌のみクリック可能
                            if (riichiMode) {
                              const canDiscardForRiichi = tenpaiInfoMap[idx]?.isTenpai
                              if (!canDiscardForRiichi) {
                                return; // グレーアウトされた牌はクリックできない
                              }
                              // リーチ宣言
                              const tileToRiichi = fullHand[idx];
                              console.log(`🔴 [Riichi] Selected tile index: ${idx}, Tile: ${tileToRiichi?.toString()}, TileID: ${tileToRiichi?.suit}_${tileToRiichi?.number}`);
                              sendAction({
                                type: 'riichi',
                                tileId: `${tileToRiichi.suit}_${tileToRiichi.number}`
                              });
                              setRiichiMode(false); // リーチモード解除
                              return;
                            }
                            // 通常の捨て牌
                            const tileToDiscard = fullHand[idx];
                            const tileId = `${tileToDiscard?.suit}_${tileToDiscard?.number}`;
                            console.log(`🟢 [Discard] Selected tile index: ${idx}`);
                            console.log(`   fullHand length: ${fullHand.length}`);
                            console.log(`   fullHand[${idx}]: suit=${tileToDiscard?.suit}, number=${tileToDiscard?.number}`);
                            console.log(`   Sending tileId: ${tileId}`);
                            console.log(`   Full hand: ${fullHand.map((t, i) => `[${i}]${t.suit}${t.number}`).join(' ')}`);
                            sendAction({
                              type: 'discard',
                              tileId: tileId
                            });
                          }
                        }}
                        onMouseEnter={() => {
                          // リーチ中は聴牌チェックしない
                          if (isRiichi) {
                            return;
                          }
                          if (isYourTurn && gameState.status === 'playing') {
                            setHoveredTileIndex(idx);
                            // キャッシュから聴牌情報を取得
                            const cached = tenpaiInfoMap[idx];
                            if (cached) {
                              setTenpaiInfo(cached);
                            } else {
                              // キャッシュがない場合のみサーバーに問い合わせ
                              checkTenpai(idx);
                            }
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredTileIndex(null);
                          setTenpaiInfo(null);
                        }}
                        isDrawn={idx === drawnTileIndex}
                        isHovered={hoveredTileIndex === idx}
                      />
                      {/* Tenpai popup */}
                      {hoveredTileIndex === idx && tenpaiInfo?.isTenpai && tenpaiInfo.winningTiles.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(76, 175, 80, 0.95)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          pointerEvents: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <div style={{
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginBottom: '2px',
                          }}>
                            🀄 聴牌
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '2px',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                            {tenpaiInfo.winningTiles.slice(0, 8).map((tile, tIdx) => {
                              const suitCode = tile.suit === 'honor' ? 'z' : (tile.suit === 'man' ? 'm' : tile.suit === 'pin' ? 'p' : 's');
                              const imagePath = `/tiles/${suitCode}${tile.number}.gif`;
                              if (tIdx === 0) {
                                console.log(`First tile: ${tile.display} -> suit: ${tile.suit}, number: ${tile.number}, path: ${imagePath}`);
                              }
                              return (
                                <img
                                  key={tIdx}
                                  src={imagePath}
                                  alt={tile.display}
                                  width={22}
                                  height={31}
                                  style={{
                                    borderRadius: '2px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                  }}
                                  onError={(e) => {
                                    console.error(`Failed to load tile image: ${imagePath}`, tile);
                                  }}
                                />
                              );
                            })}
                            {tenpaiInfo.winningTiles.length > 8 && (
                              <div style={{
                                color: 'white',
                                fontSize: '10px',
                                marginLeft: '4px',
                              }}>
                                +{tenpaiInfo.winningTiles.length - 8}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Highlight drawn tile on the right - always reserve space */}
                  {isYourTurn && drawnTileIndex >= 0 && fullHand[drawnTileIndex] && (
                    <span className='ml-8'>
                      <TileImage
                        tile={fullHand[drawnTileIndex]}
                        onClick={() => {
                          if (isYourTurn && gameState.status === 'playing') {
                            sendAction({
                              type: 'discard',
                              tileIndex: drawnTileIndex
                            });
                          }
                        }}
                        isDrawn={true}
                      />
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>手札を読み込み中...</p>
            )}
          </div>
          <div>
            {/* Melds display - positioned to the right */}
            {melds.length > 0 && (
              <div className="flex flex-col items-end flex-shrink-0 gap-2 min-w-max">
                <div className="flex max-sm:flex-col gap-2 flex-wrap justify-end">
                  {melds.map((meld: Tile[], idx: number) => (
                    <div key={idx} className="flex gap-px">
                      {meld.map((tile: Tile, tileIdx: number) => (
                        <TileImage key={tileIdx} tile={tile} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons section - compact vertical layout */}
        {isYourTurn && gameState.status === 'playing' && (
          <div className='w-full flex gap-8 justify-end'>
            {/* リーチ中で和了できる場合はツモ切りボタンを表示 */}
            {isRiichi && drawnTileIndex >= 0 && canWin && (
              <button
                onClick={() => {
                  const drawnTile = fullHand[drawnTileIndex];
                  if (drawnTile) {
                    sendAction({ type: 'discard', tileId: `${drawnTile.suit}_${drawnTile.number}` });
                  }
                }}
                style={{
                  backgroundColor: '#ff6b6b',
                  borderColor: '#c92a2a',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  padding: '8px 12px',
                  border: '2px solid',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.2s'
                }}
              >
                ツモ切り
              </button>
            )}
            {/* リーチ中で和了できない場合は自動でツモ切りされる（ボタン不要） */}
            {isRiichi && drawnTileIndex >= 0 && !canWin && (
              <div className="px-3 py-2 bg-blue-50 border-2 border-blue-500 rounded text-xs text-blue-700 text-center">
                自動ツモ切り中
              </div>
            )}
            {canDraw && (
              <button
                onClick={() => sendAction({ type: 'draw' })}
                className="px-3 py-2 bg-gray-500 text-[#ffffff] text-xs font-bold border-2 border-gray-600 rounded cursor-pointer transition-all hover:bg-gray-600"
              >
                牌を引く
              </button>
            )}
            {canPung && (
              <button
                onClick={() => sendAction({ type: 'pung' })}
                className="px-3 py-2 bg-cyan-600 text-[#ffffff] text-xs font-bold border-2 border-cyan-700 rounded cursor-pointer transition-all hover:bg-cyan-700"
              >
                ポン
              </button>
            )}
            {canRon && (
              <button
                onClick={() => sendAction({ type: 'ron' })}
                className="px-3 py-2 bg-yellow-600 text-[#ffffff] text-xs font-bold border-2 border-yellow-700 rounded cursor-pointer transition-all hover:bg-yellow-700"
              >
                ロン
              </button>
            )}
            {canWin && (
              <button
                onClick={() => sendAction({ type: 'win' })}
                className="px-3 py-2 bg-green-600 text-[#ffffff] text-xs font-bold border-2 border-green-700 rounded cursor-pointer transition-all hover:bg-green-700"
              >
                ツモ
              </button>
            )}
            {/* リーチボタン - トグル式 */}
            {canDeclareRiichi && (
              <button
                onClick={() => {
                  setRiichiMode(!riichiMode);
                  if (!riichiMode) {
                    // リーチモードONにする際のメッセージ
                    setMessage('リーチモードON: 聴牌形になる牌を選んでクリックしてください（グレーの牌は選べません）');
                    setTimeout(() => setMessage(''), 5000);
                  }
                }}
                style={{
                  backgroundColor: riichiMode ? '#4CAF50' : '#ff4444',
                  borderColor: riichiMode ? '#388E3C' : '#cc0000',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  padding: '8px 12px',
                  border: '2px solid',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'white',
                  boxShadow: riichiMode ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {riichiMode ? '✓ 待機' : '🔴 リーチ'}
              </button>
            )}
            {/* リーチ中の表示 */}
            {gameState.riichi?.[userId] && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#ffebee',
                border: '2px solid #ff4444',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '12px',
                color: '#d32f2f',
                textAlign: 'center',
                boxShadow: '0 4px 8px rgba(255,68,68,0.3)',
                animation: 'pulse 2s infinite'
              }}>
                🔴 リーチ中
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex gap-3 items-center justify-center flex-wrap">
          <button
            onClick={() => toggleAutoDrawMode(!autoDrawMode)}
            className={`px-3 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoDrawMode ? 'bg-green-700 text-[#ffffff] border-green-800' : 'bg-white text-green-700 border-green-700'}`}
          >
            自動ツモ切り: {autoDrawMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => toggleNoMeldMode(!noMeldMode)}
            className={`px-3 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${noMeldMode ? 'bg-red-600 text-[#ffffff] border-red-700' : 'bg-white text-red-600 border-red-600'}`}
          >
            鳴き無効: {noMeldMode ? 'ON' : 'OFF'}
          </button>
          <div className="text-center bg-white rounded-lg border border-gray-300 min-w-24 min-h-8 justify-center">
            {pendingPungTimeLeft !== null && pendingPungTimeLeft > 0 ? (
              <>
                <div className={`text-lg font-bold ${pendingPungTimeLeft <= 3 ? 'text-blue-500' : 'text-purple-500'}`}>
                  {pendingPungTimeLeft}秒
                </div>
              </>
            ) : (
              <>
                {autoDiscardTimeLeft !== null && autoDiscardTimeLeft > 0 && (
                  <div className={`text-lg font-bold ${autoDiscardTimeLeft <= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                    {autoDiscardTimeLeft}秒
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Score Result Modal */}
      {scoreResult && gameState && (
        <ScoreResultModal
          scoreResult={scoreResult}
          gameState={gameState}
          nextRoundReady={(gameState?.nextRoundReadyCount ?? 0) === (gameState?.totalPlayers ?? 0) && (gameState?.totalPlayers ?? 0) > 0}
          onNextRound={handleNextRound}
          winnerId={lastWinnerId}
          winnerHand={lastWinnerHand}
          winnerMelds={lastWinnerMelds}
        />
      )}

      {/* Final Results Modal (Game Over) */}
      {console.log('🏁 [DEBUG] Rendering - finalResults:', finalResults, 'gameState.status:', gameState?.status)}
      {finalResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '12px',
            maxWidth: '90vw',
            width: '1000px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{
              marginTop: 0,
              color: '#d32f2f',
              textAlign: 'center',
              fontSize: '24px',
              marginBottom: '20px',
            }}>
              🏁 ゲーム終了
            </h2>

            {/* Score History Table */}
            <div style={{
              marginBottom: '20px',
              overflowX: 'auto',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      textAlign: 'center',
                    }}>局</th>
                    {gameState?.players && gameState.players.map((player: any) => (
                      <th key={player.userId} style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}>
                        {player.playerName}
                      </th>
                    ))}
                    <th style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      textAlign: 'center',
                    }}>結果</th>
                  </tr>
                </thead>
                <tbody>
                  {finalResults.map((round: any, idx: number) => {
                    const winnerName = gameState?.players?.find((p: any) => p.userId === round.winner)?.playerName || round.winner;
                    // Calculate score changes for each player
                    const scoreChanges: Record<string, number> = {};
                    if (round.previousScores && round.scores) {
                      Object.keys(round.scores).forEach((userId: string) => {
                        const prevScore = round.previousScores[userId] ?? 25000;
                        const currentScore = round.scores[userId] ?? 25000;
                        scoreChanges[userId] = currentScore - prevScore;
                      });
                    }

                    return (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        <td style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}>
                          {round.roundName || `${round.round}局`}
                        </td>
                        {gameState?.players && gameState.players.map((player: any) => {
                          const change = scoreChanges[player.userId] ?? 0;
                          return (
                            <td key={player.userId} style={{
                              padding: '10px',
                              border: '1px solid #ddd',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              color: change > 0 ? '#4CAF50' : change < 0 ? '#f44336' : '#666',
                            }}>
                              {change > 0 ? '+' : ''}{change.toLocaleString()}
                            </td>
                          );
                        })}
                        <td style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          textAlign: 'center',
                          fontSize: '13px',
                        }}>
                          {round.winType}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Final Score Row */}
                  <tr style={{
                    backgroundColor: '#fff9e6',
                    borderTop: '3px solid #FFD700',
                  }}>
                    <td style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}>
                      最終得点
                    </td>
                    {gameState?.players && gameState.players.map((player: any) => {
                      const finalScore = gameState?.scores?.[player.userId] ?? 0;
                      return (
                        <td key={player.userId} style={{
                          padding: '12px',
                          border: '1px solid #ddd',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          color: finalScore < 0 ? '#f44336' : '#4CAF50',
                        }}>
                          {finalScore.toLocaleString()}点
                        </td>
                      );
                    })}
                    <td style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      textAlign: 'center',
                    }}>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                setFinalResults(null)
                onBack()
              }}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#4CAF50',
                color: '#fff',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              タイトルに戻る
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { TenpaiChecker } from '../utils/TenpaiChecker'
import { Tile, GamePageProps, GameState } from '../types/GameTypes'
import { normalizeTile, getTileKey, getTileId } from '../utils/TileUtils'
import { TileImage } from './TileImage'
import { FuroDisplay } from './FuroDisplay'
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
  // Toast notifications via react-hot-toast (no local state needed)
  const [userId, setUserId] = useState('')
  const [isGrayscale, setIsGrayscale] = useState(false)
  const [autoDrawMode, setAutoDrawMode] = useState(false)
  const [noMeldMode, setNoMeldMode] = useState(false)
  const [autoPlayMode, setAutoPlayMode] = useState(false)
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null)
  const [tenpaiInfo, setTenpaiInfo] = useState<{ isTenpai: boolean; winningTiles: any[] } | null>(null)
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [riichiMode, setRiichiMode] = useState(false)
  const [tenpaiInfoMap, setTenpaiInfoMap] = useState<Record<number, { isTenpai: boolean; winningTiles: any[] }>>({})
  const [nextRoundReady, setNextRoundReady] = useState(false)
  const [finalResults, setFinalResults] = useState<any[] | null>(null)
  const [tenpaiStatus, setTenpaiStatus] = useState<Record<string, boolean> | null>(null) // 流局時の聴牌状態
  // 最終結果を表示するかどうか
  const [showFinalResults, setShowFinalResults] = useState(false)
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
  const [myTsumoLuck, setMyTsumoLuck] = useState(0) // 自分のツモ運レベル
  const [opponentTsumoLuck, setOpponentTsumoLuck] = useState(0) // 相手のツモ運レベル
  const [autoActionTimerSeconds, setAutoActionTimerSeconds] = useState(10) // ツモ切り・ポン見逃しのタイマー秒数
  const [opponentTedashiGapIdx, setOpponentTedashiGapIdx] = useState(-1) // 相手手出し時の歯抜け表示位置 (-1=なし)
  const [rematchRequested, setRematchRequested] = useState(false) // 再戦リクエスト送信済み
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false) // 相手が再戦を希望
  const opponentTedashiGapTimerRef = useRef<number | null>(null)
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
  const tilesRef = useRef<Record<string, any>>({})  // ゲーム状態の tiles を保持

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    // gameState の tiles を保存しておき、gameFinished 時に使用する
    if (gameState?.tiles) {
      tilesRef.current = gameState.tiles
    }
  }, [gameState?.tiles])

  const triggerOpponentActionModal = React.useCallback((text: string) => {
    if (!text) return

    // Clear any existing timers
    if (opponentActionDelayRef.current !== null) {
      clearTimeout(opponentActionDelayRef.current)
      opponentActionDelayRef.current = null
    }

    // Schedule toast with 500ms delay
    opponentActionDelayRef.current = window.setTimeout(() => {
      // Clear any previous toasts
      toast.dismiss()
      
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

    // Check for newly added meld (pon or ankan)
    if (nextMelds.length > prevMelds.length) {
      // Check if the newly added meld is a kan (4 tiles) or pung (3 tiles)
      const lastMeld = nextMelds[nextMelds.length - 1]
      if (lastMeld && lastMeld.length === 4) {
        return `カン`
      }
      return `ポン`
    }

    // Check for added kan (existing meld expanded from 3 to 4 tiles)
    if (nextMelds.length === prevMelds.length && nextMelds.length > 0) {
      for (let i = 0; i < nextMelds.length; i++) {
        if (prevMelds[i] && prevMelds[i].length === 3 && nextMelds[i].length === 4) {
          return `カン`
        }
      }
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
    toast.dismiss()
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
          myTsumoLuck: myTsumoLuck,
          opponentTsumoLuck: opponentTsumoLuck,
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
        const userAutoPlay = payload.gameState?.autoPlay?.[payload.userId]
        if (typeof userAutoPlay === 'boolean') {
          console.log(`🔄 Restoring autoPlayMode: ${userAutoPlay}`)
          setAutoPlayMode(userAutoPlay)
        }

        debugLog(`✅ setGameState called`)
        console.log('✅ setGameState called with initialState')
        
        // Set autoActionTimerSeconds from gameState
        if (payload.gameState?.autoActionTimerSeconds) {
          setAutoActionTimerSeconds(payload.gameState.autoActionTimerSeconds)
        }

        if (payload.isReconnecting) {
          toast.success('ゲームに再接続しました', { duration: 3000 })
        } else {
          toast.success(
            `${payload.playerName}はゲームに参加しました（${payload.players.length}/2）`,
            { duration: 3000 }
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
        toast.success(`プレイヤーが参加しました（${payload.players.length}/2）`, { duration: 3000 })
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
        setOpponentTedashiGapIdx(-1)
        tilesRef.current = {}  // tiles キャッシュをリセット
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
        if (payload.autoPlay?.[currentUserIdForGameStart] !== undefined) {
          setAutoPlayMode(payload.autoPlay[currentUserIdForGameStart])
        }

        setGameState(payload)
        debugLog(`✅ gameState updated to status=${payload.status}`)
        
        // Set autoActionTimerSeconds from gameState
        if (payload.autoActionTimerSeconds) {
          setAutoActionTimerSeconds(payload.autoActionTimerSeconds)
        }
        
        toast.success('ゲームが始まりました！', { duration: 3000 })
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

          // 相手の手出し検出 → 手牌に歯抜け表示
          const myId = userIdRef.current
          const lastInfo = payload.lastDiscardInfo
          if (lastInfo && lastInfo.userId !== myId && !lastInfo.isTsumogiri) {
            // 相手が手出しした → 手牌の中にランダムな位置で歯抜けを表示
            const opponentHandLen = payload.tiles?.[lastInfo.userId]?.hand?.length ?? 0
            const gapPos = opponentHandLen > 0 ? Math.floor(Math.random() * opponentHandLen) : 0
            setOpponentTedashiGapIdx(gapPos)
            if (opponentTedashiGapTimerRef.current !== null) {
              clearTimeout(opponentTedashiGapTimerRef.current)
            }
            opponentTedashiGapTimerRef.current = window.setTimeout(() => {
              setOpponentTedashiGapIdx(-1)
              opponentTedashiGapTimerRef.current = null
            }, 1200)
          } else if (lastInfo && lastInfo.userId !== myId && lastInfo.isTsumogiri) {
            // 相手がツモ切りした → 歯抜けをすぐにクリア
            if (opponentTedashiGapTimerRef.current !== null) {
              clearTimeout(opponentTedashiGapTimerRef.current)
              opponentTedashiGapTimerRef.current = null
            }
            setOpponentTedashiGapIdx(-1)
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
        if (payload.autoPlay?.[currentUserId] !== undefined) {
          setAutoPlayMode(payload.autoPlay[currentUserId])
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
        console.log('🏁 payload.tiles keys:', Object.keys(payload.tiles || {}))
        console.log('🏁 payload.tiles has winnerId:', payload.tiles && payload.winner in payload.tiles)
        console.log('🏁 payload.finalResults:', payload.finalResults)
        console.log('🏁 payload.finalResults detailed:', JSON.stringify(payload.finalResults, null, 2))
        console.log('🏁 payload.tenpaiStatus:', payload.tenpaiStatus)
        
        // 流局時の聴牌状態を保存
        if (payload.isDraw && payload.tenpaiStatus) {
          setTenpaiStatus(payload.tenpaiStatus)
        } else {
          setTenpaiStatus(null)
        }
        
        // finalResults から winner の hand 情報を取得
        const winnerDataFromFinalResults = payload.finalResults?.find((result: any) => result.userId === payload.winner)
        console.log('🏁 Winner data from finalResults (by userId):', winnerDataFromFinalResults)
        
        // もし userId で見つからなければ、finalResults[0] を確認
        if (!winnerDataFromFinalResults && payload.finalResults?.[0]) {
          console.log('🏁 finalResults[0] keys:', Object.keys(payload.finalResults[0]))
          console.log('🏁 finalResults[0]:', JSON.stringify(payload.finalResults[0], null, 2))
        }

        const winnerId = payload.winner || null
        setLastWinnerId(winnerId)

        const opponentWon = winnerId && winnerId !== userIdRef.current
        const isOpponentRonTsumo = opponentWon && /ロン|ツモ/.test(payload.winType || '')
        const resultDelayMs = isOpponentRonTsumo ? 2000 : 0
        
        console.log('🏁 gameFinished - opponentWon:', opponentWon, 'isOpponentRonTsumo:', isOpponentRonTsumo, 'resultDelayMs:', resultDelayMs)

        if (opponentWon && isOpponentRonTsumo) {
          const winnerName = gameStateRef.current?.players?.find((p) => p.userId === winnerId)?.playerName || '相手'
          const winTypeText = getOpponentWinText(payload.winType || '', winnerName)
          triggerOpponentActionModal(winTypeText)
        }

        const noYaku =
          payload?.scoreResult?.valid === false ||
          (typeof payload?.scoreResult?.error === 'string' && payload.scoreResult.error.includes('役がありません'))
        if (noYaku) {
          toast.error(payload?.scoreResult?.error || '役がありません', { duration: 4000 })
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
          // 最終結果が来た場合
          console.log('🏁 setFinalResults called with:', payload.finalResults?.length ?? 'undefined', 'results')
          setFinalResults(payload.finalResults)
          // 最終局の結果（scoreResult）を先に表示し、ボタンで FinalResultModal に遷移
          setShowFinalResults(false)
          // スコア結果は以下で処理される
        }
        
        // gameOver の有無に関わらず scoreResult を処理
        if (payload.scoreResult) {
          // scoreResultがある場合は、winType情報を追加し、isDraw を false に設定
          const resultToShow = {
            ...payload.scoreResult,
            winType: payload.winType || '',
            isDraw: false  // ロン・ツモなど実際の和了は流局ではない
          }
          console.log('🏁 scoreResult がある: resultToShow=', resultToShow, 'resultDelayMs=', resultDelayMs)
          scheduleOpponentResultDisplay(() => {
            console.log('🏁 setScoreResult 実行:', resultToShow)
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
        } else {
          // 勝者がない場合（流局など）の結果として簡易情報を作成
          // gameOverでも流局結果を表示する必要があるため、条件から除外
          const resultToShow = {
            valid: true,
            score: 0,
            han: 0,
            fu: 0,
            scoreType: payload.winType || 'ゲーム終了',
            yaku: [],
            isDraw: true,  // 流局・引き分けフラグ
          }
          console.log('🏁 Creating scoreResult for draw:', resultToShow)
          scheduleOpponentResultDisplay(() => {
            setScoreResult(resultToShow)
          }, resultDelayMs)
        }

        // gameStateを使って勝者名を取得してからメッセージを設定
        setGameState((prevState) => {
          console.log('勝者データ取得開始:', { winnerId, prevState_exists: !!prevState, tiles_exists: !!prevState?.tiles, winner_tiles_exists: !!prevState?.tiles?.[winnerId], tilesRef_exists: !!tilesRef.current?.[winnerId] })
          
          // prevState.tiles または tilesRef.current から winner の tiles を取得
          const winnerTilesSource = prevState?.tiles?.[winnerId] || tilesRef.current?.[winnerId]
          
          if (winnerId && winnerTilesSource) {
            const winnerTiles = winnerTilesSource
            console.log('winnerTiles:', winnerTiles)
            console.log('winnerTiles.hand:', winnerTiles?.hand)
            console.log('winnerTiles.drawnTile:', winnerTiles?.drawnTile)
            const winnerHand = (winnerTiles?.hand || []).map((tile: any) => normalizeTile(tile))
            const winnerMelds = ((winnerTiles?.melds as Array<Array<Tile | string>>) || [])
              .map((meld) => meld.map((tile) => normalizeTile(tile)))
            
            // 和了牌を優先順位で取得：scoreResult.winningTile > drawnTile > 推測
            let winnerDrawn = null
            const isRon = payload.winType && payload.winType.includes('ロン')
            
            // 優先1: scoreResult.winningTile（バックエンドから明示的に送信された和了牌）
            if (payload.scoreResult?.winningTile) {
              winnerDrawn = normalizeTile(payload.scoreResult.winningTile)
              console.log((isRon ? 'ロン' : 'ツモ') + ': scoreResult.winningTile から取得:', winnerDrawn)
            } 
            // 優先2: ツモ時のドローン牌（drawnTile 存在時）
            else if (!isRon && winnerTiles?.drawnTile) {
              winnerDrawn = normalizeTile(winnerTiles.drawnTile)
              console.log('ツモ: drawnTile から取得:', winnerDrawn)
            }
            // 優先3: ツモ時のhand[drawnTileIndex]
            else if (!isRon && winnerTiles?.drawnTileIndex !== undefined && winnerTiles.drawnTileIndex >= 0 && winnerHand[winnerTiles.drawnTileIndex]) {
              winnerDrawn = winnerHand[winnerTiles.drawnTileIndex]
              console.log('ツモ: hand[drawnTileIndex] から取得:', winnerDrawn, 'index:', winnerTiles.drawnTileIndex)
            } 
            // 優先4: 手牌が存在する場合は最後の牌（デフォルト）
            else if (winnerHand.length > 0) {
              winnerDrawn = winnerHand[winnerHand.length - 1]
              console.log('デフォルト: hand の最後の牌を使用:', winnerDrawn)
            }
            
            console.log('winnerHand:', winnerHand, 'winnerDrawn:', winnerDrawn, 'isRon:', isRon)
            
            // ロン・ツモ共通：バックエンドの手牌には和了牌が既に含まれている
            // （ロン時: handleRon で hand.push(tile) 済み、ツモ時: drawnTile は hand の一部）
            // 手牌から和了牌を1枚除去し、末尾に和了牌を配置する（ScoreResultModal の表示用）
            if (winnerDrawn) {
              const handWithoutWinning = (() => {
                const idx = winnerHand.findIndex((t: Tile) =>
                  t.suit === winnerDrawn.suit && t.number === winnerDrawn.number
                )
                if (idx >= 0) {
                  const result = [...winnerHand]
                  result.splice(idx, 1)
                  return result
                }
                // 見つからない場合（通常発生しない）：最後の牌を除去
                console.warn('和了牌が手牌内に見つかりません:', winnerDrawn, 'hand:', winnerHand)
                return winnerHand.slice(0, -1)
              })()
              setLastWinnerHand([...handWithoutWinning, winnerDrawn])
            } else {
              setLastWinnerHand(winnerHand)
            }
            setLastWinnerMelds(winnerMelds)
          } else if (winnerId && payload.finalResults) {
            // payload.finalResults から winner の hand を取得
            const winnerDataFromFinalResults = payload.finalResults.find((result: any) => result.winner === winnerId)
            console.log('finalResults から winner を検索:', { winnerId, winnerDataFromFinalResults })
            console.log('finalResults[0] の keys:', Object.keys(payload.finalResults[0] || {}))
            
            if (winnerDataFromFinalResults) {
              // finalResults に hand があれば使用、なければ別の方法を検討
              const winnerHand = winnerDataFromFinalResults.hand 
                ? (winnerDataFromFinalResults.hand || []).map((tile: any) => normalizeTile(tile))
                : []
              const winnerMelds = winnerDataFromFinalResults.melds
                ? ((winnerDataFromFinalResults.melds as Array<Array<Tile | string>>) || [])
                  .map((meld) => meld.map((tile) => normalizeTile(tile)))
                : []
              
              console.log('finalResults から取得した winnerHand:', winnerHand, 'winnerMelds:', winnerMelds)
              
              // winningTile がある場合は和了牌として手牌から除去し末尾に配置
              let winningTile = null
              if (payload.scoreResult?.winningTile) {
                winningTile = normalizeTile(payload.scoreResult.winningTile)
              }
              
              if (winningTile && winnerHand.length > 0) {
                // 手牌に和了牌が含まれている可能性があるため、1枚除去してから末尾に追加
                const idx = winnerHand.findIndex((t: Tile) =>
                  t.suit === winningTile!.suit && t.number === winningTile!.number
                )
                if (idx >= 0) {
                  const handWithoutWinning = [...winnerHand]
                  handWithoutWinning.splice(idx, 1)
                  setLastWinnerHand([...handWithoutWinning, winningTile])
                } else {
                  // 手牌に含まれていない場合はそのまま追加
                  setLastWinnerHand([...winnerHand, winningTile])
                }
              } else if (winningTile) {
                setLastWinnerHand([winningTile])
              } else {
                setLastWinnerHand(winnerHand)
              }
              setLastWinnerMelds(winnerMelds)
            } else {
              setLastWinnerHand([])
              setLastWinnerMelds([])
            }
          } else {
            console.log('勝者データなし - winnerId=' + winnerId + ', prevState=' + !!prevState + ', tiles=' + !!prevState?.tiles)
            setLastWinnerHand([])
            setLastWinnerMelds([])
          }

          const winnerName = prevState?.players?.find((p: any) => p.userId === payload.winner)?.playerName || payload.winner
          if (!payload.gameOver) {
            toast.success(`${payload.winType || 'ゲーム終了'} 勝者: ${winnerName}`, { duration: 5000 })
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
            tiles: payload.tiles ?? prevState.tiles,
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
          toast.error(payload.message || 'アクションに失敗しました', { duration: 4000 })
          if (payload.message && payload.message.includes('役がありません')) {
            if (autoNextTimerRef.current !== null) {
              clearTimeout(autoNextTimerRef.current)
              autoNextTimerRef.current = null
            }
          }
        } else if (payload.riichi) {
          // リーチ成功メッセージ
          toast.success(payload.message || 'リーチ宣言しました！', { duration: 5000 })
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

        toast.error(errorMessage, { duration: 5000 })
        break
      case 'playerReconnected':
        debugLog(`🔄 Player reconnected: ${payload.playerName}`)
        console.log('🔄 Player reconnected:', payload)
        toast.success(`${payload.playerName}さんが再接続しました`, { duration: 3000 })
        break
      case 'rematchWaiting':
        console.log('🔄 Rematch waiting:', payload)
        setRematchRequested(true)
        break
      case 'rematchRequested':
        console.log('🔄 Opponent requested rematch:', payload)
        setOpponentRematchRequested(true)
        toast(`${payload.requestedBy}さんがもう一戦を希望しています`, { icon: '🔄', duration: 5000 })
        break
      case 'rematchStart':
        console.log('🔄 Rematch starting:', payload)
        // Reset all game-related state for the new match
        setFinalResults(null)
        setShowFinalResults(false)
        setScoreResult(null)
        setRematchRequested(false)
        setOpponentRematchRequested(false)
        setNextRoundReady(false)
        setLastWinnerId(null)
        setLastWinnerHand([])
        setLastWinnerMelds([])
        setTenpaiStatus(null)
        setGameState(payload)
        toast.success('再戦開始！', { duration: 3000 })
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
      if (opponentTedashiGapTimerRef.current !== null) {
        clearTimeout(opponentTedashiGapTimerRef.current)
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
      toast.dismiss()

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

      // Read tsumo luck from sessionStorage (set during room creation) or from saved session
      let myTsumoLuckValue = 0
      let opponentTsumoLuckValue = 0
      try {
        const savedMyTsumoLuck = sessionStorage.getItem('mahjong-myTsumoLuck')
        const savedOpponentTsumoLuck = sessionStorage.getItem('mahjong-opponentTsumoLuck')
        
        if (savedMyTsumoLuck && savedOpponentTsumoLuck) {
          myTsumoLuckValue = parseInt(savedMyTsumoLuck, 10)
          opponentTsumoLuckValue = parseInt(savedOpponentTsumoLuck, 10)
          if (!Number.isNaN(myTsumoLuckValue) && !Number.isNaN(opponentTsumoLuckValue)) {
            joinPayload.myTsumoLuck = myTsumoLuckValue
            joinPayload.opponentTsumoLuck = opponentTsumoLuckValue
            setMyTsumoLuck(myTsumoLuckValue)
            setOpponentTsumoLuck(opponentTsumoLuckValue)
            console.log(`📊 Using tsumo luck from sessionStorage: my=${myTsumoLuckValue}, opponent=${opponentTsumoLuckValue}`)
          }
        } else if (savedSession && savedSession.myTsumoLuck && savedSession.opponentTsumoLuck) {
          myTsumoLuckValue = savedSession.myTsumoLuck
          opponentTsumoLuckValue = savedSession.opponentTsumoLuck
          joinPayload.myTsumoLuck = myTsumoLuckValue
          joinPayload.opponentTsumoLuck = opponentTsumoLuckValue
          setMyTsumoLuck(myTsumoLuckValue)
          setOpponentTsumoLuck(opponentTsumoLuckValue)
          console.log(`📊 Using tsumo luck from saved session: my=${myTsumoLuckValue}, opponent=${opponentTsumoLuckValue}`)
        } else {
          // Default to 1 (light bias) for both
          myTsumoLuckValue = 1
          opponentTsumoLuckValue = 1
          joinPayload.myTsumoLuck = myTsumoLuckValue
          joinPayload.opponentTsumoLuck = opponentTsumoLuckValue
          setMyTsumoLuck(myTsumoLuckValue)
          setOpponentTsumoLuck(opponentTsumoLuckValue)
          console.log(`📊 Using default tsumo luck: my=${myTsumoLuckValue}, opponent=${opponentTsumoLuckValue}`)
        }
      } catch (err) {
        console.error('Error reading tsumo luck:', err)
        myTsumoLuckValue = 1
        opponentTsumoLuckValue = 1
        joinPayload.myTsumoLuck = myTsumoLuckValue
        joinPayload.opponentTsumoLuck = opponentTsumoLuckValue
        setMyTsumoLuck(myTsumoLuckValue)
        setOpponentTsumoLuck(opponentTsumoLuckValue)
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
        //console.log('📥 Raw WebSocket message received:', event.data)
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
      toast.error('接続エラー: WebSocket接続に失敗しました（バックエンドを確認してください）', { duration: 5000 })
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
    //console.log(`  Current hand:`, hand)
    //console.log(`  Current melds:`, melds)

    if (hand.length === 0) {
      setTenpaiInfo({ isTenpai: false, winningTiles: [] })
      return
    }

    // クライアント側で聴牌判定を実行
    const result = TenpaiChecker.checkTenpaiAfterDiscard(hand, tileIndex, melds)
    //console.log(`  Tenpai result:`, result)
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
        //console.log('🔍 Computing all tenpai checks locally...')
        //console.log('  Hand:', hand.map((t: any, i: number) => `[${i}]${t.display}`).join(' '))
        //console.log('  Melds:', melds.length)
        const results = TenpaiChecker.checkAllTenpai(hand, melds)
        //console.log('🔍 All tenpai results:', results)
        //console.log('🔍 Tenpai tiles count:', Object.values(results).filter((r: any) => r.isTenpai).length)
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

  const toggleAutoPlayMode = React.useCallback((enabled: boolean) => {
    setAutoPlayMode(enabled)
    sendAction({
      type: 'setAutoPlay',
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
    const meldTileCount = melds.reduce((sum: number, m: Tile[]) => sum + m.length, 0)
    info += `合計: ${hand.length}枚 (メルド${meldTileCount}枚含めて${hand.length + meldTileCount}枚)\n`
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
    toast.dismiss()

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/add-cpu`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'CPU追加に失敗しました')
      }

      const data = await response.json()
      toast.success(`${data.cpuName}が参加しました`, { duration: 3000 })
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'CPU追加に失敗しました',
        { duration: 4000 }
      )
    } finally {
      setIsAddingCPU(false)
    }
  }, [roomId, isAddingCPU])

  // N-second auto-action timer (configurable per game)
  React.useEffect(() => {
    if (!gameState || !userId || gameState.status !== 'playing') {
      return;
    }

    // autoPlayモード中はフロントエンドのタイマーをすべて無効にする（バックエンドCPU AIが操作する）
    if (autoPlayMode) {
      setAutoDiscardTimeLeft(null);
      setPendingPungTimeLeft(null);
      if (autoDiscardIntervalRef.current !== null) {
        clearInterval(autoDiscardIntervalRef.current);
        autoDiscardIntervalRef.current = null;
      }
      if (pendingPungIntervalRef.current !== null) {
        clearInterval(pendingPungIntervalRef.current);
        pendingPungIntervalRef.current = null;
      }
      if (autoDiscardTimeoutRef.current !== null) {
        clearTimeout(autoDiscardTimeoutRef.current);
        autoDiscardTimeoutRef.current = null;
      }
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

    // Handle pending pung waiting - auto-draw after N seconds (unless in no-meld mode)
    if (canPung && !isNoMeldMode) {
      // Start countdown from autoActionTimerSeconds or 一時停止復帰時は残り秒数から
      setPendingPungTimeLeft(pausedPendingPungTimeLeft.current ?? autoActionTimerSeconds);
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
        // Auto-draw after N seconds of pung waiting
        console.log('⏱️ Auto-drawing after pending pung timeout');
        sendAction({ type: 'draw' });
        setPendingPungTimeLeft(null);
      }, (pausedPendingPungTimeLeft.current ?? autoActionTimerSeconds) * 1000);

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
      const autoDiscardKey = drawnTile ? `${getTileId(drawnTile)}_${drawnTileIndex}` : null;
      if (autoDiscardKey && autoDiscardKeyRef.current !== autoDiscardKey) {
        if (autoDiscardTimeoutRef.current !== null) {
          clearTimeout(autoDiscardTimeoutRef.current);
        }
        autoDiscardKeyRef.current = autoDiscardKey;
        autoDiscardTimeoutRef.current = window.setTimeout(() => {
          if (drawnTile) {
            sendAction({ type: 'discard', tileId: getTileId(drawnTile) });
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

    // Set timer if player needs to discard (N second fallback)
    if (!autoDrawMode && canDiscard && drawnTileIndex >= 0) {
      // Start countdown from autoActionTimerSeconds or 一時停止復帰時は残り秒数から
      setAutoDiscardTimeLeft(pausedAutoDiscardTimeLeft.current ?? autoActionTimerSeconds);
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
        // Auto-discard the drawn tile after N seconds
        const drawnTile = fullHand[drawnTileIndex];
        if (drawnTile) {
          sendAction({ type: 'discard', tileId: getTileId(drawnTile) });
        }
        setAutoDiscardTimeLeft(null);
      }, (pausedAutoDiscardTimeLeft.current ?? autoActionTimerSeconds) * 1000);

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
  }, [gameState, userId, autoDrawMode, autoPlayMode, sendAction, isTimerPaused, autoActionTimerSeconds]);

  // autoPlayMode: 局終了時に自動で「次の局へ」を押す
  const autoPlayModeRef = useRef(false)
  useEffect(() => {
    autoPlayModeRef.current = autoPlayMode
  }, [autoPlayMode])

  React.useEffect(() => {
    if (!autoPlayMode || !scoreResult || !gameState) return
    // gameOverの場合は自動進行しない
    if (gameState.status === 'gameOver') return
    // finalResults表示中は自動進行しない
    if (finalResults && showFinalResults) return

    const timer = window.setTimeout(() => {
      if (!autoPlayModeRef.current) return
      if (finalResults && !showFinalResults) {
        // 最終局の結果表示中 → 最終結果モーダルへ
        setScoreResult(null)
        setShowFinalResults(true)
      } else {
        // 通常の局終了 → 次の局へ
        setNextRoundReady(true)
        handleNextRound()
      }
    }, 2000) // 2秒待ってから自動進行

    return () => clearTimeout(timer)
  }, [autoPlayMode, scoreResult, gameState?.status, finalResults, showFinalResults, handleNextRound])

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
              <div><strong>エラー:</strong> {'(toast表示)'}</div>
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

  // カン(4枚)は構造上3枚分として数える（嶺上牌で1枚補充するため）
  const meldStructureTiles = melds.reduce((sum: number, m: Tile[]) => sum + Math.min(m.length, 3), 0)
  const totalTiles = fullHand.length + meldStructureTiles
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

  // Check if player can daiminkan (大明槓: 3 matching tiles + opponent's discard)
  const pendingDaiminkanFor = gameState.pendingDaiminkanFor
  const canDaiminkan = isYourTurn && pendingDaiminkanFor === userId && !!lastOpponentDiscard && !isRiichi && !isNoMeldMode

  // Check if player can kan (concealed or added)
  const canKan = (() => {
    // 大明槓は別ボタンで表示するのでここでは除外
    if (canDaiminkan) return false;
    if (!isYourTurn || isRiichi || isNoMeldMode || drawnTileIndex < 0) {
      return false;
    }
    
    // Check for concealed kan (4 identical tiles in hand)
    const tileGroups: Record<string, number> = {};
    fullHand.forEach((tile) => {
      const key = `${tile.suit}-${tile.number}`;
      tileGroups[key] = (tileGroups[key] || 0) + 1;
    });
    
    // Check if any tile group has 4 identical tiles
    for (const count of Object.values(tileGroups)) {
      if (count === 4) {
        return true;
      }
    }
    
    // Check for added kan (matching tile + existing pung)
    for (const meld of melds) {
      if (meld.length !== 3) continue; // Only check pungs (3 tiles)
      
      const meldTile = meld[0];
      const hasMatchingTile = fullHand.some(
        (tile) => tile.suit === meldTile.suit && tile.number === meldTile.number
      );
      
      if (hasMatchingTile) {
        return true;
      }
    }
    
    return false;
  })()

  // 聴牌可能な牌が1つでもあるかチェック
  // 重要: すべての牌の聴牌情報が取得されているか確認してから判定
  const allTenpaiChecked = fullHand.length > 0 && Object.keys(tenpaiInfoMap).length === fullHand.length
  const tenpaiCount = Object.values(tenpaiInfoMap).filter(info => info?.isTenpai).length
  // 門前判定: 暗槓は門前扱いなので、全ての副露が暗槓であればリーチ可能
  const concealedMeldIndicesForRiichi = new Set(gameState.tiles?.[userId]?.concealedMeldIndices ?? [])
  const isMenzenForRiichi = melds.every((_: Tile[], idx: number) => concealedMeldIndicesForRiichi.has(idx))
  const canDeclareRiichi = allTenpaiChecked && !isRiichi && isMenzenForRiichi && ((gameState?.scores?.[userId] ?? 0) >= 1000) &&
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
    console.log(`    - canKan=${canKan}`)
    console.log(`    - canWin=${canWin}`)
    console.log(`    - isRiichi=${isRiichi}`)
    console.log(`    - canDeclareRiichi=${canDeclareRiichi} (tenpaiCount=${tenpaiCount2})`)
    console.log(`  Hand: ${fullHand.map((t, i) => `[${i}]${t?.display}`).join(' ')}`)
  }

  return (
    <div className={`flex flex-col justify-start items-center min-h-screen bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] sm:pt-1 ${isGrayscale ? 'grayscale' : ''}`}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            fontWeight: 600,
            fontSize: '0.875rem',
            maxWidth: '24rem',
          },
          success: {
            style: { background: '#22c55e', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#22c55e' },
          },
          error: {
            style: { background: '#ef4444', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#ef4444' },
          },
        }}
      />
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

        {/* Toast notifications are handled by react-hot-toast <Toaster /> */}

        {/* Game Content */}
        {(gameState.status === 'playing' || gameState.status === 'finished') ? (
          <div className="p-1 text-center bg-[#3d6b20] border-2 border-white rounded-none min-h-52 flex flex-col justify-center items-center">
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
                <FuroDisplay 
                  melds={otherMelds}
                  seatWindYou={gameState.seatWinds?.[userId]}
                  seatWindOpponent={gameState.seatWinds?.[otherUserId ?? '']}
                  concealedMeldIndices={new Set(gameState.tiles?.[otherUserId ?? '']?.concealedMeldIndices ?? [])}
                  daiminkanMeldIndices={new Set(gameState.tiles?.[otherUserId ?? '']?.daiminkanMeldIndices ?? [])}
                />

                {/* 手牌（裏向きまたは表示） */}
                <div className="flex gap-px flex-wrap">
                  {otherHand.map((tile, idx) => (
                    <React.Fragment key={`other-hand-${idx}`}>
                      {/* 手出し時の歯抜け表示: 該当位置に空きスペースを挿入 */}
                      {opponentTedashiGapIdx === idx && (
                        <div
                          className="inline-block"
                          style={{ width: 33, height: 47 }}
                        />
                      )}
                      <div className="inline-block">
                        <TileImage
                          tile={tile}
                          faceDown={!showOpponentHand || !otherPlayer?.isCPU}
                        />
                      </div>
                    </React.Fragment>
                  ))}
                  {/* 手出し時の歯抜けが手牌末尾だった場合 */}
                  {opponentTedashiGapIdx >= 0 && opponentTedashiGapIdx >= otherHand.length && (
                    <div
                      className="inline-block"
                      style={{ width: 33, height: 47 }}
                    />
                  )}
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
                      const isTsumogiri = tile.isTsumogiri === true;
                      return (
                        <div
                          key={`od-${idx}`}
                          className="inline-block relative"
                          title={isTsumogiri ? 'ツモ切り' : '手出し'}
                        >
                          <TileImage
                            tile={tile}
                            isRotated={isRiichiDiscard}
                          />
                          {/* ツモ切りマーク: 牌の右上に小さな丸印 */}
                          {isTsumogiri && (
                            <div className="hidden absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full opacity-70 pointer-events-none" style={{ transform: 'translate(25%, -25%)' }} />
                          )}
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
                      className="drop-shadow"
                    />
                  </div>
                ) : null;
              })()}
            </div>

            {/* Game Info Center */}
            <div className="max-sm:hidden grid sm:grid-cols-4 w-full mb-1 flex justify-start items-stretch gap-1 flex-wrap">
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
                      className="drop-shadow"
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
                      const isTsumogiri = tile.isTsumogiri === true;
                      return (
                        <div
                          key={`yd-${idx}`}
                          className="inline-block relative"
                          title={isTsumogiri ? 'ツモ切り' : '手出し'}
                        >
                          <TileImage
                            tile={tile}
                            isRotated={isRiichiDiscard}
                          />
                          {/* ツモ切りマーク: 牌の右上に小さな丸印 */}
                          {isTsumogiri && (
                            <div className="hidden absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full opacity-70 pointer-events-none" style={{ transform: 'translate(25%, -25%)' }} />
                          )}
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
                onClick={() => triggerOpponentActionModal('カン')}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 font-bold"
              >
                カン表示テスト
              </button>
              <button
                onClick={() => triggerOpponentActionModal('リーチ')}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 font-bold"
              >
                リーチ表示テスト
              </button>
              <button
                onClick={() => setIsTimerPaused((prev) => !prev)}
                className={`px-4 py-2 font-bold rounded transition-all min-w-[120px] ${isTimerPaused ? 'bg-red-500 text-white' : 'bg-white text-blue-700 border-2 border-blue-700'}`}
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
          // Game Over - Show modals (ScoreResultModal then FinalResultModal)
          <div className="hidden" />
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
                      className={`relative cursor-pointer ${riichiMode && !tenpaiInfoMap[idx]?.isTenpai ? 'opacity-30 grayscale' : `${idx === drawnTileIndex ? 'opacity-100' : 'opacity-90'}`}`}
                    >
                      <TileImage
                        tile={fullHand[idx]}
                        onClick={() => {
                          // リーチ中は手牌をクリックできない
                          if (isRiichi) {
                            return;
                          }
                          if (isYourTurn && gameState.status === 'playing') {
                            // ポン・カン・ロンの選択待ち中は打牌を禁止（小牌防止）
                            if (pendingPungFor === userId || ronPossibleFor === userId) {
                              return;
                            }
                            // リーチモードONの場合、聴牌形になる牌のみクリック可能
                            if (riichiMode) {
                              const canDiscardForRiichi = tenpaiInfoMap[idx]?.isTenpai
                              if (!canDiscardForRiichi) {
                                return; // グレーアウトされた牌はクリックできない
                              }
                              // リーチ宣言
                              const tileToRiichi = fullHand[idx];
                              console.log(`🔴 [Riichi] Selected tile index: ${idx}, Tile: ${tileToRiichi?.toString()}, TileID: ${getTileId(tileToRiichi)}`);
                              sendAction({
                                type: 'riichi',
                                tileId: getTileId(tileToRiichi)
                              });
                              setRiichiMode(false); // リーチモード解除
                              return;
                            }
                            // 通常の捨て牌
                            const tileToDiscard = fullHand[idx];
                            const tileId = getTileId(tileToDiscard);
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
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-green-600/95 px-3 py-2.5 rounded-lg mb-2.5 whitespace-nowrap z-[1000] shadow-lg pointer-events-none flex flex-col items-center gap-1.5">
                          <div className="text-white text-xs font-bold mb-0.5">
                            🀄 聴牌
                          </div>
                          <div className="flex gap-0.5 flex-row flex-nowrap justify-center items-center">
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
                                  className="rounded shadow-sm"
                                  onError={(e) => {
                                    console.error(`Failed to load tile image: ${imagePath}`, tile);
                                  }}
                                />
                              );
                            })}
                            {tenpaiInfo.winningTiles.length > 8 && (
                              <div className="text-white text-[10px] ml-1">
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
                    <span className={`ml-8 ${riichiMode && !tenpaiInfoMap[drawnTileIndex]?.isTenpai ? 'opacity-30 grayscale' : ''}`}>
                      <TileImage
                        tile={fullHand[drawnTileIndex]}
                        onClick={() => {
                          // リーチ中は手牌をクリックできない
                          if (isRiichi) {
                            return;
                          }
                          if (isYourTurn && gameState.status === 'playing') {
                            // ポン・カン・ロンの選択待ち中は打牌を禁止（小牌防止）
                            if (pendingPungFor === userId || ronPossibleFor === userId) {
                              return;
                            }
                            // リーチモードONの場合、聴牌形になる牌のみクリック可能
                            if (riichiMode) {
                              const canDiscardForRiichi = tenpaiInfoMap[drawnTileIndex]?.isTenpai
                              if (!canDiscardForRiichi) {
                                return; // グレーアウトされた牌はクリックできない
                              }
                              // リーチ宣言
                              const tileToRiichi = fullHand[drawnTileIndex];
                              console.log(`🔴 [Riichi] Selected drawn tile index: ${drawnTileIndex}, Tile: ${tileToRiichi?.toString()}, TileID: ${getTileId(tileToRiichi)}`);
                              sendAction({
                                type: 'riichi',
                                tileId: getTileId(tileToRiichi)
                              });
                              setRiichiMode(false);
                              return;
                            }
                            // 通常の捨て牌
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
              <p className="text-gray-600 italic">手札を読み込み中...</p>
            )}
          </div>
          <div>
            {/* Melds display - positioned to the right */}
            <FuroDisplay 
              melds={melds} 
              layout="vertical"
              seatWindYou={gameState.seatWinds?.[userId]}
              seatWindOpponent={gameState.seatWinds?.[otherUserId ?? '']}
              concealedMeldIndices={new Set(gameState.tiles?.[userId]?.concealedMeldIndices ?? [])}
              daiminkanMeldIndices={new Set(gameState.tiles?.[userId]?.daiminkanMeldIndices ?? [])}
            />
          </div>
        </div>

        {/* Action buttons section - compact vertical layout */}
        {isYourTurn && gameState.status === 'playing' && !autoPlayMode && (
          <div className='w-full flex gap-8 justify-end'>
            {/* リーチ中で和了できる場合はツモ切りボタンを表示 */}
            {isRiichi && drawnTileIndex >= 0 && canWin && (
              <button
                onClick={() => {
                  const drawnTile = fullHand[drawnTileIndex];
                  if (drawnTile) {
                    sendAction({ type: 'discard', tileId: getTileId(drawnTile) });
                  }
                }}
                className="px-3 py-2 bg-red-500 border-2 border-red-700 text-xs font-bold rounded text-white cursor-pointer transition-all hover:bg-red-600"
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
            {canPung && !canDaiminkan && (
              <button
                onClick={() => sendAction({ type: 'pung' })}
                className="px-3 py-2 bg-cyan-600 text-[#ffffff] text-xs font-bold border-2 border-cyan-700 rounded cursor-pointer transition-all hover:bg-cyan-700"
              >
                ポン
              </button>
            )}
            {canDaiminkan && (
              <>
                <button
                  onClick={() => sendAction({ type: 'pung' })}
                  className="px-3 py-2 bg-cyan-600 text-[#ffffff] text-xs font-bold border-2 border-cyan-700 rounded cursor-pointer transition-all hover:bg-cyan-700"
                >
                  ポン
                </button>
                <button
                  onClick={() => sendAction({ type: 'kong' })}
                  className="px-3 py-2 bg-purple-600 text-[#ffffff] text-xs font-bold border-2 border-purple-700 rounded cursor-pointer transition-all hover:bg-purple-700"
                >
                  カン
                </button>
              </>
            )}
            {canKan && (
              <button
                onClick={() => sendAction({ type: 'kong' })}
                className="px-3 py-2 bg-purple-600 text-[#ffffff] text-xs font-bold border-2 border-purple-700 rounded cursor-pointer transition-all hover:bg-purple-700"
              >
                カン
              </button>
            )}
            {canRon && (
              <>
                <button
                  onClick={() => sendAction({ type: 'draw' })}
                  className="px-3 py-2 bg-gray-400 text-[#ffffff] text-xs font-bold border-2 border-gray-500 rounded cursor-pointer transition-all hover:bg-gray-500"
                >
                  見逃し
                </button>
                <button
                  onClick={() => sendAction({ type: 'ron' })}
                  className="px-3 py-2 bg-yellow-600 text-[#ffffff] text-xs font-bold border-2 border-yellow-700 rounded cursor-pointer transition-all hover:bg-yellow-700"
                >
                  ロン
                </button>
              </>
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
                    toast.success('リーチモードON: 聴牌形になる牌を選んでクリックしてください（グレーの牌は選べません）', { duration: 5000 });
                  }
                }}
                className={`px-3 py-2 text-xs font-bold rounded text-white cursor-pointer transition-all ${riichiMode ? 'bg-green-600 border-2 border-green-700 shadow-lg' : 'bg-red-600 border-2 border-red-700'}`}
              >
                {riichiMode ? '✓ 待機' : '🔴 リーチ'}
              </button>
            )}
            {/* リーチ中の表示 */}
            {gameState.riichi?.[userId] && (
              <div className="px-3 py-2 bg-red-100 border-2 border-red-500 rounded font-bold text-sm text-red-800 text-center shadow-md animate-pulse">
                🔴 リーチ中
              </div>
            )}
          </div>
        )}
        {/* autoPlayモード時のインジケーター */}
        {autoPlayMode && gameState.status === 'playing' && (
          <div className="w-full flex justify-center">
            <div className="px-4 py-2 bg-blue-100 border-2 border-blue-500 rounded font-bold text-sm text-blue-800 text-center shadow-md animate-pulse">
              🤖 CPU操作中...
            </div>
          </div>
        )}

        <div className="mt-1 flex gap-3 items-center justify-center flex-wrap">
          <button
            onClick={() => toggleAutoPlayMode(!autoPlayMode)}
            className={`px-3 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoPlayMode ? 'bg-blue-600 text-[#ffffff] border-blue-700 animate-pulse' : 'bg-white text-blue-600 border-blue-600'}`}
          >
            🤖 自動: {autoPlayMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => toggleAutoDrawMode(!autoDrawMode)}
            disabled={autoPlayMode}
            className={`px-3 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoPlayMode ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed' : autoDrawMode ? 'bg-green-700 text-[#ffffff] border-green-800' : 'bg-white text-green-700 border-green-700'}`}
          >
            自動ツモ切り: {autoDrawMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => toggleNoMeldMode(!noMeldMode)}
            disabled={autoPlayMode}
            className={`px-3 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoPlayMode ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed' : noMeldMode ? 'bg-red-600 text-[#ffffff] border-red-700' : 'bg-white text-red-600 border-red-600'}`}
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
      {/* Score Result Modal */}
      {(scoreResult && gameState) || (finalResults && showFinalResults) ? (
        <>
          {scoreResult && gameState && (
            <ScoreResultModal
              scoreResult={scoreResult}
              gameState={gameState}
              nextRoundReady={finalResults ? false : nextRoundReady}
              onNextRound={() => {
                console.log('🏁 ScoreResultModal onNextRound clicked:', { finalResults: !!finalResults, showFinalResults })
                // 最終局かつfinalResultsがある場合は最終結果モーダルを表示
                if (finalResults && !showFinalResults) {
                  console.log('🏁 Showing final results modal')
                  setScoreResult(null)
                  setShowFinalResults(true)
                } else {
                  console.log('🏁 Handling next round')
                  setNextRoundReady(true)
                  handleNextRound()
                }
              }}
              winnerId={lastWinnerId}
              winnerHand={lastWinnerHand}
              winnerMelds={lastWinnerMelds}
              tenpaiStatus={tenpaiStatus}
              playerOrder={gameState?.players?.map((p) => p.userId) || []}
              playerNames={gameState?.players?.reduce((acc, p) => ({ ...acc, [p.userId]: p.playerName }), {}) || {}}
            />
          )}
          {/* Final Results Modal (Game Over) */}
          {finalResults && showFinalResults && (
            <FinalResultModal
              finalResults={finalResults}
              gameState={gameState}
              onBack={onBack}
              onRequestRematch={() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'rematch' }))
                  setRematchRequested(true)
                }
              }}
              rematchRequested={rematchRequested}
              opponentRematchRequested={opponentRematchRequested}
            />
          )}
        </>
      ) : null}
    </div>
  )
}

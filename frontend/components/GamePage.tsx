'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
// Telop notification queue system (custom, supplements react-hot-toast)
type TelopItem = {
  id: number
  message: string | React.ReactNode
  type: 'success' | 'error' | 'info'
  duration: number // ms
}
import { TenpaiChecker } from '../utils/TenpaiChecker'
import { Tile, GamePageProps, GameState, CheatType, CheatResult, CheatAccusationResult } from '../types/GameTypes'
import { normalizeTile, getTileId } from '../utils/TileUtils'
import { getTileImageUrl } from '../utils/tileData'
import { TileImage } from './TileImage'
import { TileInline } from './TileInline'
import { FuroDisplay } from './FuroDisplay'
import { useTextMode } from '../contexts/TextModeContext'
import { useWhiteMode } from '../contexts/WhiteModeContext'
import { DebugPanel } from './GameBoard/DebugPanel'
import { ScoreResultModal } from './Modals/ScoreResultModal'
import { FinalResultModal } from './Modals/FinalResultModal'
import { HandEditorModal } from './Modals/HandEditorModal'
import { MatchHistoryModal } from './Modals/MatchHistoryModal'
import { IconPickerModal } from './Modals/IconPickerModal'
import { CheatPanel } from './CheatPanel'

// Types are now imported from '../types/GameTypes'

// Utilities and components are now imported from separate files
import { debugLog, setDebugLogsEnabled } from '../utils/DebugUtils'
import { getCachedFingerprint } from '../utils/fingerprint'

const DEVELOPMENT_MODE = process.env.NODE_ENV === 'development'

const toastSettings = {
  spectatorJoinedNotify: false
}

// Gate console.log / console.warn to dev mode or CPU battle only.
// We shadow the module-level `console` so existing calls need no changes.
let _enableGameLogs = DEVELOPMENT_MODE
/* eslint-disable no-console */
const console = new Proxy(globalThis.console, {
  get(target, prop: string) {
    if (!_enableGameLogs && (prop === 'log' || prop === 'warn')) {
      return () => {}
    }
    return (target as any)[prop]
  },
})
/* eslint-enable no-console */

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
  isSpectator = false,
  isDelayedSpectator = false,
  onBanned,
}: GamePageProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  // ===== Telop notification queue =====
  const [activeTelop, setActiveTelop] = useState<TelopItem | null>(null)
  const telopQueueRef = useRef<TelopItem[]>([])
  const telopTimerRef = useRef<number | null>(null)
  const telopIdCounter = useRef(0)
  const telopDismissAllRef = useRef(false)
  const activeTelopRef = useRef<TelopItem | null>(null)

  const processTelopQueue = React.useCallback(() => {
    if (telopDismissAllRef.current) {
      telopDismissAllRef.current = false
      telopQueueRef.current = []
      activeTelopRef.current = null
      setActiveTelop(null)
      return
    }
    if (telopQueueRef.current.length === 0) {
      activeTelopRef.current = null
      setActiveTelop(null)
      return
    }
    const next = telopQueueRef.current.shift()!
    // When there are more items queued, halve the display duration
    const effectiveDuration = telopQueueRef.current.length > 0
      ? Math.max(next.duration / 2, 300)
      : next.duration
    activeTelopRef.current = next
    setActiveTelop(next)
    if (effectiveDuration > 0) {
      telopTimerRef.current = window.setTimeout(() => {
        telopTimerRef.current = null
        processTelopQueue()
      }, effectiveDuration)
    }
  }, [])

  const showTelop = React.useCallback((message: string | React.ReactNode, type: TelopItem['type'] = 'info', duration = 3000) => {
    const item: TelopItem = { id: ++telopIdCounter.current, message, type, duration }
    telopQueueRef.current.push(item)
    // If nothing is being displayed and no timer running, start processing immediately
    if (!telopTimerRef.current && activeTelopRef.current === null) {
      processTelopQueue()
    }
  }, [processTelopQueue])

  const dismissTelop = React.useCallback(() => {
    telopDismissAllRef.current = true
    if (telopTimerRef.current) {
      clearTimeout(telopTimerRef.current)
      telopTimerRef.current = null
    }
    telopQueueRef.current = []
    activeTelopRef.current = null
    setActiveTelop(null)
  }, [])

  // Cleanup telop timer on unmount
  useEffect(() => {
    return () => {
      if (telopTimerRef.current) clearTimeout(telopTimerRef.current)
    }
  }, [])
  // ===== End Telop system =====

  const [userId, setUserId] = useState('')
  const { textMode, toggleTextMode } = useTextMode()
  const { whiteMode, toggleWhiteMode } = useWhiteMode()
  const [isGrayscale, setIsGrayscale] = useState(false)
  const [autoDrawMode, setAutoDrawMode] = useState(false)
  const [noMeldMode, setNoMeldMode] = useState(false)
  const [autoPlayMode, setAutoPlayMode] = useState(false)
  const [tileScale, setTileScale] = useState<0.75 | 1>(() => {
    try { const v = localStorage.getItem('mahjong-tile-scale'); return v === '0.75' ? 0.75 : 1 } catch { return 1 }
  })
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null)
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null) // 打牌確認モード: 選択中の牌
  const [confirmDiscardMode, setConfirmDiscardMode] = useState(false) // 打牌確認モード（2タップ打牌）
  const [tenpaiInfo, setTenpaiInfo] = useState<{ isTenpai: boolean; winningTiles: any[]; isFuriten?: boolean } | null>(null)
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [riichiMode, setRiichiMode] = useState(false)
  const [tenpaiInfoMap, setTenpaiInfoMap] = useState<Record<number, { isTenpai: boolean; winningTiles: any[]; isFuriten?: boolean }>>({})
  const [nextRoundReady, setNextRoundReady] = useState(false)
  const [finalResults, setFinalResults] = useState<any[] | null>(null)
  const [tenpaiStatus, setTenpaiStatus] = useState<Record<string, boolean> | null>(null) // 流局時の聴牌状態
  const [notenPenalty, setNotenPenalty] = useState<{ amount: number; tenpaiPlayer: string; notenPlayer: string } | null>(null) // ノーテン缰符情報
  // 最終結果を表示するかどうか
  const [showFinalResults, setShowFinalResults] = useState(false)
  const [lastWinnerId, setLastWinnerId] = useState<string | null>(null)
  const [lastWinnerHand, setLastWinnerHand] = useState<Tile[]>([])
  const [lastWinnerMelds, setLastWinnerMelds] = useState<Tile[][]>([])
  const [autoDiscardTimeLeft, setAutoDiscardTimeLeft] = useState<number | null>(null) // 自動ツモ切りまでの残り時間
  const [pendingPungTimeLeft, setPendingPungTimeLeft] = useState<number | null>(null) // ポン待ち自動引きまでの残り時間
  const [showKyuushuConfirm, setShowKyuushuConfirm] = useState(false) // 九種九牌確認ダイアログ表示
  // タイマー一時停止用
  const [isTimerPaused, setIsTimerPaused] = useState(false)
  const pausedAutoDiscardTimeLeft = useRef<number | null>(null)
  const pausedPendingPungTimeLeft = useRef<number | null>(null)
  const [isAddingCPU, setIsAddingCPU] = useState(false) // CPU追加中フラグ
  const [isDeletingRoom, setIsDeletingRoom] = useState(false) // 部屋削除中フラグ
  const [showMatchHistory, setShowMatchHistory] = useState(false) // 履歴モーダル表示
  const [showOpponentHand, setShowOpponentHand] = useState(false) // 相手の手牌表示フラグ
  const [showHandEditor, setShowHandEditor] = useState(false) // 手牌エディタ表示フラグ
  const [spectatorShowHands, setSpectatorShowHands] = useState(false) // 観戦時 手牌表示フラグ
  const [spectatorHandsAllowed, setSpectatorHandsAllowed] = useState(false) // サーバー設定: 観戦時に手牌表示を許可するか
  const [myTsumoLuck, setMyTsumoLuck] = useState(0) // 自分のツモ運レベル
  const [opponentTsumoLuck, setOpponentTsumoLuck] = useState(0) // 相手のツモ運レベル
  const [spectatorNames, setSpectatorNames] = useState<Array<{ userId: string; spectatorName: string }>>([]) // 観戦者名一覧
  const [showSpectatorList, setShowSpectatorList] = useState(false) // 観戦者一覧の表示フラグ
  const [handRevealedToSpectators, setHandRevealedToSpectators] = useState(false) // 自分の手牌を観戦者に公開中か
  const [handRevealedMap, setHandRevealedMap] = useState<Record<string, boolean>>({}) // プレイヤーごとの手牌公開状態（観戦者が参照）
  const spectatorListRef = useRef<HTMLDivElement>(null) // 観戦者一覧ドロップダウン用ref
  const [autoActionTimerSeconds, setAutoActionTimerSeconds] = useState(10) // ツモ切り・ポン見逃しのタイマー秒数
  const [discardAssistSuggestion, setDiscardAssistSuggestion] = useState<{ tileId: string; tileIndex: number } | null>(null)
  const [opponentTedashiGapIdx, setOpponentTedashiGapIdx] = useState(-1) // 相手手出し時の歯抜け表示位置 (-1=なし)
  const [rematchRequested, setRematchRequested] = useState(false) // 再戦準備OK送信済み（自分）
  const [rematchReadyCount, setRematchReadyCount] = useState(0) // 再戦準備OK人数
  const [rematchReadyUserIds, setRematchReadyUserIds] = useState<string[]>([]) // 再戦準備OK済みuserId一覧
  const [reconnectTrigger, setReconnectTrigger] = useState(0) // 再接続トリガー
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('mahjong-sound-enabled') !== 'false' } catch { return false }
  })
  const [playerIcon, setPlayerIcon] = useState<string | null>(null)
  const [opponentIcon, setOpponentIcon] = useState<string | null>(null)
  const [showOpponentIcon, setShowOpponentIcon] = useState(true)
  const [iconPanelWidth, setIconPanelWidth] = useState(0)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const playerIconRef = React.useRef<string | null>(null)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false) // 対戦相手の通信切断状態

  // ===== 遅延観戦モード関連 =====
  const [delayedSpectatorWaiting, setDelayedSpectatorWaiting] = useState(false) // 遅延バッファ待機中
  const [delayedModeDelayMs, setDelayedModeDelayMs] = useState(60000) // 遅延時間（ミリ秒）
  const [delayedCountdownSec, setDelayedCountdownSec] = useState<number | null>(null) // カウントダウン残り秒数
  const delayedCountdownIntervalRef = useRef<number | null>(null) // カウントダウン用インターバルID
  const delayedWaitingStartRef = useRef<number | null>(null) // 待機開始時刻

  // ===== イカサマ関連のstate =====
  const [isCheatPanelOpen, setIsCheatPanelOpen] = useState(false)
  const [lastCheatResult, setLastCheatResult] = useState<CheatResult | null>(null)
  const [lastAccusationResult, setLastAccusationResult] = useState<CheatAccusationResult | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mahjong-player-icon')
      if (saved) {
        setPlayerIcon(saved)
        playerIconRef.current = saved
      }
    } catch {}
    try {
      const saved = localStorage.getItem('mahjong-show-opponent-icon')
      if (saved === 'false') setShowOpponentIcon(false)
    } catch {}
  }, [])

  // After joining, send own icon to the server so it can be forwarded to the opponent
  useEffect(() => {
    if (!userId || !playerIconRef.current) return
    if (isSpectator) return // 観戦者はアイコンを共有しない
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'shareIcon',
        payload: { iconData: playerIconRef.current },
      }))
    }
  }, [userId, isSpectator])

  const handleIconSelectInGame = React.useCallback((icon: string | null) => {
    setPlayerIcon(icon)
    playerIconRef.current = icon
    // shareIcon を送信して相手にも反映（観戦者は送信しない）
    if (!isSpectator && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'shareIcon',
        payload: { iconData: icon ?? '' },
      }))
    }
  }, [isSpectator])

  useEffect(() => {
    const updateIconWidth = () => {
      // max-w-4xl = 896px; show icon only when enough space remains on the left
      const available = Math.floor((window.innerWidth - 896) / 2) - 16
      setIconPanelWidth(available > 60 ? available : 0)
    }
    updateIconWidth()
    window.addEventListener('resize', updateIconWidth)
    return () => window.removeEventListener('resize', updateIconWidth)
  }, [])
  const soundEnabledRef = useRef(true)
  const dahaiAudioRef = useRef<HTMLAudioElement | null>(null)
  const opponentTedashiGapTimerRef = useRef<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const connectionAttempted = useRef(false)  // Prevent multiple connection attempts
  const autoNextTimerRef = useRef<number | null>(null)  // タイマーIDをRefで管理
  const autoDiscardIntervalRef = useRef<number | null>(null)  // カウントダウンインターバルのID
  const autoDiscardTimeoutRef = useRef<number | null>(null)  // 自動ツモ切りのタイマーID
  const autoDiscardKeyRef = useRef<string | null>(null)  // 直近の自動ツモ切り対象
  const discardAssistRequestKeyRef = useRef<string | null>(null) // 同一局面での重複リクエスト防止
  const pendingPungIntervalRef = useRef<number | null>(null)  // ポン待ち時のカウントダウンインターバルのID
  const autoDiscardDeadlineRef = useRef<number | null>(null)  // 自動ツモ切り期限時刻 (Date.now() + ms)
  const pendingPungDeadlineRef = useRef<number | null>(null)   // ポン見逃し期限時刻 (Date.now() + ms)
  const noMeldAutoDrawRef = useRef<string | null>(null)  // ノーメルドモード自動ツモの状態フラグ
  const attemptedReconnectUserId = useRef<string | null>(null)  // Track if we tried to reconnect with a specific userId
  const reconnectTimerRef = useRef<number | null>(null)  // 再接続タイマー
  const keepaliveTimerRef = useRef<number | null>(null)  // クライアント→サーバーkeepaliveタイマー（CGNAT対策）
  const onBackRef = useRef(onBack)
  const opponentActionDelayRef = useRef<number | null>(null)
  const opponentActionHideRef = useRef<number | null>(null)
  const opponentResultDelayRef = useRef<number | null>(null)
  const userIdRef = useRef('')
  const gameStateRef = useRef<GameState | null>(null)
  const tilesRef = useRef<Record<string, any>>({})  // ゲーム状態の tiles を保持
  const spectatorHandsAllowedRef = useRef(false)  // 観戦時手牌表示許可 (handleMessage用)
  const spectatorShowHandsRef = useRef(false)  // 観戦時手牌表示フラグ (handleMessage用)
  const handRevealedMapRef = useRef<Record<string, boolean>>({})  // プレイヤーごとの手牌公開状態 (handleMessage用)
  const showOpponentHandRef = useRef(false)  // 相手の手牌表示フラグ (handleMessage用)
  const selectedTileIndexRef = useRef<number | null>(null)  // 予約選択用: selectedTileIndex のRef
  const confirmDiscardModeRef = useRef(false)  // 予約選択用: confirmDiscardMode のRef
  const prevHandRef = useRef<Tile[]>([])  // 予約選択のインデックス補正用: 前回の手牌

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    selectedTileIndexRef.current = selectedTileIndex
  }, [selectedTileIndex])

  useEffect(() => {
    confirmDiscardModeRef.current = confirmDiscardMode
  }, [confirmDiscardMode])

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
    try { localStorage.setItem('mahjong-sound-enabled', String(soundEnabled)) } catch {}
  }, [soundEnabled])

  useEffect(() => {
    dahaiAudioRef.current = new Audio('/dahai.opus')
    dahaiAudioRef.current.preload = 'auto'
    return () => { dahaiAudioRef.current = null }
  }, [])

  const playDahaiSound = React.useCallback(() => {
    if (!soundEnabledRef.current) return
    const audio = dahaiAudioRef.current
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  }, [])

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    spectatorHandsAllowedRef.current = spectatorHandsAllowed
  }, [spectatorHandsAllowed])
  useEffect(() => {
    spectatorShowHandsRef.current = spectatorShowHands
  }, [spectatorShowHands])
  useEffect(() => {
    handRevealedMapRef.current = handRevealedMap
  }, [handRevealedMap])
  useEffect(() => {
    showOpponentHandRef.current = showOpponentHand
  }, [showOpponentHand])

  useEffect(() => {
    // gameState の tiles を保存しておき、gameFinished 時に使用する
    if (gameState?.tiles) {
      tilesRef.current = gameState.tiles
    }
  }, [gameState?.tiles])

  // 観戦者一覧ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    if (!showSpectatorList) return
    const handleClickOutside = (e: MouseEvent) => {
      if (spectatorListRef.current && !spectatorListRef.current.contains(e.target as Node)) {
        setShowSpectatorList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSpectatorList])

  // 打牌確認モードを localStorage から読み込む（部屋設定とは独立）
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mahjong-confirm-discard')
      if (saved === 'true') {
        setConfirmDiscardMode(true)
      }
    } catch (e) {
      console.error('Failed to load confirm discard setting:', e)
    }
  }, [])

  // 選択中の牌をステータス変更時にリセット
  useEffect(() => {
    setSelectedTileIndex(null)
  }, [gameState?.status])

  // 手牌が変わった時、予約選択中の牌のインデックスを補正する（ソート順変動対策）
  const currentHand = gameState?.tiles?.[userId]?.hand as Tile[] | undefined
  useEffect(() => {
    const prevHand = prevHandRef.current
    const newHand = currentHand || []
    // 手牌の参照が変わった場合のみ処理
    if (prevHand !== newHand && prevHand.length > 0 && newHand.length > 0) {
      const idx = selectedTileIndexRef.current
      if (idx !== null && idx >= 0 && idx < prevHand.length) {
        const selectedTile = prevHand[idx]
        if (selectedTile) {
          // 旧手牌で選択牌と同種の牌が何枚目だったか数える
          const tileKey = `${selectedTile.suit}_${selectedTile.number}_${!!selectedTile.isRed}`
          let occurrenceInOld = 0
          for (let i = 0; i < idx; i++) {
            const t = prevHand[i]
            if (`${t.suit}_${t.number}_${!!t.isRed}` === tileKey) occurrenceInOld++
          }
          // 新手牌で同種の牌のn番目を探す
          let count = 0
          let newIdx = -1
          for (let i = 0; i < newHand.length; i++) {
            const t = newHand[i]
            if (`${t.suit}_${t.number}_${!!t.isRed}` === tileKey) {
              if (count === occurrenceInOld) {
                newIdx = i
                break
              }
              count++
            }
          }
          if (newIdx >= 0 && newIdx !== idx) {
            console.log(`🔄 [PreSelect] Correcting selectedTileIndex: ${idx} → ${newIdx} (tile: ${tileKey})`)
            setSelectedTileIndex(newIdx)
          } else if (newIdx < 0) {
            // 選択していた牌が新手牌に見つからない（打牌された等）→ リセット
            console.log(`🔄 [PreSelect] Selected tile no longer in hand, resetting`)
            setSelectedTileIndex(null)
          }
        }
      }
    }
    prevHandRef.current = newHand
  }, [currentHand, userId])

  const triggerOpponentActionModal = React.useCallback((text: string) => {
    if (!text) return

    // Clear any existing timers
    if (opponentActionDelayRef.current !== null) {
      clearTimeout(opponentActionDelayRef.current)
      opponentActionDelayRef.current = null
    }

    // Schedule toast with 300ms delay
    opponentActionDelayRef.current = window.setTimeout(() => {
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

    // 観戦モードでは全プレイヤーのアクションを検出する
    // 通常モードでは相手プレイヤーのアクションのみ検出する
    type PlayerEntry = { userId: string; playerName: string; isCPU?: boolean }
    const playersToCheck: PlayerEntry[] = isSpectator
      ? (nextState.players || prevState.players || []) as PlayerEntry[]
      : (
          [
            nextState.players?.find((player) => player.userId !== currentUserId)
            || prevState.players?.find((player) => player.userId !== currentUserId)
          ].filter((p): p is PlayerEntry => !!p)
        )

    for (const player of playersToCheck) {
      if (!player) continue

      // Check for riichi
      const prevRiichi = prevState.riichi?.[player.userId]
      const nextRiichi = nextState.riichi?.[player.userId]
      if (!prevRiichi && nextRiichi) {
        return `リーチ`
      }

      const prevMelds = (prevState.tiles?.[player.userId]?.melds as Array<Array<Tile | string>>) || []
      const nextMelds = (nextState.tiles?.[player.userId]?.melds as Array<Array<Tile | string>>) || []

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
    }

    return ''
  }, [isSpectator])

  const getOpponentWinText = React.useCallback((winType: string, winnerName: string) => {
    if (winType.includes('ツモ')) return `ツモ`
    if (winType.includes('ロン')) return `ロン`
    return `和了`
  }, [])

  const clearInvalidSession = React.useCallback(() => {
    localStorage.removeItem('mahjong-session')
    dismissTelop()
  }, [dismissTelop])

  // Get the other player
  const otherPlayer = gameState?.players?.find(p => p.userId !== userId)

  // Enable verbose logging only in dev mode or when playing against a CPU
  useEffect(() => {
    const enabled = DEVELOPMENT_MODE || !!(otherPlayer?.isCPU)
    _enableGameLogs = enabled
    setDebugLogsEnabled(enabled)
  }, [otherPlayer?.isCPU])

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
          canKyuushuFor: payload.gameState?.canKyuushuFor,
          scores: payload.gameState?.scores,
          initialScore: payload.gameState?.initialScore,
          roundWind: payload.gameState?.roundWind,
          roundNumber: payload.gameState?.roundNumber,
          roundName: payload.gameState?.roundName,
          currentRound: payload.gameState?.currentRound,
          dealerId: payload.gameState?.dealerId,
          seatWinds: payload.gameState?.seatWinds,
          hostId: payload.hostId || payload.gameState?.hostId,
          rematchReadyUserIds: payload.gameState?.rematchReadyUserIds || [],
          discardAssistEnabled: payload.gameState?.discardAssistEnabled,
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

        // ゲームオーバー状態で再接続した場合、最終結果を復元して表示する
        if (payload.gameState?.status === 'gameOver' && payload.gameState?.finalResults) {
          console.log('🏁 Reconnected to a finished game - restoring final results')
          setFinalResults(payload.gameState.finalResults)
          setShowFinalResults(true)
        }

        if (payload.isReconnecting) {
          showTelop('ゲームに再接続しました', 'success', 3000)
        } else {
          showTelop(
            `${payload.playerName}はゲームに参加しました（${payload.players.length}/2）`,
            'success', 3000
          )
        }
        // 観戦者リストを復元
        if (payload.spectators) {
          setSpectatorNames(payload.spectators)
        }
        break
      case 'spectatorJoined':
        debugLog(`👀 Joined as spectator userId=${payload.userId}`)
        console.log('👀 Spectator joined:', payload)
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
          setDelayedModeDelayMs(payload.delayMs)
        }
        // 遅延観戦モードは常に両方の手牌を公開
        const handsAllowed = payload.isDelayedMode === true ? true : payload.spectatorShowHandsByDefault !== false
        setSpectatorHandsAllowed(handsAllowed)
        setSpectatorShowHands(handsAllowed)

        if (payload.delayedModeWaiting) {
          // 遅延バッファ待機中
          setDelayedSpectatorWaiting(true)
          setGameState({
            status: 'waiting',
            players: payload.players || [],
            isSpectatorView: true,
            isDelayedMode: true,
          })
          // カウントダウン開始
          const delayMs = payload.delayMs || 60000
          const startedAt = Date.now()
          delayedWaitingStartRef.current = startedAt
          if (delayedCountdownIntervalRef.current !== null) {
            clearInterval(delayedCountdownIntervalRef.current)
          }
          const remaining = Math.ceil(delayMs / 1000)
          setDelayedCountdownSec(remaining)
          delayedCountdownIntervalRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startedAt
            const rem = Math.ceil((delayMs - elapsed) / 1000)
            if (rem <= 0) {
              setDelayedCountdownSec(0)
              if (delayedCountdownIntervalRef.current !== null) {
                clearInterval(delayedCountdownIntervalRef.current)
                delayedCountdownIntervalRef.current = null
              }
            } else {
              setDelayedCountdownSec(rem)
            }
          }, 500)
          showTelop(`⏳ 遅延観戦モードで参加しました。約${Math.round(delayMs / 1000)}秒後から観戦が始まります。`, 'info', 5000)
        } else {
          setDelayedSpectatorWaiting(false)
          if (payload.gameState) {
            setGameState({ ...payload.gameState, isSpectatorView: true, isDelayedMode: payload.isDelayedMode === true })
            if (payload.gameState.autoActionTimerSeconds) {
              setAutoActionTimerSeconds(payload.gameState.autoActionTimerSeconds)
            }
          } else {
            setGameState({
              status: 'waiting',
              players: payload.players || [],
              isSpectatorView: true,
              isDelayedMode: payload.isDelayedMode === true,
            })
          }

          if (payload.isDelayedMode) {
            showTelop(`遅延観戦モードで参加しました（${Math.round((payload.delayMs || 60000) / 1000)}秒遅延・手牌公開）`, 'success', 4000)
          } else {
            showTelop(`観戦モードで参加しました`, 'success', 3000)
          }
        }

        // 観戦モード時：両プレイヤーのアイコンを設定
        if (payload.playerIcons && payload.players && payload.players.length >= 2) {
          const player1Icon = payload.playerIcons[payload.players[0].userId] || null
          const player2Icon = payload.playerIcons[payload.players[1].userId] || null
          setPlayerIcon(player1Icon)
          setOpponentIcon(player2Icon)
        }

        // 観戦者名リストと手牌公開マップを復元
        if (payload.spectators) {
          setSpectatorNames(payload.spectators)
        }
        if (payload.handRevealedMap) {
          setHandRevealedMap(payload.handRevealedMap)
        }

        // 局間に参加した場合は前の局の結果を表示する（遅延観戦でない場合のみ）
        if (!payload.isDelayedMode && payload.lastFinishedPayload) {
          const lf = payload.lastFinishedPayload
          if (lf.isDraw && lf.tenpaiStatus) setTenpaiStatus(lf.tenpaiStatus)
          else setTenpaiStatus(null)
          if (lf.isDraw && lf.notenPenalty) setNotenPenalty(lf.notenPenalty)
          else setNotenPenalty(null)
          if (lf.winner) setLastWinnerId(lf.winner)
          if (lf.gameOver && lf.finalResults) {
            setFinalResults(lf.finalResults)
            setShowFinalResults(false)
          }
          if (lf.scoreResult) {
            setScoreResult({ ...lf.scoreResult, winType: lf.winType || '', isDraw: false })
          } else if (lf.isDraw) {
            setScoreResult({ valid: true, score: 0, han: 0, fu: 0, scoreType: lf.winType || '流局', yaku: [], isDraw: true })
          } else if (lf.winner) {
            setScoreResult({ valid: true, score: 0, han: 0, fu: 0, scoreType: lf.winType || '和了', yaku: [], isDraw: false, winType: lf.winType || '' })
          }
        }
        break
      case 'spectatorJoinedNotify':
        debugLog(`👀 A spectator joined: ${payload.spectatorName}`)
        setGameState((prev) => prev ? { ...prev, spectatorCount: payload.spectatorCount } : prev)
        if (payload.spectators) {
          setSpectatorNames(payload.spectators)
        }
        if (toastSettings.spectatorJoinedNotify) {
          showTelop(`👀 ${payload.spectatorName}が観戦中`, 'info', 2000)
        }
        break
      case 'spectatorLeft':
        debugLog(`👀 A spectator left: ${payload.spectatorName}`)
        setGameState((prev) => prev ? { ...prev, spectatorCount: payload.spectatorCount } : prev)
        if (payload.spectators) {
          setSpectatorNames(payload.spectators)
        }
        break
      case 'spectatorHandRevealed':
        debugLog(`👀 Hand reveal update: ${payload.playerName} revealed=${payload.revealed}`)
        if (payload.handRevealedMap) {
          setHandRevealedMap(payload.handRevealedMap)
        }
        break
      case 'spectatorListUpdate':
        if (payload.spectators) {
          setSpectatorNames(payload.spectators)
        }
        break
      case 'playerJoined':
        debugLog(`✅ Another player joined`)
        console.log('✅ Another player joined')
        setOpponentDisconnected(false)
        setGameState((prev) => {
          debugLog(`In setGameState callback - prev gameState=${prev?.status || 'null'}`)
          console.log('In setGameState callback - prev:', prev)
          if (!prev) return prev
          return {
            ...prev,
            players: payload.players,
          }
        })
        showTelop(`プレイヤーが参加しました（${payload.players.length}/2）`, 'success', 3000)
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
        // 遅延観戦待機中フラグを解除
        setDelayedSpectatorWaiting(false)
        if (delayedCountdownIntervalRef.current !== null) {
          clearInterval(delayedCountdownIntervalRef.current)
          delayedCountdownIntervalRef.current = null
        }
        setDelayedCountdownSec(null)
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
        setLastCheatResult(null)
        setLastAccusationResult(null)
        setIsCheatPanelOpen(false)
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

        setGameState((prevState) => ({ ...payload, isSpectatorView: prevState?.isSpectatorView, isDelayedMode: prevState?.isDelayedMode }))
        debugLog(`✅ gameState updated to status=${payload.status}`)

        // Set autoActionTimerSeconds from gameState
        if (payload.autoActionTimerSeconds) {
          setAutoActionTimerSeconds(payload.autoActionTimerSeconds)
        }

        showTelop('対局開始', 'success', 3000)
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
          // 相手の打牌時に音を鳴らす
          if (lastInfo && lastInfo.userId !== myId) {
            playDahaiSound()
          }
          if (lastInfo && lastInfo.userId !== myId && !lastInfo.isTsumogiri) {
            // 相手が手出しした → 手牌の中にランダムな位置で歯抜けを表示
            // 手牌が全表示されている場合（遅延観戦、観戦手牌表示、プレイヤー公開など）は歯抜けを無効化
            // ※ Ref 経由で最新の state を取得する（useCallback([], []) のクロージャでは stale になるため）
            const opponentIsCPU = payload.players?.some((p: any) => p.userId === lastInfo.userId && p.isCPU)
            const opponentHandVisible =
              payload.isDelayedMode === true ||
              payload.transparentHand === true ||
              (spectatorHandsAllowedRef.current && spectatorShowHandsRef.current) ||
              !!(handRevealedMapRef.current[lastInfo.userId]) ||
              (showOpponentHandRef.current && opponentIsCPU)
            const opponentHandLen = payload.tiles?.[lastInfo.userId]?.hand?.length ?? 0
            const gapPos = (!opponentHandVisible && opponentHandLen > 0) ? Math.floor(Math.random() * opponentHandLen) : -1
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
            // 観戦モードフラグを維持する
            isSpectatorView: prevState?.isSpectatorView,
            isDelayedMode: prevState?.isDelayedMode,
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

        // ノーテン缰符情報を保存
        if (payload.isDraw && payload.notenPenalty) {
          setNotenPenalty(payload.notenPenalty)
        } else {
          setNotenPenalty(null)
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
          showTelop(payload?.scoreResult?.error || '役がありません', 'error', 4000)
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
        console.log('🏁 [SCORES DEBUG] payload.scores=', payload.scores, 'payload.previousScores=', payload.previousScores, 'payload.dealerId=', payload.dealerId)
        if (payload.scoreResult) {
          // scoreResultがある場合は、winType情報を追加し、isDraw を false に設定
          const resultToShow = {
            ...payload.scoreResult,
            winType: payload.winType || '',
            isDraw: false,  // ロン・ツモなど実際の和了は流局ではない
            previousScores: payload.previousScores || null,
            scores: payload.scores || null,
            dealerId: payload.dealerId || null,
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
            winType: payload.winType || '',
            previousScores: payload.previousScores || null,
            scores: payload.scores || null,
            dealerId: payload.dealerId || null,
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
            previousScores: payload.previousScores || null,
            scores: payload.scores || null,
            dealerId: payload.dealerId || null,
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
            // toast.success(`${payload.winType || 'ゲーム終了'} 勝者: ${winnerName}`, { duration: 5000 })
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
            scores: payload.scores ?? prevState.scores,
            nextRoundReadyCount: payload.nextRoundReadyCount,
            totalPlayers: payload.totalPlayers,
          } : prevState
        })
        break
      case 'actionResponse':
        debugLog(`✅ Action response received`)
        console.log('✅ Action response:', payload)
        if (payload.actionType === 'discardAssist') {
          setDiscardAssistSuggestion(payload.discardAssist ?? null)
          break
        }
        if (payload.success === false) {
          // エラーメッセージを表示
          showTelop(payload.message || 'アクションに失敗しました', 'error', 4000)
          if (payload.message && payload.message.includes('役がありません')) {
            if (autoNextTimerRef.current !== null) {
              clearTimeout(autoNextTimerRef.current)
              autoNextTimerRef.current = null
            }
          }
        } else if (payload.riichi) {
          // リーチ成功メッセージ
          // toast.success(payload.message || 'リーチ宣言しました！', { duration: 5000 })
        }
        break
      case 'error': {
        // Handle both {type, payload: {message}} and {type, message} formats
        const errorMessage = payload?.message || data.message || 'エラーが発生しました'
        debugLog(`❌ Server error: ${errorMessage}`)
        console.error('❌ Server error:', errorMessage, 'Full data:', data)

        // BAN処理: banned:<理由> 形式のメッセージ
        if (errorMessage.startsWith('banned:')) {
          const reason = errorMessage.slice('banned:'.length) || '管理者により利用が禁止されています'
          console.warn(`🚫 Banned via WebSocket: ${reason}`)
          if (onBanned) {
            onBanned(reason)
          } else {
            showTelop(`⛔ 利用禁止: ${reason}`, 'error', 15000)
          }
          break
        }

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

        // 自分が参加中のルームを観戦しようとした場合、ホームに戻す
        if (errorMessage.includes('観戦できません')) {
          showTelop(errorMessage, 'error', 3000)
          setTimeout(() => onBackRef.current(), 1500)
          break
        }

        showTelop(errorMessage, 'error', 5000)
        break
      }
      case 'playerDisconnected':
        debugLog(`📡 Player disconnected: ${payload.playerName}`)
        console.log('📡 Player disconnected:', payload)
        setOpponentDisconnected(true)
        break
      case 'playerReconnected':
        debugLog(`🔄 Player reconnected: ${payload.playerName}`)
        console.log('🔄 Player reconnected:', payload)
        setOpponentDisconnected(false)
        showTelop(`${payload.playerName}さんが再接続しました`, 'success', 3000)
        break
      case 'rematchReadyUpdate':
        console.log('🔄 Rematch ready update:', payload)
        setRematchReadyCount(payload.readyCount)
        setRematchReadyUserIds(payload.readyUserIds)
        // Mark self as ready if our userId is in the list
        if (payload.readyUserIds?.includes(userIdRef.current)) {
          setRematchRequested(true)
        }
        break
      case 'rematchStart':
        console.log('🔄 Rematch starting:', payload)
        // Reset all game-related state for the new match
        setOpponentDisconnected(false)
        setFinalResults(null)
        setShowFinalResults(false)
        setScoreResult(null)
        setRematchRequested(false)
        setRematchReadyCount(0)
        setRematchReadyUserIds([])
        setNextRoundReady(false)
        setLastWinnerId(null)
        setLastWinnerHand([])
        setLastWinnerMelds([])
        setTenpaiStatus(null)
        setNotenPenalty(null)
        setGameState(payload)
        // 再戦時はバックエンドが autoPlay を false にリセットするため、フロントエンド側も同期する
        // これをしないと UI が ON のまま残り、ボタンを OFF→ON と 2 回押さないと有効化されない
        if (payload.autoPlay?.[userIdRef.current] !== undefined) {
          setAutoPlayMode(payload.autoPlay[userIdRef.current])
        } else {
          setAutoPlayMode(false)
        }
        showTelop('再戦開始！', 'success', 3000)
        break
      case 'opponentIcon':
        if (payload?.iconData) {
          setOpponentIcon(payload.iconData)
        }
        break
      case 'playerIconUpdated':
        // 観戦モード時：プレイヤーがアイコンを更新した場合、該当するアイコンを更新
        if (payload?.iconData && payload?.playerIndex !== undefined) {
          if (payload.playerIndex === 0) {
            setPlayerIcon(payload.iconData)
          } else if (payload.playerIndex === 1) {
            setOpponentIcon(payload.iconData)
          }
        }
        break
      case 'roomDeleted':
        console.log('🗑️ Room deleted:', payload)
        showTelop('🗑️ 部屋が削除されました', 'info', 4000)
        setTimeout(() => onBackRef.current(), 1500)
        break
      case 'cheatResult':
        // イカサマ結果（実行者にのみ送信される）
        console.log('🃏 Cheat result:', payload)
        setLastCheatResult(payload)
        if (payload?.success) {
          showTelop('🃏 イカサマ実行', 'info', 2000)
        } else {
          showTelop(payload?.message || 'イカサマ失敗', 'error', 2000)
        }
        break
      case 'cheatAccusationResult':
        // イカサマ指摘結果（全プレイヤーに送信される）
        console.log('🚨 Cheat accusation result:', payload)
        setLastAccusationResult(payload)
        if (payload?.caught) {
          showTelop(`🚨 ${payload.message}`, 'info', 5000)
        } else {
          showTelop(`❌ ${payload.message}`, 'info', 5000)
        }
        break
      case 'pong':
        // サーバーからのkeepalive pong応答 - 接続維持確認のみ（ノイズを出さない）
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
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (delayedCountdownIntervalRef.current !== null) {
        clearInterval(delayedCountdownIntervalRef.current)
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

    ws.onopen = async () => {
      debugLog('✅ WebSocket connected successfully')
      console.log('✅ WebSocket connected successfully')
      dismissTelop()

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

      // Always include the persistent userId (generated at login, kept until logout)
      // This is critical for spectator blocking: server needs to know who we are
      if (!joinPayload.userId) {
        try {
          const persistentUserId = localStorage.getItem('mahjong-userId')
          if (persistentUserId) {
            joinPayload.userId = persistentUserId
            console.log('🪪 Using persistent userId:', persistentUserId)
          }
        } catch {}
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

      // 見学者モードのときはフラグを追加
      if (isSpectator) {
        joinPayload.spectator = true
      }

      // 遅延観戦モードのときはフラグを追加
      if (isDelayedSpectator) {
        joinPayload.spectator = true
        joinPayload.delayedSpectator = true
      }

      // デバイスフィンガープリントを付与（ログインページ表示時に事前生成済み）
      try {
        const fingerprint = await getCachedFingerprint()
        if (fingerprint && /^[0-9a-f]{32}$/i.test(fingerprint)) {
          joinPayload.fingerprint = fingerprint
          console.log('🔏 Device fingerprint:', fingerprint)
        }
      } catch (fpErr) {
        console.warn('⚠️ Failed to get fingerprint:', fpErr)
      }

      // await中にWebSocketが切断されている可能性があるため送信前に状態確認
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ WebSocket closed during fingerprint retrieval, join message not sent')
        return
      }

      debugLog(`📤 Sending join message: roomId=${roomId}, playerName=${playerName}, spectator=${isSpectator}`)
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
      const targetUrl = (event.target as WebSocket)?.url || wsUrl
      showTelop(`接続エラー: WebSocket接続に失敗（${targetUrl}）`, 'error', 8000)
    }

    ws.onclose = (event) => {
      // キャリアプロキシによる切断の場合 code=1006 (異常切断、ドコモ等CGNATタイムアウト)
      const codeInfo = `code=${event.code}${event.reason ? ` reason=${event.reason}` : ''}`
      debugLog(`🔌 WebSocket disconnected (${codeInfo})`)
      console.log(`🔌 WebSocket disconnected (${codeInfo}) wasClean=${event.wasClean}`)
      // keepaliveタイマーを停止
      if (keepaliveTimerRef.current !== null) {
        clearInterval(keepaliveTimerRef.current)
        keepaliveTimerRef.current = null
      }
      // 接続フラグをリセットして再接続を許可する
      connectionAttempted.current = false
      // タブが表示中なら自動再接続（2秒待機）
      if (document.visibilityState === 'visible') {
        if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = window.setTimeout(() => {
          setReconnectTrigger((t) => t + 1)
        }, 2000)
      }
    }

    // クライアント側keepalive: 20秒ごとにアプリケーションレベルpongを送信しCGNATセッションを画採りする
    keepaliveTimerRef.current = window.setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        } catch (_) {}
      }
    }, 20000)

    wsRef.current = ws

    return () => {
      if (keepaliveTimerRef.current !== null) {
        clearInterval(keepaliveTimerRef.current)
        keepaliveTimerRef.current = null
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [roomId, playerName, handleMessage, reconnectTrigger])

  // タブ切り替え時に再接続する（スマホブラウザ対応）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // カウントダウン表示をdeadlineから即座に同期
        if (pendingPungDeadlineRef.current !== null) {
          const remaining = Math.ceil((pendingPungDeadlineRef.current - Date.now()) / 1000);
          setPendingPungTimeLeft(remaining > 0 ? remaining : null);
        }
        if (autoDiscardDeadlineRef.current !== null) {
          const remaining = Math.ceil((autoDiscardDeadlineRef.current - Date.now()) / 1000);
          setAutoDiscardTimeLeft(remaining > 0 ? remaining : null);
        }
        // WSが切断されていれば再接続
        const ws = wsRef.current
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          console.log('🔌 Tab visible but WS closed - scheduling reconnect...')
          connectionAttempted.current = false
          if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = window.setTimeout(() => {
            setReconnectTrigger((t) => t + 1)
          }, 500)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

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
    // 打牌時に音を鳴らす
    if (action.type === 'discard' || action.type === 'riichi') {
      playDahaiSound()
    }
  }, [playDahaiSound])

  React.useEffect(() => {
    if (!gameState || isSpectator || !userId) {
      setDiscardAssistSuggestion(null)
      discardAssistRequestKeyRef.current = null
      return
    }

    if (gameState.discardAssistEnabled !== true || gameState.status !== 'playing') {
      setDiscardAssistSuggestion(null)
      discardAssistRequestKeyRef.current = null
      return
    }

    const isYourTurn = gameState.currentTurn === userId
    const hand = (gameState.tiles?.[userId]?.hand as Tile[]) || []
    const drawnTileIndex = gameState.tiles?.[userId]?.drawnTileIndex ?? -1
    const isRiichi = gameState.riichi?.[userId] === true
    const canDiscard = isYourTurn && hand.length % 3 === 2
    const waitingAction = gameState.pendingPungFor === userId || gameState.ronPossibleFor === userId

    if (!canDiscard || isRiichi || waitingAction) {
      setDiscardAssistSuggestion(null)
      discardAssistRequestKeyRef.current = null
      return
    }

    const handKey = hand.map((tile) => getTileId(tile)).join('|')
    const requestKey = `${userId}:${gameState.currentTurn}:${drawnTileIndex}:${handKey}`

    if (discardAssistRequestKeyRef.current === requestKey) {
      return
    }

    discardAssistRequestKeyRef.current = requestKey
    sendAction({ type: 'discardAssist' })
  }, [gameState, isSpectator, userId, sendAction])

  const handleNextRound = React.useCallback(() => {
    // バックエンドに「次の局へ」を伝える
    // バックエンドが両プレイヤーの準備状況を管理し、gameStateUpdateでnextRoundReadyCountが更新される
    sendAction({ type: 'nextRound' })
  }, [sendAction])

  const checkTenpai = React.useCallback((tileIndex: number) => {
    console.log(`🔍 Checking tenpai locally for tile index ${tileIndex}`)
    const hand = gameState?.tiles?.[userId]?.hand || []
    const melds = gameState?.tiles?.[userId]?.melds || []
    const discards: any[] = gameState?.discards?.[userId] || []
    //console.log(`  Current hand:`, hand)
    //console.log(`  Current melds:`, melds)

    if (hand.length === 0) {
      setTenpaiInfo({ isTenpai: false, winningTiles: [], isFuriten: false })
      return
    }

    // クライアント側で聴牌判定を実行
    const result = TenpaiChecker.checkTenpaiAfterDiscard(hand, tileIndex, melds)
    //console.log(`  Tenpai result:`, result)
    // フリテン判定: 待ち牌が自分の捨て牌に含まれているか
    const isFuriten = result.isTenpai && result.winningTiles.some((wt: any) =>
      discards.some((d: any) => d.suit === wt.suit && d.number === wt.number)
    )
    setTenpaiInfo({ ...result, isFuriten })
  }, [gameState, userId])

  // ツモ時に全牌の聴牌情報をローカルで計算
  const handForTenpai = gameState?.tiles?.[userId]?.hand
  const meldsForTenpai = gameState?.tiles?.[userId]?.melds
  const discardsForTenpai = gameState?.discards?.[userId]
  const handLengthForTenpai = handForTenpai?.length ?? 0
  const isMyTurnForTenpai = gameState?.currentTurn === userId
  const myRiichiForTenpai = !!gameState?.riichi?.[userId]
  const statusForTenpai = gameState?.status
  React.useEffect(() => {
    setRiichiMode(false)
    setTenpaiInfoMap({})

    // 自分のターンでリーチしていない場合、全牌の聴牌チェックをローカルで実行
    if (isMyTurnForTenpai && !myRiichiForTenpai && statusForTenpai === 'playing') {
      const hand = handForTenpai || []
      const melds = meldsForTenpai || []
      const discards: any[] = discardsForTenpai || []

      if (hand.length > 0) {
        const results = TenpaiChecker.checkAllTenpai(hand, melds)
        // フリテン判定を各結果に追加: 待ち牌が自分の捨て牌に含まれているか
        const resultsWithFuriten: Record<number, { isTenpai: boolean; winningTiles: any[]; isFuriten?: boolean }> = {}
        for (const [key, result] of Object.entries(results)) {
          const isFuriten = result.isTenpai && result.winningTiles.some((wt: any) =>
            discards.some((d: any) => d.suit === wt.suit && d.number === wt.number)
          )
          resultsWithFuriten[Number(key)] = { ...result, isFuriten }
        }
        setTenpaiInfoMap(resultsWithFuriten)
      }
    }
  }, [handLengthForTenpai, isMyTurnForTenpai, myRiichiForTenpai, userId, statusForTenpai, handForTenpai, meldsForTenpai, discardsForTenpai])

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

  // CPU対戦リセット処理（テスト用）
  const handleResetGame = React.useCallback(() => {
    if (!window.confirm('ゲームをリセットしますか？')) return
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resetGame' }))
      } else {
        showTelop('サーバーに接続されていません', 'error', 3000)
      }
    } catch (err) {
      showTelop(
        err instanceof Error ? err.message : 'リセットに失敗しました',
        'error', 4000
      )
    }
  }, [showTelop])

  // CPU追加処理
  const handleAddCPU = React.useCallback(async () => {
    if (isAddingCPU) return

    setIsAddingCPU(true)
    dismissTelop()

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
      showTelop(`${data.cpuName}が参加しました`, 'success', 3000)
    } catch (err) {
      showTelop(
        err instanceof Error
          ? err.message
          : 'CPU追加に失敗しました',
        'error', 4000
      )
    } finally {
      setIsAddingCPU(false)
    }
  }, [roomId, isAddingCPU, showTelop, dismissTelop])

  // 部屋削除処理
  const handleDeleteRoom = React.useCallback(() => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'deleteRoom' }))
        showTelop('部屋を削除しました', 'success', 2000)
      } else {
        showTelop('サーバーに接続されていません', 'error', 3000)
      }
    } catch (err) {
      showTelop(
        err instanceof Error
          ? err.message
          : '部屋削除に失敗しました',
        'error', 4000
      )
    }
  }, [showTelop])

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
      // deadlineから正確な残り時間を保存し、deadlineはクリア（visibilitychangeで同期しないよう）
      if (pendingPungDeadlineRef.current !== null) {
        pausedPendingPungTimeLeft.current = Math.max(1, Math.ceil((pendingPungDeadlineRef.current - Date.now()) / 1000));
        pendingPungDeadlineRef.current = null;
      } else {
        pausedPendingPungTimeLeft.current = pendingPungTimeLeft;
      }
      if (autoDiscardDeadlineRef.current !== null) {
        pausedAutoDiscardTimeLeft.current = Math.max(1, Math.ceil((autoDiscardDeadlineRef.current - Date.now()) / 1000));
        autoDiscardDeadlineRef.current = null;
      } else {
        pausedAutoDiscardTimeLeft.current = autoDiscardTimeLeft;
      }
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
      // 一時停止後の復帰時は残り秒数から、初回は全秒数から開始
      const initialTime = pausedPendingPungTimeLeft.current ?? autoActionTimerSeconds;
      pausedPendingPungTimeLeft.current = null;
      const deadline = Date.now() + initialTime * 1000;
      pendingPungDeadlineRef.current = deadline;
      setPendingPungTimeLeft(initialTime);

      // 残り時間をdeadlineベースで計算（200ms間隔でタブ復帰時に即座正確表示）
      const interval = window.setInterval(() => {
        const remaining = Math.ceil((deadline - Date.now()) / 1000);
        setPendingPungTimeLeft(remaining > 0 ? remaining : null);
      }, 200);

      pendingPungIntervalRef.current = interval;

      const timer = setTimeout(() => {
        // Auto-draw after N seconds of pung waiting
        console.log('⏱️ Auto-drawing after pending pung timeout');
        sendAction({ type: 'draw' });
        setPendingPungTimeLeft(null);
        pendingPungDeadlineRef.current = null;
      }, initialTime * 1000);

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

    // Auto-discard if auto-draw mode is enabled and we have a drawn tile (or post-pon state)
    if (autoDrawMode && isYourTurn && canDiscard) {
      // ポン後（drawnTileIndex < 0）でも自動打牌対象
      const autoDiscardTile = drawnTileIndex >= 0 ? fullHand[drawnTileIndex] : fullHand[fullHand.length - 1];
      setAutoDiscardTimeLeft(null); // No countdown in auto mode
      if (autoDiscardIntervalRef.current !== null) {
        clearInterval(autoDiscardIntervalRef.current);
        autoDiscardIntervalRef.current = null;
      }
      const autoDiscardKey = autoDiscardTile ? `${getTileId(autoDiscardTile)}_${drawnTileIndex}_${fullHand.length}` : null;
      if (autoDiscardKey && autoDiscardKeyRef.current !== autoDiscardKey) {
        if (autoDiscardTimeoutRef.current !== null) {
          clearTimeout(autoDiscardTimeoutRef.current);
        }
        autoDiscardKeyRef.current = autoDiscardKey;
        autoDiscardTimeoutRef.current = window.setTimeout(() => {
          if (autoDiscardTile) {
            sendAction({ type: 'discard', tileId: getTileId(autoDiscardTile) });
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
    // ポン後（drawnTileIndex < 0）でもタイマーを発動させる
    // リーチ中カン可能な場合はタイマーを発動しない（プレイヤーの操作を待つ）
    const isRiichiLocal = gameState.riichi?.[userId] === true;
    const hasRiichiAnkanPossibility = (() => {
      if (!isRiichiLocal || drawnTileIndex < 0) return false;
      // 手牌に4枚同種がある場合はリーチ後暗槓の可能性がある
      const counts: Record<string, number> = {};
      fullHand.forEach(t => {
        const key = `${t.suit}-${t.number}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.values(counts).some(c => c >= 4);
    })();
    if (!autoDrawMode && canDiscard && !hasRiichiAnkanPossibility && (drawnTileIndex >= 0 || (isYourTurn && fullHand.length % 3 === 2 && drawnTileIndex < 0))) {
      // 一時停止後の復帰時は残り秒数から、初回は全秒数から開始
      const initialDiscard = pausedAutoDiscardTimeLeft.current ?? autoActionTimerSeconds;
      pausedAutoDiscardTimeLeft.current = null;
      const deadline = Date.now() + initialDiscard * 1000;
      autoDiscardDeadlineRef.current = deadline;
      setAutoDiscardTimeLeft(initialDiscard);

      // 残り時間をdeadlineベースで計算（200ms间隔でタブ復帰時に即座正確表示）
      const interval = window.setInterval(() => {
        const remaining = Math.ceil((deadline - Date.now()) / 1000);
        setAutoDiscardTimeLeft(remaining > 0 ? remaining : null);
      }, 200);

      autoDiscardIntervalRef.current = interval;

      const timer = setTimeout(() => {
        // 予約選択中の牌があればそれを打牌、なければツモ切り
        const preSelectedIdx = selectedTileIndexRef.current;
        const isConfirmMode = confirmDiscardModeRef.current;
        let discardTile;
        if (isConfirmMode && preSelectedIdx !== null && fullHand[preSelectedIdx]) {
          discardTile = fullHand[preSelectedIdx];
          console.log(`⏱️ Auto-discard: using pre-selected tile index ${preSelectedIdx}`);
        } else {
          discardTile = drawnTileIndex >= 0 ? fullHand[drawnTileIndex] : fullHand[fullHand.length - 1];
        }
        if (discardTile) {
          sendAction({ type: 'discard', tileId: getTileId(discardTile) });
        }
        setSelectedTileIndex(null);
        setAutoDiscardTimeLeft(null);
        autoDiscardDeadlineRef.current = null;
      }, initialDiscard * 1000);

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

  // ドラ判定: dora.tiles に含まれる牌か、または赤ドラ (isRed) であれば true
  // ※ フックのルール上、条件分岐(early return)より前に定義する必要がある
  const doraTilesSet: Set<string> = React.useMemo(() => {
    const set = new Set<string>()
    const doraTiles = gameState?.dora?.tiles ?? []
    for (const t of doraTiles) {
      set.add(`${t.suit}_${t.number}`)
    }
    return set
  }, [gameState?.dora?.tiles])

  const checkIsDora = React.useCallback((tile: Tile): boolean => {
    if (tile.isRed) return true
    return doraTilesSet.has(`${tile.suit}_${tile.number}`)
  }, [doraTilesSet])

  if (!gameState) {
    const debugLogs = JSON.parse(localStorage.getItem('debugLogs') || '[]')
    const lastLog = debugLogs[debugLogs.length - 1]?.message || 'No logs yet'

    return (
      <div className="fixed inset-0 flex justify-center items-center overflow-hidden bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] p-5">
        <div className="bg-[#2d5016] border-4 border-white shadow-xl p-10 w-full max-w-2xl">
          <div className="p-5 text-center">
            <p className="text-lg mb-5">ゲームに接続中...</p>
            <div className="mb-4 text-sm font-bold text-green-600">
              最新イベント: {lastLog}
            </div>
            <div className="text-left text-gray-600 text-xs bg-gray-100 p-2 rounded mb-2 font-mono max-h-48 overflow-auto">
              <div><strong>プレイヤー:</strong> {playerName}</div>
              <div><strong>ルーム:</strong> {roomId}</div>
              <div><strong>エラー:</strong> {'(テロップ表示)'}</div>
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

  // 見学者の場合は最初のプレイヤーの視点で表示
  const effectiveUserId = isSpectator ? (gameState.players?.[0]?.userId ?? '') : userId
  // 見学者の場合の「相手プレイヤー」 = 2番目のプレイヤー
  const displayOtherPlayer = isSpectator
    ? gameState.players?.find(p => p.userId !== effectiveUserId)
    : otherPlayer

  const isYourTurn = gameState.currentTurn === (isSpectator ? '' : userId)
  // 遅延観戦モードでは effectiveUserId のターン時にもツモ牌インデックスを取得してツモ牌を右端に分離表示する
  const isEffectiveUserTurn = isDelayedSpectator
    ? gameState.currentTurn === effectiveUserId
    : isYourTurn
  const drawnTileIndex = isEffectiveUserTurn
    ? (gameState.tiles?.[effectiveUserId]?.drawnTileIndex ?? -1)
    : -1
  const fullHand = (gameState.tiles?.[effectiveUserId]?.hand as Tile[]) || []
  const displayHandIndices = fullHand
    .map((_, idx) => idx)
    .filter((idx) => !(isEffectiveUserTurn && drawnTileIndex >= 0 && idx === drawnTileIndex))

  const yourDiscards = ((gameState.discards?.[effectiveUserId] as Array<Tile | string>) || []).map(normalizeTile)
  const otherUserId = isSpectator
    ? (gameState.players?.find(p => p.userId !== effectiveUserId)?.userId)
    : otherPlayer?.userId
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

  // 相手のdrawnTileIndex（相手のターン時のみ有効）
  const isOpponentTurn = otherUserId ? gameState.currentTurn === otherUserId : false
  const otherDrawnTileIndex = isOpponentTurn
    ? (otherUserId ? (gameState.tiles?.[otherUserId]?.drawnTileIndex ?? -1) : -1)
    : -1

  // 透明手牌ルール: 相手の手牌で透明牌のインデックスを取得し、左側（透明）→右側（不透明）でソート
  const isTransparentHandRule = gameState.transparentHand === true
  const otherHandSorted: Array<{ tile: Tile; originalIdx: number; isTransparent: boolean }> = (() => {
    const transparentSet = new Set<number>(
      isTransparentHandRule && otherUserId
        ? ((gameState.tiles?.[otherUserId]?.transparentIndices as number[]) ?? [])
        : []
    )
    return otherHand
      .map((tile, idx) => ({
        tile,
        originalIdx: idx,
        isTransparent: transparentSet.has(idx),
      }))
      .filter(({ originalIdx }) => !(!isTransparentHandRule && otherDrawnTileIndex >= 0 && originalIdx === otherDrawnTileIndex))
  })()
  if (isTransparentHandRule) {
    otherHandSorted.sort((a, b) => {
      if (a.isTransparent && !b.isTransparent) return -1
      if (!a.isTransparent && b.isTransparent) return 1
      return 0
    })
  }

  // 透明手牌ルール: 自分の手牌で透明牌のインデックスを取得し、半透明表示
  const myTransparentSet = new Set<number>(
    isTransparentHandRule
      ? ((gameState.tiles?.[effectiveUserId]?.transparentIndices as number[]) ?? [])
      : []
  )

  const melds = ((gameState.tiles?.[effectiveUserId]?.melds as Array<Array<Tile | string>>) || [])
    .map((meld) => meld.map(normalizeTile))

  // カン(4枚)は構造上3枚分として数える（嶺上牌で1枚補充するため）
  const meldStructureTiles = melds.reduce((sum: number, m: Tile[]) => sum + Math.min(m.length, 3), 0)
  const totalTiles = fullHand.length + meldStructureTiles
  // Use backend's canWinFor flag for accurate win detection
  const canWin = isYourTurn && gameState.canWinFor === userId
  // 九種九牌の宣言可否（バックエンド判定を使用）
  const canKyuushu = isYourTurn && gameState.canKyuushuFor === userId
  const pendingPungFor = gameState.pendingPungFor
  const ronPossibleFor = gameState.ronPossibleFor
  const lastOpponentDiscard = otherDiscards.length > 0 ? otherDiscards[otherDiscards.length - 1] : null
  const isRiichi = gameState.riichi?.[effectiveUserId] === true
  const isNoMeldMode = gameState.noMeldMode?.[effectiveUserId] === true

  // 喰い替え禁止チェック: ポン直後に同種の牌は捨てられない
  const lastPonTile = gameState.lastPonTile ?? null
  const allowKuikae = gameState.allowKuikae ?? false
  const isKuikaeTile = (tile: Tile) =>
    !allowKuikae &&
    lastPonTile !== null &&
    tile.suit === lastPonTile.suit &&
    tile.number === lastPonTile.number
  const canPung = isYourTurn && pendingPungFor === userId && !!lastOpponentDiscard && !isRiichi && !isNoMeldMode && fullHand.filter(
    (tile) => tile.suit === lastOpponentDiscard.suit && tile.number === lastOpponentDiscard.number
  ).length >= 2
  const canRon = isYourTurn && ronPossibleFor === userId
  // ポン後で牌をまだ引いていない状態（fullHand.length % 3 === 2）では牌を引けない
  const canDraw = isYourTurn && drawnTileIndex < 0 && !canRon && !isRiichi && fullHand.length % 3 !== 2
  const showDiscardAssist = !isSpectator && gameState.discardAssistEnabled === true && gameState.status === 'playing' && isYourTurn && !isRiichi
  const assistTileIndex = showDiscardAssist ? discardAssistSuggestion?.tileIndex ?? null : null

  // Check if player can daiminkan (大明槓: 3 matching tiles + opponent's discard)
  const pendingDaiminkanFor = gameState.pendingDaiminkanFor
  const canDaiminkan = isYourTurn && pendingDaiminkanFor === userId && !!lastOpponentDiscard && !isRiichi && !isNoMeldMode

  // Check if player can kan (concealed or added)
  const canKan = (() => {
    // 大明槓は別ボタンで表示するのでここでは除外
    if (canDaiminkan) return false;
    if (!isYourTurn || isNoMeldMode || drawnTileIndex < 0) {
      return false;
    }

    // Group hand tiles by suit+number
    const tileGroups: Record<string, Tile[]> = {};
    fullHand.forEach((tile) => {
      const key = `${tile.suit}-${tile.number}`;
      if (!tileGroups[key]) tileGroups[key] = [];
      tileGroups[key].push(tile);
    });

    if (isRiichi) {
      // リーチ中は「待ちが変わらない暗槓」のみ許可
      for (const tiles of Object.values(tileGroups)) {
        if (tiles.length !== 4) continue;
        // ツモ牌を除いた13枚の手牌でリーチ時の待ちを取得
        const handWithoutDrawn = fullHand.filter((_, i) => i !== drawnTileIndex);
        const currentWaits = TenpaiChecker.getWinningTiles(handWithoutDrawn, melds);
        // 暗槓後の仮想手牌（4枚除去）と副露で待ちを取得
        const kanSuit = tiles[0].suit;
        const kanNumber = tiles[0].number;
        let removed = 0;
        const simulatedHand = fullHand.filter((t) => {
          if (t.suit === kanSuit && t.number === kanNumber && removed < 4) {
            removed++;
            return false;
          }
          return true;
        });
        const simulatedMelds = [...melds, tiles];
        const postKanWaits = TenpaiChecker.getWinningTiles(simulatedHand, simulatedMelds);
        // 待ちが同一かチェック
        const currentKeys = new Set(currentWaits.map((t) => `${t.suit}_${t.number}`));
        const postKeys = new Set(postKanWaits.map((t) => `${t.suit}_${t.number}`));
        const waitsSame =
          currentKeys.size === postKeys.size &&
          [...currentKeys].every((k) => postKeys.has(k));
        if (waitsSame) return true;
      }
      return false;
    }

    // Check for concealed kan (4 identical tiles in hand)
    // Check if any tile group has 4 identical tiles
    for (const tiles of Object.values(tileGroups)) {
      if (tiles.length === 4) {
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
  const concealedMeldIndicesForRiichi = new Set(gameState.tiles?.[effectiveUserId]?.concealedMeldIndices ?? [])
  const isMenzenForRiichi = melds.every((_: Tile[], idx: number) => concealedMeldIndicesForRiichi.has(idx))
  const canDeclareRiichi = !isSpectator && allTenpaiChecked && !isRiichi && isMenzenForRiichi && ((gameState?.scores?.[effectiveUserId] ?? 0) >= 1000) &&
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
    <div className={`fixed inset-0 flex flex-col items-center bg-gradient-to-br from-[#2d5016] to-[#1a2e0a] overflow-hidden sm:pt-1 ${isGrayscale ? 'grayscale' : ''}`}>
      {/* Player icon displayed in left margin when screen is wide enough */}
      {playerIcon && iconPanelWidth > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden"
          style={{ left: 8, width: iconPanelWidth, maxHeight: '80vh' }}
        >
          {!isSpectator ? (
            <button
              onClick={() => setShowIconPicker(true)}
              className="relative group focus:outline-none"
              title="クリックしてアイコンを変更"
              style={{ maxWidth: '100%', maxHeight: '80vh' }}
            >
              <img
                src={playerIcon}
                alt="アイコン"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                className="group-hover:opacity-70 transition-opacity"
              />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
                タップして変更
              </span>
            </button>
          ) : (
            <img
              src={playerIcon}
              alt="アイコン"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </div>
      )}
      {/* Opponent icon displayed in right margin when screen is wide enough */}
      {opponentIcon && showOpponentIcon && iconPanelWidth > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center overflow-hidden"
          style={{ right: 8, width: iconPanelWidth, maxHeight: '80vh' }}
        >
          <div className="relative">
            <img
              src={opponentIcon}
              alt="相手アイコン"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', filter: opponentDisconnected ? 'brightness(0.4)' : 'none', transition: 'filter 0.3s' }}
            />
            {opponentDisconnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg bg-black/60 px-3 py-1 rounded animate-pulse" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>通信待ち</span>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Toaster for opponent action display (top-center popup via toast.custom) */}
      <Toaster position="top-center" toastOptions={{ custom: { style: { padding: 0, background: 'transparent', boxShadow: 'none' } } }} />
      {/* Telop notification bar */}
      {activeTelop && (
        <div
          key={activeTelop.id}
          className="fixed bottom-0 left-0 right-0 flex items-center justify-center w-full whitespace-nowrap"
          style={{
            zIndex: 9999,
            padding: '10px 24px',
            fontWeight: 700,
            fontSize: '0.95rem',
            textAlign: 'center',
            boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
            animation: 'telopSlideUp 0.3s ease-out',
            borderTop: activeTelop.type === 'error' ? '2px solid #b91c1c'
              : activeTelop.type === 'success' ? '2px solid #15803d'
              : '2px solid #4ade80',
            background: activeTelop.type === 'error' ? 'rgba(220,38,38,0.92)'
              : activeTelop.type === 'success' ? 'rgba(22,163,74,0.92)'
              : 'rgba(26,46,10,0.93)',
            color: '#fff',
          }}
        >
          <span>{activeTelop.message}</span>
        </div>
      )}
      <div className="bg-[#2d5016] sm:border-2 border-white shadow-xl sm:p-2 w-full max-w-4xl flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="flex gap-2 justify-end">
          <div className="pl-2 text-xs text-white font-bold flex flex-col items-end gap-1">
            <div className='max-sm:hidden'>
              ルームID: {roomId}<br/>
              ステータス: {gameState.status}
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {isSpectator && !isDelayedSpectator && !delayedSpectatorWaiting && <span className="px-2 py-1 bg-yellow-500 text-black rounded font-bold">観戦中</span>}
              {(isDelayedSpectator || gameState?.isDelayedMode) && (
                <span className={`px-2 py-1 rounded font-bold text-xs ${delayedSpectatorWaiting ? 'bg-orange-500 text-white animate-pulse' : 'bg-purple-600 text-white'}`}>
                  {delayedSpectatorWaiting
                    ? (delayedCountdownSec !== null && delayedCountdownSec > 0
                        ? `⏳ 遅延観戦 あと${delayedCountdownSec}秒`
                        : `⏳ 遅延観戦 まもなく開始…`)
                    : `🕐 遅延観戦中（${Math.round(delayedModeDelayMs / 1000)}秒遅延）`
                  }
                </span>
              )}
              {isSpectator && spectatorHandsAllowed && !gameState?.isDelayedMode && gameState.status === 'playing' && (
                <button
                  onClick={() => setSpectatorShowHands(prev => !prev)}
                  className={`px-2 py-1 text-xs font-bold rounded border-none cursor-pointer transition-colors ${spectatorShowHands ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}
                >
                  {spectatorShowHands ? '手牌を隠す' : '手牌を見る'}
                </button>
              )}
              {/* 観戦者一覧ボタン（観戦者向け） */}
              {isSpectator && spectatorNames.length > 0 && (
                <div ref={spectatorListRef} className="relative">
                  <button
                    onClick={() => {
                      setShowSpectatorList(prev => !prev)
                      if (!showSpectatorList && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'requestSpectatorList' }))
                      }
                    }}
                    className="px-2 py-1 text-xs font-bold rounded border-none cursor-pointer transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    観戦者({spectatorNames.length}人)
                  </button>
                  {showSpectatorList && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-gray-800 text-white rounded shadow-lg border border-gray-600 min-w-[140px] max-h-48 overflow-y-auto">
                      {spectatorNames.map((s) => (
                        <div key={s.userId} className="px-3 py-1.5 text-xs border-b border-gray-700 last:border-b-0">
                          {s.spectatorName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isSpectator && opponentDisconnected && (
                <span className="text-red-400 animate-pulse">通信待ち</span>
              )}
              {/* 観戦者一覧ボタン（プレイヤー向け） */}
              {!isSpectator && gameState.spectatorCount !== undefined && gameState.spectatorCount > 0 && (
                <div ref={spectatorListRef} className="relative">
                  <button
                    onClick={() => {
                      setShowSpectatorList(prev => !prev)
                      // リスト表示時に最新の観戦者リストを取得
                      if (!showSpectatorList && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'requestSpectatorList' }))
                      }
                    }}
                    className="px-2 py-1 text-xs font-bold rounded border-none cursor-pointer transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    観戦者({gameState.spectatorCount}人)
                  </button>
                  {showSpectatorList && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-gray-800 text-white rounded shadow-lg border border-gray-600 min-w-[140px] max-h-48 overflow-y-auto">
                      {spectatorNames.length > 0 ? (
                        spectatorNames.map((s, i) => (
                          <div key={s.userId} className="px-3 py-1.5 text-xs border-b border-gray-700 last:border-b-0">
                            {s.spectatorName}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 text-xs text-gray-400">読み込み中...</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* 手牌を観戦者に公開ボタン（プレイヤー向け） */}
              {!isSpectator && gameState.spectatorCount !== undefined && gameState.spectatorCount > 0 && gameState.status === 'playing' && (
                <button
                  onClick={() => {
                    const newValue = !handRevealedToSpectators
                    setHandRevealedToSpectators(newValue)
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({
                        type: 'revealHandToSpectators',
                        payload: { revealed: newValue },
                      }))
                    }
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded border-none cursor-pointer transition-colors ${handRevealedToSpectators ? 'bg-green-600 text-white' : 'bg-gray-500 text-white hover:bg-gray-600'}`}
                >
                  {handRevealedToSpectators ? '手牌公開中' : '手牌非公開'}
                </button>
              )}
              {/* CPU対戦リセットボタン（テスト用・CPU対戦中のみ表示） */}
              {!isSpectator && otherPlayer?.isCPU && (gameState.status === 'playing' || gameState.status === 'finished' || gameState.status === 'gameOver') && (
                <button
                  onClick={handleResetGame}
                  className="px-2 py-1 text-[#ffffff] border-none rounded cursor-pointer font-bold text-xs transition-colors bg-purple-600 hover:bg-purple-700"
                >
                  リセット
                </button>
              )}
              {/* CPU追加ボタン（待機中のみ表示） */}
              {gameState.status === 'waiting' && gameState.players.length < 2 && (
                <button
                  onClick={handleAddCPU}
                  disabled={isAddingCPU}
                  className={`px-2 py-1 text-[#ffffff] border-none rounded cursor-pointer font-bold text-xs transition-colors ${isAddingCPU ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}`}
                >
                  {isAddingCPU ? 'CPU追加中...' : 'CPU追加'}
                </button>
              )}
              {/* 部屋強制削除ボタン（ホストのみ表示） */}
              {!isSpectator && userId && gameState.hostId === userId && (
                <button
                  onClick={() => {
                    if (window.confirm('部屋を削除しますか？全員がホーム画面に戻されます。')) {
                      handleDeleteRoom()
                    }
                  }}
                  disabled={isDeletingRoom}
                  className={`px-2 py-1 text-[#ffffff] border-none rounded cursor-pointer font-bold text-xs transition-colors ${isDeletingRoom ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {isDeletingRoom ? '削除中...' : '部屋削除'}
                </button>
              )}
              {/* 試合履歴ボタン */}
              <button
                onClick={() => setShowMatchHistory(true)}
                className="px-2 py-1 text-[#ffffff] border-none rounded cursor-pointer font-bold text-xs transition-colors bg-indigo-600 hover:bg-indigo-700"
              >
                履歴
              </button>
              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                className={`px-2 py-1 text-xs font-bold border-2 rounded cursor-pointer transition-all ${soundEnabled ? 'bg-blue-600 text-[#ffffff] border-blue-700' : 'bg-white text-blue-600 border-blue-600'}`}
              >
                効果音: {soundEnabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={onBack} className="px-2 py-1 bg-[#1a2e0a] border-2 rounded border-white text-xs text-[#ffffff] cursor-pointer transition-colors hover:bg-[#0f1a06]">
                戻る
              </button>
            </div>
          </div>
        </div>

        {/* Telop notifications are rendered as a fixed bar at the bottom */}

        {/* Game Content */}
        {(gameState.status === 'playing' || gameState.status === 'finished' || gameState.status === 'gameOver') ? (
          <div className="p-1 text-center bg-[#3d6b20] border-2 border-white rounded-none min-h-52 flex flex-col justify-center items-center">
            <p className={`max-sm:hidden text-lg font-bold ${isYourTurn ? 'text-green-300' : 'text-yellow-300'}`}>
              {(gameState.status === 'finished' || gameState.status === 'gameOver')
                ? 'ゲーム終了'
                : isSpectator
                  ? (() => {
                      const currentPlayer = gameState.players?.find(p => p.userId === gameState.currentTurn)
                      return currentPlayer ? `${currentPlayer.playerName}の番` : '観戦中'
                    })()
                  : (isYourTurn ? 'あなたの番です' : '相手の番です')
              }
            </p>

            {/* Game Info Center */}
            {/* Current Round */}
            <div className="sm:hidden w-full text-center p-2 bg-white rounded-lg border border-gray-300 flex-1 min-w-24 flex flex-col justify-center">
              <div className="text-xs font-bold text-green-900">
                ルームID: {roomId} /
                {getRoundLabel(gameState)} /
                自風 {getSeatWindLabel(gameState, effectiveUserId)} /
                残り {gameState.wall || 0}枚
                <div>
                  <span className="text-xs text-gray-600">{isSpectator ? (gameState.players?.find(p => p.userId === effectiveUserId)?.playerName ?? 'P1') : `あなた (${playerName})`} : </span>
                  <span className="text-green-600">
                    {((gameState?.scores?.[effectiveUserId]) ?? 25000)?.toLocaleString()}
                  </span>
                  /
                  <span className="text-xs text-gray-600">{isSpectator ? (displayOtherPlayer?.playerName ?? '---') : `相手 (${displayOtherPlayer?.playerName || '---'})`} : </span>
                  <span className="text-red-500">
                    {otherUserId ? ((gameState?.scores?.[otherUserId]) ?? 25000)?.toLocaleString() : '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent's Hand */}
            <div className="w-full mb-3 rounded-lg p-3 border-0">
              <div className="flex items-start gap-4 overflow-x-auto">
                {/* 副露（オープンの牌） */}
                <FuroDisplay
                  melds={otherMelds}
                  seatWindYou={gameState.seatWinds?.[effectiveUserId]}
                  seatWindOpponent={gameState.seatWinds?.[otherUserId ?? '']}
                  concealedMeldIndices={new Set(gameState.tiles?.[otherUserId ?? '']?.concealedMeldIndices ?? [])}
                  daiminkanMeldIndices={new Set(gameState.tiles?.[otherUserId ?? '']?.daiminkanMeldIndices ?? [])}
                  scale={tileScale}
                />

                {/* 手牌（裏向きまたは表示） */}
                <div className="flex gap-px flex-wrap">
                  {otherHandSorted.map(({ tile, originalIdx, isTransparent }) => (
                    <React.Fragment key={`other-hand-${originalIdx}`}>
                      {/* 手出し時の歯抜け表示: 該当位置に空きスペースを挿入 */}
                      {opponentTedashiGapIdx === originalIdx && (
                        <div
                          className="inline-block w-[33px] h-[47px]"
                        />
                      )}
                      <div className="inline-block">
                        <TileImage
                          tile={tile}
                          scale={tileScale}
                          faceDown={
                            isTransparentHandRule
                              ? !isTransparent
                              : (isSpectator
                                ? (!(spectatorHandsAllowed && spectatorShowHands) && !handRevealedMap[otherUserId ?? ''] && !gameState?.isDelayedMode)
                                : (!showOpponentHand || !displayOtherPlayer?.isCPU))
                          }
                        />
                      </div>
                    </React.Fragment>
                  ))}
                  {/* 手出し時の歯抜けが手牌末尾だった場合 */}
                  {opponentTedashiGapIdx >= 0 && opponentTedashiGapIdx >= otherHand.length && (
                    <div
                      className="inline-block w-[33px] h-[47px]"
                    />
                  )}
                  {/* ツモ牌を右端にスペースを開けて表示（透明手牌ルール時は適用しない） */}
                  {!isTransparentHandRule && otherDrawnTileIndex >= 0 && otherHand[otherDrawnTileIndex] && (
                    <div className="inline-block ml-4 sm:ml-8">
                      <TileImage
                        tile={otherHand[otherDrawnTileIndex]}
                        scale={tileScale}
                        faceDown={
                          isSpectator
                            ? (!(spectatorHandsAllowed && spectatorShowHands) && !handRevealedMap[otherUserId ?? ''] && !gameState?.isDelayedMode)
                            : (!showOpponentHand || !displayOtherPlayer?.isCPU)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Opponent's Discards (Kawa) */}
            <div className="w-full mb-3 flex gap-1 items-stretch">
              <div className={`${opponentIcon && showOpponentIcon ? 'w-3/4' : 'w-full'} rounded-lg p-1 border border-gray-300 min-h-28`}>
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
                            scale={opponentIcon && showOpponentIcon ? 0.75 : 1}
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
              {(() => {
                const isOtherRiichi = otherUserId && gameState.riichi && gameState.riichi[otherUserId];
                return isOtherRiichi ? (
                  <div className="w-full mt-2 flex items-center gap-2">
                    <img
                      src={getTileImageUrl('1000')}
                      alt="リーチ棒"
                      className="drop-shadow"
                    />
                  </div>
                ) : null;
              })()}
              </div>
              {opponentIcon && showOpponentIcon && (
                <div className="w-1/4 overflow-hidden rounded-lg border border-gray-300 relative" style={{ aspectRatio: '3 / 4' }}>
                  <img
                    src={opponentIcon}
                    alt="相手アイコン"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: opponentDisconnected ? 'brightness(0.4)' : 'none', transition: 'filter 0.3s' }}
                  />
                  {opponentDisconnected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-xs bg-black/60 px-2 py-0.5 rounded animate-pulse" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>通信待ち</span>
                    </div>
                  )}
                </div>
              )}
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
                  自風 {getSeatWindLabel(gameState, effectiveUserId)}
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
                    <div className="text-xs text-gray-600">{isSpectator ? (gameState.players?.find(p => p.userId === effectiveUserId)?.playerName ?? 'P1') : `あなた (${playerName})`}{isSpectator && handRevealedMap[effectiveUserId] && ' 👁️'}</div>
                    <div className="text-green-600">
                      {((gameState?.scores?.[effectiveUserId]) ?? 25000)?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">{isSpectator ? (displayOtherPlayer?.playerName ?? '---') : `相手 (${displayOtherPlayer?.playerName || '---'})`}{isSpectator && handRevealedMap[otherUserId ?? ''] && ' 👁️'}</div>
                    <div className="text-red-500">
                      {otherUserId ? ((gameState?.scores?.[otherUserId]) ?? 25000)?.toLocaleString() : '---'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dora and Kanning Wall */}
            <div className="w-full mb-1 sm:mb-3 flex justify-left items-center flex-wrap origin-top-left scale-[0.7] sm:scale-100 h-[35px] sm:h-auto">
              {/* Dora Indicator */}
              {gameState.dora && gameState.dora.indicators && gameState.dora.indicators.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex gap-px">
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
            <div className="w-full mb-3 flex gap-1 items-stretch">
              <div className={`${playerIcon && (!gameState?.isSpectatorView || showOpponentIcon) ? 'w-3/4' : 'w-full'} rounded-lg p-1 border border-gray-300 min-h-28`}>
              {/* 自分のリーチ棒表示 */}
              {(() => {
                const isPlayerRiichi = gameState.riichi && gameState.riichi[effectiveUserId];
                return isPlayerRiichi ? (
                  <div className="mb-2 flex items-center gap-2">
                    <img
                      src={getTileImageUrl('1000')}
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
                      const isRiichiDiscard = gameState.riichiDiscards?.[effectiveUserId] === idx;
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
                            scale={playerIcon ? 0.75 : 1}
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
              {playerIcon && (!gameState?.isSpectatorView || showOpponentIcon) && (
                !isSpectator ? (
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="w-1/4 overflow-hidden rounded-lg border border-gray-300 relative group focus:outline-none"
                    style={{ aspectRatio: '3 / 4' }}
                    title="クリックしてアイコンを変更"
                  >
                    <img
                      src={playerIcon}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      className="group-hover:opacity-70 transition-opacity"
                    />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">変更</span>
                    </span>
                  </button>
                ) : (
                  <div className="w-1/4 overflow-hidden rounded-lg border border-gray-300" style={{ aspectRatio: '3 / 4' }}>
                    <img
                      src={playerIcon}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )
              )}
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
      <div className="w-full max-w-4xl p-2 border-white bg-[#2d5016] sm:min-h-[168px] flex flex-col shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {showDiscardAssist && (
          <div className="w-full mb-1 px-3 py-1 rounded border border-sky-500 bg-sky-950/50 text-sky-200 text-xs font-bold">
            打牌アシスト: 青い枠がCPU推奨の打牌です
          </div>
        )}
        {/* Fixed tenpai panel - for confirm discard mode / mobile */}
        {confirmDiscardMode && selectedTileIndex !== null && gameState.status === 'playing' && (() => {
          const info = tenpaiInfoMap[selectedTileIndex];
          const isPreSelect = !isYourTurn;
          return (
            <div className={`w-full mt-1 mb-1 ${isPreSelect ? 'bg-[#0a1a2e]/80 border-blue-700' : 'bg-[#1a2e0a]/80 border-green-700'} border rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap`}>
              {info?.isTenpai && info.winningTiles.length > 0 ? (
                <>
                  <div className="text-white text-xs font-bold whitespace-nowrap">待ち:</div>
                  {info.isFuriten && (
                    <div className="text-red-300 text-xs font-bold whitespace-nowrap bg-red-900/70 px-1.5 py-0.5 rounded border border-red-500/50">フリテン</div>
                  )}
                  <div className="flex gap-0.5 flex-row flex-wrap items-center">
                    {info.winningTiles.slice(0, 12).map((tile: any, tIdx: number) => (
                      <TileInline key={tIdx} tile={tile} height={40} width={28} className="rounded shadow-sm" />
                    ))}
                    {info.winningTiles.length > 12 && (
                      <div className="text-white text-xs ml-1">+{info.winningTiles.length - 12}</div>
                    )}
                  </div>
                  <div className="text-yellow-300 text-xs font-bold ml-auto whitespace-nowrap">
                    {isPreSelect ? '予約選択中（ツモ切りタイマーで自動打牌）' : riichiMode ? 'もう一度タップでリーチ' : 'もう一度タップで打牌'}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-xs">
                  {isPreSelect ? '予約選択中（ツモ切りタイマーで自動打牌）' : riichiMode ? '聴牌なし' : '聴牌なし（もう一度タップで打牌）'}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex flex-row gap-4 items-start">
          {/* Hand tiles section */}
          <div className="flex gap-3 flex-1 flex-wrap content-start justify-start">
            {gameState.tiles && gameState.tiles[effectiveUserId]?.hand && gameState.tiles[effectiveUserId].hand.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-px">
                  {displayHandIndices.map((idx: number) => (
                    <div
                      key={idx}
                      className={`relative cursor-pointer transition-transform ${selectedTileIndex === idx ? 'ring-2 ring-yellow-400 rounded-sm -translate-y-1' : ''} ${selectedTileIndex !== idx && assistTileIndex === idx ? 'ring-2 ring-sky-400 rounded-sm' : ''} ${riichiMode && !tenpaiInfoMap[idx]?.isTenpai ? 'opacity-30 grayscale' : isKuikaeTile(fullHand[idx]) ? 'opacity-30 grayscale' : (isTransparentHandRule && isSpectator) ? 'opacity-90' : myTransparentSet.has(idx) ? 'opacity-50' : `${idx === drawnTileIndex ? 'opacity-100' : 'opacity-90'}`}`}
                    >
                      <TileImage
                        tile={fullHand[idx]}
                        scale={tileScale}
                        faceDown={
                          isTransparentHandRule && isSpectator
                            ? !myTransparentSet.has(idx)
                            : (isSpectator && !(spectatorHandsAllowed && spectatorShowHands) && !handRevealedMap[effectiveUserId] && !gameState?.isDelayedMode)
                        }
                        isDora={checkIsDora(fullHand[idx])}
                        onClick={() => {
                          // リーチ中は手牌をクリックできない
                          if (isRiichi) {
                            return;
                          }
                          // 打牌確認モード: 自分のターン以外でも予約選択可能
                          if (confirmDiscardMode && !isYourTurn && gameState.status === 'playing') {
                            if (selectedTileIndex === idx) {
                              // 同じ牌をタップ → 選択解除（打牌タイミング外なので打牌はしない）
                              setSelectedTileIndex(null);
                              setTenpaiInfo(null);
                            } else {
                              // 予約選択
                              setSelectedTileIndex(idx);
                              const cached = tenpaiInfoMap[idx];
                              if (cached) {
                                setTenpaiInfo(cached);
                              } else {
                                checkTenpai(idx);
                              }
                            }
                            return;
                          }
                          if (isYourTurn && gameState.status === 'playing') {
                            // ポン・カン・ロンの選択待ち中は打牌を禁止（小牌防止）
                            if (pendingPungFor === userId || ronPossibleFor === userId) {
                              return;
                            }
                            // 喰い替え禁止: ポン直後は同種の牌を捨てられない
                            if (isKuikaeTile(fullHand[idx])) {
                              return;
                            }
                            // リーチモードONの場合、聴牌形になる牌のみクリック可能
                            if (riichiMode) {
                              const canDiscardForRiichi = tenpaiInfoMap[idx]?.isTenpai
                              if (!canDiscardForRiichi) {
                                return; // グレーアウトされた牌はクリックできない
                              }
                              // 打牌確認モード中は2タップでリーチ宣言
                              if (confirmDiscardMode) {
                                if (selectedTileIndex === idx) {
                                  // 2タップ目 - リーチ宣言実行
                                  const tileToRiichi = fullHand[idx];
                                  console.log(`🔴 [Riichi] Selected tile index: ${idx}, Tile: ${tileToRiichi?.toString()}, TileID: ${getTileId(tileToRiichi)}`);
                                  sendAction({
                                    type: 'riichi',
                                    tileId: getTileId(tileToRiichi)
                                  });
                                  setRiichiMode(false);
                                  setSelectedTileIndex(null);
                                  setTenpaiInfo(null);
                                } else {
                                  // 1タップ目 - 選択して聴牌情報を表示
                                  setSelectedTileIndex(idx);
                                  const cached = tenpaiInfoMap[idx];
                                  if (cached) {
                                    setTenpaiInfo(cached);
                                  } else {
                                    checkTenpai(idx);
                                  }
                                }
                                return;
                              }
                              // 通常モード - 1タップでリーチ宣言
                              const tileToRiichi = fullHand[idx];
                              console.log(`🔴 [Riichi] Selected tile index: ${idx}, Tile: ${tileToRiichi?.toString()}, TileID: ${getTileId(tileToRiichi)}`);
                              sendAction({
                                type: 'riichi',
                                tileId: getTileId(tileToRiichi)
                              });
                              setRiichiMode(false); // リーチモード解除
                              return;
                            }
                            // 打牌確認モード: 1タップ目で選択、2タップ目で打牌
                            if (confirmDiscardMode) {
                              if (selectedTileIndex === idx) {
                                // 2タップ目 - 打牌実行
                                const tileToDiscard = fullHand[idx];
                                sendAction({ type: 'discard', tileId: getTileId(tileToDiscard) });
                                setSelectedTileIndex(null);
                                setTenpaiInfo(null);
                              } else {
                                // 1タップ目 - 選択して聴牌情報を表示
                                setSelectedTileIndex(idx);
                                const cached = tenpaiInfoMap[idx];
                                if (cached) {
                                  setTenpaiInfo(cached);
                                } else {
                                  checkTenpai(idx);
                                }
                              }
                              return;
                            }
                            // 通常の捨て牌（1タップ打牌）
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
                      {!confirmDiscardMode && hoveredTileIndex === idx && tenpaiInfo?.isTenpai && tenpaiInfo.winningTiles.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-green-600/95 px-3 py-2.5 rounded-lg mb-2.5 whitespace-nowrap z-[1000] shadow-lg pointer-events-none flex flex-col items-center gap-1.5">
                          <div className="text-white text-xs font-bold mb-0.5 flex items-center gap-1">
                            聴牌
                            {tenpaiInfo.isFuriten && <span className="text-red-300 text-[10px] font-bold bg-red-900/70 px-1 rounded border border-red-500/50">フリテン</span>}
                          </div>
                          <div className="flex gap-0.5 flex-row flex-nowrap justify-center items-center">
                            {tenpaiInfo.winningTiles.slice(0, 8).map((tile, tIdx) => (
                              <TileInline key={tIdx} tile={tile} height={31} width={22} className="rounded shadow-sm" />
                            ))}
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
                  {isEffectiveUserTurn && drawnTileIndex >= 0 && fullHand[drawnTileIndex] && (
                    <div className={`relative ml-4 sm:ml-8 transition-transform ${selectedTileIndex === drawnTileIndex ? 'ring-2 ring-yellow-400 rounded-sm -translate-y-1' : ''} ${selectedTileIndex !== drawnTileIndex && assistTileIndex === drawnTileIndex ? 'ring-2 ring-sky-400 rounded-sm' : ''} ${riichiMode && !tenpaiInfoMap[drawnTileIndex]?.isTenpai ? 'opacity-30 grayscale' : myTransparentSet.has(drawnTileIndex) ? 'opacity-50' : ''}`}>
                      <TileImage
                        tile={fullHand[drawnTileIndex]}
                        scale={tileScale}
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
                              // 打牌確認モード中は2タップでリーチ宣言
                              if (confirmDiscardMode) {
                                if (selectedTileIndex === drawnTileIndex) {
                                  // 2タップ目 - リーチ宣言実行
                                  const tileToRiichi = fullHand[drawnTileIndex];
                                  console.log(`🔴 [Riichi] Selected drawn tile index: ${drawnTileIndex}, Tile: ${tileToRiichi?.toString()}, TileID: ${getTileId(tileToRiichi)}`);
                                  sendAction({
                                    type: 'riichi',
                                    tileId: getTileId(tileToRiichi)
                                  });
                                  setRiichiMode(false);
                                  setSelectedTileIndex(null);
                                  setTenpaiInfo(null);
                                } else {
                                  // 1タップ目 - 選択して聴牌情報を表示
                                  setSelectedTileIndex(drawnTileIndex);
                                  const cached = tenpaiInfoMap[drawnTileIndex];
                                  if (cached) {
                                    setTenpaiInfo(cached);
                                  } else {
                                    checkTenpai(drawnTileIndex);
                                  }
                                }
                                return;
                              }
                              // 通常モード - 1タップでリーチ宣言
                              const tileToRiichi = fullHand[drawnTileIndex];
                              console.log(`🔴 [Riichi] Selected drawn tile index: ${drawnTileIndex}, Tile: ${tileToRiichi?.toString()}, TileID: ${getTileId(tileToRiichi)}`);
                              sendAction({
                                type: 'riichi',
                                tileId: getTileId(tileToRiichi)
                              });
                              setRiichiMode(false);
                              return;
                            }
                            // 打牌確認モード: 1タップ目で選択、2タップ目で打牌
                            if (confirmDiscardMode) {
                              if (selectedTileIndex === drawnTileIndex) {
                                // 2タップ目 - 打牌実行
                                sendAction({ type: 'discard', tileId: getTileId(fullHand[drawnTileIndex]) });
                                setSelectedTileIndex(null);
                                setTenpaiInfo(null);
                              } else {
                                // 1タップ目 - 選択して聴牌情報を表示
                                setSelectedTileIndex(drawnTileIndex);
                                const cached = tenpaiInfoMap[drawnTileIndex];
                                if (cached) {
                                  setTenpaiInfo(cached);
                                } else {
                                  checkTenpai(drawnTileIndex);
                                }
                              }
                              return;
                            }
                            // 通常の捨て牌（1タップ打牌）
                            sendAction({
                              type: 'discard',
                              tileId: getTileId(fullHand[drawnTileIndex])
                            });
                          }
                        }}
                        onMouseEnter={() => {
                          // リーチ中は聴牌チェックしない
                          if (isRiichi) {
                            return;
                          }
                          if (isYourTurn && gameState.status === 'playing') {
                            setHoveredTileIndex(drawnTileIndex);
                            // キャッシュから聴牌情報を取得
                            const cached = tenpaiInfoMap[drawnTileIndex];
                            if (cached) {
                              setTenpaiInfo(cached);
                            } else {
                              // キャッシュがない場合のみローカル計算
                              checkTenpai(drawnTileIndex);
                            }
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredTileIndex(null);
                          setTenpaiInfo(null);
                        }}
                        isDrawn={true}
                        isDora={checkIsDora(fullHand[drawnTileIndex])}
                      />
                      {/* Tenpai popup for drawn tile */}
                      {hoveredTileIndex === drawnTileIndex && tenpaiInfo?.isTenpai && tenpaiInfo.winningTiles.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-green-600/95 px-3 py-2.5 rounded-lg mb-2.5 whitespace-nowrap z-[1000] shadow-lg pointer-events-none flex flex-col items-center gap-1.5">
                          <div className="text-white text-xs font-bold mb-0.5 flex items-center gap-1">
                            聴牌
                            {tenpaiInfo.isFuriten && <span className="text-red-300 text-[10px] font-bold bg-red-900/70 px-1 rounded border border-red-500/50">フリテン</span>}
                          </div>
                          <div className="flex gap-0.5 flex-row flex-nowrap justify-center items-center">
                            {tenpaiInfo.winningTiles.slice(0, 8).map((tile, tIdx) => (
                              <TileInline key={tIdx} tile={tile} height={31} width={22} className="rounded shadow-sm" />
                            ))}
                            {tenpaiInfo.winningTiles.length > 8 && (
                              <div className="text-white text-[10px] ml-1">
                                +{tenpaiInfo.winningTiles.length - 8}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
              seatWindYou={gameState.seatWinds?.[effectiveUserId]}
              seatWindOpponent={gameState.seatWinds?.[otherUserId ?? '']}
              concealedMeldIndices={new Set(gameState.tiles?.[effectiveUserId]?.concealedMeldIndices ?? [])}
              daiminkanMeldIndices={new Set(gameState.tiles?.[effectiveUserId]?.daiminkanMeldIndices ?? [])}
              scale={tileScale}
            />
          </div>
        </div>

        {/* Action buttons & settings - pushed to bottom (hidden in spectator mode) */}
        {!isSpectator && (
        <div className="mt-auto">
        {/* Action buttons section - compact vertical layout */}
          <div className='w-full flex gap-8 justify-end'>
            {/* Fake button for placeholder */}
            <button disabled className="px-3 py-2 bg-transparent border-2 border-transparent text-xs font-bold rounded text-white cursor-not-allowed invisible">
              a
            </button>
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
            {canKyuushu && (
              <button
                onClick={() => setShowKyuushuConfirm(true)}
                className="px-3 py-2 bg-orange-600 text-[#ffffff] text-xs font-bold border-2 border-orange-700 rounded cursor-pointer transition-all hover:bg-orange-700"
              >
                九種九牌
              </button>
            )}
            {/* リーチボタン - トグル式 */}
            {canDeclareRiichi && (
              <button
                onClick={() => {
                  setRiichiMode(!riichiMode);
                }}
                className={`px-3 py-2 text-xs font-bold rounded text-white cursor-pointer transition-all ${riichiMode ? 'bg-green-600 border-2 border-green-700 shadow-lg' : 'bg-red-600 border-2 border-red-700'}`}
              >
                {riichiMode ? '待機' : 'リーチ'}
              </button>
            )}
            {/* リーチ中の表示 */}
            {gameState.riichi?.[userId] && (
              <div className="px-3 py-2 bg-red-100 border-2 border-red-500 rounded font-bold text-sm text-red-800 text-center shadow-md animate-pulse">
                リーチ中
              </div>
            )}
          </div>

        <div className="mt-1 flex grid grid-cols-4 gap-1 items-center justify-center flex-wrap">
          {(DEVELOPMENT_MODE || otherPlayer?.isCPU) && (
            <>
              <button
                onClick={() => toggleAutoPlayMode(!autoPlayMode)}
                className={`px-3 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoPlayMode ? 'bg-blue-600 text-[#ffffff] border-blue-700 animate-pulse' : 'bg-white text-blue-600 border-blue-600'}`}
              >
                自動: {autoPlayMode ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={toggleTextMode}
                className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${textMode ? 'bg-purple-600 text-[#ffffff] border-purple-700' : 'bg-white text-purple-600 border-purple-600'}`}
              >
                文字牌: {textMode ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowOpponentHand(!showOpponentHand)}
                className={`px-1 py-2 text-xs font-bold border-2 rounded transition-colors text-[#ffffff] ${showOpponentHand ? 'bg-green-600' : 'bg-yellow-500'}`}
              >
                {showOpponentHand ? '手牌を隠す' : '手牌を見る'}
              </button>
              <button
                onClick={() => setShowHandEditor(true)}
                disabled={gameState?.status !== 'playing'}
                className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${gameState?.status !== 'playing' ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed' : 'bg-white text-orange-600 border-orange-600 hover:bg-orange-50'}`}
              >
                手牌編集
              </button>
            </>
          )}
          {(DEVELOPMENT_MODE || otherPlayer?.isCPU) && (
            <button
              onClick={() => toggleAutoDrawMode(!autoDrawMode)}
              disabled={autoPlayMode}
              className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoPlayMode ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed' : autoDrawMode ? 'bg-green-700 text-[#ffffff] border-green-800' : 'bg-white text-green-700 border-green-700'}`}
            >
              ツモ切り: {autoDrawMode ? 'ON' : 'OFF'}
            </button>
          )}
          <button
            onClick={() => {
              const newScale = tileScale === 1 ? 0.75 : 1;
              setTileScale(newScale);
              try { localStorage.setItem('mahjong-tile-scale', String(newScale)); } catch (e) {}
            }}
            className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${tileScale === 0.75 ? 'bg-indigo-600 text-[#ffffff] border-indigo-700' : 'bg-white text-indigo-600 border-indigo-600'}`}
          >
            牌: {tileScale === 1 ? '大' : '小'}
          </button>
          <button
            onClick={() => toggleNoMeldMode(!noMeldMode)}
            disabled={autoPlayMode}
            className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${autoPlayMode ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed' : noMeldMode ? 'bg-red-600 text-[#ffffff] border-red-700' : 'bg-white text-red-600 border-red-600'}`}
          >
            鳴き無効: {noMeldMode ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => {
              const newVal = !confirmDiscardMode;
              setConfirmDiscardMode(newVal);
              setSelectedTileIndex(null);
              setTenpaiInfo(null);
              try {
                localStorage.setItem('mahjong-confirm-discard', String(newVal));
              } catch (e) {}
            }}
            className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${confirmDiscardMode ? 'bg-yellow-600 text-[#ffffff] border-yellow-700' : 'bg-white text-yellow-700 border-yellow-600'}`}
          >
            打牌確認: {confirmDiscardMode ? 'ON' : 'OFF'}
          </button>
          {gameState?.cheating?.cheatingEnabled && (
            <button
              onClick={() => setIsCheatPanelOpen(true)}
              className={`px-1 py-2 text-xs font-bold border-2 rounded cursor-pointer transition-all ${isCheatPanelOpen ? 'bg-yellow-500 text-black border-yellow-600' : 'bg-gray-800 text-yellow-400 border-yellow-500 hover:bg-gray-700'}`}
            >
              イカサマ
            </button>
          )}
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
        )}
      </div>

      {/* 九種九牌 確認ダイアログ */}
      {showKyuushuConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-xs w-full text-center">
            <div className="text-2xl font-bold text-orange-700 mb-2">九種九牌</div>
            <div className="text-sm text-gray-700 mb-4">
              九種九牌で流局しますか？<br />
              <span className="text-gray-500">（取り消せません）</span>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowKyuushuConfirm(false);
                  sendAction({ type: 'kyuushu' });
                }}
                className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all"
              >
                流局する
              </button>
              <button
                onClick={() => setShowKyuushuConfirm(false)}
                className="px-5 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-all"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Result Modal */}
      {/* Score Result Modal */}
      {(scoreResult && gameState) || (finalResults && showFinalResults) ? (
        <>
          {scoreResult && gameState && (
            <ScoreResultModal
              scoreResult={scoreResult}
              gameState={gameState}
              nextRoundReady={finalResults ? false : nextRoundReady}
              isSpectator={isSpectator}
              onLeave={isSpectator ? onBack : undefined}
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
              notenPenalty={notenPenalty}
              playerOrder={gameState?.players?.map((p) => p.userId) || []}
              playerNames={gameState?.players?.reduce((acc, p) => ({ ...acc, [p.userId]: p.playerName }), {}) || {}}
            />
          )}
          {/* Final Results Modal (Game Over) */}
          {finalResults && showFinalResults && (() => {
            const isRoomHost = !isSpectator && !!userId && gameState?.hostId === userId
            const humanPlayers = gameState?.players?.filter((p: any) => !p.isCPU) ?? []
            const totalRematchPlayers = humanPlayers.length || 1
            const humanReadyCount = rematchReadyUserIds.filter(uid =>
              humanPlayers.some((p: any) => p.userId === uid)
            ).length
            const myRematchReady = rematchReadyUserIds.includes(userId)
            return (
              <FinalResultModal
                finalResults={finalResults}
                gameState={gameState}
                onBack={onBack}
                isHost={isRoomHost}
                rematchReady={myRematchReady}
                rematchReadyCount={humanReadyCount}
                totalPlayers={totalRematchPlayers}
                onRematchReady={isSpectator ? undefined : () => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'rematch' }))
                    setRematchRequested(true)
                  }
                }}
                onStartRematch={isRoomHost ? () => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'startRematch' }))
                  }
                } : undefined}
                onDeleteRoom={isRoomHost ? () => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'deleteRoom' }))
                  }
                } : undefined}
              />
            )
          })()}
        </>
      ) : null}

      {/* Match History Modal */}
      {showMatchHistory && (
        <MatchHistoryModal
          roomId={roomId}
          onClose={() => setShowMatchHistory(false)}
        />
      )}

      {/* Hand Editor Modal (DEV only) */}
      {(DEVELOPMENT_MODE || otherPlayer?.isCPU) && showHandEditor && gameState?.tiles?.[userId] && (
        <HandEditorModal
          currentHand={(gameState.tiles[userId].hand || []).map((t: any) => normalizeTile(t))}
          currentMelds={((gameState.tiles[userId].melds || []) as Array<Array<Tile | string>>).map((m) => m.map((t) => normalizeTile(t)))}
          onApply={(tiles) => {
            sendAction({
              type: 'devEditHand',
              tiles: tiles.map(t => ({
                suit: t.suit,
                number: t.number,
                isRed: t.isRed || false,
              })),
            })
            showTelop('手牌を変更しました', 'success', 2000)
          }}
          onClose={() => setShowHandEditor(false)}
        />
      )}

      {showIconPicker && (
        <IconPickerModal
          activeIcon={playerIcon}
          onSelect={handleIconSelectInGame}
          onClose={() => setShowIconPicker(false)}
        />
      )}

      {/* イカサマパネル */}
      {gameState?.cheating?.cheatingEnabled && (
        <CheatPanel
          isOpen={isCheatPanelOpen}
          onClose={() => setIsCheatPanelOpen(false)}
          onCheat={(cheatType, params) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'cheat',
                payload: { cheatType, ...params },
              }))
            }
          }}
          onAccuse={() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'accuseCheat' }))
            }
          }}
          opponentActiveCheatCount={(() => {
            const cheating = gameState?.cheating
            if (!cheating?.activeCheatCounts) return 0
            const otherPlayer = gameState?.players?.find(p => p.userId !== userId)
            return otherPlayer ? (cheating.activeCheatCounts[otherPlayer.userId] || 0) : 0
          })()}
          myCheatCount={gameState?.cheating?.cheatExecutionCounts?.[userId ?? ''] ?? 0}
          myAccusationCount={gameState?.cheating?.accusationCounts?.[userId ?? ''] ?? 0}
          maxCheats={gameState?.cheating?.maxCheatsPerGame ?? 3}
          maxAccusations={gameState?.cheating?.maxAccusationsPerGame ?? 3}
          lastCheatResult={lastCheatResult}
          lastAccusationResult={lastAccusationResult}
          isPlaying={gameState?.status === 'playing'}
        />
      )}
    </div>
  )
}

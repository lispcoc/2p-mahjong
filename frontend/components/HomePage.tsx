'use client'

import React, { useEffect, useState } from 'react'
import { useWhiteMode } from '../contexts/WhiteModeContext'
import { YakuListModal } from './Modals/YakuListModal'
import { YakumanListModal } from './Modals/YakumanListModal'
import { IconPickerModal, loadIconLibrary } from './Modals/IconPickerModal'
import { prefetchFingerprint } from '../utils/fingerprint'

interface RulePreset {
  name: string
  initialScore: number
  wallTiles: number
  gameMode: string
  autoActionTimerSeconds: number
  useRedDora: boolean
  notenPenalty: boolean
  riichiDepositRequired: boolean
  aotenjou: boolean
  kiriagemangan: boolean
  dealerSelection: string
  ronMultiplier: number
  transparentHand: boolean
  cheatingEnabled: boolean
  discardAssistEnabled: boolean
}

const BASE_STANDARD_RULES: Omit<RulePreset, 'name'> = {
  initialScore: 25000,
  wallTiles: 44,
  gameMode: 'oneRound',
  autoActionTimerSeconds: 60,
  useRedDora: true,
  notenPenalty: false,
  riichiDepositRequired: true,
  aotenjou: false,
  kiriagemangan: true,
  dealerSelection: 'random',
  ronMultiplier: 1,
  transparentHand: false,
  cheatingEnabled: false,
  discardAssistEnabled: false,
}

const CUSTOM_PRESETS_KEY = 'mahjong-custom-presets'
const MAX_PRESETS = 5

const createDefaultPresets = (): RulePreset[] =>
  Array.from({ length: MAX_PRESETS }, (_, i) => ({
    ...BASE_STANDARD_RULES,
    name: `カスタム${i + 1}`,
  }))

const loadPresetsFromStorage = (): RulePreset[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_PRESETS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        const presets = parsed.slice(0, MAX_PRESETS).map((p: Partial<RulePreset>, i: number) => ({
          ...BASE_STANDARD_RULES,
          name: `カスタム${i + 1}`,
          ...p,
        }))
        while (presets.length < MAX_PRESETS) {
          presets.push({ ...BASE_STANDARD_RULES, name: `カスタム${presets.length + 1}` })
        }
        return presets
      }
    }
  } catch {}
  return createDefaultPresets()
}

const savePresetsToStorage = (presets: RulePreset[]) => {
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
  } catch (e) {
    console.error('Failed to save custom presets:', e)
  }
}

interface HomePageProps {
  playerName: string
  onCreateRoom: (roomId: string) => Promise<void>
  onJoinRoom: (roomId: string) => Promise<void>
  onSpectateRoom?: (roomId: string) => void
  onDelayedSpectateRoom?: (roomId: string) => void
  onLogout: () => void
  shouldRefresh?: boolean
  onRefreshed?: () => void
}

interface RoomInfo {
  roomId: string
  status: string
  playersCount: number
  playerNames: string[]
  playerIds?: string[]
  createdAt: number
  spectatorCount?: number
}

export default function HomePage({
  playerName,
  onCreateRoom,
  onJoinRoom,
  onSpectateRoom,
  onDelayedSpectateRoom,
  onLogout,
  shouldRefresh = false,
  onRefreshed,
}: HomePageProps) {
  const { whiteMode, toggleWhiteMode } = useWhiteMode()
  // 自分のuserId（localStorageから直接読み取り — SSR時は空文字）
  const [myUserId] = useState(() => {
    try { return (typeof window !== 'undefined' && localStorage.getItem('mahjong-userId')) || '' } catch { return '' }
  })
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
  const [notenPenalty, setNotenPenalty] = useState(savedSettings?.notenPenalty ?? true)
  const [riichiDepositRequired, setRiichiDepositRequired] = useState(savedSettings?.riichiDepositRequired ?? true)
  const [aotenjou, setAotenjou] = useState(savedSettings?.aotenjou ?? false)
  const [kiriagemangan, setKiriagemangan] = useState(savedSettings?.kiriagemangan !== false)
  const [dealerSelection, setDealerSelection] = useState(savedSettings?.dealerSelection ?? 'random')
  const [ronMultiplier, setRonMultiplier] = useState<number>(savedSettings?.ronMultiplier ?? 1)
  const [transparentHand, setTransparentHand] = useState(savedSettings?.transparentHand ?? false)
  const [cheatingEnabled, setCheatingEnabled] = useState(savedSettings?.cheatingEnabled ?? false)
  const [discardAssistEnabled, setDiscardAssistEnabled] = useState(savedSettings?.discardAssistEnabled ?? false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)
  const [isCustomPresetsOpen, setIsCustomPresetsOpen] = useState(false)
  const [isYakuModalOpen, setIsYakuModalOpen] = useState(false)
  const [isYakumanModalOpen, setIsYakumanModalOpen] = useState(false)
  const SHOW_OPPONENT_ICON_KEY = 'mahjong-show-opponent-icon'
  const [playerIcon, setPlayerIcon] = useState<string | null>(null)
  const [showOpponentIcon, setShowOpponentIcon] = useState(true)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [customPresets, setCustomPresets] = useState<RulePreset[]>(createDefaultPresets)
  const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null)
  const [presetName, setPresetName] = useState('')
  const [serverReady, setServerReady] = useState(false)
  const [wakeUpElapsedSeconds, setWakeUpElapsedSeconds] = useState(0)

  // ホームページ表示時にフィンガープリントをバックグラウンドで事前生成する
  // WebSocket接続より先に取得しておくことで、join時に即座に送信できる
  useEffect(() => {
    prefetchFingerprint()
  }, [])

  const fetchRooms = React.useCallback(async () => {
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
  }, [])

  // サーバー疎通確認: 5秒ごとにバックエンドへ通信し、成功したら停止
  // Render Free プランではコールドスタートに最大60秒かかるため経過時間も表示する
  useEffect(() => {
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null
    let elapsedTimer: ReturnType<typeof setInterval> | null = null
    const startTime = Date.now()

    const checkServer = async () => {
      const controller = new AbortController()
      // Render のコールドスタートは最大60秒かかるため十分長いタイムアウトを設定
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
        const res = await fetch(`${backendUrl}/api/rooms`, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (res.ok && !cancelled) {
          // レスポンスボディを確認して本当にバックエンドが正常稼働しているか検証
          // { rooms: [...] } 形式であることを確認する
          let data: { rooms?: unknown } | null = null
          try { data = await res.json() } catch { /* パース失敗は無視 */ }
          if (!data || !Array.isArray(data.rooms)) {
            // 想定外のレスポンス（プロキシや別サービスが返している可能性）→ 再試行
            if (!cancelled) timerId = setTimeout(checkServer, 5000)
            return
          }
          setRooms(data.rooms as RoomInfo[])
          if (elapsedTimer) clearInterval(elapsedTimer)
          setWakeUpElapsedSeconds(0)
          setServerReady(true)
          return // 成功したら停止
        }
      } catch {
        clearTimeout(timeoutId)
        // 通信失敗 → 再試行
      }
      if (!cancelled) {
        timerId = setTimeout(checkServer, 5000)
      }
    }

    // 起動中は1秒ごとに経過時間を更新してユーザーに進捗を示す
    elapsedTimer = setInterval(() => {
      if (cancelled) { clearInterval(elapsedTimer!); return }
      setWakeUpElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    checkServer()

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
      if (elapsedTimer) clearInterval(elapsedTimer)
    }
  }, []) // fetchRooms への依存不要（レスポンスを直接利用するため）

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mahjong-player-icon')
      if (saved) setPlayerIcon(saved)
    } catch {}
    try {
      const saved = localStorage.getItem(SHOW_OPPONENT_ICON_KEY)
      if (saved === 'false') setShowOpponentIcon(false)
    } catch {}
  }, [])

  const toggleShowOpponentIcon = () => {
    setShowOpponentIcon(prev => {
      const next = !prev
      try { localStorage.setItem(SHOW_OPPONENT_ICON_KEY, String(next)) } catch {}
      return next
    })
  }

  // カスタムプリセットをlocalStorageから読み込み
  useEffect(() => {
    setCustomPresets(loadPresetsFromStorage())
  }, [])

  const handleIconSelect = (icon: string | null) => {
    setPlayerIcon(icon)
  }

  useEffect(() => {
    // Refresh rooms list when returning from game
    if (shouldRefresh) {
      console.log('🔄 Refreshing room list...')
      fetchRooms()
      onRefreshed?.()
    }
  }, [shouldRefresh, onRefreshed, fetchRooms])

  const handleOpenCreateRoomModal = () => {
    setError('')
    setIsCreateMenuOpen(true)
  }

  const handleOpenCustomCreate = () => {
    setIsCreateMenuOpen(false)
    setEditingPresetIndex(null)
    setIsRuleModalOpen(true)
  }

  const handleCreateWithDefaults = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: defaultWallTiles,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: defaultAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: true,
          riichiDepositRequired: true,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
          discardAssistEnabled: false,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWithStandardRules = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: defaultWallTiles,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: maxAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: false,
          riichiDepositRequired: true,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
          discardAssistEnabled: false,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWithStandardRulesAssist = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: defaultWallTiles,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: maxAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: false,
          riichiDepositRequired: true,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
          discardAssistEnabled: true,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWithStandardRulesLong = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: 56,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: maxAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: false,
          riichiDepositRequired: true,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
          discardAssistEnabled: false,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWithStandardRulesLongAssist = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: 56,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: maxAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: false,
          riichiDepositRequired: true,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
          discardAssistEnabled: true,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWithQuickRules = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: defaultWallTiles,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: defaultAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: false,
          riichiDepositRequired: false,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
          discardAssistEnabled: false,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateWithQuickRulesLong = async () => {
    setIsCreateMenuOpen(false)
    setIsCreating(true)
    setError('')
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialScore: defaultInitialScore,
          wallTiles: defaultWallTiles,
          gameMode: 'oneRound',
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: maxAutoActionTimerSeconds,
          useRedDora: true,
          notenPenalty: false,
          riichiDepositRequired: false,
          aotenjou: false,
          kiriagemangan: true,
          dealerSelection: 'random',
          ronMultiplier: 1,
          transparentHand: false,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
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
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
          autoActionTimerSeconds: sanitizedAutoActionTimerSeconds,
          useRedDora: useRedDora,
          notenPenalty: notenPenalty,
          riichiDepositRequired: riichiDepositRequired,
          aotenjou: aotenjou,
          kiriagemangan: kiriagemangan,
          dealerSelection: dealerSelection,
          ronMultiplier: ronMultiplier,
          transparentHand: transparentHand,
          cheatingEnabled: cheatingEnabled,
          discardAssistEnabled: discardAssistEnabled,
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
          riichiDepositRequired,
          aotenjou,
          kiriagemangan,
          dealerSelection,
          ronMultiplier,
          transparentHand,
          cheatingEnabled,
          discardAssistEnabled,
        }))
      } catch (e) {
        console.error('Failed to save room settings:', e)
      }
      setIsRuleModalOpen(false)
      await onCreateRoom(data.roomId)
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
    if (editingPresetIndex !== null) {
      setPresetName(`カスタム${editingPresetIndex + 1}`)
      setInitialScore(BASE_STANDARD_RULES.initialScore)
      setWallTiles(BASE_STANDARD_RULES.wallTiles)
      setGameMode(BASE_STANDARD_RULES.gameMode)
      setAutoActionTimerSeconds(BASE_STANDARD_RULES.autoActionTimerSeconds)
      setUseRedDora(BASE_STANDARD_RULES.useRedDora)
      setNotenPenalty(BASE_STANDARD_RULES.notenPenalty)
      setRiichiDepositRequired(BASE_STANDARD_RULES.riichiDepositRequired)
      setAotenjou(BASE_STANDARD_RULES.aotenjou)
      setKiriagemangan(BASE_STANDARD_RULES.kiriagemangan)
      setDealerSelection(BASE_STANDARD_RULES.dealerSelection)
      setRonMultiplier(BASE_STANDARD_RULES.ronMultiplier)
      setTransparentHand(BASE_STANDARD_RULES.transparentHand)
      setCheatingEnabled(BASE_STANDARD_RULES.cheatingEnabled)
      setDiscardAssistEnabled(BASE_STANDARD_RULES.discardAssistEnabled)
    } else {
      setInitialScore(defaultInitialScore)
      setWallTiles(defaultWallTiles)
      setGameMode('oneRound')
      setMyTsumoLuck(0)
      setOpponentTsumoLuck(0)
      setAutoActionTimerSeconds(defaultAutoActionTimerSeconds)
      setUseRedDora(true)
      setNotenPenalty(false)
      setRiichiDepositRequired(true)
      setAotenjou(false)
      setKiriagemangan(true)
      setDealerSelection('random')
      setRonMultiplier(1)
      setTransparentHand(false)
      setCheatingEnabled(false)
      setDiscardAssistEnabled(false)
    }
  }

  const handleCancelCreateRoom = () => {
    setIsRuleModalOpen(false)
    if (editingPresetIndex !== null) {
      setEditingPresetIndex(null)
      setIsCustomPresetsOpen(true)
    } else {
      setEditingPresetIndex(null)
    }
  }

  const handleEditPreset = (index: number) => {
    const preset = customPresets[index]
    setEditingPresetIndex(index)
    setPresetName(preset.name)
    setInitialScore(preset.initialScore)
    setWallTiles(preset.wallTiles)
    setGameMode(preset.gameMode)
    setAutoActionTimerSeconds(preset.autoActionTimerSeconds)
    setUseRedDora(preset.useRedDora)
    setNotenPenalty(preset.notenPenalty)
    setRiichiDepositRequired(preset.riichiDepositRequired)
    setAotenjou(preset.aotenjou)
    setKiriagemangan(preset.kiriagemangan)
    setDealerSelection(preset.dealerSelection)
    setRonMultiplier(preset.ronMultiplier)
    setTransparentHand(preset.transparentHand)
    setCheatingEnabled(preset.cheatingEnabled)
    setDiscardAssistEnabled(preset.discardAssistEnabled)
    setError('')
    setIsRuleModalOpen(true)
  }

  const handleSavePreset = () => {
    if (editingPresetIndex === null) return
    const updatedPresets = [...customPresets]
    updatedPresets[editingPresetIndex] = {
      name: presetName.trim() || `カスタム${editingPresetIndex + 1}`,
      initialScore: sanitizeInitialScore(initialScore),
      wallTiles: clampWallTiles(wallTiles),
      gameMode,
      autoActionTimerSeconds: clampAutoActionTimerSeconds(autoActionTimerSeconds),
      useRedDora,
      notenPenalty,
      riichiDepositRequired,
      aotenjou,
      kiriagemangan,
      dealerSelection,
      ronMultiplier,
      transparentHand,
      cheatingEnabled,
      discardAssistEnabled,
    }
    setCustomPresets(updatedPresets)
    savePresetsToStorage(updatedPresets)
    setIsRuleModalOpen(false)
    setEditingPresetIndex(null)
    setIsCustomPresetsOpen(true)
  }

  const handleCreateFromPreset = async (index: number) => {
    const preset = customPresets[index]
    setIsCreating(true)
    setError('')
    try {
      const { name: _name, ...ruleSettings } = preset
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleSettings,
          myTsumoLuck: 0,
          opponentTsumoLuck: 0,
        }),
      })
      if (!response.ok) throw new Error('ルーム作成に失敗しました')
      const data = await response.json()
      sessionStorage.setItem('mahjong-myTsumoLuck', '0')
      sessionStorage.setItem('mahjong-opponentTsumoLuck', '0')
      await onCreateRoom(data.roomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました')
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL_HTTP || 'http://localhost:3001'
      const response = await fetch(
        `${backendUrl}/api/rooms/${trimmedRoomId}`
      )

      if (!response.ok) {
        throw new Error('ルームが見つかりません')
      }

      await onJoinRoom(trimmedRoomId)
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
    await onJoinRoom(roomId)
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
    <div className="sm:p-2 flex justify-center sm:items-center h-[100vh] h-[100dvh] overflow-hidden bg-gradient-to-br from-[#2d5016] to-[#1a2e0a]">
      <div className="bg-[#2d5016] sm:border-2 border-white shadow-xl p-2 w-full max-w-xl overflow-y-auto max-h-[100dvh] rounded">
        <div className="flex justify-between items-center mb-4 pb-5 border-b-2 border-gray-300">
          <h1 className="text-3xl text-[#ffffff] font-bold m-0">二人麻雀</h1>
          <div className="flex grid grid-cols-2 items-end gap-2 text-sm text-[#ffffff]">
            <div className="h-full flex flex-col items-center gap-2">
              {/* アイコン表示・変更ボタン */}
              <button
                onClick={() => setShowIconPicker(true)}
                className="cursor-pointer flex-shrink-0 focus:outline-none group relative"
                title="アイコンを変更"
                aria-label="アイコンを選択・変更"
              >
                {playerIcon ? (
                  <>
                    <img
                      src={playerIcon}
                      alt="アイコン"
                      className="object-cover border-2 border-white group-hover:opacity-70 transition-opacity shadow"
                      style={{ height: '5.5rem', aspectRatio: '3 / 4' }}
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#3d6b20] border border-white flex items-center justify-center text-white text-[9px] leading-none">✎</span>
                  </>
                ) : (
                  <div className="border-2 border-dashed border-white flex items-center justify-center text-white text-lg group-hover:bg-white/10 transition-colors" style={{ height: '5.5rem', aspectRatio: '3 / 4' }}>+</div>
                )}
              </button>
              <div className='text-gray-300 text-xs'>
                <span><strong className="text-[#ffffff] text-sm">{playerName}</strong></span>
              </div>
            </div>
            <div className="h-full flex flex-col items-end gap-1">
              <button
                onClick={onLogout}
                className="w-full px-3 py-1 bg-[#1a2e0a] border-2 border-white text-xs text-[#ffffff] cursor-pointer transition-colors hover:bg-[#0f1a06]"
              >
                ログアウト
              </button>
              <button
                onClick={() => setShowIconPicker(true)}
                className="w-full px-2 py-1 text-xs text-[#ffffff] bg-[#1a2e0a] border border-white cursor-pointer hover:bg-[#0f1a06] transition-colors"
              >
                アイコン設定
              </button>
              <button
                onClick={toggleShowOpponentIcon}
                title="相手のアイコンを対戦画面に表示するかどうか"
                className={`w-full px-2 py-1 text-xs font-bold border cursor-pointer transition-colors ${
                  showOpponentIcon
                    ? 'bg-[#3d6b20] border-white text-white'
                    : 'bg-transparent border-gray-500 text-gray-400'
                }`}
              >
                相手アイコン<br />
                {showOpponentIcon ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={toggleWhiteMode}
                className="w-full px-2 py-1 text-xs text-[#ffffff] bg-[#1a2e0a] border border-white cursor-pointer hover:bg-[#0f1a06] transition-colors"
              >
                {whiteMode ? '表示モード:白' : '表示モード:緑'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-4 pb-5 border-b-2 border-gray-300 gap-2">
          <button
            onClick={() => setIsYakuModalOpen(true)}
            className="flex-1 px-2 py-3 border-2 border-white font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016]"
          >
            役一覧を見る
          </button>
          <button
            onClick={() => setIsYakumanModalOpen(true)}
            className="flex-1 px-2 py-3 border-2 border-white font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016]"
          >
            役満達成記録
          </button>
          </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg text-[#ffffff] m-0 font-bold">新しい部屋を作成</h2>
            {!serverReady && wakeUpElapsedSeconds > 0 && (
              <div className="text-sm text-yellow-200 bg-yellow-900/60 border border-yellow-600 rounded px-3 py-2">
                ⏳ サーバーを起動中です（{wakeUpElapsedSeconds}秒経過）。しばらくお待ちください…
                {wakeUpElapsedSeconds >= 20 && (
                  <span className="block mt-1 text-yellow-300">コールドスタートに最大60秒かかる場合があります。</span>
                )}
              </div>
            )}
            <button
              onClick={handleOpenCreateRoomModal}
              disabled={isCreating || (!serverReady && wakeUpElapsedSeconds > 0)}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {isCreating ? '作成中...' : (!serverReady && wakeUpElapsedSeconds > 0) ? 'サーバー起動待ち...' : '基本ルールで部屋を作成'}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setIsCustomPresetsOpen(true)}
              disabled={isCreating || (!serverReady && wakeUpElapsedSeconds > 0)}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016] disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {(!serverReady && wakeUpElapsedSeconds > 0) ? 'サーバー起動待ち...' : 'カスタムルールで部屋を作成'}
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

          <div className="flex flex-col gap-4 pb-20">
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
                    <div className="flex gap-2">
                      {onSpectateRoom && !(myUserId && room.playerIds?.includes(myUserId)) && (
                        <button
                          onClick={() => onSpectateRoom(room.roomId)}
                          className="px-4 py-3 border-2 border-white bg-[#1a4a5a] text-[#ffffff] text-base font-bold cursor-pointer transition-all hover:bg-[#0f3040]"
                        >
                          観戦
                        </button>
                      )}
                      {onDelayedSpectateRoom && !(myUserId && room.playerIds?.includes(myUserId)) && (
                        <button
                          onClick={() => onDelayedSpectateRoom(room.roomId)}
                          title="1分遅延で手牌公開観戦（のぞき見防止）"
                          className="px-4 py-3 border-2 border-purple-400 bg-[#2d1a4a] text-[#d8b4fe] text-base font-bold cursor-pointer transition-all hover:bg-[#1e0f33]"
                        >
                          遅延観戦
                        </button>
                      )}
                      <button
                        onClick={() => handleJoinFromList(room.roomId)}
                        className="px-6 py-3 border-2 border-white bg-[#1a2e0a] text-[#ffffff] text-base font-bold cursor-pointer transition-all hover:bg-[#0f1a06] disabled:opacity-60"
                        disabled={!canJoinRoom(room)}
                      >
                        {getButtonText(room)}
                      </button>
                    </div>
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

      {isYakumanModalOpen && (
        <YakumanListModal onClose={() => setIsYakumanModalOpen(false)} />
      )}

      {showIconPicker && (
        <IconPickerModal
          activeIcon={playerIcon}
          onSelect={handleIconSelect}
          onClose={() => setShowIconPicker(false)}
        />
      )}

      {isCustomPresetsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
          <div className="w-full max-w-md border-2 border-white bg-[#2d5016] p-6 shadow-2xl flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white m-0 mb-2">カスタムルールで部屋を作成</h3>
            {customPresets.map((preset, index) => (
              <div key={index} className="flex gap-2">
                <button
                  onClick={() => { setIsCustomPresetsOpen(false); handleCreateFromPreset(index) }}
                  disabled={isCreating}
                  className="flex-1 px-3 py-2 border-2 border-white text-sm font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70 truncate text-left"
                  title={preset.name}
                >
                  <div className="truncate">{preset.name}</div>
                  <div className="text-xs text-gray-300 font-normal truncate">
                    {preset.gameMode === 'oneRound' ? '一局' : preset.gameMode === 'easternsouthern' ? '東南' : 'エンドレス'}
                    ・{preset.autoActionTimerSeconds}秒
                    {preset.useRedDora ? '・赤ドラ' : ''}
                    {preset.notenPenalty ? '・罰符あり' : ''}
                    {!preset.riichiDepositRequired ? '・供託なし' : ''}
                    {preset.aotenjou ? '・青天井' : ''}
                    {preset.discardAssistEnabled ? '・打牌アシスト' : ''}
                  </div>
                </button>
                <button
                  onClick={() => { setIsCustomPresetsOpen(false); handleEditPreset(index) }}
                  className="px-3 py-2 border-2 border-white text-sm font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016] flex-shrink-0"
                >
                  編集
                </button>
              </div>
            ))}
            <button
              onClick={() => setIsCustomPresetsOpen(false)}
              className="px-6 py-2 border-2 border-gray-400 text-sm font-bold cursor-pointer transition-all bg-transparent text-gray-300 hover:bg-[#1a2e0a] hover:text-white mt-2"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {isCreateMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
          <div className="w-full max-w-xs border-2 border-white bg-[#2d5016] p-6 shadow-2xl flex flex-col gap-3">
            <h3 className="text-xl font-bold text-white m-0 mb-2">部屋の作成方法</h3>
            <button
              onClick={handleCreateWithStandardRules}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
            >
              <div>基本ルールで作成</div>
              <div className='text-xs'>(一局勝負･立直供託あり･ノーテン罰符なし)</div>
            </button>
            <button
              onClick={handleCreateWithStandardRulesLong}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
            >
              <div>基本ルール(牌多め)で作成</div>
              <div className='text-xs'>(一局勝負･立直供託あり･ノーテン罰符なし)</div>
            </button>
            <button
              onClick={handleCreateWithStandardRulesAssist}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
            >
              <div>基本ルール(アシストあり)で作成</div>
              <div className='text-xs'>(一局勝負･立直供託あり･ノーテン罰符なし･打牌アシストあり)</div>
            </button>
            <button
              onClick={handleCreateWithStandardRulesLongAssist}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
            >
              <div>基本ルール(牌多め・アシストあり)で作成</div>
              <div className='text-xs'>(一局勝負･立直供託あり･ノーテン罰符なし･打牌アシストあり)</div>
            </button>
            <button
              onClick={handleCreateWithQuickRulesLong}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
            >
              <div>簡易ルールで作成</div>
              <div className='text-xs'>(一局勝負･和了以外の得点変動なし)</div>
            </button>
            <button
              onClick={handleOpenCustomCreate}
              disabled={isCreating}
              className="px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#3d6b20] text-[#ffffff] hover:bg-[#2d5016] disabled:opacity-70"
            >
              カスタムルールで作成
            </button>
            <button
              onClick={() => setIsCreateMenuOpen(false)}
              disabled={isCreating}
              className="px-6 py-2 border-2 border-gray-400 text-sm font-bold cursor-pointer transition-all bg-transparent text-gray-300 hover:bg-[#1a2e0a] hover:text-white disabled:opacity-70"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
          <div className="w-full max-w-xl border-2 border-white bg-[#2d5016] p-2 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="mb-5 border-b-2 border-gray-300 pb-3">
              <h3 className="text-xl font-bold text-white m-0">
                {editingPresetIndex !== null ? 'プリセット編集' : 'ルール設定'}
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {editingPresetIndex !== null && (
                <div className="flex flex-col gap-1">
                  <label className="text-gray-300 text-xs" htmlFor="presetNameModal">
                    ルール名
                  </label>
                  <input
                    id="presetNameModal"
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder={`カスタム${editingPresetIndex + 1}`}
                    maxLength={20}
                    className="px-4 py-3 border-2 border-white text-base bg-white transition-colors focus:outline-none focus:border-[#1a2e0a]"
                  />
                </div>
              )}
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
              <div className="hidden flex flex-col gap-3 p-3 bg-[#1a2e0a] border border-gray-500 rounded">
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
                      一局勝負（最初に和了したプレイヤーが勝ち）
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
                <label className="text-gray-300 text-xs">リーチ供託点</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={riichiDepositRequired}
                      onChange={(e) => setRiichiDepositRequired(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">リーチ時に供託点あり（1000点）</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">                <label className="text-gray-300 text-xs">切り上げ満貫</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kiriagemangan}
                      onChange={(e) => setKiriagemangan(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">切り上げ満貫（4翻30符・3翻60符を満貫扱い）</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">                <label className="text-gray-300 text-xs">青天井</label>
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
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">親の開始</label>
                <div className="flex flex-col gap-2 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <div className="flex items-center gap-2">
                    <input
                      id="dealer-random"
                      type="radio"
                      name="dealerSelection"
                      value="random"
                      checked={dealerSelection === 'random'}
                      onChange={(e) => setDealerSelection(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-gray-300 text-xs cursor-pointer" htmlFor="dealer-random">
                      ランダム
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="dealer-self"
                      type="radio"
                      name="dealerSelection"
                      value="self"
                      checked={dealerSelection === 'self'}
                      onChange={(e) => setDealerSelection(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-gray-300 text-xs cursor-pointer" htmlFor="dealer-self">
                      自分の親から開始
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="dealer-opponent"
                      type="radio"
                      name="dealerSelection"
                      value="opponent"
                      checked={dealerSelection === 'opponent'}
                      onChange={(e) => setDealerSelection(e.target.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label className="text-gray-300 text-xs cursor-pointer" htmlFor="dealer-opponent">
                      相手の親から開始
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">ロン得点倍率</label>
                <div className="flex flex-col gap-2 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  {([1, 1.5, 2] as number[]).map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <input
                        id={`ron-multiplier-${val}`}
                        type="radio"
                        name="ronMultiplier"
                        value={val}
                        checked={ronMultiplier === val}
                        onChange={() => setRonMultiplier(val)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <label className="text-gray-300 text-xs cursor-pointer" htmlFor={`ron-multiplier-${val}`}>
                        {val === 1 ? `×${val}（デフォルト）` : `×${val}`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">透明牌</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transparentHand}
                      onChange={(e) => setTransparentHand(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">透明牌あり</span>
                  </label>
                </div>
                {transparentHand && (
                  <div className="text-xs text-gray-400 p-2 bg-[#0f1a06] border border-gray-600 rounded">
                    <div>・同種4牌のうち3牌は相手から透けて見えます</div>
                    <div>・赤ドラは常に透けて見えます</div>
                    <div>・相手の手牌表示は透けて見える牌が左側、通常牌が右側に並びます</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">イカサマ(未実装)</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cheatingEnabled}
                      onChange={(e) => setCheatingEnabled(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">イカサマあり</span>
                  </label>
                </div>
                {cheatingEnabled && (
                  <div className="text-xs text-gray-400 p-2 bg-[#0f1a06] border border-gray-600 rounded">
                    <div>・両プレイヤーがイカサマを使用できます</div>
                    <div>・覗き見 / 積み込み / すり替え / 壁操作 / 手牌覗き見</div>
                    <div>・相手のイカサマを一定ターン以内に指摘すると満貫獲得</div>
                    <div>・誤指摘の場合は自分が満貫支払い</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-300 text-xs">打牌アシスト（初心者向け）</label>
                <div className="flex items-center gap-3 p-2 bg-[#1a2e0a] border border-gray-500 rounded">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discardAssistEnabled}
                      onChange={(e) => setDiscardAssistEnabled(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#3d6b20]"
                    />
                    <span className="text-gray-300 text-xs">CPUの推奨打牌を表示する</span>
                  </label>
                </div>
                <div className="text-xs text-gray-400 p-2 bg-[#0f1a06] border border-gray-600 rounded">
                  有効時、自分のターンにCPUが選ぶ推奨牌が手牌上で表示されます。
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
                  onClick={editingPresetIndex !== null ? handleSavePreset : handleConfirmCreateRoom}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 border-2 border-white text-base font-bold cursor-pointer transition-all bg-[#1a2e0a] text-[#ffffff] hover:bg-[#0f1a06] disabled:opacity-70"
                >
                  {editingPresetIndex !== null ? '保存' : isCreating ? '作成中...' : 'OK'}
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
                {editingPresetIndex !== null ? '基本ルールに戻す' : 'デフォルト設定に戻す'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* サーバー疎通確認インジケーター：起動中のときだけ表示 */}
      {(serverReady || (!serverReady && wakeUpElapsedSeconds > 0)) && (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-bold transition-all duration-500 ${
          serverReady
            ? 'bg-green-800/90 text-green-200 border border-green-500'
            : 'bg-yellow-900/90 text-yellow-200 border border-yellow-500 animate-pulse'
        }`}>
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
            serverReady ? 'bg-green-400' : 'bg-yellow-400'
          }`} style={!serverReady ? { animation: 'pulse 1.5s ease-in-out infinite' } : undefined} />
          {serverReady ? 'サーバー準備完了' : '通信中…'}
        </div>
      </div>
      )}
    </div>
  )
}


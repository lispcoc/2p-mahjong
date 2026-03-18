export interface Tile {
  suit: string
  number: number
  display: string
  isRed?: boolean
  isTransparent?: boolean
  isTsumogiri?: boolean
}

export interface GamePageProps {
  playerName: string
  roomId: string
  onBack: () => void
  isSpectator?: boolean
  onBanned?: (reason: string) => void
}

export interface GameState {
  status: string
  players: Array<{ userId: string; playerName: string; isCPU?: boolean }>
  currentTurn?: string
  pendingPungFor?: string
  pendingDaiminkanFor?: string
  ronPossibleFor?: string
  // tiles[userId].daiminkanMeldIndices is sent from backend but typed loosely via Record<string, any>
  canWinFor?: string
  autoDrawMode?: Record<string, boolean>
  noMeldMode?: Record<string, boolean>
  autoPlay?: Record<string, boolean>
  scores?: Record<string, number>
  riichi?: Record<string, boolean>
  riichiDeposits?: number
  riichiDiscards?: Record<string, number>
  dora?: {
    indicators: Tile[]
    tiles: Tile[]
    uraIndicators?: Tile[]
    uraTiles?: Tile[]
  }
  kanningWall?: {
    remaining: number
    tiles: Tile[]
  }
  tiles?: Record<string, any>
  wall?: number
  discards?: Record<string, Tile[]>
  lastDiscardInfo?: { userId: string; isTsumogiri: boolean } | null
  currentRound?: number
  roundWind?: number
  roundNumber?: number
  roundName?: string
  dealerId?: string | null
  seatWinds?: Record<string, number>
  nextRoundReadyCount?: number
  totalPlayers?: number
  autoActionTimerSeconds?: number
  initialScore?: number
  spectatorCount?: number
  isSpectatorView?: boolean
  spectatorShowHandsByDefault?: boolean
  hostId?: string
  rematchReadyUserIds?: string[]
  transparentHand?: boolean
  cheating?: CheatingState | null
}

// イカサマ種類
export type CheatType = 'peek' | 'stack' | 'swap' | 'wallSwap' | 'peekHand'

// イカサマ種類の定義
export interface CheatDefinition {
  type: CheatType
  name: string
  description: string
  icon: string
}

// イカサマ状態（サーバーから送信される）
export interface CheatingState {
  cheatingEnabled: boolean
  globalTurnCount: number
  cheatGraceTurns: Record<CheatType, number>
  activeCheatCounts: Record<string, number>
  accusationCounts: Record<string, number>
  cheatExecutionCounts: Record<string, number>
  maxAccusationsPerGame: number
  maxCheatsPerGame: number
}

// イカサマ実行結果
export interface CheatResult {
  success: boolean
  message?: string
  data?: {
    tiles?: Tile[]
    message?: string
  }
}

// イカサマ指摘結果
export interface CheatAccusationResult {
  success: boolean
  caught: boolean
  message: string
  penalty?: number
  cheatType?: CheatType
  accuserId?: string
  penalizedId?: string
}

// イカサマ種類一覧
export const CHEAT_DEFINITIONS: CheatDefinition[] = [
  { type: 'peek', name: '覗き見', description: '壁牌の次にツモされる牌を覗く', icon: '👁️' },
  { type: 'stack', name: '積み込み', description: '指定した牌を壁の先頭に移動', icon: '📦' },
  { type: 'swap', name: 'すり替え', description: '手牌の牌を壁の牌と交換', icon: '🔄' },
  { type: 'wallSwap', name: '壁操作', description: '壁内の任意2枚を入れ替え', icon: '🧱' },
  { type: 'peekHand', name: '手牌覗き見', description: '相手の手牌を取得', icon: '🔍' },
]

export interface Tile {
  suit: string
  number: number
  display: string
  isRed?: boolean
  isTsumogiri?: boolean
}

export interface GamePageProps {
  playerName: string
  roomId: string
  onBack: () => void
  isSpectator?: boolean
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
}

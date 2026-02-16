export interface Tile {
  suit: string
  number: number
  display: string
}

export interface GamePageProps {
  playerName: string
  roomId: string
  onBack: () => void
}

export interface GameState {
  status: string
  players: Array<{ userId: string; playerName: string; isCPU?: boolean }>
  currentTurn?: string
  pendingPungFor?: string
  ronPossibleFor?: string
  canWinFor?: string
  autoDrawMode?: Record<string, boolean>
  scores?: Record<string, number>
  riichi?: Record<string, boolean>
  riichiDeposits?: number
  riichiDiscards?: Record<string, number>
  dora?: {
    indicators: Tile[]
    tiles: Tile[]
  }
  kanningWall?: {
    remaining: number
    tiles: Tile[]
  }
  tiles?: Record<string, any>
  wall?: number
  discards?: Record<string, Tile[]>
  currentRound?: number
  nextRoundReadyCount?: number
  totalPlayers?: number
}

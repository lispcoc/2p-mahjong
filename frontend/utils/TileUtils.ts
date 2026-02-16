import { Tile } from '../types/GameTypes'

export const HONOR_KEY_BY_NUMBER: Record<number, string> = {
  1: 'east',
  2: 'south',
  3: 'west',
  4: 'north',
  5: 'white',
  6: 'green',
  7: 'red',
}

export const KANJI_TO_NUMBER: Record<string, number> = {
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9,
}

export const HONOR_NUMBER_BY_KANJI: Record<string, number> = {
  '東': 1,
  '南': 2,
  '西': 3,
  '北': 4,
  '白': 5,
  '發': 6,
  '中': 7,
}

export function getTileKey(tile: Tile): string {
  if (tile.suit === 'honor') {
    return `z${tile.number}`
  }
  const suitMap: Record<string, string> = {
    'man': 'm',
    'pin': 'p',
    'sou': 's',
  }
  const suitCode = suitMap[tile.suit] || 'unknown'
  return `${suitCode}${tile.number}`
}

export function normalizeTile(tile: Tile | string): Tile {
  if (typeof tile !== 'string') {
    return tile
  }

  if (tile.length === 1 && HONOR_NUMBER_BY_KANJI[tile]) {
    return {
      suit: 'honor',
      number: HONOR_NUMBER_BY_KANJI[tile],
      display: tile,
    }
  }

  const suitChar = tile.slice(-1)
  const numChar = tile.slice(0, tile.length - 1)
  const number = KANJI_TO_NUMBER[numChar] || 0

  const suit = suitChar === '萬' ? 'man' : suitChar === '筒' ? 'pin' : suitChar === '索' ? 'sou' : 'honor'

  return {
    suit,
    number,
    display: tile,
  }
}

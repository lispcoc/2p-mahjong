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
  // 赤ドラの場合は0を使用（例：m0, p0, s0）
  if (tile.isRed && tile.number === 5) {
    return `${suitCode}0`
  }
  return `${suitCode}${tile.number}`
}

/**
 * 牌をサーバーに送信するためのtileId文字列を生成
 * 赤ドラの場合は "suit_number_red" 形式
 */
export function getTileId(tile: Tile): string {
  const base = `${tile.suit}_${tile.number}`
  return tile.isRed ? `${base}_red` : base
}

/**
 * 牌をテキスト表示用の文字列に変換
 * 萬子: 🀇🀈🀉🀊🀋🀌🀍🀎🀏 (Unicode Mahjong Tiles)
 * 筒子: ①②③④⑤⑥⑦⑧⑨
 * 索子: 1s〜9s (色付き)
 * 字牌: 東南西北白發中
 */
export function getTileText(tile: Tile): string {
  if (tile.suit === 'honor') {
    const honorText: Record<number, string> = {
      1: '東', 2: '南', 3: '西', 4: '北',
      5: '白', 6: '發', 7: '中',
    }
    return honorText[tile.number] || '?'
  }

  const number = tile.number
  if (tile.suit === 'man') {
    const manText = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    return (tile.isRed ? '赤' : manText[number]) + '萬'
  }
  if (tile.suit === 'pin') {
    const pinText = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨']
    return tile.isRed ? '赤⑤' : pinText[number]
  }
  if (tile.suit === 'sou') {
    const souText = ['', '１', '２', '３', '４', '５', '６', '７', '８', '９']
    return (tile.isRed ? '赤５' : souText[number]) + '索'
  }
  return tile.display || '?'
}

/**
 * テキストモード用の牌の背景色クラスを取得
 */
export function getTileTextColorClass(tile: Tile): string {
  if (tile.isRed) return 'text-red-600'
  if (tile.suit === 'man') return 'text-black'
  if (tile.suit === 'pin') return 'text-blue-700'
  if (tile.suit === 'sou') return 'text-green-700'
  if (tile.suit === 'honor') {
    if (tile.number >= 1 && tile.number <= 4) return 'text-gray-800'  // 風牌
    if (tile.number === 5) return 'text-gray-400'  // 白
    if (tile.number === 6) return 'text-green-600'  // 發
    if (tile.number === 7) return 'text-red-600'  // 中
  }
  return 'text-black'
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

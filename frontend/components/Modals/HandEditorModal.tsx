import React, { useState, useEffect } from 'react'
import { Tile } from '../../types/GameTypes'
import { TileImage } from '../TileImage'
import { getTileId } from '../../utils/TileUtils'

interface HandEditorModalProps {
  currentHand: Tile[]
  currentMelds: Tile[][]
  onApply: (tiles: Array<{ suit: string; number: number; isRed?: boolean }>) => void
  onClose: () => void
}

// 全牌の定義
const ALL_TILES: Array<{ suit: string; number: number; display: string; isRed?: boolean }> = [
  // 萬子 1-9
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'man', number: i + 1, display: `${['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][i + 1]}萬` })),
  // 萬子 赤5
  { suit: 'man', number: 5, display: '赤五萬', isRed: true },
  // 筒子 1-9
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'pin', number: i + 1, display: `${['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][i + 1]}` })),
  // 筒子 赤5
  { suit: 'pin', number: 5, display: '赤⑤', isRed: true },
  // 索子 1-9
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'sou', number: i + 1, display: `${i + 1}索` })),
  // 索子 赤5
  { suit: 'sou', number: 5, display: '赤5索', isRed: true },
  // 字牌 東南西北白發中
  { suit: 'honor', number: 1, display: '東' },
  { suit: 'honor', number: 2, display: '南' },
  { suit: 'honor', number: 3, display: '西' },
  { suit: 'honor', number: 4, display: '北' },
  { suit: 'honor', number: 5, display: '白' },
  { suit: 'honor', number: 6, display: '發' },
  { suit: 'honor', number: 7, display: '中' },
]

// 牌種ごとのグループ
const TILE_GROUPS = [
  { label: '萬子', tiles: ALL_TILES.filter(t => t.suit === 'man') },
  { label: '筒子', tiles: ALL_TILES.filter(t => t.suit === 'pin') },
  { label: '索子', tiles: ALL_TILES.filter(t => t.suit === 'sou') },
  { label: '字牌', tiles: ALL_TILES.filter(t => t.suit === 'honor') },
]

export function HandEditorModal({ currentHand, currentMelds, onApply, onClose }: HandEditorModalProps) {
  // 現在の手牌をコピーして編集用の状態にする
  const [editHand, setEditHand] = useState<Tile[]>([...currentHand])
  const meldTileCount = currentMelds.reduce((sum, m) => sum + m.length, 0)
  // 手牌の最大枚数 (14 - メルド牌数) ただしツモ牌含めて +1 の場合もある
  // メルド1組 = 3枚消費 → 手牌は 14 - 3*melds
  const maxHandSize = 14 - meldTileCount + 1 // ツモ直後は14枚+1

  const addTile = (tile: typeof ALL_TILES[0]) => {
    if (editHand.length >= maxHandSize) return
    setEditHand([...editHand, { suit: tile.suit, number: tile.number, display: tile.display, isRed: tile.isRed }])
  }

  const removeTile = (index: number) => {
    setEditHand(editHand.filter((_, i) => i !== index))
  }

  const clearHand = () => {
    setEditHand([])
  }

  const handleApply = () => {
    onApply(editHand.map(t => ({
      suit: t.suit,
      number: t.number,
      isRed: t.isRed || undefined,
    })))
    onClose()
  }

  // 各牌の使用済み枚数を数える (赤ドラも含む)
  const getUsedCount = (suit: string, number: number, isRed?: boolean) => {
    return editHand.filter(t => t.suit === suit && t.number === number && (!!t.isRed === !!isRed)).length
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">🀄 手牌エディタ (DEV)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {/* 現在の副露 */}
        {currentMelds.length > 0 && (
          <div className="mb-3 p-2 bg-gray-100 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">副露 (変更不可)</div>
            <div className="flex gap-2 flex-wrap">
              {currentMelds.map((meld, mIdx) => (
                <div key={mIdx} className="flex gap-px border border-gray-300 rounded p-0.5 bg-white">
                  {meld.map((tile, tIdx) => (
                    <TileImage key={tIdx} tile={tile} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 編集中の手牌 */}
        <div className="mb-3 p-2 bg-green-50 border-2 border-green-300 rounded-lg min-h-[70px]">
          <div className="text-xs text-gray-500 mb-1">
            手牌 ({editHand.length}/{maxHandSize}枚)
          </div>
          <div className="flex gap-px flex-wrap">
            {editHand.length === 0 ? (
              <span className="text-gray-400 text-sm p-2">牌をクリックして追加</span>
            ) : (
              editHand.map((tile, idx) => (
                <div key={idx} className="relative cursor-pointer group" onClick={() => removeTile(idx)}>
                  <TileImage tile={tile} />
                  <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/30 rounded transition-colors flex items-center justify-center">
                    <span className="text-red-600 font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">✕</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 牌選択パレット */}
        <div className="space-y-2">
          {TILE_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-xs text-gray-500 font-bold mb-1">{group.label}</div>
              <div className="flex gap-px flex-wrap">
                {group.tiles.map((tile, idx) => {
                  const usedCount = getUsedCount(tile.suit, tile.number, tile.isRed)
                  const maxCount = tile.isRed ? 1 : 4
                  const isMaxed = usedCount >= maxCount
                  const isFull = editHand.length >= maxHandSize
                  return (
                    <div
                      key={idx}
                      className={`relative cursor-pointer transition-opacity ${isMaxed || isFull ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
                      onClick={() => !isMaxed && !isFull && addTile(tile)}
                    >
                      <TileImage tile={tile as Tile} />
                      {usedCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {usedCount}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={clearHand}
            className="px-4 py-2 text-sm font-bold border-2 border-gray-400 rounded bg-white text-gray-600 hover:bg-gray-100 transition-colors"
          >
            クリア
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold border-2 border-gray-400 rounded bg-white text-gray-600 hover:bg-gray-100 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-bold border-2 border-blue-600 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}

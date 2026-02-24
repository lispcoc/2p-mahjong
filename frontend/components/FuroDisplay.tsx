import React from 'react'
import { Tile } from '../types/GameTypes'
import { TileImage } from './TileImage'

interface FuroDisplayProps {
  melds: Tile[][]
  layout?: 'vertical' | 'horizontal'
  compact?: boolean
  meldClassName?: string
  wrapperClassName?: string
  seatWindYou?: number  // Your seat wind (1=East, 2=South, 3=West, 4=North)
  seatWindOpponent?: number  // Opponent seat wind
  concealedMeldIndices?: Set<number>  // Indices of concealed kans (暗槓)
  daiminkanMeldIndices?: Set<number>  // Indices of daiminkan (大明槓)
}

export function FuroDisplay({ 
  melds, 
  layout = 'horizontal',
  compact = false,
  meldClassName,
  wrapperClassName,
  seatWindYou,
  seatWindOpponent,
  concealedMeldIndices,
  daiminkanMeldIndices
}: FuroDisplayProps) {
  if (!melds || melds.length === 0) {
    return null
  }

  const defaultWrapperClass = layout === 'vertical' 
    ? 'flex flex-col items-end flex-shrink-0 gap-2 min-w-max'
    : 'flex max-sm:flex-col gap-4'
  
  const finalWrapperClass = wrapperClassName || defaultWrapperClass

  // items-end ensures bottom-alignment when kakan stacking makes one element taller
  const defaultMeldContainerClass = 'flex gap-px items-end'
  const finalMeldContainerClass = meldClassName || defaultMeldContainerClass

  // 2人麻雀では相手は常に対面（toimen）
  // 倒す牌の位置で鳴いた相手の方向を示す：
  //   上家（左）: 左端  /  対面（正面）: 中央  /  下家（右）: 右端
  // 2人対戦では常に中央位置に倒す
  //
  // バックエンドのデータ形式：
  //   ポン: [hand0, hand1, calledTile]          → calledTile は index 2
  //   加槓: [hand0, hand1, calledTile, addedTile] → calledTile は index 2, addedTile は index 3
  //   暗槓: [tile, tile, tile, tile]             → concealedMeldIndices に含まれる

  const renderMeld = (meld: Tile[], meldIdx: number) => {
    const isConcealed = concealedMeldIndices?.has(meldIdx)

    if (isConcealed) {
      // 暗槓: [裏, 表, 表, 裏]
      return meld.map((tile, tileIdx) => (
        <div key={`meld-${meldIdx}-${tileIdx}`} className="inline-block">
          <TileImage
            tile={tile}
            faceDown={tileIdx === 0 || tileIdx === meld.length - 1}
          />
        </div>
      ))
    }

    if (meld.length === 3) {
      // ポン: 対面から鳴いた牌を中央に横向きで表示
      // データ: [hand0, hand1, calledTile]
      // 表示: [hand0] [calledTile 横] [hand1]
      return (
        <>
          <div key={`meld-${meldIdx}-0`} className="inline-block">
            <TileImage tile={meld[0]} />
          </div>
          <div key={`meld-${meldIdx}-2`} className="inline-block">
            <TileImage tile={meld[2]} isRotated />
          </div>
          <div key={`meld-${meldIdx}-1`} className="inline-block">
            <TileImage tile={meld[1]} />
          </div>
        </>
      )
    }

    if (meld.length === 4) {
      const isDaiminkan = daiminkanMeldIndices?.has(meldIdx)

      if (isDaiminkan) {
        // 大明槓: 4枚を横一列に並べ、鳴いた牌（index 2）を横向きで中央に表示
        // データ: [hand0, hand1, calledTile, hand2]
        // 表示: [hand0] [calledTile 横] [hand1] [hand2]
        return (
          <>
            <div key={`meld-${meldIdx}-0`} className="inline-block">
              <TileImage tile={meld[0]} />
            </div>
            <div key={`meld-${meldIdx}-2`} className="inline-block">
              <TileImage tile={meld[2]} isRotated />
            </div>
            <div key={`meld-${meldIdx}-1`} className="inline-block">
              <TileImage tile={meld[1]} />
            </div>
            <div key={`meld-${meldIdx}-3`} className="inline-block">
              <TileImage tile={meld[3]} />
            </div>
          </>
        )
      }

      // 加槓（小明槓）: ポンの横向き牌の上に4枚目を重ねて表示
      // データ: [hand0, hand1, calledTile, addedTile]
      // 表示: [hand0] [calledTile 横 + addedTile 横（重ね）] [hand1]
      return (
        <>
          <div key={`meld-${meldIdx}-0`} className="inline-block">
            <TileImage tile={meld[0]} />
          </div>
          <div
            key={`meld-${meldIdx}-stack`}
            className="inline-flex flex-col"
            style={{ gap: 0 }}
          >
            {/* 上: 加槓で追加した牌（横向き） */}
            <div style={{ marginBottom: -14 }}>
              <TileImage tile={meld[3]} isRotated />
            </div>
            {/* 下: 元のポンで鳴いた牌（横向き） */}
            <div>
              <TileImage tile={meld[2]} isRotated />
            </div>
          </div>
          <div key={`meld-${meldIdx}-1`} className="inline-block">
            <TileImage tile={meld[1]} />
          </div>
        </>
      )
    }

    // フォールバック: そのまま表示
    return meld.map((tile, tileIdx) => (
      <div key={`meld-${meldIdx}-${tileIdx}`} className="inline-block">
        <TileImage tile={tile} />
      </div>
    ))
  }

  return (
    <div className={finalWrapperClass}>
      {melds.map((meld, meldIdx) => (
        <div key={`meld-${meldIdx}`} className={finalMeldContainerClass}>
          {renderMeld(meld, meldIdx)}
        </div>
      ))}
    </div>
  )
}

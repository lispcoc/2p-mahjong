'use client'

import React, { useState } from 'react'
import { Tile } from '../../types/GameTypes'
import { TileInline } from '../TileInline'

interface YakuListModalProps {
  onClose: () => void
}

/** ヘルパー: 牌オブジェクト生成 (m=萬子, p=筒子, s=索子, z=字牌) */
function t(suit: string, number: number, isRed = false): Tile {
  const suitMap: Record<string, string> = { m: 'man', p: 'pin', s: 'sou', z: 'honor' }
  const suitNames: Record<string, string> = { m: '萬', p: '筒', s: '索', z: '' }
  const windNames: Record<number, string> = { 1: '東', 2: '南', 3: '西', 4: '北' }
  const dragonNames: Record<number, string> = { 5: '白', 6: '發', 7: '中' }
  let display = ''
  if (suit === 'z') {
    display = windNames[number] || dragonNames[number] || ''
  } else {
    display = `${isRed ? '赤' : ''}${number}${suitNames[suit] || ''}`
  }
  return { suit: suitMap[suit] || suit, number, display, isRed }
}

/** 手牌を一列表示するコンポーネント */
function TileRow({ tiles, gap = 0.5, height = 28, width = 20, separator }: {
  tiles: Tile[]
  gap?: number
  height?: number
  width?: number
  separator?: number[] // インデックスの後にスペースを入れる位置
}) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: `${gap * 4}px` }}>
      {tiles.map((tile, idx) => (
        <React.Fragment key={idx}>
          <TileInline tile={tile} height={height} width={width} className="rounded-sm shadow-sm" />
          {separator?.includes(idx) && <div style={{ width: '6px' }} />}
        </React.Fragment>
      ))}
    </div>
  )
}

interface YakuEntry {
  name: string
  han: string
  description: string
  tiles: Tile[]
  separator?: number[]
  note?: string
}

interface YakuCategory {
  title: string
  entries: YakuEntry[]
}

const yakuData: YakuCategory[] = [
  {
    title: '1翻',
    entries: [
      {
        name: '門前清自摸和',
        han: '1翻（門前のみ）',
        description: '門前でツモ和了する',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 7), t('s', 8), t('s', 9),
          t('m', 5), t('m', 6), t('m', 7),
          t('z', 1), t('z', 1),
        ],
        note: 'ツモで和了',
      },
      {
        name: '立直',
        han: '1翻（門前のみ）',
        description: '門前聴牌時にリーチを宣言',
        tiles: [
          t('m', 2), t('m', 3), t('m', 4),
          t('p', 5), t('p', 6), t('p', 7),
          t('s', 1), t('s', 2), t('s', 3),
          t('m', 8), t('m', 8), t('m', 8),
          t('z', 2), t('z', 2),
        ],
      },
      {
        name: '一発',
        han: '1翻（門前のみ）',
        description: 'リーチ後、1巡以内に和了',
        tiles: [
          t('m', 2), t('m', 3), t('m', 4),
          t('p', 5), t('p', 6), t('p', 7),
          t('s', 1), t('s', 2), t('s', 3),
          t('m', 8), t('m', 8), t('m', 8),
          t('z', 2), t('z', 2),
        ],
        note: 'リーチ後1巡以内',
      },
      {
        name: '平和',
        han: '1翻（門前のみ）',
        description: '全て順子＋役牌以外の雀頭＋両面待ち',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 7), t('s', 8), t('s', 9),
          t('m', 5), t('m', 6), t('m', 7),
          t('s', 2), t('s', 2),
        ],
      },
      {
        name: '断么九',
        han: '1翻',
        description: '么九牌（1・9・字牌）を含まない',
        tiles: [
          t('m', 2), t('m', 3), t('m', 4),
          t('p', 3), t('p', 4), t('p', 5),
          t('s', 5), t('s', 6), t('s', 7),
          t('m', 6), t('m', 7), t('m', 8),
          t('p', 8), t('p', 8),
        ],
      },
      {
        name: '一盃口',
        han: '1翻（門前のみ）',
        description: '同じ順子が2組',
        tiles: [
          t('m', 3), t('m', 4), t('m', 5),
          t('m', 3), t('m', 4), t('m', 5),
          t('p', 6), t('p', 7), t('p', 8),
          t('s', 1), t('s', 1), t('s', 1),
          t('z', 7), t('z', 7),
        ],
      },
      {
        name: '役牌（白・發・中）',
        han: '1翻',
        description: '三元牌の刻子',
        tiles: [
          t('z', 5), t('z', 5), t('z', 5),
          t('m', 2), t('m', 3), t('m', 4),
          t('p', 6), t('p', 7), t('p', 8),
          t('s', 3), t('s', 3), t('s', 3),
          t('m', 9), t('m', 9),
        ],
      },
      {
        name: '場風牌・自風牌',
        han: '1翻',
        description: '場風または自風の刻子',
        tiles: [
          t('z', 1), t('z', 1), t('z', 1),
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 7), t('s', 8), t('s', 9),
          t('p', 2), t('p', 2),
        ],
        note: '東場の東など',
      },
      {
        name: '海底撈月',
        han: '1翻',
        description: '壁牌の最後の牌でツモ和了',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 7), t('p', 8), t('p', 9),
          t('s', 4), t('s', 5), t('s', 6),
          t('m', 5), t('m', 6), t('m', 7),
          t('z', 3), t('z', 3),
        ],
        note: '最後のツモ',
      },
      {
        name: '河底撈魚',
        han: '1翻',
        description: '最後の捨て牌でロン和了',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 7), t('p', 8), t('p', 9),
          t('s', 4), t('s', 5), t('s', 6),
          t('m', 5), t('m', 6), t('m', 7),
          t('z', 3), t('z', 3),
        ],
        note: '最後の捨牌でロン',
      },
      {
        name: '嶺上開花',
        han: '1翻',
        description: 'カンの後の嶺上牌でツモ和了',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 5), t('p', 5), t('p', 5), t('p', 5),
          t('s', 4), t('s', 5), t('s', 6),
          t('m', 7), t('m', 8), t('m', 9),
        ],
        separator: [2, 6],
        note: 'カン後の嶺上ツモ',
      },
    ],
  },
  {
    title: '2翻',
    entries: [
      {
        name: 'ダブル立直',
        han: '2翻（門前のみ）',
        description: '最初の打牌でリーチを宣言',
        tiles: [
          t('m', 2), t('m', 3), t('m', 4),
          t('p', 5), t('p', 6), t('p', 7),
          t('s', 1), t('s', 2), t('s', 3),
          t('m', 8), t('m', 8), t('m', 8),
          t('z', 2), t('z', 2),
        ],
        note: '第1打でリーチ',
      },
      {
        name: '七対子',
        han: '2翻（門前のみ）',
        description: '7つの対子で構成',
        tiles: [
          t('m', 1), t('m', 1),
          t('m', 5), t('m', 5),
          t('p', 3), t('p', 3),
          t('p', 9), t('p', 9),
          t('s', 2), t('s', 2),
          t('s', 8), t('s', 8),
          t('z', 7), t('z', 7),
        ],
        separator: [1, 3, 5, 7, 9, 11],
      },
      {
        name: '対々和',
        han: '2翻',
        description: '4つの刻子で構成',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1),
          t('p', 5), t('p', 5), t('p', 5),
          t('s', 9), t('s', 9), t('s', 9),
          t('z', 6), t('z', 6), t('z', 6),
          t('m', 3), t('m', 3),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '三暗刻',
        han: '2翻',
        description: '暗刻が3つ',
        tiles: [
          t('m', 3), t('m', 3), t('m', 3),
          t('p', 7), t('p', 7), t('p', 7),
          t('s', 5), t('s', 5), t('s', 5),
          t('m', 6), t('m', 7), t('m', 8),
          t('z', 1), t('z', 1),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '三槓子',
        han: '2翻',
        description: 'カンが3つ',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1), t('m', 1),
          t('p', 5), t('p', 5), t('p', 5), t('p', 5),
          t('s', 9), t('s', 9), t('s', 9), t('s', 9),
          t('z', 3), t('z', 3),
        ],
        separator: [3, 7, 11],
      },
      {
        name: '小三元',
        han: '2翻',
        description: '三元牌のうち2つの刻子と1つの雀頭',
        tiles: [
          t('z', 5), t('z', 5), t('z', 5),
          t('z', 6), t('z', 6), t('z', 6),
          t('z', 7), t('z', 7),
          t('m', 2), t('m', 3), t('m', 4),
          t('s', 1), t('s', 2), t('s', 3),
        ],
        separator: [2, 5, 7, 10],
        note: '役牌2つ込みで実質4翻',
      },
      {
        name: '混老頭',
        han: '2翻',
        description: '么九牌（1・9・字牌）のみで構成',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1),
          t('p', 9), t('p', 9), t('p', 9),
          t('s', 1), t('s', 1), t('s', 1),
          t('z', 1), t('z', 1), t('z', 1),
          t('z', 7), t('z', 7),
        ],
        separator: [2, 5, 8, 11],
        note: '対々和と複合',
      },
      {
        name: '三色同順',
        han: '2翻（食い下がり1翻）',
        description: '3色で同じ並びの順子',
        tiles: [
          t('m', 4), t('m', 5), t('m', 6),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 4), t('s', 5), t('s', 6),
          t('m', 8), t('m', 8), t('m', 8),
          t('z', 2), t('z', 2),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '三色同刻',
        han: '2翻',
        description: '3色で同じ数の刻子',
        tiles: [
          t('m', 5), t('m', 5), t('m', 5),
          t('p', 5), t('p', 5), t('p', 5),
          t('s', 5), t('s', 5), t('s', 5),
          t('m', 1), t('m', 2), t('m', 3),
          t('z', 4), t('z', 4),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '一気通貫',
        han: '2翻（食い下がり1翻）',
        description: '同じ色で1〜9の順子を揃える',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('m', 4), t('m', 5), t('m', 6),
          t('m', 7), t('m', 8), t('m', 9),
          t('p', 3), t('p', 3), t('p', 3),
          t('s', 7), t('s', 7),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '混全帯么九',
        han: '2翻（食い下がり1翻）',
        description: '全ての面子と雀頭に么九牌を含む（字牌あり）',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 7), t('p', 8), t('p', 9),
          t('s', 1), t('s', 1), t('s', 1),
          t('z', 5), t('z', 5), t('z', 5),
          t('z', 1), t('z', 1),
        ],
        separator: [2, 5, 8, 11],
      },
    ],
  },
  {
    title: '3翻',
    entries: [
      {
        name: '混一色',
        han: '3翻（食い下がり2翻）',
        description: '1種類の数牌＋字牌のみ',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('m', 4), t('m', 5), t('m', 6),
          t('m', 7), t('m', 8), t('m', 9),
          t('z', 5), t('z', 5), t('z', 5),
          t('z', 1), t('z', 1),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '純全帯么九',
        han: '3翻（食い下がり2翻）',
        description: '全ての面子と雀頭に1か9を含む（字牌なし）',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 7), t('p', 8), t('p', 9),
          t('s', 1), t('s', 1), t('s', 1),
          t('m', 9), t('m', 9), t('m', 9),
          t('s', 9), t('s', 9),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '二盃口',
        han: '3翻（門前のみ）',
        description: '一盃口が2組',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 7), t('p', 8), t('p', 9),
          t('p', 7), t('p', 8), t('p', 9),
          t('s', 5), t('s', 5),
        ],
        separator: [2, 5, 8, 11],
      },
    ],
  },
  {
    title: '6翻',
    entries: [
      {
        name: '清一色',
        han: '6翻（食い下がり5翻）',
        description: '1種類の数牌のみで構成',
        tiles: [
          t('p', 1), t('p', 2), t('p', 3),
          t('p', 3), t('p', 4), t('p', 5),
          t('p', 5), t('p', 6), t('p', 7),
          t('p', 7), t('p', 8), t('p', 9),
          t('p', 1), t('p', 1),
        ],
        separator: [2, 5, 8, 11],
      },
    ],
  },
  {
    title: '役満',
    entries: [
      {
        name: '天和',
        han: '役満（門前のみ）',
        description: '親の配牌で和了',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 7), t('s', 8), t('s', 9),
          t('m', 5), t('m', 6), t('m', 7),
          t('z', 1), t('z', 1),
        ],
        note: '親の配牌時に完成',
      },
      {
        name: '地和',
        han: '役満（門前のみ）',
        description: '子の第1ツモで和了',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 7), t('s', 8), t('s', 9),
          t('m', 5), t('m', 6), t('m', 7),
          t('z', 2), t('z', 2),
        ],
        note: '子の最初のツモ',
      },
      {
        name: '人和',
        han: '役満（門前のみ）',
        description: '子が最初のツモ前に他プレイヤーの捨牌でロン',
        tiles: [
          t('m', 1), t('m', 2), t('m', 3),
          t('p', 4), t('p', 5), t('p', 6),
          t('s', 7), t('s', 8), t('s', 9),
          t('m', 5), t('m', 6), t('m', 7),
          t('z', 4), t('z', 4),
        ],
        note: '第1ツモ前のロン',
      },
      {
        name: '国士無双',
        han: '役満（門前のみ）',
        description: '13種の么九牌を1枚ずつ＋いずれか1枚',
        tiles: [
          t('m', 1), t('m', 9),
          t('p', 1), t('p', 9),
          t('s', 1), t('s', 9),
          t('z', 1), t('z', 2), t('z', 3), t('z', 4),
          t('z', 5), t('z', 6), t('z', 7),
          t('z', 7),
        ],
      },
      {
        name: '四暗刻',
        han: '役満（門前のみ）',
        description: '4つの暗刻',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1),
          t('p', 5), t('p', 5), t('p', 5),
          t('s', 9), t('s', 9), t('s', 9),
          t('z', 7), t('z', 7), t('z', 7),
          t('m', 3), t('m', 3),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '大三元',
        han: '役満',
        description: '三元牌（白・發・中）すべての刻子',
        tiles: [
          t('z', 5), t('z', 5), t('z', 5),
          t('z', 6), t('z', 6), t('z', 6),
          t('z', 7), t('z', 7), t('z', 7),
          t('m', 2), t('m', 3), t('m', 4),
          t('p', 8), t('p', 8),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '大四喜',
        han: '役満',
        description: '4つの風牌すべての刻子',
        tiles: [
          t('z', 1), t('z', 1), t('z', 1),
          t('z', 2), t('z', 2), t('z', 2),
          t('z', 3), t('z', 3), t('z', 3),
          t('z', 4), t('z', 4), t('z', 4),
          t('m', 5), t('m', 5),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '小四喜',
        han: '役満',
        description: '風牌3つの刻子＋1つの雀頭',
        tiles: [
          t('z', 1), t('z', 1), t('z', 1),
          t('z', 2), t('z', 2), t('z', 2),
          t('z', 3), t('z', 3), t('z', 3),
          t('z', 4), t('z', 4),
          t('m', 5), t('m', 6), t('m', 7),
        ],
        separator: [2, 5, 8, 10],
      },
      {
        name: '字一色',
        han: '役満',
        description: '字牌のみで構成',
        tiles: [
          t('z', 1), t('z', 1), t('z', 1),
          t('z', 2), t('z', 2), t('z', 2),
          t('z', 5), t('z', 5), t('z', 5),
          t('z', 7), t('z', 7), t('z', 7),
          t('z', 6), t('z', 6),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '清老頭',
        han: '役満',
        description: '1と9の数牌のみで構成',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1),
          t('m', 9), t('m', 9), t('m', 9),
          t('p', 1), t('p', 1), t('p', 1),
          t('s', 9), t('s', 9), t('s', 9),
          t('p', 9), t('p', 9),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '緑一色',
        han: '役満',
        description: '索子の2・3・4・6・8と發のみで構成',
        tiles: [
          t('s', 2), t('s', 3), t('s', 4),
          t('s', 2), t('s', 3), t('s', 4),
          t('s', 6), t('s', 6), t('s', 6),
          t('s', 8), t('s', 8), t('s', 8),
          t('z', 6), t('z', 6),
        ],
        separator: [2, 5, 8, 11],
      },
      {
        name: '大車輪',
        han: '役満（門前のみ）',
        description: '筒子の2〜8で七対子',
        tiles: [
          t('p', 2), t('p', 2),
          t('p', 3), t('p', 3),
          t('p', 4), t('p', 4),
          t('p', 5), t('p', 5),
          t('p', 6), t('p', 6),
          t('p', 7), t('p', 7),
          t('p', 8), t('p', 8),
        ],
        separator: [1, 3, 5, 7, 9, 11],
      },
      {
        name: '九蓮宝燈',
        han: '役満（門前のみ）',
        description: '1112345678999＋同色の任意1枚',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1),
          t('m', 2), t('m', 3), t('m', 4), t('m', 5),
          t('m', 6), t('m', 7), t('m', 8),
          t('m', 9), t('m', 9), t('m', 9),
          t('m', 5),
        ],
      },
      {
        name: '四槓子',
        han: '役満',
        description: '4つのカン',
        tiles: [
          t('m', 1), t('m', 1), t('m', 1), t('m', 1),
          t('p', 5), t('p', 5), t('p', 5), t('p', 5),
          t('s', 9), t('s', 9), t('s', 9), t('s', 9),
          t('z', 7), t('z', 7), t('z', 7), t('z', 7),
          t('m', 3), t('m', 3),
        ],
        separator: [3, 7, 11, 15],
      },
    ],
  },
  {
    title: 'ボーナス',
    entries: [
      {
        name: 'ドラ',
        han: '1翻/枚',
        description: 'ドラ表示牌の次の牌（単独では和了不可）',
        tiles: [
          t('m', 3), t('m', 4), t('m', 5, true),
        ],
        note: '表示が3→4がドラ, 赤5も各1翻',
      },
      {
        name: '裏ドラ',
        han: '1翻/枚',
        description: 'リーチ和了時に追加されるドラ',
        tiles: [
          t('p', 7), t('p', 8), t('p', 9),
        ],
        note: 'リーチ時のみ有効',
      },
    ],
  },
]

export function YakuListModal({ onClose }: YakuListModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(0)
  const categories = yakuData

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2">
      <div className="w-full max-w-[600px] border-2 border-white bg-[#2d5016] shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="p-3 border-b-2 border-gray-300 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white m-0">役一覧</h3>
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-white text-sm font-bold cursor-pointer transition-all bg-[#3d6b20] text-white hover:bg-[#2d5016]"
            >
              閉じる
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-1 mb-0">実装済みの役と和了形の例</p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-500 shrink-0 bg-[#1a2e0a]">
          {categories.map((cat, idx) => (
            <button
              key={cat.title}
              onClick={() => setSelectedCategory(idx)}
              className={`px-3 py-1.5 text-xs font-bold border rounded cursor-pointer transition-all ${
                selectedCategory === idx
                  ? 'bg-white text-[#2d5016] border-white'
                  : 'bg-transparent text-gray-300 border-gray-500 hover:bg-[#2d5016] hover:text-white'
              }`}
            >
              {cat.title}（{cat.entries.length}）
            </button>
          ))}
        </div>

        {/* Yaku list */}
        <div className="overflow-y-auto flex-1 p-2">
          <div className="flex flex-col gap-2">
            {categories[selectedCategory].entries.map((yaku, idx) => (
              <div key={idx} className="border border-gray-500 bg-[#3d6b20] p-2.5 rounded">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-white font-bold text-sm">{yaku.name}</span>
                  <span className="text-yellow-300 text-xs font-bold whitespace-nowrap">{yaku.han}</span>
                </div>
                <p className="text-gray-200 text-xs m-0 mb-2">{yaku.description}</p>
                <div className="bg-[#1a2e0a] border border-gray-600 rounded p-2">
                  <TileRow tiles={yaku.tiles} separator={yaku.separator} height={30} width={21} />
                </div>
                {yaku.note && (
                  <p className="text-gray-400 text-[11px] mt-1.5 mb-0 italic">※ {yaku.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

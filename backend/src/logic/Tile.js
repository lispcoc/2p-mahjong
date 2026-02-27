class Tile {
  constructor (suit, number, isRed = false) {
    this.suit = suit // 'man' (萬子), 'pin' (筒子), 'sou' (索子), 'honor' (字牌)
    this.number = number // 1-9 for suits, 1-7 for honors
    this.isRed = isRed // 赤ドラかどうか
  }

  equals (other) {
    return this.suit === other.suit && this.number === other.number
  }

  /**
   * isRedを含めた完全一致。赤ドラと通常牌を区別する必要がある場合に使用
   */
  exactEquals (other) {
    return this.suit === other.suit && this.number === other.number && this.isRed === other.isRed
  }

  toString () {
    const suitChar = {
      man: '萬',
      pin: '筒',
      sou: '索',
      honor: '字'
    }[this.suit]

    const numberChar = {
      1: '一',
      2: '二',
      3: '三',
      4: '四',
      5: '五',
      6: '六',
      7: '七',
      8: '八',
      9: '九'
    }[this.number]

    if (this.suit === 'honor') {
      const honorChar = ['', '東', '南', '西', '北', '白', '發', '中'][
        this.number
      ]
      return honorChar
    }

    return `${numberChar}${suitChar}`
  }

  getNextTile () {
    if (this.suit === 'honor') {
      if (this.toString() === '中') {
        return new Tile('honor', 5) // 白に戻る
      } else if (this.toString() === '北') {
        return new Tile('honor', 1) // 東に戻る
      }
      return new Tile('honor', this.number + 1)
    }
    if (this.number < 9) {
      return new Tile(this.suit, this.number + 1)
    }
    return new Tile(this.suit, 1)
  }
}

module.exports = Tile

class Tile {
  constructor(suit, number) {
    this.suit = suit; // 'man' (萬子), 'pin' (筒子), 'sou' (索子), 'honor' (字牌)
    this.number = number; // 1-9 for suits, 1-7 for honors
  }
  
  equals(other) {
    return this.suit === other.suit && this.number === other.number;
  }
  
  toString() {
    const suitChar = {
      man: '萬',
      pin: '筒',
      sou: '索',
      honor: '字',
    }[this.suit];
    
    const numberChar = {
      1: '一',
      2: '二',
      3: '三',
      4: '四',
      5: '五',
      6: '六',
      7: '七',
      8: '八',
      9: '九',
    }[this.number];
    
    if (this.suit === 'honor') {
      const honorChar = ['', '東', '南', '西', '北', '白', '發', '中'][this.number];
      return honorChar;
    }
    
    return `${numberChar}${suitChar}`;
  }
}

module.exports = Tile;
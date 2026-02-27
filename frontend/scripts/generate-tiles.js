const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 50;
const HEIGHT = 70;
const OUT_DIR = path.join(__dirname, '..', 'public', 'tiles');

const numberChars = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

const suitColors = {
  man: { main: '#F7C948', dark: '#C99B1F' },
  pin: { main: '#F26C4F', dark: '#B94A32' },
  sou: { main: '#2ECC71', dark: '#1E8B4D' },
  honor: { main: '#9B59B6', dark: '#6E3C8D' },
  missing: { main: '#CCCCCC', dark: '#888888' },
};

const honorDisplay = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
  white: '白',
  green: '發',
  red: '中',
};

function tileDisplay(suit, numberOrKey) {
  if (suit === 'honor') {
    return honorDisplay[numberOrKey] || '?';
  }
  const num = numberChars[numberOrKey] || '?';
  const suitChar = suit === 'man' ? '萬' : suit === 'pin' ? '筒' : '索';
  return `${num}${suitChar}`;
}

function tileSvg(display, suit) {
  const colors = suitColors[suit] || suitColors.missing;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="${colors.main}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="46" height="66" rx="4" fill="url(#bg)" stroke="${colors.dark}" stroke-width="2"/>
  <rect x="5" y="6" width="40" height="10" rx="3" fill="url(#shine)"/>
  <text x="25" y="42" text-anchor="middle" font-size="24" font-weight="700" fill="#111" font-family="serif">${display}</text>
  <rect x="2" y="2" width="46" height="66" rx="4" fill="none" stroke="#222" stroke-width="1"/>
</svg>`;
}

async function generateTile(key, display, suit) {
  const svg = tileSvg(display, suit);
  const outPath = path.join(OUT_DIR, `${key}.png`);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const tasks = [];

  // Suited tiles
  ['man', 'pin', 'sou'].forEach((suit) => {
    for (let i = 1; i <= 9; i += 1) {
      const key = `${suit}_${i}`;
      const display = tileDisplay(suit, i);
      tasks.push(generateTile(key, display, suit));
    }
  });

  // Honor tiles
  Object.keys(honorDisplay).forEach((honorKey) => {
    const key = `honor_${honorKey}`;
    const display = tileDisplay('honor', honorKey);
    tasks.push(generateTile(key, display, 'honor'));
  });

  // Missing tile placeholder
  tasks.push(generateTile('missing', '?', 'missing'));

  await Promise.all(tasks);
  console.log(`Generated ${tasks.length} tile images in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

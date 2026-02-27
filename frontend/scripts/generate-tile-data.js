/**
 * タイル画像をBase64 Data URLに変換し、TypeScriptモジュールとして出力する。
 * 実行: node scripts/generate-tile-data.js
 * 出力: utils/tileData.ts
 */
const fs = require('fs');
const path = require('path');

const TILES_DIR = path.join(__dirname, '..', 'public', 'tiles');
const OUTPUT_FILE = path.join(__dirname, '..', 'utils', 'tileData.ts');

const files = fs.readdirSync(TILES_DIR).filter(f => f.endsWith('.gif') || f.endsWith('.png'));

const entries = [];
for (const file of files) {
  const filePath = path.join(TILES_DIR, file);
  const data = fs.readFileSync(filePath);
  const ext = path.extname(file).slice(1); // gif or png
  const mime = ext === 'png' ? 'image/png' : 'image/gif';
  const base64 = data.toString('base64');
  const key = path.basename(file, path.extname(file)); // e.g. "m1", "pai", "1000"
  entries.push({ key, dataUrl: `data:${mime};base64,${base64}` });
}

// Sort for readability
entries.sort((a, b) => a.key.localeCompare(b.key));

let output = `/**
 * タイル画像のBase64 Data URL マップ
 * 自動生成: node scripts/generate-tile-data.js
 * これによりタイル画像のHTTPリクエストがゼロになる
 */

export const TILE_IMAGES: Record<string, string> = {\n`;

for (const { key, dataUrl } of entries) {
  output += `  '${key}': '${dataUrl}',\n`;
}

output += `}

/**
 * タイルキーからData URLを取得する。
 * フォールバックとして /tiles/ パスを返す。
 */
export function getTileImageUrl(key: string): string {
  return TILE_IMAGES[key] || \`/tiles/\${key}.gif\`
}
`;

fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

const totalSize = (Buffer.byteLength(output, 'utf-8') / 1024).toFixed(1);
console.log(`Generated ${OUTPUT_FILE}`);
console.log(`  ${entries.length} images embedded`);
console.log(`  File size: ${totalSize} KB`);

# CLAUDE.md — Project Intelligence for Claude Code

このファイルはClaude Codeがプロジェクトを扱う際のガイドです。自動的に読み込まれ、コンテキストとして使用されます。

---

## プロジェクト概要

<!-- AUTO:OVERVIEW:START -->
二人麻雀のフルスタックリアルタイム対戦ゲーム。Next.js 14 フロントエンド + Express/WebSocket バックエンドのモノレポ構成。

- **バックエンド**: `backend/` — Node.js (Express + ws), CommonJS, ビルドステップなし（約8,644行）
- **フロントエンド**: `frontend/` — Next.js 14 + React 18 + TypeScript + Tailwind CSS 4（約4,580行）
- **テスト**: 21ファイル
- **ポート**: バックエンド `http://localhost:3001`, フロントエンド `http://localhost:3000`
<!-- AUTO:OVERVIEW:END -->

---

## コマンド集

### 起動
```bash
# ワンクリック起動（推奨）
.\Start-Game.ps1
# または
start-game.bat

# 初回セットアップ（npm install含む）
setup-and-start.bat
```

### バックエンド
```bash
cd backend
npm start          # 本番起動
npm run dev        # nodemon開発モード（ホットリロード）
```

### フロントエンド
```bash
cd frontend
npm run dev        # 開発サーバー
npm run build      # プロダクションビルド
npm run lint       # ESLint
```

### テスト実行
```bash
# 個別テスト（テストフレームワークなし、Node.js直接実行）
cd backend
node tests/test-kan-scenarios.js
node tests/test-cpu-battle.js

# CPU対戦バッチ
run-cpu-battle.bat
```

### タスク管理
```bash
cd backend
npm run task:list       # タスク一覧
npm run task:complete   # タスク完了
npm run task:progress   # 進捗表示
```

---

## アーキテクチャ

### バックエンドコアモジュール（`backend/src/logic/`）

<!-- AUTO:BACKEND_MODULES:START -->
| ファイル | 行数 |
|----------|------|
| `AIPlayer.js` | 898 |
| `GameRoom.js` | 1,348 |
| `MahjongLogic.js` | 2,827 |
| `ScoreCalculator.js` | 1,975 |
| `TenpaiChecker.js` | 446 |
| `Tile.js` | 66 |
<!-- AUTO:BACKEND_MODULES:END -->

### フロントエンド構成

<!-- AUTO:FRONTEND_STRUCTURE:START -->
| パス | 行数 |
|------|------|
| `frontend/types/GameTypes.ts` | 56 |
| `frontend/hooks/useGameConnection.ts` | 367 |
| `frontend/utils/DebugUtils.ts` | 27 |
| `frontend/utils/TenpaiChecker.ts` | 450 |
| `frontend/utils/tileData.ts` | 59 |
| `frontend/utils/TileUtils.ts` | 135 |
| `frontend/components/FuroDisplay.tsx` | 158 |
| `frontend/components/GameBoard/ConnectingScreen.tsx` | 43 |
| `frontend/components/GameBoard/DebugPanel.tsx` | 35 |
| `frontend/components/GameBoard/DoraAndKanning.tsx` | 80 |
| `frontend/components/GameBoard/GameHeader.tsx` | 57 |
| `frontend/components/GameBoard/GameInfo.tsx` | 111 |
| `frontend/components/GameBoard/OpponentDiscards.tsx` | 48 |
| `frontend/components/GameBoard/YourDiscards.tsx` | 40 |
| `frontend/components/GamePage.tsx` | 2,552 |
| `frontend/components/HomePage.tsx` | 620 |
| `frontend/components/LoginPage.tsx` | 73 |
| `frontend/components/Modals/FinalResultModal.tsx` | 130 |
| `frontend/components/Modals/HandEditorModal.tsx` | 181 |
| `frontend/components/Modals/ScoreResultModal.tsx` | 293 |
| `frontend/components/TileImage.tsx` | 101 |
| `frontend/components/TileInline.tsx` | 58 |
<!-- AUTO:FRONTEND_STRUCTURE:END -->

### WebSocketプロトコル

- Client → Server: `join`, `action`（discard/tsumo/pung/ron/tsumoAgari/riichi/kan）
- Server → Client: `joined`, `playerJoined`, `playerReconnected`, `gameStateUpdate`, `gameStarted`, `scoreResult`, `roomDeleted`, `error`

---

## コーディング規約

### モジュールシステム
- **バックエンド**: CommonJS（`require` / `module.exports`）
- **フロントエンド**: ESM（`import` / `export`）、`'use client'`ディレクティブ

### 命名規則
- 変数・メソッド: **camelCase** （`calculateShanten`, `tenpaiInfo`）
- クラス・コンポーネント: **PascalCase** （`GameRoom`, `TileImage`）
- 定数: **SCREAMING_SNAKE_CASE** （`DEVELOPMENT_MODE`）
- バックエンドファイル: PascalCase（`GameRoom.js`）
- テストファイル: kebab-case（`test-kan-scenarios.js`）
- フロントエンドコンポーネント: PascalCase（`GamePage.tsx`）

### コメント言語
- **日本語コメント + 英語識別子**が基本パターン
- ドメインロジックの説明は日本語（`// 嶺上牌から引いたか（嶺上開花用）`）
- 変数名・メソッド名は英語

### クラス設計パターン
- `TenpaiChecker` / `AIPlayer`: **staticメソッドのみ**のユーティリティクラス
- `ScoreCalculator`: ゲームごとにインスタンス化
- `GameRoom`: `MahjongLogic`インスタンスを所有しオーケストレーション
- `Tile`: イミュータブルなエンティティ（`equals()`はredを無視、`exactEquals()`はredも比較）

### Reactパターン
- 関数コンポーネント + hooks（`useState`, `useRef`, `useCallback`, `useEffect`）
- ステート管理はローカル（Redux/Zustand未使用）
- セッション永続化: `localStorage`（`mahjong-session`キー、24時間期限）
- 通知: `react-hot-toast`

---

## 麻雀ドメイン用語マッピング

コードで使われる英語 ↔ 麻雀用語の対応。新規コード追加時もこの命名に従うこと。

| コード用語 | 日本語 | 説明 |
|-----------|--------|------|
| `man` / `pin` / `sou` / `honor` | 萬子/筒子/索子/字牌 | `tile.suit` の値 |
| `tsumo` / `ron` | ツモ/ロン | 自摸和了/放銃和了 |
| `riichi` / `doubleRiichi` | リーチ/ダブルリーチ | 立直宣言 |
| `meld` / `furo` | 副露 | 鳴き面子 |
| `kan` | 槓 | 暗槓/加槓/大明槓 |
| `pung` | ポン | 刻子鳴き |
| `tenpai` | 聴牌 | アガリ1枚前 |
| `shanten` | 向聴数 | アガリまでの距離 |
| `dora` / `uraDora` / `redDora` | ドラ/裏ドラ/赤ドラ | ボーナス牌 |
| `furiten` | フリテン | ロン不可状態 |
| `han` / `fu` | 翻/符 | 得点計算単位 |
| `dealer` / `oya` | 親 | ラウンドディーラー |
| `roundWind` / `seatWind` | 場風/自風 | 風の割り当て |
| `haitei` / `houtei` / `rinshan` / `ippatsu` | 海底/河底/嶺上/一発 | 特殊和了条件 |
| `chiitoitsu` / `kokushi` | 七対子/国士無双 | 特殊手形 |
| `tsumoKiri` / `tedashi` | ツモ切り/手出し | 打牌の種類 |

---

## 牌の内部表現

### Tile クラス
```javascript
class Tile {
  suit    // 'man' | 'pin' | 'sou' | 'honor'
  number  // man/pin/sou: 1-9, honor: 1-7 (東南西北白發中)
  isRed   // boolean（赤ドラ）
}
```

### 34種牌インデックス（AIPlayer内）
- `man 1-9` → インデックス `0-8`
- `pin 1-9` → インデックス `9-17`
- `sou 1-9` → インデックス `18-26`
- `honor 1-7` → インデックス `27-33`

---

## テストの書き方

テストフレームワークは使用していない。Node.jsスクリプトとして直接実行するパターン：

```javascript
// backend/tests/test-example.js
const MahjongLogic = require('../src/logic/MahjongLogic');
const Tile = require('../src/logic/Tile');

console.log('🎯 テスト名');

// セットアップ
const game = new MahjongLogic({ dealerIndex: 0 });
// 手動で手牌をセット
game.players[0].hand = [
  new Tile('man', 1), new Tile('man', 2), new Tile('man', 3),
  // ...
];

// 検証
const result = someFunction();
if (result === expected) {
  console.log('✅ テスト通過: 説明');
} else {
  console.log('❌ テスト失敗: 説明');
  console.log(`  期待値: ${expected}, 実際: ${result}`);
}
```

テスト実行: `cd backend && node tests/test-example.js`

---

## 設定パラメータ

`GameRoom`コンストラクタのオプション：

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|---------|------|
| `gameMode` | `'oneRound'` \| `'easternsouthern'` \| `'endless'` | `'oneRound'` | ゲームモード |
| `initialScore` | number | 25000 | 初期持ち点 |
| `wallTiles` | number | 70 | 壁牌数 |
| `autoActionTimerSeconds` | number (3-60) | - | 自動アクションタイマー |
| `useRedDora` | boolean | true | 赤ドラ使用 |
| `tsumoLuckSettings` | object | - | ツモ運バイアス |
| `testMode` | boolean | false | テストモード |

数値パラメータは`Number.isFinite()` + `Math.min/max/floor`でバリデーション。

---

## よくある開発タスクのガイド

### 新しい役を追加する場合
1. `ScoreCalculator.js` に役判定メソッドを追加
2. `calculateScore()` 内で翻数を加算するロジックを追加
3. `backend/tests/test-新役名.js` にテストを作成
4. テスト実行して検証

### 新しいAI戦略を追加する場合
1. `AIPlayer.js` にstaticメソッドとして実装
2. `evaluateDiscard()` のスコアリングに新要素を統合
3. CPU対戦テスト（`test-cpu-battle.js`）で効果を検証

### フロントエンドにUI機能を追加する場合
1. `frontend/types/GameTypes.ts` に必要な型を追加
2. `frontend/components/` にコンポーネントを作成（PascalCase）
3. `GamePage.tsx` から利用
4. Tailwind CSSでスタイリング

### WebSocketメッセージを追加する場合
1. `backend/src/server.js` のメッセージハンドラーに新タイプを追加
2. `frontend/hooks/useGameConnection.ts` に受信ハンドラーを追加
3. `frontend/types/GameTypes.ts` に型を追加

### 新しいテストを追加する場合
1. `backend/tests/test-機能名.js` を作成
2. CommonJSで必要なモジュールをrequire
3. 手動セットアップ → 実行 → console.logで検証
4. `node tests/test-機能名.js` で実行確認

---

## 技術スタック（自動検出）

<!-- AUTO:TECH_STACK:START -->
### バックエンド依存関係

| パッケージ | バージョン | 種類 |
|-----------|-----------|------|
| cors | ^2.8.5 | dependencies |
| express | ^4.18.2 | dependencies |
| uuid | ^9.0.0 | dependencies |
| ws | ^8.14.2 | dependencies |
| nodemon | ^3.0.2 | devDependencies |

### フロントエンド依存関係

| パッケージ | バージョン | 種類 |
|-----------|-----------|------|
| next | ^14.0.0 | dependencies |
| react | ^18.2.0 | dependencies |
| react-dom | ^18.2.0 | dependencies |
| react-hot-toast | ^2.6.0 | dependencies |
| ws | ^8.14.2 | dependencies |
| @tailwindcss/postcss | ^4.1.18 | devDependencies |
| @types/node | 25.2.2 | devDependencies |
| @types/react | 19.2.13 | devDependencies |
| autoprefixer | ^10.4.24 | devDependencies |
| eslint | ^8.50.0 | devDependencies |
| eslint-config-next | ^14.0.0 | devDependencies |
| postcss | ^8.5.6 | devDependencies |
| sharp | ^0.33.5 | devDependencies |
| tailwindcss | ^4.1.18 | devDependencies |
<!-- AUTO:TECH_STACK:END -->

---

## 注意点・落とし穴

- **Tile.equals()はredを無視する**: 赤ドラを区別する必要がある場合は`exactEquals()`を使用
- **TenpaiChecker/AIPlayerはstatic**: `new`でインスタンス化せずクラスメソッドとして呼び出す
- **同型コード**: `TenpaiChecker`はバックエンド（JS）とフロントエンド（TS）に同じロジックが存在する。変更時は**両方を更新**すること
- **テストにフレームワークなし**: 素のNode.jsスクリプト。console.logとif文で検証
- **手牌枚数**: 通常13枚、ツモ後14枚。槓後は嶺上ツモで14枚に戻る
- **フリテンは3種類**: 捨て牌フリテン、同巡フリテン、リーチ後見逃しフリテン（永続）
- **GameRoom.jsのクリーンアップ**: 非アクティブルームは5分で自動削除される

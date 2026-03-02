# CLAUDE.md — Project Intelligence for Claude Code

このファイルはClaude Codeがプロジェクトを扱う際のガイドです。自動的に読み込まれ、コンテキストとして使用されます。

---

## プロジェクト概要

<!-- AUTO:OVERVIEW:START -->
二人麻雀のフルスタックリアルタイム対戦ゲーム。Next.js 14 フロントエンド + Express/WebSocket バックエンドのモノレポ構成。

- **バックエンド**: `backend/` — Node.js (Express + ws), CommonJS, ビルドステップなし（約8,889行）
- **フロントエンド**: `frontend/` — Next.js 14 + React 18 + TypeScript + Tailwind CSS 4（約5,359行）
- **テスト**: 19ファイル
- **ポート**: バックエンド `http://localhost:3001`, フロントエンド `http://localhost:3000`
<!-- AUTO:OVERVIEW:END -->

---

## コマンド集

### 起動
```bash
# Server Manager（GUI）から起動
manager\launch.bat

# 手動起動（ターミナル2つ必要）
cd backend && npm run dev     # バックエンド
cd frontend && npm run dev    # フロントエンド
```

### バックエンド
```bash
cd backend
npm start          # 本番起動（node src/server.js）
npm run dev        # nodemon開発モード（ホットリロード）
```

### フロントエンド
```bash
cd frontend
npm run dev            # 開発サーバー
npm run build          # プロダクションビルド
npm start              # プロダクション起動
npm run lint           # ESLint
npm run generate-tiles # 牌画像データ生成
```

### テスト実行
```bash
cd backend
npm test               # 全テスト一括実行（16ファイル、推奨）
npm run test:verbose   # 全テスト詳細出力
npm run test:quiet     # サマリーのみ

# 個別テスト（特定テストのデバッグ時）
node tests/test-yaku-detection.js

# CPU対戦シミュレーション（長時間、別枠）
run-cpu-battle.bat
```

### メンテナンス
```bash
cd backend
npm run update-claude  # CLAUDE.mdの自動更新セクションを再生成
npm run task:list      # タスク一覧
npm run task:complete  # タスク完了
npm run task:progress  # 進捗表示
npm run task:generate  # タスク生成
```

---

## アーキテクチャ

### バックエンドコアモジュール（`backend/src/logic/`）

<!-- AUTO:BACKEND_MODULES:START -->
| ファイル | 行数 |
|----------|------|
| `AIPlayer.js` | 898 |
| `GameRoom.js` | 1,364 |
| `MahjongLogic.js` | 2,841 |
| `ScoreCalculator.js` | 2,171 |
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
| `frontend/components/HomePage.tsx` | 702 |
| `frontend/components/LoginPage.tsx` | 76 |
| `frontend/components/Modals/FinalResultModal.tsx` | 130 |
| `frontend/components/Modals/HandEditorModal.tsx` | 181 |
| `frontend/components/Modals/ScoreResultModal.tsx` | 295 |
| `frontend/components/Modals/YakuListModal.tsx` | 692 |
| `frontend/components/TileImage.tsx` | 101 |
| `frontend/components/TileInline.tsx` | 58 |
<!-- AUTO:FRONTEND_STRUCTURE:END -->

### WebSocketプロトコル

- Client → Server: `join`, `action`（discard/tsumo/pung/ron/tsumoAgari/riichi/kan/nextRound）, `rematch`
- Server → Client: `joined`, `playerJoined`, `playerLeft`, `playerReconnected`, `gameStateUpdate`, `gameStarted`, `scoreResult`, `rematchRequested`, `roomDeleted`, `error`

### 設定の一元管理（`backend/src/settings.js`）

すべてのマジックナンバーは `settings.js` に集約。新しい定数を追加する場合は必ずここに定義すること。

| カテゴリ | 主な設定 |
|---------|--------|
| `server` | ポート番号 |
| `game` | プレイヤー数、初期点、配牌枚数、リーチ供託、ノーテン罰符 |
| `wall` | 壁牌数の上下限、嶺上牌数、ドラ表示牌候補数 |
| `timers` | 自動アクション、ルーム削除、切断猶予（10分） |
| `cpuDelays` | AIの思考遅延、ポン/カン後遅延 |
| `tsumoLuck` | 配牌運のレベル別試行回数・選択確率 |

### 環境変数

| 変数 | 使用箇所 | デフォルト |
|------|---------|--------|
| `PORT` | バックエンド | `3001` |
| `NEXT_PUBLIC_BACKEND_URL` | フロントエンド（WS） | `ws://localhost:3001` |
| `NEXT_PUBLIC_BACKEND_URL_HTTP` | フロントエンド（HTTP） | `http://localhost:3001` |

`.env`ファイルは使用していない。すべてハードコードのフォールバック値あり。

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

> **完全版は [`TERMINOLOGY.md`](TERMINOLOGY.md) を参照。**  
> 牌の種類・手牌構造・役一覧・アクション名・WebSocketプロトコルなど全用語を網羅しています。

コードで使われる英語 ↔ 麻雀用語の主要対応（クイックリファレンス）。  
新規コード追加時もこの命名に従うこと。

| コード用語 | 日本語 | 説明 |
|-----------|--------|------|
| `man` / `pin` / `sou` / `honor` | 萬子/筒子/索子/字牌 | `tile.suit` の値 |
| `tsumo` / `ron` | ツモ/ロン | 自摸和了/放銃和了 |
| `riichi` / `doubleRiichi` | リーチ/ダブルリーチ | 立直宣言 |
| `meld` | 副露 | 鳴き面子（`melds` 配列） |
| `pung` | ポン | 刻子鳴き |
| `kan` / `daiminkan` / `ankan` / `kakan` | 槓/大明槓/暗槓/加槓 | カンの種別 |
| `tenpai` | 聴牌 | アガリ1枚前 |
| `shanten` | 向聴数 | アガリまでの距離（-1=和了形） |
| `dora` / `uraDora` / `redDora` | ドラ/裏ドラ/赤ドラ | ボーナス牌 |
| `furiten` / `tempFuriten` / `riichiPassFuriten` | フリテン/同巡/リーチ後永続 | ロン不可状態の種別 |
| `han` / `fu` | 翻/符 | 得点計算単位 |
| `dealer` / `dealerIndex` | 親 | ラウンドディーラー |
| `roundWind` / `seatWind` | 場風/自風 | 風の割り当て（番号: 1=東 2=南 3=西 4=北） |
| `isHaitei` / `isHoutei` / `isRinshan` / `isIppatsumari` | 海底/河底/嶺上/一発 | 特殊和了条件フラグ |
| `chiitoitsu` / `kokushi` | 七対子/国士無双 | 特殊手形 |
| `isTsumogiri` / `tedashi` | ツモ切り/手出し | `discardFlags` の打牌種別 |
| `combination.pair` | 雀頭 | 和了形の対子部分 |
| `combination.melds` | 面子 | 和了形の面子配列（順子/刻子/槓子） |

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
| `notenPenalty` | boolean | false | ノーテン罰符 |
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
3. 手動セットアップ → 実行 → `✅`/`❌` + `結果: N/N` 形式で検証
4. `node tests/test-機能名.js` で実行確認
5. **`tests/run-all-tests.js` の `testFiles` 配列にファイル名を追加**

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

## 重要な開発ルール

### 変更前に必ず確認
- **ロジック変更後は `cd backend && npm test` を実行**して全テスト通過を確認
- **`TenpaiChecker`を変更したら、バックエンド（JS）とフロントエンド（TS）の両方を更新**すること
- **定数・マジックナンバーは `settings.js` に定義**。ロジックファイルに直接書かない
- **テストを追加したら `run-all-tests.js` のテストファイル一覧にも追加**すること

### テスト結果の判定ルール
- テストは `✅` / `✓` / `✔` マーカー + `結果: N/N` パターンで成否を出力
- テストランナーはこれらを解析して集計する。新規テストもこの形式に従うこと
- 各テストファイルのタイムアウトは60秒

---

## 注意点・落とし穴

- **Tile.equals()はredを無視する**: 赤ドラを区別する必要がある場合は`exactEquals()`を使用
- **TenpaiChecker/AIPlayerはstatic**: `new`でインスタンス化せずクラスメソッドとして呼び出す
- **同型コード**: `TenpaiChecker`はバックエンド（JS）とフロントエンド（TS）に同じロジックが存在する。変更時は**両方を更新**すること
- **テストにフレームワークなし**: 素のNode.jsスクリプト。console.logとif文で検証
- **手牌枚数**: 通常13枚、ツモ後14枚。槓後は嶺上ツモで14枚に戻る
- **フリテンは3種類**: 捨て牌フリテン、同巡フリテン、リーチ後見逃しフリテン（永続）
- **GameRoom.jsのクリーンアップ**: 非アクティブルームは5分で自動削除される
- **データベースなし**: すべての状態はインメモリ（Mapオブジェクト）。サーバー再起動で全ゲームが消える
- **package-lock.jsonはgitignore対象**: 依存関係のバージョンロックなし。`npm install`の結果が環境により変わりうる
- **バックエンドにlint設定なし**: フロントエンドのみESLint（`next/core-web-vitals`）
- **`manager/`はnw.jsアプリ**: バックエンド/フロントエンドの起動管理GUIで、ゲームロジックとは独立

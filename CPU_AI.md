# CPU AI Implementation

## 概要

CPUプレイヤーが「ツモ切り」（引いた牌を無条件に捨てる）だけではなく、戦略的な打ち方をするようになりました。

## 実装内容

### 新規ファイル
- **`backend/src/logic/AIPlayer.js`** - CPU用の麻雀AI戦略エンジン

### 修正ファイル
- **`backend/src/logic/GameRoom.js`** - AIPlayerの統合、ツモ切りモード管理
- **`backend/src/logic/MahjongLogic.js`** - `isPlayerRiichi()`メソッド追加

### テストファイル
- `backend/tests/test-ai-player.js` - AIの基本機能テスト
- `backend/tests/test-ai-analysis.js` - AIのスコアリング分析
- `backend/tests/test-gameroom-ai.js` - GameRoomのAI統合テスト

## AI戦略 (AIPlayer.js)

### chooseDiscard() - ディスカード牌の選択

```javascript
chooseDiscard(hand, drawnTileIndex, isRiichi = false, gameState = {})
```

以下の優先順位でディスカード牌を決定：

1. **テンパイ状態** (ボーナス: 5000点)
   - テンパイ後の手牌を検出し、テンパイ状態が最高優先度
   - テンパイ状態の場合、和了牌の数が多いほど追加ボーナス

2. **危険度評価**
   - 相手がリーチしている場合、危険牌を避ける
   - 相手が捨てた牌の周辺牌は比較的安全

3. **牌の有用性** (係数: 1.5倍)
   - **孤立した牌** (周りに似た牌がない) → ボーナス（削除推奨）
   - **複合する牌** (周りに似た牌がある) → ペナルティ（保持推奨）

4. **手の整形度**
   - スーツが集中している手牌にボーナス
   - 連続する数字が多い場合に追加ボーナス

### ツモ切りモード（テスト用）

引いた牌を無条件に捨てるモード。テスト用に保持されています：

```javascript
// ツモ切りモード有効化
room.setCPUTsumoKiriMode(userId, true);

// ツモ切りモード確認
const isTsumoKiriMode = room.getCPUTsumoKiriMode(userId);
```

### リーチ中の挙動

リーチしている場合、CPUは自動的に引いた牌をツモ切り（ツモ切りモード同然）します。

## GameRoomでの使用方法

### CPUプレイヤーの作成

```javascript
// CPUプレイヤーを追加
room.addPlayer('cpu-player-id', 'Computer', null, true);

// AIPlayerが自動で初期化されます
// デフォルト: 戦略的な打ち方（ツモ切りモードOFF）
```

### CPU自動プレイ

```javascript
// CPU自動実行（既存コード同じ）
room.executeCPUTurn(callback);
```

内部で以下が実行：
1. `executeCPUTurn()` - ドロー処理
2. `executeCPUDiscard()` - AIで最適な牌を選んで捨てる

### テスト用ツモ切りモード

```javascript
// テスト: ツモ切りモード有効
room.setCPUTsumoKiriMode('cpu-player-id', true);
room.executeCPUTurn(callback); // ツモ切りで動作

// テスト: 通常モード（戻す）
room.setCPUTsumoKiriMode('cpu-player-id', false);
room.executeCPUTurn(callback); // 戦略的な打ち方で動作
```

## テスト実行方法

```bash
# AI基本機能テスト
cd backend
node tests/test-ai-player.js

# AI戦略分析（スコアリング詳細表示）
node tests/test-ai-analysis.js

# GameRoom統合テスト
node tests/test-gameroom-ai.js
```

## 今後の改善案

1. **相手プレイヤーのリーチ検知**
   - 相手のリーチ状態を考慮した危険牌回避

2. **点数状況の考慮**
   - 点数が負けている場合は積極的なプレイ
   - 点数がリードしている場合は防守的なプレイ

3. **相手の捨て牌パターン分析**
   - 相手の待ちを推摩して危険牌ランクを動的計算

4. **メルド（副露）の活用**
   - 複合性が低い場合、ポン・チーで牌を活用

5. **七対子・国士無双などの特殊役の認識**
   - 特殊役向けの手作り判定

## 技術仕様

- **言語**: JavaScript (Node.js)
- **依存**: TenpaiChecker （既存: 聴牌判定エンジン）
- **算法**: スコアベースの多目的評価関数

## 互換性

- 既存のゲーム進行コード完全互換
- API破壊なし
- ツモ切りモードでテスト検証可能

## 追加実装（フェーズ2）

### CPU自動和了・ロン・ポン機能

CPUプレイヤーが以下を自動実行するようになりました：

1. **ツモ和了** - 和了可能な手で自動宣言
2. **ロン** - 他家の捨て牌で和了を自動宣言  
3. **ポン** - 無意味な副露を回避した知的決定

詳細は [WIN_PUNG_RON_IMPLEMENTATION.md](WIN_PUNG_RON_IMPLEMENTATION.md) を参照

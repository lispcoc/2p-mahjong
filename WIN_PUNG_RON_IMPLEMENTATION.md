# CPU Win/Pung/Ron Implementation

## 📋 実装完了内容

### 1. CPU自動和了（ツモ和了）

**実装ファイル:** GameRoom.js - `executeCPUAfterDraw()`

```javascript
executeCPUAfterDraw(userId, callback) {
  // ツモ和了可能かチェック
  if (this.gameLogic.isWinningHand(userId)) {
    if (aiPlayer.shouldWin()) {
      // ツモ和了を宣言
      this.handlePlayerAction(userId, { type: 'win' });
    }
  }
}
```

**特徴:**
- ツモで和了可能な手をAIが自動判定
- 役がない場合は自動的に処理されない（サーバー側で検証）
- ドロー後に常に和了チェック

### 2. CPU自動ロン

**実装ファイル:** GameRoom.js - `executeCPURon()`

```javascript
executeCPURon(userId, callback) {
  if (aiPlayer.shouldTakeRon()) {
    // ロンを実行
    this.handlePlayerAction(userId, { type: 'ron' });
  }
}
```

**特徴:**
- ロン可能状態（`ronPossibleFor`）を自動検知
- AIプレイヤーが判定して自動宣言
- ロン失敗時は自動的にdraw（フリテン対応）

### 3. CPU知的なポン決定

**実装ファイル:** AIPlayer.js - `shouldPung()`

重要: **無意味なポンを回避** するロジック

```javascript
shouldPung(hand, discardedTile, melds = []) {
  const afterPungHand = hand.slice();
  
  // 1. テンパイに近づくかチェック
  const currentWinningTiles = TenpaiChecker.getWinningTiles(afterPungHand, melds);
  if (currentWinningTiles.length > 0) {
    return true; // テンパイに近づくならポン
  }
  
  // 2. 複合性を評価
  const pungComplexity = this.evaluateHandComplexity(afterPungHand);
  if (melds.length === 0 && pungComplexity > 30) {
    return true; // 複合性が高いならポン
  }
  
  // 3. それ以外は無意味なポンとして回避
  return false;
}
```

**判定基準:**
- ✅ テンパイに近づく→ ポン実施
- ✅ スーツが集中している (スーツ複合性 > 30) → ポン実施
- ❌ テンパイに遠い＆複合性低い → ポン不実施（draw代わり）

### 4. GameRoomの自動実行フロー

**実装:** GameRoom.js - `executeCPUTurn()`

実行順序:
```
executeCPUTurn()
  ↓
  1️⃣ ロン可能状態を確認
     ├─ YES → executeCPURon() 実行
     └─ NO → 次へ
  ↓
  2️⃣ ポン待機状態を確認
     ├─ YES → executeCPUPung() 実行
     └─ NO → 次へ
  ↓
  3️⃣ 通常のターン処理
     ├─ ドロー必要？ → executeCPUMainTurn() で draw
     └─ ツモ和了可能？ → executeCPUAfterDraw() で win
  ↓
  4️⃣ ディスカード処理
     └─ executeCPUDiscard() で最適な牌を選択
```

## 🔧 修正・追加ファイル

### 修正ファイル
1. **backend/src/logic/AIPlayer.js**
   - `shouldWin()` メソッド追加
   - `shouldTakeRon()` メソッド追加
   - `shouldPung()` メソッド追加（複合性とテンパイを考慮）
   - `evaluateHandComplexity()` メソッド追加

2. **backend/src/logic/GameRoom.js**
   - `executeCPUTurn()` 全面リファクタリング
   - `executeCPUMainTurn()` 新規メソッド
   - `executeCPUAfterDraw()` 新規メソッド
   - `executeCPURon()` 新規メソッド
   - `executeCPUPung()` 新規メソッド

3. **backend/src/logic/MahjongLogic.js**
   - `getLastDiscard()` メソッド追加

### テストファイル
- `backend/tests/test-cpu-win-pung.js` - 和了・副露ロジックのテスト
- `backend/tests/test-integration-cpu-actions.js` - 統合テスト

## 📊 ポン判定の詳細

### 複合性スコア計算

```javascript
evaluateHandComplexity(hand) {
  let complexityScore = 0;

  // スーツ集中度
  if (suitCounts[0] >= 6) {
    complexityScore += 40; // 6枚以上同じスーツ
  } else if (suitCounts[0] >= 5) {
    complexityScore += 20; // 5枚以上同じスーツ
  }

  // 連続性
  for (let i = 1; i < 8; i++) {
    if ((numbers[i] || 0) > 0 && (numbers[i + 1] || 0) > 0) {
      complexityScore += 5; // 連続する数字
    }
  }

  return complexityScore;
}
```

### ポン判定のフローチャート

```
牌がポンできる？
  ├─ NO → スキップ
  └─ YES ↓
    テンパイに近づく？
      ├─ YES → ポンする ✅
      ├─ NO ↓
    複合性が高い？(>30)
      ├─ YES → ポンする ✅
      ├─ NO ↓
    無意味なポン判定
      └─ draw を選択 ❌
```

## 🎮 ゲームでの動作

CPUプレイヤーは以下のアクションを**自動的に**実行します：

1. **ツモ和了** - 和了可能な手であれば自動宣言
2. **ロン** - ロン可能状態で自動宣言
3. **ポン** - テンパイ近い or 複合性高い場合のみ実施
4. **ディスカード** - 戦略的に最適な牌を選択（テンパイ優先）

## ✅ テスト方法

```bash
cd backend

# 和了・副露ロジックテスト
node tests/test-cpu-win-pung.js

# 統合テスト
node tests/test-integration-cpu-actions.js

# 完全なゲームテスト
npm start
# ブラウザでCPUと対戦
```

## 🔍 無意味なポン回避例

### 回避するパターン

```
手牌: [1m, 5p, 1s, 2s, 3h, 4h, 5h, 6h]
捨て牌: [1m]

複合性スコア: 5（低い）
テンパイ一覧: [] （テンパイでない）

判定: ❌ ポンしない → draw を選択
```

### ポンするパターン

```
手牌: [1m, 1m, 2m, 3m, 4m, 5m, 6m, 2p]
捨て牌: [1m]

複合性スコア: 50（高い）
テンパイ一覧: [1m, 2m, 3m, 4m, 5m, 6m, 7m]（充実）

判定: ✅ ポンする
```

## 互換性

- ✅ 既存のゲーム進行完全互換
- ✅ ツモ切りモード残存（テスト用）
- ✅ 人間プレイヤーの操作に影響なし
- ✅ サーバーサイド検証と連携

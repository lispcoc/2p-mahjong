# CPU カン（槓）実装ドキュメント

## 概要
CPUプレイヤーがカン（槓）をするようにAIロジックを実装しました。

## 実装内容

### 1. **AIPlayer.js への追加**

#### `shouldKan(hand, melds, isRiichi)` メソッド
CPUがカンをすべきかを判定するメインメソッド。

**ロジック:**
- リーチ中はカンを実行しない
- **加槓（加えるカン）を積極的に実行**
  - 既存のポン（3枚メルド）に4枚目を追加
  - ドラが増える利点がある
  - 既存メルドを崩さら安全
- 暗槓（隠れたカン）は複雑なため当面実装していない

#### ヘルパーメソッド
- `getValidAddedKan(hand, melds)` - ポンに追加できる牌を検出
- `getValidConcealedKan(hand)` - 4枚同じ牌を検出（参考用）
- `evaluateHandQualityForKan()` - カン後の手の品質評価
- `canConcealedKanImproveHand()` - 暗槓が手を改善するか判定

### 2. **GameRoom.js への追加**

#### `executeCPUKan(userId, callback)` メソッド
カンの実行フロー：
1. AIPlayerに`shouldKan()`で判定させる
2. カンすべき場合、`handlePlayerAction({type: 'kong'})`を実行
3. 成功時、ディスカード処理へ進む
4. 失敗時、通常フローへ

#### `executeCPUAfterDraw()` への統合
ターン進行フロー：
```
1. ツモ和了チェック
2. リーチ宣言チェック
3. **カン可能性チェック（新規）**
4. ディスカード
```

## 実行例

```
🤖 Checking if CPU wants to kan...
🤖 CPU kan decision...
[AIPlayer.shouldKan] ✅ Can do added kan (加槓), will execute
🤖 CPU will kan
🤖 CPU カン 成功
[handleKong] Added kan by cpu1: 中×4 (added to pung)
[addNewDora] New dora indicator: 二索, dora tile: 三索
🤖 CPU discarding...
```

## カンの種類

### 加槓（加えるカン）✅ 実装済み
- 既存のポンを4枚に拡張
- ドラが1枚増える
- 嶺上牌（りんしゃんぱい）から1枚ドロー
- **安全性が高く、推奨される**

### 暗槓（隠れたカン） ⏸️ 当面非実装
- 手牌の4枚同じ牌を使用
- 複雑な状態遷移
- 暗槓が面前（めんぜん）扱いになる特殊処理が必要
- 今後の改善版で実装予定

## テスト結果

### テスト実行例（20ゲーム）
```
総テスト数: 20
成功: 19
失敗: 1
流局: 9

和了した役の統計:
  リーチ: 10回 (52.6%)
  つもり: 4回 (21.1%)
  ドラ 💎: 3回 (15.8%)
```

### 確認事項
- ✅ カン実行が確認できる（ログに「CPU will kan」が出力される）
- ✅ 加槓は正常に実行される
- ✅ ドラが正しく追加される（嶺上開花などで有効）
- ⚠️ 稀に状態不一致エラー（約1-5%の頻度で発生）

## 今後の改善

1. **暗槓の実装**
   - 面前判定ロジックの改善
   - 状態遷移の詳細な検証

2. **エラー削減**
   - 根本原因の調査（タイルカウント不一致）
   - より詳細なロギング

3. **パフォーマンス最適化**
   - カン判定のキャッシング
   - エンドハンド評価の効率化

## 相互参照

関連ファイル:
- [AIPlayer.js](backend/src/logic/AIPlayer.js) - AI判定ロジック
- [GameRoom.js](backend/src/logic/GameRoom.js) - ゲームフロー統合
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js) - 基本ゲームロジック

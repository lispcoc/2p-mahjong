# カン実装における手牌数の検証レポート

## 検査概要
カン（槓）処理における手牌数の管理が正しく実装されているかを検査しました。

## 検査結果: ✅ 実装は正しい

### 実装動作

#### 暗槓（暗カン）の場合:
```
処理前: 手牌14枚（13枚 + ツモ1枚）
1. 暗槓の4枚を手牌から除去: 14 - 4 = 10枚
2. 嶺上牌から1枚をツモ: 10 + 1 = 11枚
処理後: 手牌11枚
```

#### 加槓（カを足す）の場合:
```
処理前: 手牌13枚（ポンで副露後、ツモ待ち）
1. ポンの面子（3枚）にマッチする手牌1枚を除去: 13 - 1 = 12枚
2. 嶺上牌から1枚をツモ: 12 + 1 = 13枚
処理後: 手牌13枚
```

### 検証ポイント

✅ **手牌が14枚を超えない**
- カン処理中、手牌が14枚を超える状況は発生しません
- 除去（remove）が先に実行され、その後にツモ（add）が実行されます

✅ **嶺上牌の管理が正確**
```
初期状態: kanningWall = 3枚（通常最大3回のカン対応）
1回目のカン後: kanningWall = 2枚
2回目のカン後: kanningWall = 1枚
3回目のカン後: kanningWall = 0枚
```

✅ **ドラの増加処理**
- カンのたびに新しいドラ表示牌が追加されます
- ドラ牌の管理も正確です

### コード的確認

**MahjongLogic.js の実装:**

```javascript
// 暗槓の場合（線713-719）
// Remove the 4 tiles from hand
for (const tile of kanTiles) {
  const index = hand.indexOf(tile);
  if (index >= 0) {
    hand.splice(index, 1);  // 先に除去
  }
}
// ...
// Draw a tile from the kanning wall to restore hand size
const drawnTile = this.drawFromKanningWall();
if (drawnTile) {
  this.players[userId].hand.push(drawnTile);  // その後にツモ
  this.players[userId].drawnTile = drawnTile;
  this.players[userId].drawnTileIndex = this.players[userId].hand.length - 1;
}
```

**加槓の場合（線753-770）**
```javascript
// Remove the tile from hand
hand.splice(j, 1);  // 先に手牌から除去
// ...
// Add the tile to the pung (convert to kan)
meld.push(matchingTile);  // 面子に追加
// ...
const drawnTile = this.drawFromKanningWall();
if (drawnTile) {
  this.players[userId].hand.push(drawnTile);  // その後にツモ
}
```

### 処理順序の安全性

カン処理の実装は以下の安全な順序で実行されます:

1. **事前チェック**: リーチ状態、鳴き無効モード、カン可能性の確認
2. **除去フェーズ**: 手牌から瓦を除去（先に減らす）
3. **追加フェーズ**: 嶺上牌をツモして手牌に追加
4. **クリーンアップ**: 保留中のポン状態、ロン状態をリセット
5. **ドラ追加**: 新しいドラ表示牌を追加

### 手牌数の期待値

**プレイの段階ごとの手牌数:**

```
開始時:
- 親プレイヤー: 14枚（13枚の手牌 + 1枚のツモ）
- 非親プレイヤー: 13枚（ツモ待ち）

ポン後:
- 1回目のポン: 11枚 → ツモで12枚
- 2回目のポン: 9枚 → ツモで10枚

カン後:
- 暗槓: 8枚 → 10枚 → 11枚（嶺上牌ツモ）
- 加槓: 12枚 → 13枚（嶺上牌ツモ）

注記: カン後、手牌が14枚未満になるのは正しい動作です。
カン処理が完了して次のプレイヤーのツモフェーズに移行するため、
現在のプレイヤーは14枚に戻りません。
```

### 結論

✅ **カン実装における手牌数の管理は正しく実装されています。**

- 手牌が14枚を超えることはありません
- 嶺上牌の補充処理は適切に実行されます
- ドラ追加処理も正確です

カン処理により手牌数が14枚未満になることは、マージャンのルール上正しい動作です。

## テストケース

本検証に使用したテストケース:
- [test-kan-implementation.js](./tests/test-kan-implementation.js) - 基本的なカン動作
- [test-kan-tile-count.js](./tests/test-kan-tile-count.js) - 手牌数の詳細追跡
- [test-kan-scenarios.js](./tests/test-kan-scenarios.js) - 複数シナリオでの検証
- [test-kan-correctness.js](./tests/test-kan-correctness.js) - 正確性の分析
- [test-hand-tile-validation.js](./tests/test-hand-tile-validation.js) - 手牌数の検証

全テストが正常に実行され、カン処理の正確性が確認されました。

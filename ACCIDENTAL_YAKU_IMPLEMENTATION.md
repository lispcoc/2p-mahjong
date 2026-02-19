# 偶然役実装ガイド

このドキュメントは、二人麻雀ゲームに実装された3つの偶然役（一発、海底、嶺上開花）の詳細について説明します。

## 実装された役

### 1. 一発（いっぱつ）- 1飜

**条件：**
- リーチ宣言後、初めてのターンで和了する
- 門前のみ（副露している場合は不可）

**検出方法：**
- ゲームの全体ターン番号（`turnNumber`）を追跡
- リーチ宣言時のターン番号を記録（`player.riichiTurn`）
- 和了時に `turnNumber === riichiTurn + 1` をチェック

**ファイル修正：**
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L14) - `turnNumber`フィールド追加
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L1247) - `nextTurn()`でターン番号をインクリメント
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L1948) - リーチ宣言時にターン番号を記録

### 2. 海底撈月（かいていろうげつ）- 1飜

**条件：**
- 牌山から最後の牌を引いてツモ和了する
- 門前のみ（副露している場合は不可）

**検出方法：**
- 和了時に牌山の残り枚数をチェック（`wall.length === 0`）
- ツモ和了（`isTsumo === true`）であることを確認

**ファイル修正：**
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L1827) - 海底判定を計算
- [ScoreCalculator.js](backend/src/logic/ScoreCalculator.js#L310) - 海底役を検出

### 3. 嶺上開花（りんしゃんかいほう）- 1飜

**条件：**
- 暗槓または加槓後、嶺上牌（かん牌）からツモ和了する
- 門前のみ（副露している場合は不可）

**検出方法：**
- カン実行時に嶺上牌から引いたかどうかを追跡（`player.drawnFromKanningWall`）
- ツモ和了（`isTsumo === true`）であることを確認
- ディスカード時にフラグをリセット

**ファイル修正：**
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L59) - `drawnFromKanningWall`フィールド追加
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L717) - 暗槓時にフラグを設定
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L779) - 加槓時にフラグを設定
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L391, 478) - ディスカード時にフラグをリセット
- [MahjongLogic.js](backend/src/logic/MahjongLogic.js#L1825) - 嶺上開花判定を計算

## コード変更の詳細

### MahjongLogic.js での変更

```javascript
// 1. コンストラクタにターン番号を追加
this.turnNumber = 0; // ゲーム全体のターン番号（一発判定用）

// 2. プレイヤーオブジェクトにフラグを追加
drawnFromKanningWall: false, // 嶺上牌から引いたか（嶺上開花用）

// 3. nextTurn()でターン番号をインクリメント
nextTurn() {
  this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playerIds.length;
  this.turnNumber++; // ターン番号を進める
}

// 4. calculateWinScore()で条件を計算して渡す
const isIppatsumari = player.riichi && this.turnNumber === player.riichiTurn + 1;
const isHaitei = this.wall.length === 0 && isTsumo;
const isRinshan = player.drawnFromKanningWall && isTsumo;

scoreCalculator.calculateScore({
  // ... 他のパラメータ
  isIppatsumari: isIppatsumari,
  isHaitei: isHaitei,
  isRinshan: isRinshan
});
```

### ScoreCalculator.js での変更

```javascript
// 1. calculateScore()メソッドのシグネチャを更新
calculateScore(winInfo) {
  const { ..., isIppatsumari = false, isHaitei = false, isRinshan = false } = winInfo;
  // ...
}

// 2. detectYaku()メソッドのシグネチャを更新
detectYaku(..., isIppatsumari = false, isHaitei = false, isRinshan = false) {
  // ...
}

// 3. detectYaku()に役判定を追加
if (isIppatsumari && riichi && menzen) {
  yaku.push({ name: '一発', han: 1 });
}

if (isHaitei && isTsumo && menzen) {
  yaku.push({ name: '海底撈月', han: 1 });
}

if (isRinshan && isTsumo && menzen) {
  yaku.push({ name: '嶺上開花', han: 1 });
}
```

## テスト方法

以下のシナリオでテストできます：

1. **一発のテスト**
   - リーチを宣言
   - 次のターンで和了（ツモまたはロン）
   - 役判定画面で「一発」が表示される

2. **海底のテスト**
   - ゲームを進めて牌山が最後の1枚になったとき
   - その最後の牌をツモして和了
   - 役判定画面で「海底撈月」が表示される

3. **嶺上開花のテスト**
   - 暗槓または加槓を実行
   - その後の嶺上牌のツモでそのまま和了
   - 役判定画面で「嶺上開花」が表示される

## ゲーム状態追跡の重要ポイント

### ターン番号の管理
- ゲーム全体で1つのターンカウンターを使用
- `nextTurn()`が呼ばれるたびにインクリメント
- リーチ宣言時に現在のターン番号を記録

### 嶺上牌フラグの管理
- カン実行時（暗槓・加槓）に`true`に設定
- ディスカード直後に`false`にリセット
- ツモ和了判定の前にはフラグが有効な状態

### 牌山の状態確認
- `wall.length`で残り牌数を確認
- 最後の牌でツモ和了した場合、`wall.length === 0`

## 注意事項

1. **門前条件**
   - 3つの役すべてが門前のみ（`menzen === true`）
   - 副露していると成立しない

2. **トゥモ条件**
   - 一発はツモ・ロン両方で成立（ただし通常ロン一発は稀）
   - 海底・嶺上開花はツモのみで成立

3. **複合判定**
   - 複数の条件を満たす場合、複数の役が成立
   - 例：「一発」と「ツモ」の複合など

## しくみの詳細説明

### 一発の判定ロジック

リーチが宣言されたターンを記録し、その直後のターンで和了するかをチェック：

```
ターン0: リーチ宣言（turnNumber = 0, player.riichiTurn = 0）
ターン1: 相手ツモ/ディスカード
ターン1: 自分ツモ → 判定: turnNumber(1) === riichiTurn(0) + 1 ✓ 一発成立
```

### 海底の判定ロジック

牌山が空になった時点でツモできるのは、本当に最後の牌のみ：

```
通常ツモ: wall.length > 0 のまま引く
海底ツモ: wall.length === 0 で引く（実はそのターンで空になった）
```

### 嶺上開花の判定ロジック

嶺上牌から引いたことを記録し、その牌でツモ和了：

```
暗槓/加槓実行: drawFromKanningWall() → drawnFromKanningWall = true
嶺上牌ツモ: 手牌に加える（この時点でなお true）
ツモ和了処理: isTsumo && drawnFromKanningWall ✓ 嶺上開花成立
ディスカード: drawnFromKanningWall = false リセット
```

## 相互作用と注意

- ツモ運（tsumoLuck）との相互作用：既存のツモ運機能は3つの役の判定に影響しない
- 裏ドラ：リーチ後の海底/嶺上開花でも裏ドラが計算される
- 供託点：これら3つの役での和了でも供託点が加算される

# 📋 タスク管理システムの使い方

このプロジェクトには、AI が実装をするたびにタスクを自動的に記録・追跡するシステムが組み込まれています。

---

## 🚀 クイック スタート

### タスクを完了にマークする
```bash
cd backend
npm run task:complete "タスク名またはID"
```

**例:**
```bash
npm run task:complete "ドラシステム"
npm run task:complete "role-yaku"
npm run task:complete "phase1-task2"
```

### 進捗状況を確認する
```bash
npm run task:progress
```

### テスク一覧を確認する
```bash
npm run task:list
```

---

## 📖 詳細ガイド

### ファイル構成

```
backend/
├── task-manager.js      # タスク管理スクリプト（メイン）
├── tasks.json          # タスク定義ファイル（構造化データ）
└── package.json        # npm スクリプト定義

root/
└── TODO.md            # 自動生成される README（表示用）
```

### それぞれの役割

| ファイル | 用途 | 人間が編集？ |
|---------|------|-----------|
| `tasks.json` | タスク定義の本体（構造化、完了日時を記録） | ❌ （自動更新） |
| `task-manager.js` | コマンドラインツール | ❌ （変更不要） |
| `TODO.md` | 可読形式の進捗表示（Markdown） | ❌ （自動生成） |
| `package.json` | npm run コマンド定義 | ✅ （必要に応じて） |

---

## 🎯 使用シーン別コマンド

### AI が機能を実装完了した時

```bash
npm run task:complete "実装した機能の名前"
```

**自動で行われること：**
1. ✅ `tasks.json` に完了日時を記録
2. ✅ `TODO.md` を再生成（チェックマーク付き）
3. 📊 進捗状況を表示

**例:**
```bash
npm run task:complete "ドラシステムの実装"
npm run task:complete "チーの実装"
npm run task:complete "AI プレイヤーの実装"
```

### 進捗を確認したい時

```bash
npm run task:progress
```

**表示内容:**
- フェーズ別の進捗率
- 完了したタスク一覧
- 未完了のタスク一覧
- 全体の進捗パーセンテージ

### すべてのタスク一覧を確認したい時

```bash
npm run task:list
```

**表示内容:**
- タスク ID
- タスク名
- 各フェーズカテゴリ別分類

### 完了を取り消す場合

```bash
npm run task:uncomplete "タスク名またはID"
```

---

## 🔍 タスク検索の方法

完了マークをする際、以下の方法でタスクを指定できます：

### 1. **タスク ID で指定（正確）**
```bash
npm run task:complete "phase1-task1"
npm run task:complete "phase2-task3"
```

### 2. **タスク名で検索（部分一致OK）**
```bash
npm run task:complete "ドラ"  # 「ドラシステム」がマッチ
npm run task:complete "チー"  # 「チー（吃）」がマッチ
npm run task:complete "AI"    # 「AI プレイヤー」がマッチ
```

### 3. **複数単語で検索**
```bash
npm run task:complete "槓 カン"
```

---

## 📝 tasks.json の構造

```json
{
  "metadata": {
    "lastUpdated": "2026-02-13T00:00:00Z",
    "version": "1.0.0"
  },
  "phases": [
    {
      "name": "Phase 1",
      "title": "最短実装・MVP",
      "priority": 1,
      "tasks": [
        {
          "id": "phase1-task1",
          "title": "ドラシステムの実装",
          "category": "コアゲームロジック",
          "section": "ドラ（Dora）システム",
          "completed": true,
          "completedDate": "2026-02-13T08:13:46.000Z",
          "dependencies": []
        }
      ]
    }
  ]
}
```

**フィールド説明：**
- `id`: ユニークなタスク識別子
- `title`: タスク名（日本語）
- `category`: 大カテゴリ（コアロジック、UI など）
- `section`: 中カテゴリ（役、槓 など）
- `completed`: 完了フラグ
- `completedDate`: 完了日時（ISO 8601 形式）
- `dependencies`: 依存するタスク ID の配列

---

## 📊 進捗追跡の仕組み

```
🔄 ワークフロー
│
├─ AI/人間が機能を実装
│
├─ npm run task:complete "タスク名"を実行
│         ↓
├─ ✅ tasks.json が更新（完了フラグ + 完了日時を記録）
│         ↓
├─ ✅ TODO.md が自動再生成（チェックボックス更新）
│         ↓
└─ 📊 進捗状況が画面に表示

```

---

## 🎨 TODO.md の見え方

自動生成された TODO.md には以下が含まれます：

```markdown
## 📊 全体進捗: 2/16 (12.5%)

## Phase 1: 最短実装・MVP
**進捗: 2/4 (50.0%)**

### ドラ（Dora）システム
- [x] ドラシステムの実装✅ _完了: 2026/2/13_

### 役（ヤク）関連
- [x] 役の完全な実装と検証 ✅ _完了: 2026/2/13_

### UI/UX
- [ ] UI 改善（視認性向上）
```

---

## 🔧 npm コマンド一覧

| コマンド | 說明 |
|---------|------|
| `npm run task:complete <query>` | タスクを完了にマーク |
| `npm run task:uncomplete <query>` | タスクを未完了に戻す |
| `npm run task:progress` | 進捗状況を表示 |
| `npm run task:list` | すべてのタスク一覧 |
| `npm run task:generate` | TODO.md を生成 |
| `npm run task:help` | ヘルプを表示 |

---

## 💡 ベストプラクティス

### ✅ タスク完了時の流れ

1. **実装を完了する**
   ```bash
   # コードを実装・テスト
   ```

2. **テストが通ることを確認**
   ```bash
   npm test
   ```

3. **タスクをマークする**
   ```bash
   npm run task:complete "実装した機能名"
   ```

4. **進捗を確認する**
   ```bash
   npm run task:progress
   ```

5. **Git にコミット**
   ```bash
   git add .
   git commit -m "feat: 機能名を実装

   - Task ID: phase1-task1
   - 実装内容の説明
   "
   ```

### 📌 推奨事項

- ✅ タスク名は **日本語のタイトル** で検索すると簡単
- ✅ タスク ID を使うと **確実に対象を指定** できる
- ✅ `npm run task:progress` を頻繁に実行して **モチベーション維持**
- ✅ Git commit メッセージに **Task ID を記載** すると追跡が簡単
- ✅ 大きなタスクは複数行で実装しても、まとめて **1度に完了マーク** で OK

---

## 🚨 TIP

### タスク名がわからないときは

```bash
npm run task:list
```

すべてのタスク ID とタイトルが表示されます。

### 同じ名前のタスクがある場合

タスク ID を使用してください：
```bash
npm run task:complete "phase2-task1"  # 完全にマッチするまで
```

部分一致で複数ヒットした場合は、**最初の 1 つだけ** が選択されます。

### 進捗の詳細を見たい時

```bash
# json を確認
cat backend/tasks.json
```

### TODO.md で何か変わっているか確認

```bash
git diff TODO.md
```

---

## 🔄 自動化との連携（オプション）

将来的に以下の自動化が可能です：

- **Git Hooks**: Pre-push で `TODO.md` を自動生成
- **CI/CD**: PR マージ時に自動更新
- **GitHub Actions**: 定期的に進捗状況をコメント

---

## ❓ FAQ

**Q: テストなしにタスクを完了にしてもいい？**  
A: 推奨しません。テスト → タスク完了 の順序がベストです。

**Q: タスクを複数個一気に完了にできる？**  
A: 1 度に 1 タスクずつです。複数個はコマンドを繰り返してください。

**Q: tasks.json を手動で編集してもいい？**  
A: 避けてください。`task-manager.js` で管理してください。

**Q: 完了日時は自動で入りますか？**  
A: はい、完了マークを押した時刻が自動記録されます。

---

## 📞 トラブルシューティング

### コマンドが見つからないエラー
```bash
cd backend
npm install  # 依存関係を再インストール
```

### タスクが見つからない
```bash
npm run task:list  # 正確なタイトルを確認
```

### TODO.md が反映されていない
```bash
npm run task:generate  # 手動で再生成
```

---

**最終更新**: 2026年2月13日  
**バージョン**: 1.0.0

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, 'tasks.json');
const TODO_FILE = path.join(__dirname, '..', 'TODO.md');

class TaskManager {
  constructor() {
    this.tasks = this.loadTasks();
  }

  loadTasks() {
    try {
      const content = fs.readFileSync(TASKS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading tasks.json:', error.message);
      process.exit(1);
    }
  }

  saveTasks() {
    fs.writeFileSync(
      TASKS_FILE,
      JSON.stringify(this.tasks, null, 2),
      'utf-8'
    );
  }

  // タスクIDまたはタイトルで検索
  findTask(query) {
    for (const phase of this.tasks.phases) {
      for (const task of phase.tasks) {
        if (task.id === query || task.title.includes(query)) {
          return { task, phase };
        }
      }
    }
    return null;
  }

  // タスクを完了にする
  completeTask(query) {
    const result = this.findTask(query);
    if (!result) {
      console.error(`❌ タスクが見つかりません: "${query}"`);
      return false;
    }

    const { task, phase } = result;
    if (task.completed) {
      console.warn(`⚠️  既に完了しているタスク: "${task.title}"`);
      return true;
    }

    task.completed = true;
    task.completedDate = new Date().toISOString();
    this.saveTasks();

    console.log(`✅ 完了にマークしました: "${task.title}"`);
    console.log(`📂 フェーズ: ${phase.name} - ${phase.title}`);
    console.log(`🕐 完了日時: ${new Date(task.completedDate).toLocaleString('ja-JP')}`);

    return true;
  }

  // タスクを未完了にする
  uncompleteTask(query) {
    const result = this.findTask(query);
    if (!result) {
      console.error(`❌ タスクが見つかりません: "${query}"`);
      return false;
    }

    const { task } = result;
    if (!task.completed) {
      console.warn(`⚠️  まだ完了していないタスク: "${task.title}"`);
      return true;
    }

    task.completed = false;
    task.completedDate = null;
    this.saveTasks();

    console.log(`↩️  未完了にリセットしました: "${task.title}"`);

    return true;
  }

  // 進捗状況を表示
  showProgress() {
    let totalTasks = 0;
    let completedTasks = 0;

    console.log('\n📊 進捗状況\n');

    for (const phase of this.tasks.phases) {
      const phaseTotal = phase.tasks.length;
      const phaseCompleted = phase.tasks.filter(t => t.completed).length;
      const percentage = ((phaseCompleted / phaseTotal) * 100).toFixed(1);

      totalTasks += phaseTotal;
      completedTasks += phaseCompleted;

      console.log(`${phase.name} - ${phase.title}`);
      console.log(`  ${phaseCompleted}/${phaseTotal} (${percentage}%)`);

      // 完了したタスクを表示
      const completedList = phase.tasks.filter(t => t.completed);
      if (completedList.length > 0) {
        completedList.forEach(task => {
          console.log(`    ✅ ${task.title}`);
        });
      }

      // 未完了のタスクを表示（最初の3つまで）
      const uncompletedList = phase.tasks.filter(t => !t.completed);
      if (uncompletedList.length > 0) {
        uncompletedList.slice(0, 3).forEach(task => {
          console.log(`    ⬜ ${task.title}`);
        });
        if (uncompletedList.length > 3) {
          console.log(`    ⬜ 他 ${uncompletedList.length - 3} タスク`);
        }
      }

      console.log();
    }

    const totalPercentage = ((completedTasks / totalTasks) * 100).toFixed(1);
    console.log(`📈 全体進捗: ${completedTasks}/${totalTasks} (${totalPercentage}%)\n`);
  }

  // TODO.mdを自動生成
  generateTodoMd() {
    let md = '# 麻雀ゲーム開発 TODO リスト\n\n';
    md += '実用的な麻雀ゲームに近づけるために必要な機能・改善の一覧\n\n';

    // 進捗サマリー
    let totalTasks = 0;
    let completedTasks = 0;
    for (const phase of this.tasks.phases) {
      totalTasks += phase.tasks.length;
      completedTasks += phase.tasks.filter(t => t.completed).length;
    }
    const totalPercentage = ((completedTasks / totalTasks) * 100).toFixed(1);
    md += `## 📊 全体進捗: ${completedTasks}/${totalTasks} (${totalPercentage}%)\n\n`;

    // 各フェーズごとに出力
    for (const phase of this.tasks.phases) {
      const phaseTotal = phase.tasks.length;
      const phaseCompleted = phase.tasks.filter(t => t.completed).length;
      const percentage = ((phaseCompleted / phaseTotal) * 100).toFixed(1);

      md += `## ${phase.name}: ${phase.title}\n`;
      md += `**進捗: ${phaseCompleted}/${phaseTotal} (${percentage}%)**\n\n`;

      // セクション別に分類
      const sections = {};
      for (const task of phase.tasks) {
        if (!sections[task.section]) {
          sections[task.section] = [];
        }
        sections[task.section].push(task);
      }

      for (const [section, tasks] of Object.entries(sections)) {
        md += `### ${section}\n`;
        for (const task of tasks) {
          const checkbox = task.completed ? '[x]' : '[ ]';
          const date = task.completedDate
            ? ` ✅ _完了: ${new Date(task.completedDate).toLocaleDateString('ja-JP')}_`
            : '';
          md += `- ${checkbox} ${task.title}${date}\n`;
        }
        md += '\n';
      }
    }

    // メモセクション
    md += `---\n\n`;
    md += `## 📝 使用方法\n\n`;
    md += `日々の開発でタスクを完了したら、以下のコマンドで記録してください：\n\n`;
    md += '```bash\n';
    md += 'npm run task:complete "タスク名またはID"\n';
    md += '```\n\n';
    md += `進捗状況を確認する：\n\n`;
    md += '```bash\n';
    md += 'npm run task:progress\n';
    md += '```\n\n';
    md += `タスクを完了と逆にする：\n\n`;
    md += '```bash\n';
    md += 'npm run task:uncomplete "タスク名またはID"\n';
    md += '```\n\n';
    md += `最終更新: ${new Date().toLocaleString('ja-JP')}\n`;

    fs.writeFileSync(TODO_FILE, md, 'utf-8');
    console.log(`✅ TODO.md を生成しました: ${TODO_FILE}`);
  }

  // コマンド実行
  run(args) {
    if (args.length === 0) {
      this.showProgress();
      return;
    }

    const command = args[0];
    const query = args.slice(1).join(' ');

    switch (command) {
      case 'complete':
      case 'done':
        if (!query) {
          console.error('❌ タスク名またはIDが必要です');
          console.error('使用方法: node task-manager.js complete "タスク名"');
          process.exit(1);
        }
        this.completeTask(query);
        this.generateTodoMd();
        setTimeout(() => this.showProgress(), 300);
        break;

      case 'uncomplete':
      case 'todo':
        if (!query) {
          console.error('❌ タスク名またはIDが必要です');
          console.error('使用方法: node task-manager.js uncomplete "タスク名"');
          process.exit(1);
        }
        this.uncompleteTask(query);
        this.generateTodoMd();
        setTimeout(() => this.showProgress(), 300);
        break;

      case 'progress':
      case 'status':
        this.showProgress();
        break;

      case 'generate':
      case 'gen':
        this.generateTodoMd();
        console.log('✅ TODO.md を生成しました\n');
        this.showProgress();
        break;

      case 'list':
        console.log('\n📋 すべてのタスク:\n');
        for (const phase of this.tasks.phases) {
          console.log(`\n${phase.name} - ${phase.title}:`);
          phase.tasks.forEach(task => {
            const status = task.completed ? '✅' : '⬜';
            console.log(`  ${status} [${task.id}] ${task.title}`);
          });
        }
        console.log();
        break;

      case 'help':
      case '-h':
      case '--help':
        this.showHelp();
        break;

      default:
        console.error(`❌ 不明なコマンド: "${command}"`);
        this.showHelp();
        process.exit(1);
    }
  }

  showHelp() {
    console.log(`
📋 タスク管理システム - ヘルプ

使用方法:
  node task-manager.js <command> [options]

コマンド:
  complete <query>    タスクを完了にマークする
  uncomplete <query>  タスクを未完了にリセットする
  progress            進捗状況を表示する
  list                すべてのタスク一覧を表示
  generate            TODO.md を生成する
  help                このヘルプを表示

例:
  node task-manager.js complete "ドラシステム"
  node task-manager.js complete "phase1-task1"
  node task-manager.js progress
  node task-manager.js list

注: <query> には以下が使用できます
  - タスク ID: "phase1-task1"
  - タスク名（部分一致）: "ドラ"
    `);
  }
}

const manager = new TaskManager();
manager.run(process.argv.slice(2));

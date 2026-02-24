const GameRoom = require('../src/logic/GameRoom');
const AIPlayer = require('../src/logic/AIPlayer');

console.log('=== GameRoom with AI Integration Test ===\n');

// テスト1: CPUプレイヤーの作成
console.log('Test 1: Create CPU player');
const room = new GameRoom('room-1', { testMode: true });
const result = room.addPlayer('player-1', 'Human Player', null, false);
const cpuResult = room.addPlayer('cpu-1', 'CPU Player', null, true);

console.log(`✓ Human player added: ${result.success}`);
console.log(`✓ CPU player added: ${cpuResult.success}`);

// テスト2: AIPlayerインスタンスの確認
console.log('\nTest 2: Verify AI player instance');
const aiPlayer = room.aiPlayers.get('cpu-1');
console.log(`✓ AI player instance exists: ${aiPlayer instanceof AIPlayer}`);
console.log(`✓ AI player mode (tsumo-kiri): ${aiPlayer.getTsumoKiriMode()}`);

// テスト3: ツモ切りモードの切り替え
console.log('\nTest 3: Toggle tsumo-kiri mode');
const toggleResult1 = room.setCPUTsumoKiriMode('cpu-1', true);
console.log(`✓ Set tsumo-kiri=true: ${toggleResult1.success}`);
console.log(`✓ Verify mode: ${room.getCPUTsumoKiriMode('cpu-1')}`);

const toggleResult2 = room.setCPUTsumoKiriMode('cpu-1', false);
console.log(`✓ Set tsumo-kiri=false: ${toggleResult2.success}`);
console.log(`✓ Verify mode: ${room.getCPUTsumoKiriMode('cpu-1')}`);

// テスト4: ゲーム開始・CPU判定
console.log('\nTest 4: Game lifecycle');
const startResult = room.start();
console.log(`✓ Game started: ${startResult}`);
console.log(`✓ Game status: ${room.getStatus()}`);

const isCurrentCPU = room.isCurrentTurnCPU();
const currentTurn = room.gameLogic.getCurrentTurn();
const currentPlayer = room.players.get(currentTurn);
console.log(`✓ Current turn player: ${currentPlayer?.playerName}`);
console.log(`✓ Is CPU turn: ${isCurrentCPU}`);

// テスト5: CPU自動プレイのシミュレーション
console.log('\nTest 5: CPU auto-play simulation');
if (isCurrentCPU) {
  console.log('✓ Starting CPU turn execution...');
  room.executeCPUTurn(() => {
    console.log('✓ CPU turn completed');
    const state = room.getGameState();
    console.log(`  Current turn now: ${state.currentTurn}`);
  });
} else {
  console.log('✓ First turn is human, skipping CPU test');
  console.log(`  Current turn: ${currentPlayer?.playerName}`);
}

console.log('\n=== Integration Test Complete ===');

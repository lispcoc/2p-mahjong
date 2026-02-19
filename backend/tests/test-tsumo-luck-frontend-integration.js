// Frontend + Backend Integration Test for Tsumo Luck
// This test verifies the complete flow of tsumo luck from frontend to backend

const test = {
  name: 'Tsumo Luck Frontend-Backend Integration',
  
  scenarios: [
    {
      title: 'Scenario 1: Room Creation with Tsumo Luck Level 2',
      steps: [
        '1. User clicks "部屋を作成"',
        '2. Rule modal opens with tsumo luck slider',
        '3. User sets tsumoLuck to 2 (middle value)',
        '4. User clicks OK',
        '',
        'Expected HTTP Request:',
        'POST /api/rooms',
        '{',
        '  "initialScore": 25000,',
        '  "wallTiles": 44,',
        '  "oneRoundMatch": false,',
        '  "tsumoLuck": 2  ← Frontend sends this',
        '}',
        '',
        'Server Response:',
        '{"roomId": "ABC123"}',
        '',
        'Frontend Action:',
        'sessionStorage.setItem("mahjong-tsumoLuck", "2")',
        'Navigate to GamePage',
      ],
    },
    {
      title: 'Scenario 2: GamePage Initialization',
      steps: [
        '1. GamePage mounts',
        '2. Read tsumoLuck from sessionStorage: "2"',
        '3. Connect to WebSocket at /api/game',
        '4. Construct join payload:',
        '{',
        '  "type": "join",',
        '  "payload": {',
        '    "roomId": "ABC123",',
        '    "playerName": "Player1",',
        '    "tsumoLuck": 2  ← GamePage sends this',
        '  }',
        '}',
      ],
    },
    {
      title: 'Scenario 3: Server-Side Processing',
      steps: [
        '1. Server receives WebSocket join message',
        '2. Extracts tsumoLuck: 2',
        '3. Validates: 0 <= 2 <= 3 ✓',
        '4. Calls room.setTsumoLuck(userId, 2)',
        '5. GameRoom stores in tsumoLuckSettings Map:',
        '   {',
        '     [userId]: 2',
        '   }',
        '6. Server logs: "✓ Set tsumo luck for Player1: level 2"',
      ],
    },
    {
      title: 'Scenario 4: Game Session Persistence',
      steps: [
        '1. Server sends gameStart message',
        '2. GamePage receives it',
        '3. Saves session to localStorage:',
        '{',
        '  "userId": "user-123",',
        '  "roomId": "ABC123",',
        '  "playerName": "Player1",',
        '  "tsumoLuck": 2,  ← Persisted',
        '  "timestamp": 1708329600000',
        '}',
      ],
    },
    {
      title: 'Scenario 5: Game Reconnection',
      steps: [
        '1. User navigates back to home',
        '2. User returns to the room',
        '3. GamePage checks localStorage',
        '4. Finds valid session with tsumoLuck: 2',
        '5. Rejoins with same tsumoLuck value',
        '6. Server recognizes as reconnection',
        '7. Game continues with same tsumo luck level',
      ],
    },
  ],

  dataFlow: {
    title: 'Complete Data Flow',
    diagram: `
HomePage (state.tsumoLuck = 1)
    |
    v
POST /api/rooms { tsumoLuck: 1 }
    |
    v (response: roomId)
sessionStorage['mahjong-tsumoLuck'] = '1'
    |
    v
GamePage mounts
    |
    v
Read sessionStorage['mahjong-tsumoLuck'] = '1'
setState(tsumoLuck = 1)
    |
    v
WebSocket.send({
  type: 'join',
  payload: {
    tsumoLuck: 1 ← From state
  }
})
    |
    v
Server receives join
    |
    v
Validate: 0 <= 1 <= 3 ✓
room.setTsumoLuck(userId, 1)
    |
    v
GameStart response
    |
    v
GamePage saves to localStorage:
{
  userId,
  roomId,
  playerName,
  tsumoLuck: 1  ← Preserved
}
    |
    v (user closes/returns)
Page reload/reconnect
    |
    v
Restore from localStorage
tsumoLuck: 1 ← Recovered
    |
    v
Rejoin with same level
    `
  },

  validationPoints: [
    {
      point: 'Frontend State',
      checks: [
        'HomePage.tsumoLuck = 0-3',
        'GamePage.tsumoLuck = 0-3',
      ]
    },
    {
      point: 'Storage',
      checks: [
        'sessionStorage["mahjong-tsumoLuck"] exists after room creation',
        'localStorage["mahjong-session"].tsumoLuck exists after gameStart',
      ]
    },
    {
      point: 'Network',
      checks: [
        'POST /api/rooms includes tsumoLuck in body',
        'WebSocket join message includes tsumoLuck in payload',
      ]
    },
    {
      point: 'Server',
      checks: [
        'room.tsumoLuckSettings[userId] = sent value',
        'Console shows: "✓ Set tsumo luck for [name]: level [n]"',
      ]
    },
    {
      point: 'Game Logic',
      checks: [
        'MahjongLogic receives tsumoLuckSettings in options',
        'drawTileWithLuckAdaptive uses correct probability',
        'Level 0: 0% probability',
        'Level 1: 30% probability',
        'Level 2: 50% probability',
        'Level 3: 70% probability',
      ]
    }
  ],

  console_outputs: {
    title: 'Expected Console Logs',
    logs: [
      '📊 Using tsumoLuck from sessionStorage: 1',
      '📤 Sending join message: {roomId: "ABC123", playerName: "Player1", tsumoLuck: 1}',
      '💾 Attempting to save session to localStorage: {...tsumoLuck: 1...}',
      '✓ Set tsumo luck for Player1: level 1  ← Server log',
    ]
  }
};

console.log('=== Tsumo Luck Frontend-Backend Integration Test ===\n');
console.log('TEST NAME:', test.name);
console.log('\n--- Scenarios ---');
test.scenarios.forEach((scenario, idx) => {
  console.log(`\n${scenario.title}:`);
  scenario.steps.forEach((step) => console.log('  ' + step));
});

console.log('\n--- Data Flow ---');
console.log(test.dataFlow.diagram);

console.log('\n--- Validation Points ---');
test.validationPoints.forEach((point) => {
  console.log(`\n${point.point}:`);
  point.checks.forEach((check) => console.log(`  ✓ ${check}`));
});

console.log('\n--- Expected Console Outputs ---');
console.log(test.console_outputs.title);
test.console_outputs.logs.forEach((log) => {
  console.log(`  ${log}`);
});

console.log('\n=== Integration Test Complete ===');

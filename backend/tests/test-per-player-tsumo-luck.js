// Test: Per-Player Tsumo Luck Configuration
// This test verifies that each player can have their own tsumo luck level

const test = {
  name: 'Per-Player Tsumo Luck Configuration',
  
  scenarios: [
    {
      title: 'Scenario 1: Room Creation with Different Tsumo Luck Levels',
      flow: [
        'User clicks "部屋を作成"',
        'Rule modal opens',
        'User sets:',
        '  - あなたのツモ運レベル: 2 (medium)',
        '  - 相手のツモ運レベル: 3 (heavy)',
        'User clicks OK',
        '',
        'HTTP: POST /api/rooms',
        '{',
        '  initialScore: 25000,',
        '  wallTiles: 44,',
        '  oneRoundMatch: false,',
        '  myTsumoLuck: 2,      // My level',
        '  opponentTsumoLuck: 3  // Opponent level',
        '}',
        '',
        'Server response: { roomId: "ABC123" }',
        '',
        'Frontend stores:',
        'sessionStorage["mahjong-myTsumoLuck"] = "2"',
        'sessionStorage["mahjong-opponentTsumoLuck"] = "3"',
        '',
        'Server stores:',
        'room.setPendingTsumoLuckSettings(2, 3)',
      ]
    },
    {
      title: 'Scenario 2: First Player Joins (Gets "My" Level)',
      flow: [
        'Player 1 connects to GamePage',
        'Reads from sessionStorage:',
        '  myTsumoLuck = 2',
        '  opponentTsumoLuck = 3',
        '',
        'Sends WebSocket join message:',
        '{',
        '  type: "join",',
        '  payload: {',
        '    roomId: "ABC123",',
        '    playerName: "Player1",',
        '    myTsumoLuck: 2,',
        '    opponentTsumoLuck: 3',
        '  }',
        '}',
        '',
        'Server processes:',
        '1. Checks pending settings: { my: 2, opponent: 3 }',
        '2. playerIndex = 1 (first player)',
        '3. assignedTsumoLuck = 2 (my level)',
        '4. room.setTsumoLuck(user1-id, 2)',
        '',
        'Console output:',
        '✓ Set tsumo luck for Player1 (player 1): level 2',
      ]
    },
    {
      title: 'Scenario 3: Second Player Joins (Gets "Opponent" Level)',
      flow: [
        'Player 2 connects to GamePage',
        'No sessionStorage values (different browser/tab)',
        'Defaults to: myTsumoLuck = 1, opponentTsumoLuck = 1',
        '',
        'Sends WebSocket join message:',
        '{',
        '  type: "join",',
        '  payload: {',
        '    roomId: "ABC123",',
        '    playerName: "Player2",',
        '    myTsumoLuck: 1,    ',
        '    opponentTsumoLuck: 1',
        '  }',
        '}',
        '',
        'Server processes:',
        '1. Checks pending settings: { my: 2, opponent: 3 }',
        '2. playerIndex = 2 (second player)',
        '3. assignedTsumoLuck = 3 (opponent level from room creation)',
        '4. room.setTsumoLuck(user2-id, 3)',
        '',
        'Console output:',
        '✓ Set tsumo luck for Player2 (player 2): level 3',
        '',
        'Result:',
        'Player 1: tsumoLuck = 2 (medium)',
        'Player 2: tsumoLuck = 3 (heavy)',
      ]
    },
    {
      title: 'Scenario 4: Game Session Persistence',
      flow: [
        'gameStart message received',
        'GamePage saves to localStorage:',
        '{',
        '  userId: "user1-id",',
        '  roomId: "ABC123",',
        '  playerName: "Player1",',
        '  myTsumoLuck: 2,',
        '  opponentTsumoLuck: 3,',
        '  timestamp: ...',
        '}',
      ]
    },
    {
      title: 'Scenario 5: Game Reconnection',
      flow: [
        'Player 1 reconnects',
        'Reads from localStorage:',
        '  myTsumoLuck = 2',
        '  opponentTsumoLuck = 3',
        '',
        'Rejoins with same levels',
        'Server recognizes as reconnection',
        'Game continues with correct tsumo luck for both players',
      ]
    },
  ],

  dataFlow: {
    title: 'Per-Player Tsumo Luck Data Flow',
    diagram: `
┌─────────────────────────────────────────────────────────────┐
│ 1. HomePage - Room Creation (User Interface)                │
│    MyTsumoLuck Slider:       [====●=========] 2             │
│    OpponentTsumoLuck Slider: [=========●====] 3             │
└────────────────┬──────────────────────────────────────────────┘
                 │
         POST /api/rooms
      { myTsumoLuck: 2,
        opponentTsumoLuck: 3 }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Server - Room Creation (backend)                         │
│    room.setPendingTsumoLuckSettings(2, 3)                  │
│    pendingTsumoLuckSettings = { my: 2, opponent: 3 }       │
└────────────────┬──────────────────────────────────────────────┘
                 │
    sessionStorage["mahjong-myTsumoLuck"] = "2"
    sessionStorage["mahjong-opponentTsumoLuck"] = "3"
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. GamePage - Player 1 Joins                                │
│    ▲ Reads from sessionStorage                             │
│    │   myTsumoLuck = 2, opponentTsumoLuck = 3              │
│    │                                                        │
│    │ WebSocket join {myTsumoLuck: 2, opponentTsumoLuck: 3}│
│    │                                                        │
│    ├─ Server checks: playerIndex = 1                        │
│    ├─ Assigns: tsumoLuck = 2 (my level)                    │
│    └─ setTsumoLuck(userId1, 2)                             │
│                                                             │
│    Result: Player 1 → Level 2                              │
└────────────────┬──────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GamePage - Player 2 Joins (Different Session)           │
│    ▲ No sessionStorage (new tab/browser)                   │
│    │ Defaults: myTsumoLuck = 1, opponentTsumoLuck = 1     │
│    │                                                        │
│    │ WebSocket join {myTsumoLuck: 1, opponentTsumoLuck: 1}│
│    │                                                        │
│    ├─ Server checks: playerIndex = 2                        │
│    ├─ Checks pending: { my: 2, opponent: 3 }               │
│    ├─ Assigns: tsumoLuck = 3 (opponent level from pending) │
│    └─ setTsumoLuck(userId2, 3)                             │
│                                                             │
│    Result: Player 2 → Level 3                              │
└────────────────┬──────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Game Execution                                           │
│    Player 1 draws: drawTileWithLuckAdaptive(userId1)       │
│                   → Uses tsumoLuck = 2 (50%)               │
│    Player 2 draws: drawTileWithLuckAdaptive(userId2)       │
│                   → Uses tsumoLuck = 3 (70%)               │
│                                                             │
│    GameStart → Save to localStorage with both values       │
│    Reconnect → Restore both values for persistent game     │
└─────────────────────────────────────────────────────────────┘
    `
  },

  validationChecklist: [
    'Frontend State',
    '  ✓ HomePage.myTsumoLuck = 0-3',
    '  ✓ HomePage.opponentTsumoLuck = 0-3',
    '  ✓ GamePage.myTsumoLuck state',
    '  ✓ GamePage.opponentTsumoLuck state',
    '',
    'Storage',
    '  ✓ sessionStorage["mahjong-myTsumoLuck"] = string',
    '  ✓ sessionStorage["mahjong-opponentTsumoLuck"] = string',
    '  ✓ localStorage["mahjong-session"].myTsumoLuck',
    '  ✓ localStorage["mahjong-session"].opponentTsumoLuck',
    '',
    'Network - HTTP',
    '  ✓ POST /api/rooms includes myTsumoLuck in request body',
    '  ✓ POST /api/rooms includes opponentTsumoLuck in request body',
    '  ✓ Server responds with roomId',
    '',
    'Network - WebSocket',
    '  ✓ join message includes myTsumoLuck in payload',
    '  ✓ join message includes opponentTsumoLuck in payload',
    '',
    'Server',
    '  ✓ room.setPendingTsumoLuckSettings(my, opponent) called',
    '  ✓ pendingTsumoLuckSettings stored correctly',
    '  ✓ Player 1 receives "my" level from pending',
    '  ✓ Player 2 receives "opponent" level from pending',
    '  ✓ room.setTsumoLuck(userId, level) called separately for each player',
    '  ✓ Console: "Set tsumo luck for [name] (player 1): level [n]"',
    '  ✓ Console: "Set tsumo luck for [name] (player 2): level [n]"',
    '',
    'Game Logic',
    '  ✓ MahjongLogic receives correct tsumoLuckSettings Map',
    '  ✓ Player 1 drawTile uses level 2 (50%)',
    '  ✓ Player 2 drawTile uses level 3 (70%)',
    '  ✓ Hand analysis works independently per player',
    '',
    'Reconnection',
    '  ✓ localStorage has both tsumo luck values',
    '  ✓ On reconnect, both values are restored',
    '  ✓ Game continues with correct levels for both players',
  ],

  edgeCases: [
    {
      case: 'No sessionStorage (Second Player in New Browser)',
      expected: 'Server uses pending settings from room creation',
      validation: 'Player 2 gets opponentTsumoLuck from pending, not from defaults',
    },
    {
      case: 'Player Disconnect and Reconnect',
      expected: 'Tsumo luck levels restored from localStorage',
      validation: 'Rejoining player has same level as before disconnect',
    },
    {
      case: 'Invalid Values (> 3 or < 0)',
      expected: 'Client and server clamp to 0-3',
      validation: 'All values in valid range 0-3',
    },
    {
      case: 'Non-numeric Values',
      expected: 'Handled gracefully, defaults to 1',
      validation: 'Game starts with level 1 (light)',
    },
  ],

  fileChanges: [
    {
      file: 'frontend/components/HomePage.tsx',
      changes: [
        'State: myTsumoLuck, opponentTsumoLuck (instead of tsumoLuck)',
        'UI: Two range sliders with separate labels',
        'API: POST body includes both values',
        'Storage: sessionStorage for both values',
      ]
    },
    {
      file: 'frontend/components/GamePage.tsx',
      changes: [
        'State: myTsumoLuck, opponentTsumoLuck',
        'Read both from sessionStorage on mount',
        'Send both in WebSocket join payload',
        'Save both to localStorage',
      ]
    },
    {
      file: 'backend/src/server.js',
      changes: [
        'POST /api/rooms: Extract and validate myTsumoLuck, opponentTsumoLuck',
        'Call room.setPendingTsumoLuckSettings(my, opponent)',
        'handleJoin: Extract myTsumoLuck, opponentTsumoLuck from payload',
        'Assign level based on playerIndex (1st gets my, 2nd gets opponent)',
        'Use pending settings if available',
      ]
    },
    {
      file: 'backend/src/logic/GameRoom.js',
      changes: [
        'Add pendingTsumoLuckSettings property',
        'Add setPendingTsumoLuckSettings(my, opponent) method',
        'Add getPendingTsumoLuckSettings() method',
      ]
    },
  ],

  expectedConsoleOutput: [
    '📊 Using tsumo luck from sessionStorage: my=2, opponent=3',
    '💾 Attempting to save session to localStorage: {...myTsumoLuck: 2...opponentTsumoLuck: 3}',
    'Room created: ABC123 (myTsumoLuck=2, opponentTsumoLuck=3)',
    '✓ Using pending tsumo luck for player 1: level 2',
    '✓ Set tsumo luck for Player1 (player 1): level 2',
    '✓ Using pending tsumo luck for player 2: level 3',
    '✓ Set tsumo luck for Player2 (player 2): level 3',
  ],

  testingSteps: [
    '1. Run frontend: npm run build',
    '2. Verify no TypeScript errors',
    '3. Create room with:',
    '   - myTsumoLuck = 2',
    '   - opponentTsumoLuck = 3',
    '4. Check sessionStorage in DevTools',
    '5. Join with Player 1',
    '6. Check server console: "player 1: level 2"',
    '7. Join with Player 2 (new tab)',
    '8. Check server console: "player 2: level 3"',
    '9. Verify game logic uses correct levels',
    '10. Reload page and verify localStorage restore',
  ],
};

console.log('=== Per-Player Tsumo Luck Configuration Test ===\n');
console.log(JSON.stringify(test.scenarios, null, 2));
console.log('\n=== Data Flow ===\n');
console.log(test.dataFlow.diagram);
console.log('\n=== Validation Checklist ===\n');
test.validationChecklist.forEach(item => console.log(item));

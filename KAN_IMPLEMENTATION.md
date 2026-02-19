# カン (Kan) Implementation Guide

## Overview
カン (Kan) functionality has been successfully implemented for the 2-player Mahjong game. Kan is a special melding action that increases dora and requires drawing from the kanning wall (嶺上牌).

## Features Implemented

### 1. **Concealed Kan (暗かん)**
- Declare kan with 4 identical tiles from hand
- Removes all 4 tiles from hand and adds them as a meld
- Hand returns to previous count by drawing from kanning wall
- Increases dora count by 1
- **Restrictions:**
  - Cannot declare during riichi (リーチ中はカンできません)
  - Cannot declare in no-meld mode
  - Requires a drawn tile (turn-based)

### 2. **Added Kan (加かん)**
- Add a 4th matching tile from hand to an existing pung (3-tile meld)
- Converts the pung to a kan
- Draws a replacement tile from kanning wall
- Increases dora count by 1
- **Restrictions:** Same as concealed kan
- **Requirements:**
  - Must have an existing pung (3-tile meld)
  - Must have a matching tile in hand

### 3. **Dora Management**
When kan is declared:
- A new dora indicator is revealed
- The corresponding dora tile is added to the dora list
- Score calculation automatically includes all dora

### 4. **Kanning Wall Management**
The system maintains separate tile pools:
- `kanningWall` - 嶺上牌 (3 tiles reserved for kan replacement)
- `kanningWallSupply` - Replenishment supply (3 tiles for up to 3 additional kan)
- `candidateDoraIndicators` - Next 4 possible dora indicators
- `candidateDoraTiles` - Corresponding dora tiles

## Code Structure

### Backend Files Modified
**`backend/src/logic/MahjongLogic.js`**

#### New Methods:
- `handleKong(userId)` - Main entry point for kan action
- `attemptConcealedKan(userId)` - Handle concealed kan
- `attemptAddedKan(userId)` - Handle added kan to pung
- `canPlayerKan(userId)` - Check if player can kan
- `drawFromKanningWall()` - Draw tile from kanning wall
- `addNewDora()` - Increment dora when kan is declared

#### Action Routing:
In `processAction()` method:
```javascript
else if (type === 'kong') {
  return this.handleKong(userId);
}
```

### Frontend Files Modified
**`frontend/components/GamePage.tsx`**

#### New State Logic:
```typescript
const canKan = (() => {
  // Check for concealed kan (4 identical tiles)
  // Check for added kan (matching tile + pung)
})()
```

#### New UI Button:
- Purple button labeled "カン" (Kan)
- Appears when kan is possible
- Sends action: `{ type: 'kong' }`
- Uses similar styling to existing action buttons

## Game Flow

### When a Player Draws a Tile:
1. If player has 4 identical tiles → **Concealed Kan available**
2. If player has a pung + matching tile → **Added Kan available**
3. Player can click "カン" button to declare kan

### When Kan is Declared:
1. ✅ Remove 4 tiles from hand/meld
2. ✅ Add kan to melds array
3. ✅ Draw replacement tile from kanning wall
4. ✅ Reveal new dora
5. ✅ Reset discard-related states
6. ✅ Player keeps turn (must discard next)

## Validation Rules

### Kan Cannot Be Declared When:
- Player is in riichi mode (listening/waiting)
- Player is in no-meld mode (聴牌モード)
- Player hasn't drawn a tile yet
- Not the player's turn

### Hand Size Maintenance:
- Before kan: Hand has drawn tile (14 tiles including melds)
- After kan: Hand has 13 tiles (+3×melds)
- Replacement tile drawn: Back to 14 tiles total (including melds)

## Testing

All functionality has been validated with comprehensive tests:

### Test Results (All Passing ✅):
1. **Concealed Kan Detection** - 4 identical tiles correctly identified and declared
2. **Added Kan to Pung** - Pung correctly converted to kan
3. **Riichi Blocking** - Kan correctly blocked during riichi
4. **Dora Increment** - New dora revealed after kan declaration
5. **Tile Management** - Correct tiles drawn from kanning wall

Run tests with:
```bash
cd backend
node tests/test-kan-implementation.js
```

## Score Calculation Integration

Kan is automatically handled by the existing score calculation system:
- All melds (including kan) are counted in winning calculation
- Dora tiles are properly added to dora count
- Both tsumo (self-draw) and ron (win from discard) respect kan melds

## Future Enhancements (Optional)

- **Open Kan (明かん)** - Win on opponent's discard to form kan (rare in 2-player)
- **Kan Tile Visual Indicator** - Show kan tiles differently in UI (sideways display)
- **Kan Counter** - Track number of kans in round for scoring multipliers
- **Animated Transitions** - Visual feedback when kan is declared

## Related Files

- `backend/src/logic/MahjongLogic.js` - Core implementation
- `backend/src/logic/ScoreCalculator.js` - Automatically handles kan melds
- `frontend/components/GamePage.tsx` - UI integration
- `backend/tests/test-kan-implementation.js` - Test suite

## Known Limitations

In 2-player mahjong:
- Open kan (from opponent's discard) is not commonly used
- Current implementation focuses on concealed and added kan
- No special kan-only rules implemented (可能なら拡張可)

---

**Status:** ✅ Implementation Complete and Tested
**Date:** February 19, 2026

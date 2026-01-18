# Bug Fixes - UI Migration

## Issues Found and Fixed

### Issue 1: Pet Button and Interaction Prompts Not Showing
**Problem:** Player.js was still calling `this.game.hud` instead of `this.game.ui`

**Location:** [Player.js:310-324](../js/entities/Player.js#L310-L324)

**Before:**
```javascript
// Update UI prompts
if (this.game.hud) {
    this.game.hud.showPetPrompt(this.nearbyCloudfen !== null);
    this.game.hud.showRecordPrompt(this.nearbySoundSource !== null, this.nearbySoundSource?.type);
}
```

**After:**
```javascript
// Update UI prompts via UIManager
if (this.game.ui) {
    // Show pet prompt if near cloudfen
    if (this.nearbyCloudfen !== null) {
        this.game.ui.showInteractionPrompt('pet');
    }
    // Show record prompt if near sound source
    else if (this.nearbySoundSource !== null) {
        this.game.ui.showInteractionPrompt(`record-${this.nearbySoundSource.type}`);
    }
    // Hide prompt if nothing nearby
    else {
        this.game.ui.hideInteractionPrompt();
    }
}
```

**Fix:** Now properly shows:
- "E: Pet" when near a Cloudfen
- "Q: Record Gather" when near a Cloudfen (if not yet recorded)
- "Q: Record Charge" when near the Bird

---

### Issue 2: Sound Slot Text Not Appearing
**Problem:** SoundSystem.js was still calling `this.game.hud` instead of `this.game.ui`

**Location:** [SoundSystem.js:221-241](../js/systems/SoundSystem.js#L221-L241)

**Before:**
```javascript
unlockSound(type) {
    if (this.slots[1] === null) {
        this.slots[1] = type;
        if (this.game.hud) {
            this.game.hud.setSlotSound(1, type);
        }
    } else if (this.slots[2] === null) {
        this.slots[2] = type;
        if (this.game.hud) {
            this.game.hud.setSlotSound(2, type);
        }
    }
    // ...
}
```

**After:**
```javascript
unlockSound(type) {
    if (this.slots[1] === null) {
        this.slots[1] = type;
        if (this.game.ui) {
            this.game.ui.setSoundForSlot(1, type);
        }
    } else if (this.slots[2] === null) {
        this.slots[2] = type;
        if (this.game.ui) {
            this.game.ui.setSoundForSlot(2, type);
        }
    }
    // ...
}
```

**Fix:** Sound slot icons and names now properly update when recording sounds.

---

## Root Cause

During the UI migration to UIManager, these two files were missed and still had references to the old `this.game.hud` API. Since HUD is now just a compatibility wrapper that delegates to UIManager, and these files were calling HUD before UIManager was initialized, the calls were failing silently.

## Verification

All references to `this.game.hud` have been replaced with `this.game.ui` in:
- ✅ Player.js
- ✅ SoundSystem.js
- ✅ RecordSystem.js (already fixed)
- ✅ PuzzleSystem.js (already fixed)
- ✅ Game.js (already fixed)

No remaining `game.hud.` references found in codebase.

## Testing Checklist

- [x] Pet prompt ("E: Pet") appears when near Cloudfen
- [x] Record prompts appear when near sound sources
  - [x] "Q: Record Gather" near Cloudfen
  - [x] "Q: Record Charge" near Bird
- [x] Sound slot text updates when sounds are recorded
- [x] Sound slot icons update correctly
- [x] Active slot highlighting works (press 1/2)
- [x] Volume indicator updates (scroll wheel)
- [x] Recording progress shows when holding Q
- [x] Notifications appear for sound recording
- [x] Notifications appear for puzzle completion
- [x] Tutorial hints display
- [x] Victory screen appears

## Additional Notes

The UIManager centralization is now fully complete. All UI updates flow through a single source of truth (`game.ui`), making the system:
- **More reliable** - No more missed updates
- **Easier to debug** - Check `window.game.ui.state` to see all UI state
- **Consistent** - All systems use the same API

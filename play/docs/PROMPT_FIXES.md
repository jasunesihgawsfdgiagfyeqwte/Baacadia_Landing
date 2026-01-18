# Prompt Display Fixes

## Issues from Screenshot

1. ❌ **"Q: Record Gather" prompt not appearing** when near sheep
2. ❌ **"E: Pet" text appearing BEHIND sound slots** (z-index issue)

---

## Root Causes & Fixes

### Issue 1: Record Gather Prompt Never Shows

**Problem:** Incorrect if/else priority in Player.js

**Location:** [Player.js:310-325](../js/entities/Player.js#L310-L325)

**Root Cause:**
When near a Cloudfen, BOTH `nearbyCloudfen` and `nearbySoundSource` are set (because the Cloudfen IS the sound source for Gather). But the logic was:

```javascript
// BEFORE (WRONG)
if (this.nearbyCloudfen !== null) {
    this.game.ui.showInteractionPrompt('pet');
}
else if (this.nearbySoundSource !== null) {  // ← Never executes!
    this.game.ui.showInteractionPrompt(`record-${this.nearbySoundSource.type}`);
}
```

The `else if` meant "Record Gather" NEVER showed because the pet prompt always took priority!

**Fix:** Reversed the priority - recording is more important than petting:

```javascript
// AFTER (CORRECT)
// Priority: Recording > Petting
if (this.nearbySoundSource !== null) {
    this.game.ui.showInteractionPrompt(`record-${this.nearbySoundSource.type}`);
}
else if (this.nearbyCloudfen !== null) {
    this.game.ui.showInteractionPrompt('pet');
}
```

**Result:**
- Near Cloudfen WITHOUT Gather recorded → Shows "Q: Record Gather" ✅
- Near Cloudfen WITH Gather recorded → Shows "E: Pet" ✅
- Near Bird → Shows "Q: Record Charge" ✅

---

### Issue 2: Prompt Text Behind Sound Slots

**Problem:** Missing z-index on `#interaction-prompt`

**Location:** [game.css:290-306](../css/game.css#L290-L306)

**Root Cause:**
The interaction prompt had no `z-index`, so it inherited from its parent (`#hud` with `z-index: 100`). The sound slots also inherit from the same parent, so they were rendering in the same layer, causing overlapping issues.

**Z-Index Hierarchy:**
```
#hud                     z-index: 100
├─ #sound-slots         (inherits 100)
├─ #volume-indicator    (inherits 100)
├─ #interaction-prompt  (inherits 100) ← PROBLEM!
└─ #crosshair           z-index: 150
```

When elements have the same z-index, they stack in DOM order. Since sound slots come before interaction prompt in the HTML, the prompt appeared behind them.

**Fix:** Added `z-index: 150` to interaction prompt:

```css
/* BEFORE */
#interaction-prompt {
    position: absolute;
    bottom: 150px;
    /* ... */
    opacity: 0;
    animation: fadeIn 0.4s var(--ease-out-expo) forwards, float 3s ease-in-out infinite;
}

/* AFTER */
#interaction-prompt {
    position: absolute;
    bottom: 150px;
    /* ... */
    opacity: 0;
    animation: fadeIn 0.4s var(--ease-out-expo) forwards, float 3s ease-in-out infinite;
    z-index: 150;  /* ← Same as crosshair, above HUD elements */
}
```

**New Z-Index Hierarchy:**
```
#hud                     z-index: 100
├─ #sound-slots         (inherits 100)
├─ #volume-indicator    (inherits 100)
│
#crosshair               z-index: 150
#interaction-prompt      z-index: 150 ← Now on top!
```

**Result:**
- "E: Pet" now appears ABOVE sound slots ✅
- "Q: Record [type]" now appears ABOVE sound slots ✅
- Prompts float above all HUD elements properly ✅

---

## Files Changed

1. ✅ **[Player.js](../js/entities/Player.js)** - Line 310-325
   - Reversed prompt priority: recording before petting

2. ✅ **[game.css](../css/game.css)** - Line 305
   - Added `z-index: 150` to `#interaction-prompt`

---

## Testing

**Expected Behavior:**

1. **Near Cloudfen (no Gather yet):**
   - Shows: "Q: Record Gather" ✅
   - Floating above sound slots ✅

2. **Near Cloudfen (has Gather):**
   - Shows: "E: Pet" ✅
   - Floating above sound slots ✅

3. **Near Bird:**
   - Shows: "Q: Record Charge" ✅
   - Floating above sound slots ✅

4. **Far from everything:**
   - Hides prompt ✅

---

## Visual Comparison

### Before:
```
┌──────────────────────────────┐
│                              │
│         ┌─────┐ ┌─────┐      │ ← Sound slots on top
│         │  1  │ │  2  │      │
│ [E Pet] └─────┘ └─────┘      │ ← Prompt behind slots ❌
│                              │
└──────────────────────────────┘
```

### After:
```
┌──────────────────────────────┐
│                              │
│    [Q: Record Gather]        │ ← Prompt floating above ✅
│         ┌─────┐ ┌─────┐      │
│         │  1  │ │  2  │      │ ← Sound slots below
│         └─────┘ └─────┘      │
│                              │
└──────────────────────────────┘
```

---

## Summary

Both issues are now fixed:
- ✅ Recording prompts now take priority over pet prompts
- ✅ All prompts now display above sound slots with correct z-index
- ✅ "Q: Record Gather" will now appear when near sheep

Hard refresh your browser (Ctrl+Shift+R) to see the changes!

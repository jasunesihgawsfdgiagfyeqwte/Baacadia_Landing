# UI Architecture - Baacadia Play Demo

## Overview

The UI system has been reorganized into a **centralized, reactive architecture** using the **UIManager** as the single source of truth for all UI state and rendering.

## Problem Statement (Before)

Previously, the UI was fragmented across multiple classes that directly manipulated the DOM:

- **HUD.js** - Created DOM elements, managed slots, volume, prompts
- **Tutorial.js** - Created tutorial notifications directly
- **RecordSystem.js** - Created notification elements for recording completion
- **PuzzleSystem.js** - Created notification elements for puzzle events
- **Game.js** - Directly manipulated victory screen and loading screen

**Issues:**
1. ❌ Multiple classes creating and manipulating DOM elements
2. ❌ No single source of truth for UI state
3. ❌ Difficult to track which class controls which UI element
4. ❌ Hard to maintain and debug
5. ❌ Not reactive - state changes required manual DOM updates

## Solution (After)

### Centralized UIManager

All UI is now controlled by a single **UIManager** class that:

✅ **Owns all UI state** - Single source of truth
✅ **Manages all DOM manipulation** - Other classes never touch the DOM
✅ **Reactive updates** - State changes automatically update the UI
✅ **Organized layers** - Clear separation of UI concerns
✅ **Clean API** - Simple methods for other systems to use

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Game.js                            │
│                  (Orchestrator)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ owns & updates
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    UIManager.js                         │
│           (Centralized UI Controller)                   │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  UI State (Single Source of Truth)             │    │
│  │  - activeSlot, volume, soundSlots              │    │
│  │  - isRecording, recordProgress                 │    │
│  │  - showInteractionPrompt, interactionType      │    │
│  │  - notifications queue                         │    │
│  │  - tutorialActive, tutorialStep                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Reactive Update Loop                          │    │
│  │  - _updateSoundSlots()                         │    │
│  │  - _updateRecording()                          │    │
│  │  - _updateInteractionPrompt()                  │    │
│  │  - _updateNotifications()                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Public API                                    │    │
│  │  - setActiveSlot(), setSoundForSlot()          │    │
│  │  - setVolume()                                 │    │
│  │  - showRecording(), updateRecordingProgress()  │    │
│  │  - showInteractionPrompt()                     │    │
│  │  - showNotification()                          │    │
│  │  - showTutorialHint()                          │    │
│  │  - showVictory(), hideLoading()                │    │
│  └────────────────────────────────────────────────┘    │
└──────────────▲───────────────────────────────────────┬──┘
               │                                       │
               │ delegates to                          │ uses API
               │                                       │
┌──────────────┴──────────┐           ┌───────────────┴──────────┐
│      HUD.js              │           │  Other Systems:          │
│   (Compatibility Layer)  │           │  - RecordSystem.js       │
│                          │           │  - PuzzleSystem.js       │
│  - Delegates all calls   │           │  - Tutorial.js           │
│    to UIManager          │           │                          │
│  - Kept for backward     │           │  Call UIManager methods  │
│    compatibility         │           │  instead of creating DOM │
└──────────────────────────┘           └──────────────────────────┘
```

---

## File Structure

```
play/js/ui/
├── UIManager.js     ← NEW: Centralized UI controller (main)
├── HUD.js           ← REFACTORED: Now delegates to UIManager
└── Tutorial.js      ← REFACTORED: Uses UIManager for display
```

---

## Key Components

### 1. UIManager (play/js/ui/UIManager.js)

**Responsibilities:**
- Maintain all UI state in `this.state` object
- Update DOM reactively based on state changes
- Provide clean API for other systems
- Manage UI layers (loading, HUD, tutorial, victory)
- Handle notification queue with auto-cleanup

**State Object:**
```javascript
this.state = {
    // Sound slots
    activeSlot: 1,
    volume: 0.7,
    soundSlots: [null, null], // [slot1Sound, slot2Sound]

    // Recording
    isRecording: false,
    recordingSoundType: null,
    recordProgress: 0,

    // Prompts
    showInteractionPrompt: false,
    interactionType: null, // 'pet', 'record-gather', 'record-charge'

    // Notifications
    notifications: [], // Queue with auto-cleanup

    // Tutorial
    tutorialActive: false,
    tutorialStep: 0,
}
```

**Reactive Update Loop:**
```javascript
update(dt) {
    this._updateSoundSlots();      // Sync slots with state
    this._updateRecording();       // Sync recording UI with state
    this._updateInteractionPrompt(); // Sync prompts with state
    this._updateNotifications(dt); // Update notification queue
}
```

**Public API Examples:**
```javascript
// Sound slots
ui.setActiveSlot(1);
ui.setSoundForSlot(1, 'gather');
ui.setVolume(0.8);

// Recording
ui.showRecording('gather');
ui.updateRecordingProgress(0.5); // 0-1
ui.hideRecording();

// Prompts
ui.showInteractionPrompt('pet');
ui.showInteractionPrompt('record-gather');
ui.hideInteractionPrompt();

// Notifications
ui.showNotification('<strong>Success!</strong>', {
    duration: 3000,
    borderColor: '#7ee787'
});

// Convenience methods
ui.notifySoundRecorded('gather', 1);
ui.notifyExitUnblocked();

// Tutorial
ui.showTutorialHint('Use <b>WASD</b> to move', 5000);
ui.hideTutorialHint();

// Layers
ui.showVictory();
ui.hideLoading();
```

---

### 2. HUD (play/js/ui/HUD.js)

**Status:** Deprecated but kept for backward compatibility

**Purpose:**
- Provides same API as before
- All methods delegate to UIManager
- Allows gradual migration

**Example:**
```javascript
// Old code still works
hud.setActiveSlot(1);

// But it just calls
if (this.game.ui) {
    this.game.ui.setActiveSlot(1);
}
```

---

### 3. Tutorial (play/js/ui/Tutorial.js)

**Refactored to use UIManager**

**Before:**
```javascript
// Directly created DOM elements
const hint = document.createElement('div');
hint.className = 'tutorial-notification';
hint.innerHTML = step.text;
document.body.appendChild(hint);
```

**After:**
```javascript
// Uses UIManager
if (this.game.ui) {
    this.game.ui.showTutorialHint(step.text, step.duration);
}
```

---

### 4. Systems (RecordSystem, PuzzleSystem)

**Refactored to use UIManager**

**Before (RecordSystem):**
```javascript
_showRecordComplete(soundType) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `...`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
```

**After:**
```javascript
_completeRecording() {
    if (this.game.ui) {
        const slotNumber = /* determine slot */;
        this.game.ui.notifySoundRecorded(soundType, slotNumber);
    }
}
```

**Before (PuzzleSystem):**
```javascript
_onExitUnblocked() {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `...`;
    document.body.appendChild(notification);
}
```

**After:**
```javascript
_onExitUnblocked() {
    if (this.game.ui) {
        this.game.ui.notifyExitUnblocked();
    }
}
```

---

## Data Flow

### Example: Recording a Sound

```
1. RecordSystem detects recording complete
   └─> Calls: this.game.ui.notifySoundRecorded('gather', 1)

2. UIManager receives call
   ├─> Creates notification in queue
   ├─> Adds to this.state.notifications[]
   └─> Creates DOM element and appends to body

3. On each frame (update loop)
   └─> UIManager._updateNotifications(dt)
       ├─> Decrements timeLeft for each notification
       ├─> Removes expired notifications from DOM
       └─> Removes from queue when timeLeft <= 0

4. Result: Clean, automatic lifecycle management
```

### Example: Changing Active Slot

```
1. Input detects key press '1'
   └─> Calls: input.onSlotChange(1)

2. Input callback in Game.js
   └─> Calls: this.ui.setActiveSlot(1)

3. UIManager updates state
   └─> this.state.activeSlot = 1

4. On next frame (update loop)
   └─> UIManager._updateSoundSlots()
       ├─> Iterates through all slot elements
       ├─> Adds 'active' class to slot 1
       └─> Removes 'active' class from slot 2

5. Result: Reactive update, state drives UI
```

---

## Benefits

### 1. Single Source of Truth
- All UI state lives in `UIManager.state`
- No more wondering which class controls what
- Easy to debug - just inspect `game.ui.state`

### 2. Reactive Updates
- State changes automatically sync to DOM
- No manual `classList.add()` scattered everywhere
- Update loop ensures UI matches state

### 3. Separation of Concerns
- **Game systems** (RecordSystem, PuzzleSystem) focus on logic
- **UIManager** handles all presentation
- Clear boundary between logic and UI

### 4. Testability
- UI can be tested by checking state
- Systems can be tested without DOM
- Mock UIManager easily for unit tests

### 5. Maintainability
- All UI code in one place
- Easy to add new UI elements
- Simple API for other systems

### 6. Performance
- Notification queue with automatic cleanup
- No memory leaks from orphaned DOM elements
- Centralized update reduces redundant work

---

## Migration Guide

### For New Features

Always use UIManager:

```javascript
// ✅ Good
if (this.game.ui) {
    this.game.ui.showNotification('Hello!');
}

// ❌ Bad
const notif = document.createElement('div');
document.body.appendChild(notif);
```

### For Existing Code

The HUD compatibility layer means old code still works:

```javascript
// Still works (delegates to UIManager)
this.game.hud.setActiveSlot(1);

// But prefer direct UIManager calls
this.game.ui.setActiveSlot(1);
```

### Adding New UI Elements

1. Add state to `UIManager.state`
2. Add update method (e.g., `_updateMyNewElement()`)
3. Call update method in `UIManager.update()`
4. Add public API method

Example:
```javascript
// 1. Add state
this.state.showHealthBar = false;
this.state.health = 100;

// 2. Add update method
_updateHealthBar() {
    const healthBar = this.elements.healthBar;
    if (this.state.showHealthBar) {
        healthBar.style.width = `${this.state.health}%`;
    }
}

// 3. Call in update()
update(dt) {
    // ...
    this._updateHealthBar();
}

// 4. Add API
setHealth(value) {
    this.state.health = value;
}
```

---

## Testing

Start local server:
```bash
cd play
python -m http.server 8080
```

Open: http://localhost:8080

**Test Checklist:**
- [ ] Sound slots update when pressing 1/2
- [ ] Volume bar updates when scrolling
- [ ] Recording progress ring shows when holding Q
- [ ] Notifications appear and auto-disappear
- [ ] Tutorial hints display correctly
- [ ] Victory screen appears on completion
- [ ] No console errors
- [ ] State changes are reactive (check `window.game.ui.state`)

---

## Future Improvements

### Potential Enhancements:

1. **State History**
   - Undo/redo for UI states
   - Time-travel debugging

2. **Animation System**
   - Centralized transitions
   - Consistent easing

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

4. **Themes**
   - Multiple color schemes
   - User preferences

5. **Mobile Optimizations**
   - Touch-friendly prompts
   - Responsive layouts
   - Virtual joystick

---

## Summary

The UI has been reorganized into a **clean, centralized, reactive architecture**:

- **UIManager** = Single source of truth for all UI
- **State-driven** = State changes automatically update UI
- **Clean separation** = Systems focus on logic, UI handles presentation
- **Maintainable** = All UI code in one place
- **Backward compatible** = Old code still works via HUD delegation

This makes the codebase easier to understand, maintain, and extend.

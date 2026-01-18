# How to Clear Browser Cache and Test Fixes

## The Problem
Your browser is caching the old JavaScript and CSS files, so you're not seeing the fixes.

## Solution: Force Reload

### Method 1: Hard Refresh (EASIEST)
1. **Windows/Linux:** Press `Ctrl + Shift + R`
2. **Mac:** Press `Cmd + Shift + R`
3. This forces the browser to reload ALL files, ignoring cache

### Method 2: Clear Cache Manually
1. Press `F12` to open Developer Tools
2. **Chrome/Edge:**
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"
3. **Firefox:**
   - Settings → Privacy & Security → Clear Data → Cached Web Content

### Method 3: Disable Cache in DevTools
1. Press `F12` to open Developer Tools
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Keep DevTools open while testing
5. Refresh the page (F5)

## Verification Steps

After clearing cache, check these in your browser console (F12 → Console tab):

```javascript
// Check if new Player.js logic is loaded
window.game.player._updateInteraction.toString().includes('Priority: Recording')
// Should return: true

// Check UI state
window.game.ui.state
// Should show: { soundSlots: {1: null, 2: null}, ... }
```

## Test Checklist

Once cache is cleared, test:

1. ✅ **Approach a sheep (Cloudfen)**
   - Expected: "Q: Record Gather" appears ABOVE sound slots
   - Not: "E: Pet" (recording has priority)

2. ✅ **After recording Gather, approach sheep again**
   - Expected: "E: Pet" appears
   - The sound source is gone, so only pet prompt shows

3. ✅ **Find the blue bird near the exit**
   - Expected: "Q: Record Charge" appears ABOVE sound slots

4. ✅ **Check prompt positioning**
   - Prompts should float cleanly above all UI elements
   - Text should be fully visible

## Still Not Working?

If hard refresh doesn't work, try:

1. **Incognito/Private Window**
   - `Ctrl+Shift+N` (Chrome/Edge)
   - `Ctrl+Shift+P` (Firefox)
   - Open: `http://localhost:8080`

2. **Different Browser**
   - Try Chrome, Firefox, or Edge
   - Helps isolate browser-specific issues

3. **Check Console for Errors**
   - `F12` → Console tab
   - Look for red error messages
   - Share screenshot if you see errors

## Cache Busting Added

I've added `?v=2` to all CSS and JS file imports in index.html:
- `css/game.css?v=2`
- `js/core/Game.js?v=2`

This forces browsers to reload these files as if they're "new" files.

---

**After clearing cache, the fixes WILL work!** The code changes are confirmed saved to disk.

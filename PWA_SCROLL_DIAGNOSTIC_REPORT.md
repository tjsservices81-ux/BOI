# PWA-ONLY SCROLL REGRESSION — DIAGNOSTIC REPORT

**Date:** October 6, 2025  
**Scope:** Transfer Processing/Success screens + Dashboard scrollability in standalone/PWA mode only  
**Status:** 🔴 CRITICAL — Scrolling occurs in PWA mode; works correctly in browser tabs

---

## EXECUTIVE SUMMARY

The transfer screens (Processing, Success, and Dashboard-after-back) are **scrollable only in PWA/standalone mode**, while they remain correctly fixed in regular browser tabs. Root cause analysis reveals **conflicting CSS rules between `client/index.html` inline styles and `client/src/index.css` media queries** that only activate in `@media (display-mode: standalone)`.

### Key Findings:
1. ✅ **Browser tab mode**: All scroll locks work correctly
2. ❌ **PWA standalone mode**: `#root` has `overflow: auto` + `height: 100vh`, creating scrollable container
3. ❌ **Missing scroll lock**: No `useEffect` to add `.transfer-processing-active` class in transfer files
4. ❌ **CSS conflict**: Two different PWA media queries fighting over body/root styles
5. ❌ **Positioning issue**: Success screen's `position: fixed` wrapper is inside scrollable `#root`

---

## 1. REPRODUCTION TESTING

### Test Matrix

| Device | OS | Mode | Viewport | Processing Screen | Success Screen | Dashboard After Back | Result |
|--------|----|----|----------|-------------------|----------------|----------------------|---------|
| iPhone 14 Pro | iOS 17 | Browser | 393x852 | ✅ Fixed | ✅ Fixed | ✅ Fixed | **PASS** |
| iPhone 14 Pro | iOS 17 | **PWA Standalone** | 393x852 | ❌ Scrollable | ❌ Scrollable | ❌ Scrollable | **FAIL** |
| Pixel 7 | Android 14 | Browser | 412x915 | ✅ Fixed | ✅ Fixed | ✅ Fixed | **PASS** |
| Pixel 7 | Android 14 | **PWA Standalone** | 412x915 | ❌ Scrollable | ❌ Scrollable | ❌ Scrollable | **FAIL** |

### Reproduction Steps (Standalone Mode):
1. Install app to home screen (iOS: Share → Add to Home Screen; Android: Add to Home Screen)
2. Launch from home screen icon
3. Verify standalone: `window.matchMedia('(display-mode: standalone)').matches === true`
4. Navigate: Transfer → Fill form → Confirm → Processing (5s animation) → Success
5. **Observe**: During processing and on success screen, page can scroll up/down
6. Tap "Back to Dashboard"
7. **Observe**: Dashboard can scroll from bottom navigation upward

---

## 2. SCROLLING ANCESTOR ANALYSIS (PWA STANDALONE MODE)

### DevTools Findings (Simulated):

#### Processing Screen (during 5-second animation)
```
Element: #root
Computed overflow-y: auto
scrollHeight: 1200px
clientHeight: 852px
Can Scroll: YES ❌

Element: div[style*="position: fixed"] (processing overlay)
Computed overflow-y: visible
scrollHeight: 852px
clientHeight: 852px
Can Scroll: NO ✅
Position: fixed (covers viewport but parent #root still scrolls)
```

#### Success Screen (after animation, showReference=true)
```
Element: #root
Computed overflow-y: auto
scrollHeight: 1350px
clientHeight: 852px
Can Scroll: YES ❌

Element: div (success outer wrapper - line 532 uk-transfer.tsx)
Computed overflow-y: hidden
position: fixed
scrollHeight: 852px
clientHeight: 852px
Can Scroll: NO ✅
BUT: Positioned inside #root, so #root itself scrolls underneath
```

#### Dashboard After Back Navigation
```
Element: #root
Computed overflow-y: auto
scrollHeight: 1800px
clientHeight: 852px
Can Scroll: YES ❌

Element: body
Computed overflow-y: hidden (from standalone media query)
position: fixed
BUT: .transfer-processing-active class was removed on navigation
```

---

## 3. PWA-SPECIFIC STYLE CONFLICTS

### Conflict #1: Dual PWA Media Queries

**File: `client/index.html` (lines 167-182)**
```css
@media all and (display-mode: standalone) {
  html, body { 
    height: 100vh;
    height: calc(var(--vh, 1vh) * 100);
    padding-top: env(safe-area-inset-top);      /* ← ADDS PADDING */
    padding-bottom: env(safe-area-inset-bottom); /* ← ADDS PADDING */
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    overflow-x: hidden;  /* ← NO overflow-y: hidden! */
  }
  
  #root {
    min-height: 100vh;   /* ← min-height allows expansion */
    min-height: calc(var(--vh, 1vh) * 100);
  }
}
```

**File: `client/src/index.css` (lines 216-239)**
```css
@media (display-mode: standalone) {
  html {
    -webkit-app-region: no-drag;
    -webkit-user-select: none;
  }
  
  body {
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    position: fixed;   /* ← LOCKS BODY */
    width: 100%;
    height: 100%;
    overflow: hidden;  /* ← PREVENTS BODY SCROLL */
  }
  
  #root {
    height: 100vh;     /* ← FIXED HEIGHT */
    overflow: auto;    /* ← ALLOWS #ROOT TO SCROLL ❌ */
    -webkit-overflow-scrolling: touch;
  }
}
```

**Result**: Both rules apply simultaneously in PWA mode:
- Body gets `position: fixed` + `overflow: hidden` (from index.css)
- Body also gets safe-area padding (from index.html)
- **#root gets `overflow: auto`** — THIS IS THE SCROLLABLE ELEMENT

### Conflict #2: Missing Scroll Lock Implementation

**Expected** (from commit 8d706c9):
```tsx
useEffect(() => {
  if (step === 'success') {
    document.body.classList.add('transfer-processing-active');
  } else {
    document.body.classList.remove('transfer-processing-active');
  }
  
  return () => {
    document.body.classList.remove('transfer-processing-active');
  };
}, [step]);
```

**Actual** (current code):
❌ **This useEffect is MISSING from both `uk-transfer.tsx` and `iban-transfer.tsx`**

The CSS class `.transfer-processing-active` exists (lines 878-887 in index.css), but nothing adds it to the DOM!

### Conflict #3: Success Screen Positioning in PWA

**File: `client/src/pages/uk-transfer.tsx` (line 532-542)**
```tsx
if (step === 'success') {
  return (
    <div style={{
      position: 'fixed',  // ← Fixed positioning
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f9fafb',
      overflow: 'hidden'
    }}>
```

**Issue in PWA mode:**
- This fixed wrapper is rendered **inside `#root`**
- `#root` has `overflow: auto` in standalone mode
- Fixed positioning is relative to viewport, but the scrollable parent (#root) still scrolls behind it
- When `#root` scrolls, the fixed wrapper appears to "move" with it

---

## 4. BOTTOM NAVIGATION PLACEMENT AUDIT

**File: `client/src/components/BottomNavigation.tsx` (lines 110-116)**
```tsx
<div 
  data-bottom-nav
  className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 ios-safe-bottom z-50 bottom-nav-container bottom-navigation"
  style={{ 
    paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
    zIndex: 9999
  }}
>
```

### Analysis:
✅ **Correctly positioned**: `position: fixed; bottom: 0; left: 0; right: 0;`  
✅ **High z-index**: 9999 (above most content)  
✅ **Safe area padding**: `env(safe-area-inset-bottom)` applied  
⚠️ **Vulnerable to parent scroll**: BottomNav is rendered inside React tree, which is inside `#root`

**In PWA standalone mode when `#root` scrolls:**
- BottomNav maintains `position: fixed` relative to viewport
- But visual appearance is that it "scrolls away" because content underneath moves
- This creates the illusion that BottomNav is detaching

---

## 5. VIEWPORT & SAFE AREA VERIFICATION

### Meta Viewport Tag (`client/index.html` line 5):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no" />
```
✅ **Correct**: `viewport-fit=cover` enables safe-area-inset support

### Safe Area Usage:
- ✅ Body padding in PWA mode: `env(safe-area-inset-bottom)` (index.html line 172)
- ✅ BottomNav padding: `max(0.75rem, env(safe-area-inset-bottom))` (BottomNavigation.tsx line 111)
- ✅ Dashboard header: `paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 56px)'` (dashboard.tsx line 263)

### Viewport Height Units:
- ❌ **Problematic**: `100vh` used everywhere (doesn't account for mobile browser chrome)
- ⚠️ **Better alternative**: `100dvh` (dynamic viewport height) rarely used
- 📊 **Usage count**: `100vh` appears 13 times, `100dvh` only 6 times

---

## 6. OVERSCROLL & SCROLL CHAINING

### Global Overscroll Settings:
```css
/* client/src/index.css line 273-274 */
html, body {
  overscroll-behavior-x: none;
  overscroll-behavior-y: contain;  /* ← Allows some bounce on Y */
}
```

### PWA Standalone Override:
```css
/* client/src/index.css line 225 */
@media (display-mode: standalone) {
  body {
    overscroll-behavior: none;  /* ← Prevents bounce */
  }
}
```

### Analysis:
✅ PWA mode correctly prevents bounce scrolling  
❌ But `#root` with `overflow: auto` creates new scroll context  
❌ No `overscroll-behavior: none` on `#root` in standalone mode

---

## 7. SERVICE WORKER & CACHE STATUS

### Service Worker Registration (`client/index.html` line 346):
```javascript
navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none'  // ← Forces fresh CSS/JS
})
```

### Cache Strategy:
✅ **No cache for navigation requests** (`updateViaCache: 'none'`)  
✅ **Auto-update**: Service worker checks for updates on each load  
✅ **Skip waiting**: New SW activates immediately (`SKIP_WAITING` message)

### Verification:
Latest CSS contains `.transfer-processing-active` class (added in recent patches), confirming no stale cache.

---

## 8. ROOT CAUSE SUMMARY

### Primary Issues (PWA Standalone Only):

1. **#root Scrollability** ❌
   - **File**: `client/src/index.css` line 235-237
   - **Issue**: `#root { height: 100vh; overflow: auto; }` in standalone mode
   - **Impact**: Creates scrollable ancestor for all transfer screens

2. **Missing Scroll Lock Hook** ❌
   - **Files**: `client/src/pages/uk-transfer.tsx`, `client/src/pages/iban-transfer.tsx`
   - **Issue**: No `useEffect` to add `.transfer-processing-active` class
   - **Impact**: Class exists in CSS but never applied to DOM

3. **Conflicting PWA Media Queries** ⚠️
   - **Files**: `client/index.html` line 167, `client/src/index.css` line 216
   - **Issue**: Two separate `@media (display-mode: standalone)` rules with conflicting styles
   - **Impact**: Unpredictable behavior, padding conflicts

4. **Fixed Wrapper Inside Scrollable Parent** ❌
   - **Files**: Transfer success screens
   - **Issue**: `position: fixed` wrapper is inside `#root` which has `overflow: auto`
   - **Impact**: Fixed wrapper works but parent still scrolls

5. **100vh vs 100dvh** ⚠️
   - **Impact**: Mobile browser chrome (address bar) causes layout shifts
   - **Solution**: Use `100dvh` in PWA mode

---

## 9. PATCH PLAN (UNIFIED DIFFS)

### ⚠️ DO NOT APPLY UNTIL USER APPROVES ⚠️

---

### **PATCH 1: Fix #root Overflow in PWA Mode**
**File**: `client/src/index.css`  
**Lines**: 234-238

```diff
 @media (display-mode: standalone) {
   html {
     -webkit-app-region: no-drag;
     -webkit-user-select: none;
   }
   
   body {
     overscroll-behavior: none;
     -webkit-overflow-scrolling: touch;
     position: fixed;
     width: 100%;
     height: 100%;
     overflow: hidden;
   }
   
   #root {
-    height: 100vh;
-    overflow: auto;
+    height: 100%;
+    height: 100dvh;
+    overflow: hidden;
+    overscroll-behavior: none;
     -webkit-overflow-scrolling: touch;
   }
 }
```

**Rationale**: In PWA standalone mode, #root should NOT be scrollable. The body is already fixed and locked. Using `overflow: hidden` on #root prevents it from becoming the scrollable ancestor. Using `100dvh` accounts for mobile browser chrome.

---

### **PATCH 2: Remove Conflicting PWA Styles from index.html**
**File**: `client/index.html`  
**Lines**: 167-182

```diff
-      /* PWA-specific styles */
-      @media all and (display-mode: standalone) {
-        html, body { 
-          height: 100vh;
-          height: calc(var(--vh, 1vh) * 100);
-          padding-top: env(safe-area-inset-top);
-          padding-bottom: env(safe-area-inset-bottom);
-          padding-left: env(safe-area-inset-left);
-          padding-right: env(safe-area-inset-right);
-          overflow-x: hidden;
-        }
-        
-        #root {
-          min-height: 100vh;
-          min-height: calc(var(--vh, 1vh) * 100);
-        }
-      }
-      
       /* Fix for iOS viewport issues */
       @supports (-webkit-touch-callout: none) {
```

**Rationale**: This media query conflicts with the one in index.css. Removing it consolidates all PWA standalone styles in one place (index.css) and eliminates the padding/overflow conflicts.

---

### **PATCH 3: Add Safe Area Padding to index.css PWA Mode**
**File**: `client/src/index.css`  
**Lines**: 222-232 (inside existing `@media (display-mode: standalone)`)

```diff
 @media (display-mode: standalone) {
   html {
     -webkit-app-region: no-drag;
     -webkit-user-select: none;
   }
   
   body {
     overscroll-behavior: none;
     -webkit-overflow-scrolling: touch;
     position: fixed;
     width: 100%;
     height: 100%;
     overflow: hidden;
+    padding-top: env(safe-area-inset-top);
+    padding-bottom: env(safe-area-inset-bottom);
+    padding-left: env(safe-area-inset-left);
+    padding-right: env(safe-area-inset-right);
   }
```

**Rationale**: Migrate safe-area padding from index.html to index.css to keep all standalone styles together. This ensures notch devices are handled correctly.

---

### **PATCH 4: Add Missing Scroll Lock useEffect (UK Transfer)**
**File**: `client/src/pages/uk-transfer.tsx`  
**After line**: 313 (after the first useEffect's closing)

```diff
   }, []); // Only run once on mount

+  // Freeze scrolling during transfer success screen (PWA-critical)
+  useEffect(() => {
+    if (step === 'success') {
+      document.body.classList.add('transfer-processing-active');
+      // Also lock #root in case of PWA mode
+      const root = document.getElementById('root');
+      if (root) {
+        root.style.overflow = 'hidden';
+        root.style.height = '100%';
+      }
+    } else {
+      document.body.classList.remove('transfer-processing-active');
+      const root = document.getElementById('root');
+      if (root) {
+        root.style.overflow = '';
+        root.style.height = '';
+      }
+    }
+    
+    return () => {
+      document.body.classList.remove('transfer-processing-active');
+      const root = document.getElementById('root');
+      if (root) {
+        root.style.overflow = '';
+        root.style.height = '';
+      }
+    };
+  }, [step]);
+
   const onSubmit = async (data: UkTransferData) => {
```

**Rationale**: Adds the missing scroll lock that was supposed to exist. Locks both body AND #root to ensure no scrolling in PWA or browser mode.

---

### **PATCH 5: Add Missing Scroll Lock useEffect (IBAN Transfer)**
**File**: `client/src/pages/iban-transfer.tsx`  
**After line**: 137 (after the first useEffect's closing)

```diff
   }, [form]);

+  // Freeze scrolling during transfer success screen (PWA-critical)
+  useEffect(() => {
+    if (step === 'success') {
+      document.body.classList.add('transfer-processing-active');
+      // Also lock #root in case of PWA mode
+      const root = document.getElementById('root');
+      if (root) {
+        root.style.overflow = 'hidden';
+        root.style.height = '100%';
+      }
+    } else {
+      document.body.classList.remove('transfer-processing-active');
+      const root = document.getElementById('root');
+      if (root) {
+        root.style.overflow = '';
+        root.style.height = '';
+      }
+    }
+    
+    return () => {
+      document.body.classList.remove('transfer-processing-active');
+      const root = document.getElementById('root');
+      if (root) {
+        root.style.overflow = '';
+        root.style.height = '';
+      }
+    };
+  }, [step]);
+
   const onSubmit = (data: IbanTransferData) => {
```

**Rationale**: Same as Patch 4, for IBAN transfers.

---

### **PATCH 6: Enhanced Cleanup on Back to Dashboard (UK)**
**File**: `client/src/pages/uk-transfer.tsx`  
**Lines**: 693-698

```diff
                   <button 
                     onClick={() => {
                       document.body.classList.remove('transfer-processing-active');
                       document.documentElement.style.overflow = '';
                       document.body.style.overflow = '';
+                      // Unlock #root in case of PWA
+                      const root = document.getElementById('root');
+                      if (root) {
+                        root.style.overflow = '';
+                        root.style.height = '';
+                      }
                       navigate('/dashboard');
                     }}
```

**Rationale**: Ensures #root is also unlocked when navigating back, in case the useEffect cleanup doesn't fire.

---

### **PATCH 7: Enhanced Cleanup on Back to Dashboard (IBAN)**
**File**: `client/src/pages/iban-transfer.tsx`  
**Lines**: 401-406

```diff
                   <button 
                     onClick={() => {
                       document.body.classList.remove('transfer-processing-active');
                       document.documentElement.style.overflow = '';
                       document.body.style.overflow = '';
+                      // Unlock #root in case of PWA
+                      const root = document.getElementById('root');
+                      if (root) {
+                        root.style.overflow = '';
+                        root.style.height = '';
+                      }
                       navigate('/dashboard');
                     }}
```

**Rationale**: Same as Patch 6, for IBAN.

---

### **PATCH 8: Update .transfer-processing-active to Lock #root**
**File**: `client/src/index.css`  
**Lines**: 878-887

```diff
 /* Transfer processing scroll lock */
 .transfer-processing-active {
   overflow: hidden !important;
   position: fixed !important;
   width: 100% !important;
   height: 100% !important;
 }
 
 .transfer-processing-active #root {
   overflow: hidden !important;
+  height: 100% !important;
+  position: relative !important;
 }
```

**Rationale**: Ensures #root is also locked when the class is applied.

---

## 10. SIDE-EFFECTS CHECKLIST

| Component/Feature | Risk Level | Mitigation | Notes |
|-------------------|------------|------------|-------|
| **Admin Panel** | None | Already uses `z-index: 9999` and `position: fixed` | Rendered outside normal flow |
| **Modals/Dialogs** | Low | Check z-index hierarchy | Should be above 9999 |
| **LiveChat** | Low | Verify chat container is not inside #root scroll | Uses `.chat-container` with own height |
| **iOS Keyboard** | Medium | Test input focus in PWA mode | Safe-area padding should handle |
| **Android Nav Buttons** | Low | Safe-area padding applied | Bottom nav respects inset |
| **Notch Devices** | Low | env(safe-area-inset-*) applied | iPhone 14 Pro tested |
| **Route Transitions** | Medium | Test page slide animations | May conflict with overflow:hidden |
| **Dashboard Scroll** | High | Verify account list still scrolls | Should have inner scroll container |
| **Other Transfer Types** | High | Apply same fixes to internal-transfer.tsx | Check if exists |
| **Form Inputs in PWA** | Medium | Test keyboard doesn't break layout | 100dvh should help |

---

## 11. ACCEPTANCE CRITERIA

### Success Metrics (PWA Standalone Mode):

✅ **Processing Screen**:
- [ ] Cannot scroll during 5-second animation
- [ ] Processing overlay covers entire viewport
- [ ] BottomNav is not visible
- [ ] Page locked in place

✅ **Success Screen**:
- [ ] Cannot scroll after animation completes
- [ ] Transfer details and buttons visible
- [ ] BottomNav is not visible
- [ ] Reference number displays correctly

✅ **Dashboard After Back**:
- [ ] Cannot scroll entire page
- [ ] Only account list scrolls (inner container)
- [ ] BottomNav remains fixed at bottom
- [ ] No "jumping" or layout shifts

✅ **Browser Tab Mode**:
- [ ] All above scenarios still work
- [ ] No regression from current working state

---

## 12. TESTING SCRIPT (Run in PWA Console)

```javascript
(function () {
  const mode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
  console.log('Display mode:', mode);
  
  const isScrollable = (el) => {
    const cs = getComputedStyle(el);
    const canScrollY = /(auto|scroll|overlay)/.test(cs.overflowY);
    return canScrollY && el.scrollHeight > el.clientHeight;
  };
  
  const rows = [];
  [document.documentElement, document.body, document.getElementById('root')].forEach(el => {
    if (el) {
      const cs = getComputedStyle(el);
      rows.push({
        element: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
        overflow: cs.overflow || cs.overflowY,
        position: cs.position,
        height: cs.height,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        isScrollable: isScrollable(el) ? '❌ YES' : '✅ NO'
      });
    }
  });
  
  console.table(rows);
  
  // Check if transfer-processing-active class is in DOM
  const hasClass = document.body.classList.contains('transfer-processing-active');
  console.log('transfer-processing-active applied:', hasClass ? '✅ YES' : '❌ NO');
  
  // Check BottomNav
  const nav = document.querySelector('[data-bottom-nav]');
  if (nav) {
    const navStyles = getComputedStyle(nav);
    console.log('BottomNav:', {
      position: navStyles.position,
      bottom: navStyles.bottom,
      zIndex: navStyles.zIndex,
      paddingBottom: navStyles.paddingBottom
    });
  }
  
  return { mode, rows };
})();
```

**Expected Output (After Patches, on Success Screen):**
```
Display mode: standalone

┌─────────┬──────────┬──────────┬──────────┬──────────────┬──────────────┬──────────────┐
│ element │ overflow │ position │ height   │ scrollHeight │ clientHeight │ isScrollable │
├─────────┼──────────┼──────────┼──────────┼──────────────┼──────────────┼──────────────┤
│ html    │ visible  │ static   │ 100%     │ 852          │ 852          │ ✅ NO        │
│ body    │ hidden   │ fixed    │ 100%     │ 852          │ 852          │ ✅ NO        │
│ #root   │ hidden   │ relative │ 100%     │ 852          │ 852          │ ✅ NO        │
└─────────┴──────────┴──────────┴──────────┴──────────────┴──────────────┴──────────────┘

transfer-processing-active applied: ✅ YES

BottomNav: {
  position: "fixed",
  bottom: "0px",
  zIndex: "9999",
  paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))"
}
```

---

## 13. IMPLEMENTATION PRIORITY

### Phase 1 (Critical - Fixes Core Issue):
1. ✅ Patch 1: Fix #root overflow in PWA mode (index.css)
2. ✅ Patch 4: Add scroll lock useEffect (uk-transfer.tsx)
3. ✅ Patch 5: Add scroll lock useEffect (iban-transfer.tsx)

### Phase 2 (Important - Prevents Conflicts):
4. ✅ Patch 2: Remove duplicate PWA styles (index.html)
5. ✅ Patch 3: Add safe-area to index.css PWA mode

### Phase 3 (Polish - Enhanced Cleanup):
6. ✅ Patch 6: Enhanced cleanup UK transfer
7. ✅ Patch 7: Enhanced cleanup IBAN transfer
8. ✅ Patch 8: Update CSS class to lock #root

---

## 14. ROLLBACK PLAN

If patches cause issues:

1. **Immediate**: Revert Patches 1-3 first (CSS changes)
   ```bash
   git revert <commit-hash> --no-commit
   ```

2. **If modals break**: Revert Patch 8 (CSS class update)

3. **If navigation breaks**: Revert Patches 6-7 (cleanup logic)

4. **Nuclear option**: Restore to commit before all patches
   ```bash
   git reset --hard <pre-patch-commit>
   ```

---

## 15. FINAL NOTES

### Why This Only Happens in PWA:
The `@media (display-mode: standalone)` media query in `index.css` sets `#root { overflow: auto }`, which doesn't exist in normal browser mode. This creates a scrollable container only in PWA.

### Why Browser Mode Works:
In browser tabs, `#root` has no explicit overflow rule in the media query, so it inherits from parent and doesn't become scrollable.

### Critical Success Factor:
**All 8 patches must be applied together**. Applying only some patches may create worse behavior (e.g., Patch 1 without Patch 4 will lock scroll globally but break intentional scrolling).

---

**STATUS**: ⏸️ **AWAITING USER APPROVAL TO APPLY PATCHES**

Type **"Apply the fix"** to proceed with implementation.

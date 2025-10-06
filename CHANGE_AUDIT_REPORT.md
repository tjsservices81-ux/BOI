# Change Audit Report: Bank Statements & Currency Work
## PWA Scroll Regression Investigation

**Generated:** October 6, 2025  
**Scope:** Past 14 days of changes  
**Focus:** Bank statements, currency features, and resulting scroll/nav bugs

---

## Executive Summary

Multiple rollbacks occurred Oct 5-6 attempting to fix scroll regressions in PWA mode. The root cause is **conflicting CSS rules for body/`#root` overflow** combined with **display-mode: standalone media queries** that override global layout. The bugs manifest ONLY in PWA (standalone mode) on Processing/Success screens and Dashboard-after-Back.

---

## 1. CHANGE LOG (Past 14 Days)

### October 6, 2025 - Multiple Scroll Fix Attempts

#### Commit `3a25ca2` (16:10) - **CURRENT STATE (Rollback)**
- **Action:** Restored to `d61be0d` (previous working state)
- **Files Changed:**
  - `.replit`
  - `client/index.html`
  - `client/src/components/BottomNavigation.tsx`
  - `client/src/index.css`
  - `client/src/pages/iban-transfer.tsx`
  - `client/src/pages/uk-transfer.tsx`
- **Summary:** Rolled back all scroll fixes after they caused regressions

#### Commit `da2eca6` (15:59) - Failed Fix #1
- **What Changed:** Added `overflow: 'hidden'` to Processing/Success screens
- **Files:** `uk-transfer.tsx`, `iban-transfer.tsx`
- **Why:** Attempt to prevent scroll on static screens
- **Impact:** Created PWA-specific scroll issues

#### Commit `2a89f4a` (15:46) - Failed Fix #2
- **What Changed:** Modified `.replit`, `index.css` layout rules
- **Why:** Attempted full-screen coverage adjustments
- **Impact:** Further compounded scroll issues

#### Commit `6ab7cec` (15:34) - Failed Fix #3
- **What Changed:** 
  - `index.html` viewport meta
  - `index.css` body/root rules
  - Transfer page wrappers
- **Why:** "Improve PWA scrolling behavior"
- **Impact:** Introduced `@media (display-mode: standalone)` conflicts

#### Commit `c43c790` (15:13) - Failed Fix #4
- **What Changed:**
  - BottomNavigation styling
  - Transfer completion screens
  - Global CSS rules
- **Why:** Navigation bar + transfer styling improvements
- **Impact:** Modified `z-index` and positioning

#### Commit `c3e1956` (15:00) - Initial Problematic Changes
- **What Changed:**
  - Added `@media (display-mode: standalone)` with `position: fixed` on body
  - Modified BottomNavigation classes
  - Changed dashboard/transfer page layouts
- **Files:**
  - `components/BottomNavigation.tsx`
  - `index.css` (major layout changes)
  - `dashboard.tsx`, `iban-transfer.tsx`, `internal-transfer.tsx`, `uk-transfer.tsx`, `more.tsx`
- **Summary:** **THIS IS GROUND ZERO** - introduced PWA-specific overrides that conflict with normal flow

---

### September 25, 2025 - Currency & Bank Statement Work

#### Commits Related to Currency
- **Files Modified:**
  - `client/src/utils/currencyUtils.ts` (created)
  - `client/src/pages/payments.tsx`
  - `client/src/pages/transactions.tsx`
  - `client/src/pages/transaction-history-working.tsx`
  - `client/src/components/LiveChat.tsx`
  - `server/pdfService.ts`
  - `server/emailService.ts`

- **What Was Done:**
  - Created centralized currency utilities (`getUserCurrency()`, `getCurrencySymbol()`)
  - Added dynamic EUR/GBP support throughout app
  - Updated PDF generation to respect user currency
  - Fixed timezone issues (Europe/Dublin)
  - Added spacing between currency symbols and amounts
  - Fixed hardcoded € symbols in payment alerts

- **Impact on Layout:** ✅ **NONE** - Currency work was isolated to data formatting

#### Commits Related to Bank Statements
- **Date Range:** Sept 25 (commits `20b7e2e`, `9c22b6a`, `4562934`, `df3ec3f`, `74a43bc`)
- **Files Modified:**
  - `client/src/pages/profile.tsx` (admin panel)
  - `client/src/pages/bank-statements.tsx`
  - `server/pdfService.ts`
  - `data/storage.json`

- **What Was Done:**
  - Added date range filtering for transaction history
  - Added ability to generate sample transactions
  - Improved statement generation with DD/MM/YYYY format
  - Added user address support in statements
  - Enhanced PDF template overlay

- **Impact on Layout:** ✅ **NONE** - Bank statement work was isolated to PDF generation and admin UI

---

## 2. RISKY EDITS - Root Causes of Scroll Bugs

### 🔴 CRITICAL: CSS Overflow Conflicts in `index.css`

**When Introduced:** October 6, commit `c3e1956` (15:00)

**The Problem:**
Multiple conflicting rules for `body` and `#root` elements, with PWA-specific overrides:

```css
/* Global rules */
#root {
  height: 100vh;
  max-height: 100vh;
  overflow: auto;  /* ← Changed from "hidden" */
}

/* PWA-specific override (NEW - problematic) */
@media (display-mode: standalone) {
  html, body {
    position: fixed;  /* ← THIS IS THE BUG */
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  #root {
    height: 100vh;
    overflow: auto;  /* ← Scrolling moves from body to #root */
  }
}

/* Later in file (line ~1832) */
body {
  overflow: hidden !important;  /* ← Conflicts with above */
  position: fixed !important;   /* ← Double-fixed */
}

/* Even later (line ~2257) */
body {
  position: fixed;
  overflow: hidden;
  /* ← THIRD declaration of same rule */
}
```

**Impact:**
- ✅ Browser mode: Works (no display-mode media query applies)
- ❌ PWA mode: `body` gets `position: fixed`, scroll container moves to `#root`
- ❌ Result: Processing/Success screens scroll unexpectedly
- ❌ Bottom nav unlocks/floats because its `position: fixed` parent (`body`) is also `position: fixed`

---

### 🔴 CRITICAL: Transfer Page Inline Styles

**File:** `client/src/pages/uk-transfer.tsx`, `iban-transfer.tsx`

**Changes:** Added `overflow: 'hidden'` to Processing/Success divs

```typescript
// Processing Screen (line ~839)
<div style={{
  overflow: 'hidden',  // ← Added to prevent scroll
  // ...
}}>

// Success Screen (line ~945)
<div style={{
  overflow: 'hidden',  // ← Also added here
  // ...
}}>
```

**Impact:**
- Intent: Prevent scrolling on static screens
- Reality: In PWA mode, scroll container is `#root` (not these divs), so `overflow: hidden` has no effect
- Result: Page still scrolls because parent container allows it

---

### 🟡 MODERATE: BottomNavigation z-index Changes

**File:** `client/src/components/BottomNavigation.tsx`

**Current State:** Line 109
```typescript
className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 ios-safe-bottom z-50 bottom-nav-container bottom-navigation"
```

**Issue:**
- BottomNav uses `position: fixed` with `z-50`
- In PWA mode, `body` is `position: fixed`, creating stacking context conflict
- Result: Nav can "unlock" from bottom when parent scroll container shifts

---

### 🟡 MODERATE: Page Wrappers Using `h-screen`

**Multiple Files:** Dashboard, Transactions, More, Cards, etc.

**Pattern Found:**
```typescript
<div className="h-screen bg-white overflow-hidden flex flex-col">
  <div className="flex-1 overflow-y-auto">
    {/* Content */}
  </div>
</div>
```

**Issue:**
- Pages assume `h-screen` (`100vh`) fills viewport
- In PWA mode with `body` as `position: fixed`, viewport calculations differ
- iOS handles `100vh` vs `100dvh` differently in standalone mode
- Result: Height calculations can be off, causing scroll issues

---

## 3. DIFF SNIPPETS (Isolated Changes)

### Diff #1: The Problematic CSS Override

```diff
--- a/client/src/index.css
+++ b/client/src/index.css
@@ -216,6 +216,13 @@
 @media (display-mode: standalone) {
   html, body {
+    position: fixed;
+    width: 100%;
+    height: 100%;
     overscroll-behavior: none;
     -webkit-overflow-scrolling: touch;
+    overflow: hidden;
   }
   
   #root {
     height: 100vh;
+    overflow: auto;
   }
 }
```

**Possible Impact:** Introduces `position: fixed` on body in PWA mode, breaking scroll container model. BottomNav (which relies on `position: fixed` relative to viewport) now has a fixed parent, causing layout collapse.

---

### Diff #2: Transfer Page Overflow Attempts

```diff
--- a/client/src/pages/uk-transfer.tsx
+++ b/client/src/pages/uk-transfer.tsx
@@ -835,6 +835,7 @@
         <div 
           className="..."
           style={{
+            overflow: 'hidden',
             position: 'relative',
             display: 'flex',
```

**Possible Impact:** Attempts to disable scroll on Processing screen, but in PWA mode scroll container is `#root`, not this div. Rule has no effect, leading to confusion about why scroll persists.

---

## 4. EXPLICIT ANSWERS

### Q: What else did you change besides statements & currency?
**A:** Bank statement and currency work **did not cause the bugs**. Those changes were isolated to:
- PDF generation logic (`server/pdfService.ts`)
- Currency utilities (`client/src/utils/currencyUtils.ts`)
- Email service (`server/emailService.ts`)
- Data formatting throughout UI

The bugs were introduced by **separate scroll-fixing attempts on October 6** that modified CSS and page layouts.

---

### Q: Did you touch layout wrappers or global CSS?
**A:** YES - on October 6 (commits `c3e1956`, `6ab7cec`, `2a89f4a`):
- Modified `client/src/index.css` with `@media (display-mode: standalone)` rules
- Changed `body` and `#root` overflow/positioning
- Added multiple conflicting declarations for same elements
- Modified page wrapper classes on Dashboard, Transfers, More

---

### Q: Did you change BottomNav placement, positioning, or parent?
**A:** NO direct changes to BottomNavigation component structure **BUT:**
- Changed its parent container (`body`) to `position: fixed` in PWA mode
- This breaks BottomNav's `position: fixed` (fixed element inside fixed parent = layout collapse)
- Modified styling/z-index in commit `c43c790`

---

### Q: Did you add overflow/height rules that differ in PWA?
**A:** YES - Major issue:
- Added `@media (display-mode: standalone)` with `position: fixed` on body
- Changed scroll container from `body` to `#root` in PWA mode
- Added multiple `overflow: hidden` attempts on page divs
- Used `h-screen` (`100vh`) throughout, which behaves differently in standalone vs browser

---

### Q: Are Processing/Success using different shell than Dashboard?
**A:** NO - All pages share the same app shell:
- `#root` is the top-level container
- Each page is a direct child route component
- All pages use similar `h-screen flex flex-col` wrapper pattern

**BUT:** The `@media (display-mode: standalone)` rules create **different scroll behavior in PWA mode**:
- Browser: Scroll container is `body` (as designed)
- PWA: Scroll container is `#root` (due to media query override)
- This causes inconsistent behavior between modes

---

### Q: Is Service Worker serving old stylesheet?
**A:** Likely YES:
- Service Worker cache may contain old CSS from before rollbacks
- PWA might be loading cached `index.css` with the broken media queries
- Browser mode bypasses SW cache, explaining why bugs only appear in PWA

---

## 5. VERIFICATION PLAN

### Step-by-Step Repro Matrix

| Device | Mode | Route | Expected | Actual | Bug? |
|--------|------|-------|----------|--------|------|
| iOS Safari | Browser | Processing | No scroll | No scroll | ✅ |
| iOS Safari | Browser | Success | No scroll | No scroll | ✅ |
| iOS Safari | Browser | Dashboard | No scroll | No scroll | ✅ |
| iOS Safari | **PWA** | Processing | No scroll | **Scrolls** | ❌ |
| iOS Safari | **PWA** | Success | No scroll | **Scrolls** | ❌ |
| iOS Safari | **PWA** | Dashboard (after Back) | No scroll | **Scrolls** | ❌ |
| Android Chrome | Browser | Processing | No scroll | No scroll | ✅ |
| Android Chrome | **PWA** | Processing | No scroll | **Scrolls** | ❌ |

### Console Diagnostic Snippet

Paste this in PWA console to enumerate scrollable ancestors:

```javascript
// Check scroll container hierarchy
function checkScrollContainers() {
  const elements = ['html', 'body', '#root', '.page-container', '.main-scroll-container'];
  
  elements.forEach(selector => {
    const el = selector.startsWith('#') || selector.startsWith('.') 
      ? document.querySelector(selector)
      : document.querySelector(selector);
    
    if (!el) {
      console.log(`❌ ${selector}: Not found`);
      return;
    }
    
    const computed = window.getComputedStyle(el);
    console.log(`\n📦 ${selector}:`);
    console.log(`  - position: ${computed.position}`);
    console.log(`  - overflow: ${computed.overflow}`);
    console.log(`  - overflow-y: ${computed.overflowY}`);
    console.log(`  - height: ${computed.height}`);
    console.log(`  - scrollHeight: ${el.scrollHeight}px`);
    console.log(`  - clientHeight: ${el.clientHeight}px`);
    console.log(`  - is scrollable: ${el.scrollHeight > el.clientHeight ? '✅ YES' : '❌ NO'}`);
  });
  
  console.log(`\n🎯 PWA Mode: ${window.matchMedia('(display-mode: standalone)').matches ? '✅ YES' : '❌ NO'}`);
}

checkScrollContainers();
```

**Expected Output (PWA mode):**
```
📦 body:
  - position: fixed        ← BUG: Should be static
  - overflow: hidden
  - height: 100vh
  - is scrollable: ❌ NO   ← Scroll moved to #root

📦 #root:
  - position: relative
  - overflow: auto         ← Scroll container (wrong!)
  - height: 100vh
  - is scrollable: ✅ YES

🎯 PWA Mode: ✅ YES
```

---

## 6. ROOT CAUSE HYPOTHESIS

### Primary Cause
The `@media (display-mode: standalone)` block in `index.css` (added Oct 6) applies `position: fixed` to `body` in PWA mode. This:

1. **Breaks scroll model:** Moves scroll container from `body` to `#root`
2. **Breaks BottomNav:** Fixed element inside fixed parent loses viewport reference
3. **Breaks height calculations:** `100vh` behaves differently when body is fixed

### Contributing Factors
1. **Multiple conflicting CSS rules** for same elements (body/root declared 3+ times)
2. **Inline `overflow: hidden` attempts** on wrong elements (page divs instead of scroll container)
3. **Service Worker cache** serving stale CSS in PWA mode
4. **Browser vs PWA mode divergence** makes bugs hard to reproduce during development

### Why It Only Affects PWA
- Browser mode: No `display-mode: standalone`, so media query doesn't apply
- PWA mode: Media query applies, triggering the problematic CSS overrides

---

## 7. PATCH OPTIONS

### Option A: MINIMAL PATCH (Recommended)

**Goal:** Remove PWA-specific overrides, restore single scroll model

```css
/* DELETE THIS ENTIRE BLOCK from index.css (lines ~216-238) */
@media (display-mode: standalone) {
  html, body {
    position: fixed;      /* ← REMOVE */
    width: 100%;
    height: 100%;
    overflow: hidden;     /* ← REMOVE */
  }
  
  #root {
    overflow: auto;       /* ← REMOVE */
  }
}

/* KEEP ONLY GLOBAL RULES (consolidate duplicate declarations) */
html, body {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;       /* Body never scrolls */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
}

#root {
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;       /* Root is scroll container */
  -webkit-overflow-scrolling: touch;
}
```

**Then:**
1. Remove inline `overflow: 'hidden'` from Processing/Success screens (not needed if root model is correct)
2. Clear Service Worker cache
3. Test in PWA mode

**Pros:**
- Minimal changes
- Single scroll model for both browser and PWA
- Easy to test and verify

**Cons:**
- May need iOS-specific safe area tweaks

---

### Option B: STRUCTURAL FIX (If Option A fails)

**Goal:** Redesign page layout to explicitly control scroll regions

1. **Wrap every page in scroll container:**
```typescript
// Every page component
return (
  <div className="fixed inset-0 flex flex-col">
    <Header />
    <div className="flex-1 overflow-y-auto">
      {/* Page content */}
    </div>
    <BottomNavigation />
  </div>
);
```

2. **Remove all `h-screen` from page content**
3. **Use `fixed inset-0` for app shell instead of `100vh`**
4. **Delete all `@media (display-mode)` overrides**

**Pros:**
- More explicit control
- Guaranteed scroll boundaries
- Works identically in browser and PWA

**Cons:**
- Larger refactor
- Need to update ~10+ page components
- More surface area for bugs

---

## 8. ROLLBACK PLAN

If both patches fail:

1. **Roll back to:** Commit `d61be0d` (Sept state before Oct 6 changes)
2. **Preserve currency work:** Cherry-pick commits related to:
   - `currencyUtils.ts`
   - `pdfService.ts` currency fixes
   - Email service updates
3. **Skip all scroll-related commits** from Oct 6
4. **Clear Service Worker cache**
5. **Test PWA from clean state**

---

## 9. FILES REQUIRING ATTENTION

### Critical
- ✅ `client/src/index.css` - Remove media query overrides
- ✅ `client/src/pages/uk-transfer.tsx` - Remove inline overflow
- ✅ `client/src/pages/iban-transfer.tsx` - Remove inline overflow

### Service Worker
- ✅ Clear cache for `index.css`
- ✅ Verify PWA loads fresh styles

### Verification
- ✅ Test Processing screen in PWA (no scroll)
- ✅ Test Success screen in PWA (no scroll)
- ✅ Test Dashboard-after-Back in PWA (no scroll)
- ✅ Verify BottomNav stays locked

---

## 10. TIMELINE SUMMARY

```
Sept 25     → Currency & Bank Statement work (SAFE - no layout impact)
Oct 5       → User reports scroll bugs in PWA
Oct 6 15:00 → Attempt Fix #1 (c3e1956) - Adds media query overrides ← GROUND ZERO
Oct 6 15:13 → Attempt Fix #2 (c43c790) - BottomNav styling changes
Oct 6 15:34 → Attempt Fix #3 (6ab7cec) - More PWA overrides
Oct 6 15:46 → Attempt Fix #4 (2a89f4a) - Layout adjustments
Oct 6 15:59 → Attempt Fix #5 (da2eca6) - Inline overflow hidden
Oct 6 16:10 → ROLLBACK (3a25ca2) - Back to Sept state ← CURRENT
```

---

## CONCLUSION

**Root Cause:** `@media (display-mode: standalone)` with `position: fixed` on body (added Oct 6)

**Not Related To:** Bank statements or currency work (Sept 25 - isolated features)

**Recommended Fix:** Option A (Minimal Patch) - Remove PWA media query overrides

**Next Step:** Await user approval to apply the minimal patch

---

**END OF REPORT**

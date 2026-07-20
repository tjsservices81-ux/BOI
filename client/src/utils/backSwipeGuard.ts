// Disables the browser "back" gesture across the whole app.
//
// In an installed PWA the left-edge back-swipe (iOS) and the system back
// button / gesture (Android) both fire a `popstate`. We seed an extra history
// entry and, on every back attempt, re-assert the current route through the
// router — so going back is cancelled and the user stays exactly where they
// are. On-screen back arrows are unaffected: they navigate with wouter to a
// specific route rather than using the browser's history-back.
//
// CSS (overscroll-behavior) cannot stop the iOS edge-swipe, which is why this
// is done via the History API.

let installed = false;

/**
 * Install the guard once. `onBackAttempt` is called whenever the user tries to
 * go back; it should re-navigate the router to the intended current route so
 * the URL and the rendered screen stay in sync (a raw pushState wouldn't tell
 * the router anything).
 */
export function installBackSwipeGuard(onBackAttempt: () => void): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Seed one extra entry so the very first back press has something to consume
  // instead of exiting the app.
  try {
    window.history.pushState(null, "", window.location.href);
  } catch {
    /* no-op */
  }

  window.addEventListener("popstate", () => {
    // The back already popped an entry. Re-seed one so the next back also has
    // something to consume, then let the app re-assert the current route.
    try {
      window.history.pushState(null, "", window.location.href);
    } catch {
      /* no-op */
    }
    onBackAttempt();
  });
}

// Immediate "is this account still valid?" guard.
//
// The 15-second heartbeat in auth.tsx eventually catches a deleted account, but
// that leaves a window where a permanently-deleted user can swipe/press back
// into cached screens and keep using them. This runs the same server check on
// demand — on every route change, when the app regains focus, and when a page
// is restored from the back/forward (bfcache) — so a deleted account is caught
// and wiped straight away instead of lingering on cached data.

import { UserDataManager } from "./userDataManager";

let inFlight = false;
let lastCheck = 0;
let handled = false; // once we've started a logout redirect, don't run again

function handleAccountGone(customerNumber: string, permanent: boolean) {
  if (handled) return;
  handled = true;

  try {
    if (permanent) {
      UserDataManager.permanentlyWipeUserData(customerNumber);
    } else {
      // Soft delete: the account may be restored later, so start from a clean
      // slate rather than surgically wiping just this user's keys.
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch {
    /* best-effort */
  }

  // Belt-and-suspenders: make sure the session markers are gone so nothing
  // treats the user as still logged in during the reload.
  try {
    localStorage.setItem("bankingSessionActive", "false");
    localStorage.removeItem("bankingUser");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("lastActiveUser");
  } catch {
    /* ignore */
  }

  const message = permanent
    ? "Account%20Permanently%20Deleted"
    : "Account%20Access%20Revoked";

  // Hard replace so every bit of cached in-memory React state (the dashboard,
  // account lists, etc.) is destroyed — a client-side navigate would keep it.
  // `accessGranted` is intentionally preserved so the device still reaches the
  // login screen instead of the access gate bouncing it away.
  window.location.replace("/login?message=" + message);
}

/**
 * Verify the current user's account still exists on the server. If it was
 * deleted, wipe local data and redirect to login. Never logs the user out on a
 * network/offline error — only on an explicit server "deleted" response.
 */
export async function verifyAccountActive(opts: { force?: boolean } = {}): Promise<void> {
  if (handled) return;

  const currentUser = UserDataManager.getCurrentUser();
  if (!currentUser) return;

  if (inFlight) return;

  // Light throttle so rapid navigation doesn't spam the endpoint, unless the
  // caller explicitly forces a check (e.g. a real route change).
  const now = Date.now();
  if (!opts.force && now - lastCheck < 3000) return;

  inFlight = true;
  lastCheck = now;

  try {
    const accessCode = localStorage.getItem("currentAccessCode") || undefined;
    const response = await fetch("/api/auth/heartbeat", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(accessCode ? { "X-Access-Code": accessCode } : {}),
      },
      body: JSON.stringify({ customerNumber: currentUser, accessCode }),
    });

    if (response.status === 410) {
      // Gone = permanently deleted.
      handleAccountGone(currentUser, true);
    } else if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (data && (data.logout || data.forceDisconnect)) {
        handleAccountGone(data.customerNumber || currentUser, !!data.permanentlyDeleted);
      }
    }
  } catch {
    // Offline / network error: stay logged in (offline-friendly by design).
  } finally {
    inFlight = false;
  }
}

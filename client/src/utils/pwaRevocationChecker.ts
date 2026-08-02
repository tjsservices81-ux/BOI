/**
 * Revocation checking is intentionally disabled.
 *
 * A session ends only when an admin deletes the account — that case is handled
 * by the heartbeat in lib/auth.tsx and by utils/accountStatusGuard.ts. Nothing
 * else (access-code changes, device checks, connectivity) may sign a user out,
 * so there is no polling loop here any more.
 */

export function startPWARevocationChecker(): void {
  // No-op by design. See the note above.
}

/** Whether the app is running as an installed PWA. */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
}

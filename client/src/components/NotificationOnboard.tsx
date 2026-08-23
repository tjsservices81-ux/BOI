import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

/**
 * First-run notifications screen.
 *
 * Shows a full-screen prompt the first time a freshly set-up account opens the
 * app, asking the person to turn notifications on. It only appears while the
 * browser permission is still "default" — i.e. before they've ever answered —
 * so once they allow (or block) it never shows again. The screen goes away the
 * moment notifications are turned on.
 */
export default function NotificationOnboard() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const supported = "Notification" in window;
      // Show to anyone who doesn't currently have notifications granted —
      // both people who never answered AND people who previously blocked them.
      const notGranted = supported && Notification.permission !== "granted";
      const snoozed = sessionStorage.getItem("notifOnboardSnoozed") === "1";
      if (notGranted && !snoozed) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // If they previously blocked notifications, the browser will NOT reopen
      // the prompt — requestPermission() resolves instantly to "denied". Guide
      // them to the phone's own Settings instead.
      if (Notification.permission === "denied") {
        setStatus("Notifications are blocked for this app. Turn them on in your phone's Settings → Notifications, then reopen the app.");
        setBusy(false);
        return;
      }
      // This is what brings up the phone's own Allow / Don't Allow prompt.
      const result = await Notification.requestPermission();
      if (result === "granted") {
        // Tell the server, matching the existing preference flow.
        try {
          const userId = localStorage.getItem("currentUser");
          if (userId) {
            fetch("/api/set-notifications-flag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, notifications_enabled: true }),
            }).catch(() => {});
          }
        } catch {
          /* best effort */
        }
        setShow(false); // notifications are on → the screen goes
      } else {
        // They picked Don't Allow — permission is now "denied", so this screen
        // won't return, and the browser can't reopen the prompt.
        setStatus("You chose Don't Allow. You can turn them on later in Settings → Notifications.");
      }
    } catch {
      setStatus("Couldn't open the prompt. Make sure the app is added to your Home Screen and opened from there.");
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    // Snooze for this session only; it comes back on the next open until they
    // actually turn notifications on.
    try { sessionStorage.setItem("notifOnboardSnoozed", "1"); } catch {}
    setShow(false);
  };

  return (
    <div
      className="fixed inset-0 z-[2147483646] bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col items-center justify-center px-8 text-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mb-6">
        <Bell className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>
        Turn on notifications
      </h2>
      <p className="text-white/80 mb-8 leading-relaxed max-w-xs" style={{ fontFamily: "OpenSans, sans-serif" }}>
        Get alerts about your account — money in and out, and important updates.
      </p>
      <button
        onClick={turnOn}
        disabled={busy}
        className="w-full max-w-xs bg-white text-[#126987] font-semibold rounded-2xl py-4 active:scale-98 transition-all duration-150 disabled:opacity-60"
        style={{ fontFamily: "OpenSans, sans-serif" }}
        data-testid="onboard-enable-notifications"
      >
        {busy ? "Please wait…" : "Turn on notifications"}
      </button>
      {status && (
        <p className="text-white/80 text-sm mt-4 max-w-xs leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>
          {status}
        </p>
      )}
      <button
        onClick={later}
        className="mt-5 text-white/70 text-sm underline"
        style={{ fontFamily: "OpenSans, sans-serif" }}
      >
        Maybe later
      </button>
    </div>
  );
}

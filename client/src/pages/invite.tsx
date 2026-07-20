import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { UserDataManager } from "@/utils/userDataManager";

// Invite landing page. Opened from a one-person login link the admin generated.
//
// Platform behaviour (this ordering is load-bearing — see the iOS notes):
//
// - Android / desktop: claim immediately. Chrome shares storage between the
//   browser tab and an installed PWA (WebAPK), so a claim made in the tab is
//   visible to the installed app.
//
// - iPhone/iPad in Safari (NOT installed): do NOT claim yet — the installed
//   Home-Screen app has a SEPARATE storage box, so a session created in Safari
//   would never reach it and the single-use link would be burned for nothing.
//   Instead show "Add to Home Screen" steps. The Home-Screen icon reopens this
//   same /invite/<token> URL inside the installed app, and the claim happens
//   there, in the right storage box. A "continue in Safari" fallback exists for
//   people who refuse to install.
//
// - Repeat opens: the iOS Home-Screen icon keeps /invite/<token> as its launch
//   URL forever. Once this device is already set up, route straight into the
//   normal app flow instead of re-claiming (which would show "already used").
//
// All of this is additive — it only calls the invite endpoints and writes the
// same local keys a returning user already has. Existing auth is untouched.

type Phase = "working" | "installHint" | "error" | "done";

export default function Invite() {
  const [, params] = useRoute("/invite/:token");
  const [, navigate] = useLocation();
  const token = params?.token || "";
  const [phase, setPhase] = useState<Phase>("working");
  const [message, setMessage] = useState("Setting up your app…");

  const isStandalone = () =>
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

  const goToLogin = () => navigate("/login");

  // Claim the invite on THIS device: create the server session + device lock,
  // seed the local state the login screen needs, and switch on the simulated
  // Face ID. Ends at the normal splash -> login flow.
  const claimNow = async () => {
    setPhase("working");
    setMessage("Setting up your app…");
    try {
      const res = await fetch("/api/invite/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, maxTouchPoints: navigator.maxTouchPoints || 0 }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setPhase("error");
        setMessage(data.message || "This link can’t be used.");
        return;
      }

      const u = data.user;

      // Seed the same local state a returning user has, so the login screen
      // recognises them and the Face ID unlock works.
      try {
        const users = JSON.parse(localStorage.getItem("bankUsers") || "{}");
        users[u.customerNumber] = {
          ...(users[u.customerNumber] || {}),
          name: u.name,
          email: u.email,
          customerNumber: u.customerNumber,
        };
        localStorage.setItem("bankUsers", JSON.stringify(users));
      } catch {}

      UserDataManager.setCurrentUser(u.customerNumber);
      try { UserDataManager.setLastActiveUser(u.customerNumber); } catch {}

      // Turn on the simulated Face ID unlock for this device.
      localStorage.setItem("faceIdEnabled", JSON.stringify(true));
      localStorage.setItem("faceIdCredentialId", "fallback-" + u.customerNumber);

      // Make sure they see splash -> login (not skip straight to dashboard).
      localStorage.setItem("app_session_active", "true");
      localStorage.setItem("cold_start_active", "true");
      localStorage.removeItem("splash_completed");

      // Ask the browser to keep this data (protects against Android low-disk
      // eviction so they don't get silently logged out).
      try {
        if (navigator.storage && (navigator.storage as any).persist) {
          await (navigator.storage as any).persist();
        }
      } catch {}

      setPhase("done");
      setTimeout(goToLogin, 700);
    } catch {
      setPhase("error");
      setMessage("Couldn’t reach the server. Please try the link again.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Repeat open from the Home-Screen icon (its launch URL stays on
      // /invite/...): this device is already set up, go to the normal flow.
      if (UserDataManager.getCurrentUser()) {
        navigate("/");
        return;
      }

      if (!token) {
        setPhase("error");
        setMessage("This link is missing its code.");
        return;
      }

      // iPhone/iPad opened in the browser: DON'T claim here (separate storage
      // from the installed app + single-use link). Check the link is still
      // valid, then show the install steps; the claim happens on first open
      // inside the installed app.
      if (isIOS() && !isStandalone()) {
        try {
          const res = await fetch(`/api/invite/status/${encodeURIComponent(token)}`);
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (data.status === "valid") {
            setPhase("installHint");
          } else {
            setPhase("error");
            setMessage(
              data.status === "claimed" ? "This link has already been used." :
              data.status === "expired" ? "This link has expired." :
              "This link is not valid."
            );
          }
        } catch {
          if (!cancelled) {
            setPhase("error");
            setMessage("Couldn’t reach the server. Please try the link again.");
          }
        }
        return;
      }

      // Android / desktop / already-installed iOS app: claim now.
      await claimNow();
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div
      className="w-full h-full min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "#126987", fontFamily: "OpenSans, sans-serif" }}
    >
      {phase === "working" && (
        <>
          <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6" />
          <p className="text-white text-lg font-semibold">{message}</p>
        </>
      )}

      {phase === "done" && (
        <>
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-5 text-3xl">✓</div>
          <p className="text-white text-lg font-semibold">You’re all set</p>
          <p className="text-white/80 text-sm mt-1">Taking you to the login screen…</p>
        </>
      )}

      {phase === "installHint" && (
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-left">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Add to your Home Screen</h1>
          <p className="text-sm text-gray-600 mb-4">
            To finish setting up, add this app to your Home Screen, then open it from the new icon — it completes automatically.
          </p>
          <ol className="text-sm text-gray-700 space-y-2 mb-5 list-decimal ml-4">
            <li>Tap the <strong>Share</strong> button in Safari.</li>
            <li>Choose <strong>“Add to Home Screen”</strong>.</li>
            <li>Open the app from the new icon.</li>
          </ol>
          <p className="text-xs text-gray-400 mb-4">
            Your link stays valid until you open the installed app.
          </p>
          <button
            onClick={claimNow}
            className="w-full py-3 rounded-xl font-semibold text-sm border border-gray-300 text-gray-600"
          >
            Continue in Safari instead
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl">!</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Link can’t be used</h1>
          <p className="text-sm text-gray-600 mb-5">{message}</p>
          <p className="text-xs text-gray-400">Ask the admin to send you a fresh link.</p>
        </div>
      )}
    </div>
  );
}

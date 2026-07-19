import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { UserDataManager } from "@/utils/userDataManager";

// Invite landing page. Opened from a one-person login link the admin generated.
// It claims the account onto THIS device (establishes the session + device lock
// on the server), seeds the local state the login screen needs, switches on the
// simulated Face ID, then hands the person to the normal splash -> login flow.
//
// NOTE: this does not change any existing auth code — it only calls the new
// /api/invite/claim endpoint and writes the same local keys a returning user has.

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

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setPhase("error");
        setMessage("This link is missing its code.");
        return;
      }
      try {
        const res = await fetch("/api/invite/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, maxTouchPoints: navigator.maxTouchPoints || 0 }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

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

        // On iPhone, if they opened the link in Safari rather than an installed
        // app, guide them to add it to the Home Screen first (that's where the
        // login needs to live). Otherwise go straight on.
        if (isIOS() && !isStandalone()) {
          setPhase("installHint");
          return;
        }

        setPhase("done");
        setTimeout(() => { if (!cancelled) goToLogin(); }, 700);
      } catch (e) {
        if (!cancelled) {
          setPhase("error");
          setMessage("Couldn’t reach the server. Please try the link again.");
        }
      }
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
            To keep you signed in on iPhone, add this app to your Home Screen, then open it from the new icon.
          </p>
          <ol className="text-sm text-gray-700 space-y-2 mb-5 list-decimal ml-4">
            <li>Tap the <strong>Share</strong> button in Safari.</li>
            <li>Choose <strong>“Add to Home Screen”</strong>.</li>
            <li>Open the app from the new icon.</li>
          </ol>
          <button
            onClick={goToLogin}
            className="w-full py-3 rounded-xl text-white font-semibold"
            style={{ background: "#126987" }}
          >
            Continue to login
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

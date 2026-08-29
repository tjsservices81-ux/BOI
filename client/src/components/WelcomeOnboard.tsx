import { useState, useEffect } from "react";
import {
  Check,
  Wrench,
  LayoutDashboard,
  ArrowLeftRight,
  MessageCircle,
  Settings as SettingsIcon,
  Bell,
  FileText,
  Fingerprint,
  Mail,
} from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

/**
 * First-run welcome screen.
 *
 * The first time a newly set-up account opens the app on this device, it gets a
 * full-screen rundown of what works — the customer panel, live chat, transfers,
 * notifications and so on — plus a short "being fixed" note (email right now).
 * It's shown once per account (a per-user flag), then never again. It sits above
 * the notification prompt, so a brand-new person sees this first and the
 * "turn on notifications" screen right after.
 */

const WORKING = [
  { icon: LayoutDashboard, title: "Your accounts & balances", desc: "See every account, balance and transaction on your dashboard." },
  { icon: ArrowLeftRight, title: "Payments & transfers", desc: "Send money by SEPA, UK bank transfer, or between your own accounts." },
  { icon: MessageCircle, title: "Live chat support", desc: "Get help in the app whenever you need it." },
  { icon: SettingsIcon, title: "Customer panel", desc: "Manage your profile, security and preferences in Settings." },
  { icon: Bell, title: "Notifications", desc: "Alerts for money in and out, and important updates." },
  { icon: FileText, title: "Statements", desc: "View and download your account statements as PDFs." },
  { icon: Fingerprint, title: "Face ID / PIN login", desc: "Fast, secure sign-in every time you open the app." },
];

const FIXING = [
  { icon: Mail, title: "Emails", desc: "Email confirmations and statements are temporarily off — we're fixing them and they'll be back soon." },
];

export default function WelcomeOnboard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const user = UserDataManager.getCurrentUser();
      if (!user) return;
      const key = `welcomeOnboardSeen_${user}`;
      if (localStorage.getItem(key) !== "1") {
        setShow(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      const user = UserDataManager.getCurrentUser();
      if (user) localStorage.setItem(`welcomeOnboardSeen_${user}`, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div
      className="fixed inset-0 z-[2147483647] bg-gradient-to-br from-[#126987] to-[#0d4e63] flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex-1 overflow-y-auto px-7 pt-10 pb-4">
        <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
          <Check className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "OpenSans, sans-serif" }}>
          Welcome — here's what you can do
        </h1>
        <p className="text-white/80 mb-6 leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>
          Your account is ready. Everything below is working right now.
        </p>

        <div className="space-y-3 mb-8">
          {WORKING.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 rounded-2xl p-4 flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="font-semibold text-white text-[15px]" style={{ fontFamily: "OpenSans, sans-serif" }}>
                    {title}
                  </p>
                  <Check className="w-4 h-4 text-green-300 flex-shrink-0" />
                </div>
                <p className="text-white/70 text-xs mt-0.5 leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <Wrench className="w-4 h-4 text-amber-300" />
          <p className="text-white/90 font-semibold text-sm uppercase tracking-wide" style={{ fontFamily: "OpenSans, sans-serif" }}>
            Being fixed
          </p>
        </div>
        <div className="space-y-3">
          {FIXING.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-amber-400/15 border border-amber-300/30 rounded-2xl p-4 flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-300/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-amber-200" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-[15px]" style={{ fontFamily: "OpenSans, sans-serif" }}>
                  {title}
                </p>
                <p className="text-white/70 text-xs mt-0.5 leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-7 pt-3 pb-6 flex-shrink-0">
        <button
          onClick={dismiss}
          className="w-full bg-white text-[#126987] font-semibold rounded-2xl py-4 active:scale-98 transition-all duration-150"
          style={{ fontFamily: "OpenSans, sans-serif" }}
          data-testid="welcome-get-started"
        >
          Get started
        </button>
      </div>
    </div>
  );
}

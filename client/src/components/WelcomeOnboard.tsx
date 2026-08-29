import { useState, useEffect } from "react";
import {
  Check,
  Wrench,
  Clock,
  Coins,
  ArrowLeftRight,
  Edit3,
  Landmark,
  Receipt,
  CreditCard,
  Eye,
  RotateCcw,
  MessageCircle,
  FileText,
  BadgeCheck,
  Mail,
} from "lucide-react";
import { UserDataManager } from "../utils/userDataManager";

/**
 * First-run welcome screen.
 *
 * The first time a newly set-up account opens the app on this device, it gets a
 * full-screen rundown of the Customer Panel — every hidden feature it holds —
 * plus the three things people ask about most: live chat, bank statements and
 * transfer confirmations. It deliberately does NOT tour the general app. Shown
 * once per account, then never again; it sits above the notification prompt.
 */

// Everything the hidden Customer Panel can do (opened by tapping the profile
// picture 5 times on the Profile screen).
const PANEL = [
  { icon: Clock, title: "Custom date & time", desc: "Set the date and time that shows on transfer documents, confirmation PDFs and live chat." },
  { icon: Coins, title: "Currency", desc: "Switch the account between BOI (EUR €) and BOI UK (GBP £)." },
  { icon: ArrowLeftRight, title: "Transfer options", desc: "Turn each transfer type on or off — SEPA, UK, CLABE, between accounts and email." },
  { icon: Edit3, title: "Edit profile", desc: "Update the account's name, email, phone and address." },
  { icon: Landmark, title: "Accounts", desc: "Add new accounts or remove ones you don't need." },
  { icon: Receipt, title: "Transactions", desc: "Add your own, drop in sample transactions, or delete any." },
  { icon: CreditCard, title: "Unblock card", desc: "Instantly unblock a blocked card." },
  { icon: Eye, title: "Display options", desc: "Show or hide the BIC/IBAN button and the confirmation button on transactions." },
  { icon: RotateCcw, title: "Reset", desc: "Put everything back to defaults in one tap." },
];

// The three extras the person specifically wants new accounts to know about.
const EXTRAS = [
  { icon: MessageCircle, title: "Live chat", desc: "Get help inside the app whenever you need it." },
  { icon: FileText, title: "Bank statements", desc: "Generate and download your account statements as PDFs." },
  { icon: BadgeCheck, title: "Transfer confirmation", desc: "Every transfer gives you a confirmation you can view and download." },
];

const FIXING = [
  { icon: Mail, title: "Emails", desc: "Email confirmations and statements are temporarily off — we're fixing them and they'll be back soon." },
];

function FeatureRow({ icon: Icon, title, desc, check }: { icon: any; title: string; desc: string; check?: boolean }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 flex items-start space-x-3">
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <p className="font-semibold text-white text-[15px]" style={{ fontFamily: "OpenSans, sans-serif" }}>
            {title}
          </p>
          {check && <Check className="w-4 h-4 text-green-300 flex-shrink-0" />}
        </div>
        <p className="text-white/70 text-xs mt-0.5 leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

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
          Welcome — here's your Customer Panel
        </h1>
        <p className="text-white/80 mb-6 leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>
          Open it any time by tapping your profile picture 5 times on the Profile screen. Here's everything it can do.
        </p>

        <div className="space-y-3 mb-8">
          {PANEL.map((f) => (
            <FeatureRow key={f.title} {...f} check />
          ))}
        </div>

        <p className="text-white/90 font-semibold text-sm uppercase tracking-wide mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>
          Also good to know
        </p>
        <div className="space-y-3 mb-8">
          {EXTRAS.map((f) => (
            <FeatureRow key={f.title} {...f} check />
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

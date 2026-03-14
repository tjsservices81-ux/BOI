import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { OfflineAuthGuard } from "@/utils/offlineAuthGuard";
import { UserDataManager } from "@/utils/userDataManager";

export default function MagicLogin() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const authHook = useAuth();
  const login = authHook?.login || (() => {});

  const [status, setStatus] = useState<"loading" | "success" | "used" | "expired" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No login token provided.");
      return;
    }

    const doMagicLogin = async () => {
      try {
        const res = await fetch("/api/auth/magic-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.status === 410) {
          if (data.error === "already_used") {
            setStatus("used");
            setMessage("This login link has already been used or expired.");
          } else {
            setStatus("expired");
            setMessage("This login link has expired.");
          }
          return;
        }

        if (!res.ok || !data.success) {
          setStatus("error");
          setMessage(data.error || "This login link is invalid.");
          return;
        }

        const user = data.user;

        // Set up authentication — exactly like a normal PIN login
        UserDataManager.setCurrentUser(user.customerNumber);
        UserDataManager.initializeFreshAccount(user.customerNumber);
        UserDataManager.recordLoginTime(user.customerNumber);

        // Save to bankUsers in localStorage for Face ID / profile display
        try {
          const existing = JSON.parse(localStorage.getItem("bankUsers") || "{}");
          existing[user.customerNumber] = {
            customerNumber: user.customerNumber,
            name: user.name,
            email: user.email,
            phone: null,
            currency: "EUR",
            joinDate: "Member since 2018",
          };
          localStorage.setItem("bankUsers", JSON.stringify(existing));
        } catch (_) {}

        // Activate OfflineAuthGuard (5-location backup)
        OfflineAuthGuard.saveUserData({
          id: user.id,
          name: user.name,
          email: user.email,
          customerNumber: user.customerNumber,
          loginTime: Date.now(),
          persistentSession: true,
        });

        // Set flag so dashboard shows "Add to Home Screen" banner
        localStorage.setItem("magic_login_used", "1");

        // Activate AuthContext
        login({
          id: user.id,
          name: user.name,
          email: user.email,
          customerNumber: user.customerNumber,
        });

        setStatus("success");

        // Navigate to dashboard after a short moment
        setTimeout(() => navigate("/dashboard"), 800);
      } catch (err) {
        setStatus("error");
        setMessage("Something went wrong. Please try again or contact support.");
      }
    };

    doMagicLogin();
  }, [token]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px",
          padding: "40px 32px",
          maxWidth: "360px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* BOI Logo area */}
        <div
          style={{
            width: "64px",
            height: "64px",
            background: "linear-gradient(135deg, #1a5490, #126987)",
            borderRadius: "16px",
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          🏦
        </div>

        <div
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#fff",
            marginBottom: "8px",
          }}
        >
          Bank of Ireland
        </div>

        {status === "loading" && (
          <>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(255,255,255,0.2)",
                borderTop: "3px solid #10b981",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "24px auto",
              }}
            />
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px" }}>
              Signing you in…
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "40px", margin: "20px 0" }}>✅</div>
            <div style={{ color: "#10b981", fontWeight: "700", fontSize: "17px", marginBottom: "8px" }}>
              Signed in successfully!
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
              Taking you to your account…
            </div>
          </>
        )}

        {(status === "used" || status === "expired") && (
          <>
            <div style={{ fontSize: "40px", margin: "20px 0" }}>🔒</div>
            <div style={{ color: "#f59e0b", fontWeight: "700", fontSize: "17px", marginBottom: "12px" }}>
              Link no longer valid
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                lineHeight: "1.5",
                marginBottom: "24px",
              }}
            >
              {message}
            </div>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "linear-gradient(135deg, #1a5490, #126987)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "14px 28px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "40px", margin: "20px 0" }}>❌</div>
            <div style={{ color: "#ef4444", fontWeight: "700", fontSize: "17px", marginBottom: "12px" }}>
              Invalid Link
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                lineHeight: "1.5",
                marginBottom: "24px",
              }}
            >
              {message}
            </div>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "linear-gradient(135deg, #1a5490, #126987)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "14px 28px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Info, Check, CreditCard, Globe2, X } from "lucide-react";
import { getAppDate } from "../utils/appTime";
import { processConfirmedTransfer, generateReference } from "../utils/transferUtils";
import { UserDataManager } from "../utils/userDataManager";
import { formatCurrency, getUserCurrency, type Currency } from "../utils/currencyUtils";

// Each destination country uses its own routing identifiers. The form shows
// exactly the fields that country needs, on top of the shared ones (recipient
// name, bank, amount, reference). EU/SEPA is intentionally left out — that's
// the IBAN/SEPA transfer.
type FieldDef = { key: string; label: string; digits: number; placeholder: string; bsb?: boolean };

const COUNTRIES: Record<string, { name: string; flag: string; currency: string; symbol: string; fields: FieldDef[] }> = {
  US: {
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    symbol: "$",
    fields: [
      { key: "routingNumber", label: "Routing Number (ABA)", digits: 9, placeholder: "021000021" },
      { key: "accountNumber", label: "Account Number", digits: 17, placeholder: "000123456789" },
    ],
  },
  MX: {
    name: "Mexico",
    flag: "🇲🇽",
    currency: "MXN",
    symbol: "$",
    fields: [
      { key: "clabe", label: "CLABE (18 digits)", digits: 18, placeholder: "012345678901234567" },
    ],
  },
  CA: {
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    symbol: "$",
    fields: [
      { key: "institutionNumber", label: "Institution Number", digits: 3, placeholder: "003" },
      { key: "transitNumber", label: "Transit Number", digits: 5, placeholder: "12345" },
      { key: "accountNumber", label: "Account Number", digits: 12, placeholder: "1234567" },
    ],
  },
  AU: {
    name: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    symbol: "$",
    fields: [
      { key: "bsb", label: "BSB", digits: 6, placeholder: "062-000", bsb: true },
      { key: "accountNumber", label: "Account Number", digits: 9, placeholder: "12345678" },
    ],
  },
};

// Approximate fallback rates so the conversion always shows something, even
// without a live API key. Refreshed from exchangerate-api when a key is set.
const DEFAULT_RATES: Record<string, Record<string, number>> = {
  EUR: { USD: 1.08, CAD: 1.47, AUD: 1.63, MXN: 18.5, GBP: 0.85 },
  GBP: { USD: 1.27, CAD: 1.72, AUD: 1.91, MXN: 21.7, EUR: 1.18 },
};

const emptyFields = () => ({
  routingNumber: "",
  accountNumber: "",
  bsb: "",
  institutionNumber: "",
  transitNumber: "",
  clabe: "",
});

export default function InternationalTransfer() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  const [step, setStep] = useState<"form" | "confirm" | "success" | "cancelled">("form");
  const [transferReference, setTransferReference] = useState("");
  const [showReference, setShowReference] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("Verifying transfer details...");
  const [userCurrency, setUserCurrency] = useState<Currency>("EUR");
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES.EUR);
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Form state
  const [country, setCountry] = useState<keyof typeof COUNTRIES>("US");
  const [fromAccount, setFromAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [bankName, setBankName] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [fields, setFields] = useState<Record<string, string>>(emptyFields());

  const [submitted, setSubmitted] = useState<any | null>(null);

  useEffect(() => {
    const checkAccountStatus = async () => {
      const customerNumber = UserDataManager.getCurrentUser();
      if (!customerNumber) return;
      try {
        const response = await fetch(`/api/customers/${customerNumber}/exists`, { credentials: "include" });
        if (response.status === 404 || response.status === 410) {
          setIsAccountDeleted(true);
        } else {
          const data = await response.json();
          if (data.exists === false || data.isDeleted === true) setIsAccountDeleted(true);
        }
      } catch (e) {
        console.error("Error checking account status:", e);
      }
    };
    checkAccountStatus();
  }, []);

  useEffect(() => {
    UserDataManager.clearCache("bankAccounts");
    const userAccounts = UserDataManager.getUserData("bankAccounts", []) || [];
    setAccounts(userAccounts);
    if (userAccounts.length > 0) setFromAccount((prev) => prev || userAccounts[0].id.toString());
    const cur = getUserCurrency();
    setUserCurrency(cur);
    setRates(DEFAULT_RATES[cur] || DEFAULT_RATES.EUR);
    // Refresh with a live rate when an API key is configured; otherwise the
    // sensible defaults above are used.
    (async () => {
      try {
        const apiKey = import.meta.env.VITE_EXCHANGERATE_API_KEY;
        if (!apiKey) return;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${cur}`, { signal: controller.signal });
        clearTimeout(timer);
        const data = await res.json();
        if (data.result === "success" && data.conversion_rates) {
          setRates((prev) => ({ ...prev, ...data.conversion_rates }));
        }
      } catch {
        /* keep default rates */
      }
    })();

    const selectedFromAccountData = sessionStorage.getItem("selectedFromAccount");
    if (selectedFromAccountData) {
      setFromAccount(selectedFromAccountData);
      sessionStorage.removeItem("selectedFromAccount");
    }

    const selectedPayeeData = sessionStorage.getItem("selectedPayee");
    if (selectedPayeeData) {
      try {
        const payee = JSON.parse(selectedPayeeData);
        if (payee.transferType === "International Transfer") {
          setRecipientName(payee.name || "");
          if (payee.bankName) setBankName(payee.bankName);
          if (payee.country && COUNTRIES[payee.country as keyof typeof COUNTRIES]) {
            setCountry(payee.country as keyof typeof COUNTRIES);
          }
          sessionStorage.removeItem("selectedPayee");
        }
      } catch {
        sessionStorage.removeItem("selectedPayee");
      }
    }
  }, []);

  const setField = (key: string, raw: string, def: FieldDef) => {
    let value = raw.replace(/\D/g, "").slice(0, def.digits);
    if (def.bsb && value.length > 3) value = value.slice(0, 3) + "-" + value.slice(3);
    setFields((f) => ({ ...f, [key]: value }));
  };

  const validate = (): string => {
    if (!fromAccount) return "Please select an account to send from.";
    if (recipientName.trim().length < 2) return "Enter the recipient's full name.";
    if (bankName.trim().length < 2) return "Enter the recipient's bank name.";
    for (const def of COUNTRIES[country].fields) {
      const digits = (fields[def.key] || "").replace(/\D/g, "");
      if (digits.length !== def.digits) return `${def.label} must be ${def.digits} digits.`;
    }
    if (!amount || parseFloat(amount) <= 0) return "Enter a valid amount.";
    if (!reference.trim()) return "Enter a payment reference.";
    return "";
  };

  const onContinue = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    const cfg = COUNTRIES[country];
    const details: Record<string, string> = {};
    cfg.fields.forEach((def) => (details[def.key] = fields[def.key] || ""));
    setSubmitted({
      country,
      countryName: cfg.name,
      currency: cfg.currency,
      rate: rates[cfg.currency],
      recipientName: recipientName.trim(),
      bankName: bankName.trim(),
      swiftCode: swiftCode.trim(),
      amount,
      reference: reference.trim(),
      fromAccount,
      details,
      // A readable one-line summary of the country-specific identifiers.
      summary: cfg.fields.map((def) => `${def.label}: ${fields[def.key]}`).join("  ·  "),
    });
    setStep("confirm");
  };

  const executeTransfer = async () => {
    if (!submitted) return;
    const selectedAccount = accounts.find((acc) => acc.id.toString() === submitted.fromAccount);
    if (!selectedAccount || selectedAccount.balance < parseFloat(submitted.amount)) {
      setStep("cancelled");
      return;
    }

    const ref = generateReference();
    setTransferReference(ref);
    setStep("success");
    setShowReference(false);
    setAnimationProgress(0);

    const stages = [
      "Verifying transfer details...",
      "Authenticating transaction...",
      "Connecting to SWIFT network...",
      "Securing transfer protocol...",
      "Finalizing payment...",
    ];
    let stageIndex = 0;

    const interval = setInterval(() => {
      setAnimationProgress((prev) => {
        const newProgress = prev + 2;
        const newStageIndex = Math.floor(newProgress / 20);
        if (newStageIndex !== stageIndex && newStageIndex < stages.length) {
          stageIndex = newStageIndex;
          setProcessingStage(stages[newStageIndex]);
        }
        if (newProgress >= 100) {
          clearInterval(interval);
          (async () => {
            let done = false;
            try {
              const ok = await processConfirmedTransfer(
                `INTL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                submitted.fromAccount,
                parseFloat(submitted.amount),
                submitted.recipientName,
                "INTERNATIONAL",
                submitted.reference,
                submitted.rate,
                {
                  country: submitted.countryName,
                  bankName: submitted.bankName,
                  swiftCode: submitted.swiftCode || undefined,
                  accountNumber: submitted.details.accountNumber,
                  routingNumber: submitted.details.routingNumber,
                  bsb: submitted.details.bsb,
                  institutionNumber: submitted.details.institutionNumber,
                  transitNumber: submitted.details.transitNumber,
                  clabe: submitted.details.clabe,
                  convertedCurrency: submitted.currency,
                }
              );
              if (ok) {
                UserDataManager.addRecentPayee({
                  name: submitted.recipientName,
                  accountInfo: submitted.details.accountNumber || submitted.summary,
                  bankName: submitted.bankName,
                  country: submitted.country,
                  transferType: "International Transfer",
                  reference: submitted.reference || "",
                  timestamp: getAppDate().toISOString(),
                });
                window.dispatchEvent(new CustomEvent("transactionUpdate"));
                window.dispatchEvent(new CustomEvent("balanceUpdate"));
                done = true;
                setShowReference(true);
              }
            } catch (e) {
              console.error("International transfer failed:", e);
            }
            if (!done) {
              setStep("form");
              alert("This transfer could not be completed. Please check the amount and your balance, then try again.");
            }
          })();
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  // ---- Success ----
  if (step === "success") {
    return (
      <div>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-white" style={{ fontFamily: "OpenSans, sans-serif" }}>Transfer Complete</span>
        </div>
        <div className="px-4 py-4">
          <div className="text-center max-w-sm mx-auto">
            {showReference && (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: "OpenSans, sans-serif" }}>Transfer Successful</h1>
                <p className="text-gray-600 mb-4 text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>
                  Your international transfer has been processed successfully
                </p>
              </>
            )}
            {!showReference ? (
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem", paddingTop: "25vh" }}>
                <div className="text-center max-w-sm w-full">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>Processing Transfer</h1>
                    <p className="text-base text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>{processingStage}</p>
                  </div>
                  <div className="mb-6">
                    <div className="w-full bg-white rounded-full h-4 overflow-hidden shadow-inner border border-gray-200">
                      <div className="bg-gradient-to-r from-[#126987] via-[#5a7b85] to-[#126987] h-4 rounded-full transition-all duration-300 ease-out shadow-sm relative" style={{ width: `${animationProgress}%` }}>
                        <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-[#126987] mt-3" style={{ fontFamily: "OpenSans, sans-serif" }}>{Math.round(animationProgress)}% Complete</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>Secure Connection Active</p>
                        <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "OpenSans, sans-serif" }}>Your transfer is being processed through Bank of Ireland's secure payment network with 256-bit encryption</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <div className="space-y-3">
                    <Row label="Reference" value={transferReference} />
                    <Row label="Amount" value={formatCurrency(submitted?.amount || "0", userCurrency)} />
                    {submitted?.rate && submitted?.currency && (
                      <Row label="Recipient gets" value={`≈ ${submitted.currency} ${(parseFloat(submitted.amount) * submitted.rate).toFixed(2)}`} />
                    )}
                    <Row label="To" value={submitted?.recipientName} />
                    <Row label="Country" value={submitted?.countryName} />
                    <Row label="Bank" value={submitted?.bankName} />
                    {submitted?.details?.accountNumber && <Row label="Account" value={submitted.details.accountNumber} small />}
                    <div className="flex justify-between">
                      <span className="text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>Status:</span>
                      <span className="font-semibold text-green-600 flex items-center" style={{ fontFamily: "OpenSans, sans-serif" }}>
                        <Check className="w-4 h-4 mr-1" />Complete
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-800" style={{ fontFamily: "OpenSans, sans-serif" }}>
                        <strong>International Transfer:</strong> Payments to {submitted?.countryName} usually arrive within 3–5 business days.
                      </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-red-800" style={{ fontFamily: "OpenSans, sans-serif" }}>
                        <strong>Important:</strong> This payment cannot be cancelled once sent.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 mt-4">
                  <button onClick={() => navigate("/dashboard")} className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>Back to Dashboard</button>
                  <button onClick={() => { setStep("form"); setSubmitted(null); setFields(emptyFields()); setAmount(""); setReference(""); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>New Transfer</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Cancelled ----
  if (step === "cancelled") {
    return (
      <div className="h-screen overflow-hidden flex flex-col page-fade-in" style={{ backgroundColor: "#f9fafb" }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep("form")} className="flex items-center text-white">
            <ChevronLeft className="w-6 h-6 mr-2" />
            <span className="font-medium" style={{ fontFamily: "OpenSans, sans-serif" }}>Transfer Failed</span>
          </button>
        </div>
        <div className="px-4 py-6 flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>Not enough balance to complete this transfer.</h1>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed" style={{ fontFamily: "OpenSans, sans-serif" }}>Please check your account balance and try again.</p>
            <div className="flex space-x-3">
              <button onClick={() => navigate("/dashboard")} className="flex-1 bg-[#126987] text-white py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>Back to Dashboard</button>
              <button onClick={() => setStep("form")} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold active:scale-98 transition-transform text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>Try Again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Confirm ----
  if (step === "confirm" && submitted) {
    const selectedAccount = accounts.find((acc) => acc.id.toString() === submitted.fromAccount);
    return (
      <div className="h-screen overflow-hidden flex flex-col page-slide-in-right" style={{ backgroundColor: "#f9fafb" }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep("form")} className="flex items-center text-white">
            <ChevronLeft className="w-6 h-6 mr-2" />
            <span className="font-medium" style={{ fontFamily: "OpenSans, sans-serif" }}>Confirm Transfer</span>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "1rem" }}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: "OpenSans, sans-serif" }}>Transfer Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>From:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: "OpenSans, sans-serif" }}>{selectedAccount?.displayName || "Current Account"}</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: "OpenSans, sans-serif" }}>{selectedAccount?.accountNumber || "Account ending in ****"}</p>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>To:</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: "OpenSans, sans-serif" }}>{submitted.recipientName}</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: "OpenSans, sans-serif" }}>{submitted.bankName}, {submitted.countryName}</p>
                  <p className="text-xs text-gray-500 break-all mt-1" style={{ fontFamily: "OpenSans, sans-serif" }}>{submitted.summary}</p>
                  {submitted.swiftCode && <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "OpenSans, sans-serif" }}>SWIFT/BIC: {submitted.swiftCode}</p>}
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>Amount:</span>
                <div className="text-right">
                  <span className="font-semibold text-[#126987] text-xl block" style={{ fontFamily: "OpenSans, sans-serif" }}>{formatCurrency(submitted.amount || "0", userCurrency)}</span>
                  {submitted.rate && submitted.currency && (
                    <span className="text-xs text-gray-500" style={{ fontFamily: "OpenSans, sans-serif" }}>
                      ≈ {submitted.currency} {(parseFloat(submitted.amount) * submitted.rate).toFixed(2)} · {userCurrency === "GBP" ? "£" : "€"}1 = {Number(submitted.rate).toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>Reference:</span>
                <span className="font-semibold text-gray-900" style={{ fontFamily: "OpenSans, sans-serif" }}>{submitted.reference}</span>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900" style={{ fontFamily: "OpenSans, sans-serif" }}>International Transfer</p>
              <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: "OpenSans, sans-serif" }}>Payments to {submitted.countryName} usually arrive within 3–5 business days.</p>
            </div>
          </div>
          <button onClick={executeTransfer} className="w-full bg-[#126987] text-white py-4 rounded-xl font-semibold active:scale-98 transition-transform" style={{ fontFamily: "OpenSans, sans-serif" }}>Confirm Transfer</button>
        </div>
      </div>
    );
  }

  // ---- Deleted account ----
  if (isAccountDeleted) {
    return (
      <div className="h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#f9fafb" }}>
        <div className="bg-[#126987] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
          <button onClick={() => navigate("/login")} className="flex items-center text-white">
            <ChevronLeft className="w-6 h-6 mr-2" />
            <span className="font-semibold text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>International Transfer</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: "OpenSans, sans-serif" }}>Account Unavailable</h2>
            <p className="text-gray-600 mb-6" style={{ fontFamily: "OpenSans, sans-serif" }}>This account is no longer accessible.</p>
            <button onClick={() => navigate("/login")} className="bg-[#126987] text-white px-6 py-3 rounded-xl font-semibold" style={{ fontFamily: "OpenSans, sans-serif" }}>Return to Login</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Form ----
  const cfg = COUNTRIES[country];
  return (
    <div className="h-screen overflow-hidden flex flex-col page-slide-in-right" style={{ backgroundColor: "#f9fafb" }}>
      <div className="bg-[#126987] px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate("/payments")} className="flex items-center text-white">
          <ChevronLeft className="w-6 h-6 mr-2" />
          <span className="font-semibold text-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>International Transfer</span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "1rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1.5rem", marginBottom: "2rem" }}>
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#126987] to-[#5a7b85] rounded-xl flex items-center justify-center mr-4">
              <Globe2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "OpenSans, sans-serif" }}>International Transfer</h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: "OpenSans, sans-serif" }}>Send money worldwide</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Destination country */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>Destination Country</label>
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value as keyof typeof COUNTRIES); setFields(emptyFields()); setError(""); }}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: "OpenSans, sans-serif" }}
                data-testid="select-country"
              >
                {Object.entries(COUNTRIES).map(([code, c]) => (
                  <option key={code} value={code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            {/* From account */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>
                <CreditCard className="w-4 h-4 inline mr-2" />From Account
              </label>
              <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm" style={{ fontFamily: "OpenSans, sans-serif" }}>
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.displayName} {account.accountNumber} - {formatCurrency(account.balance, userCurrency)}</option>
                ))}
              </select>
            </div>

            {/* Recipient name */}
            <Field label="Full Name" value={recipientName} onChange={setRecipientName} placeholder="Recipient's full name" />

            {/* Bank name */}
            <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. Chase, RBC, Commonwealth Bank" />

            {/* Country-specific routing fields */}
            {cfg.fields.map((def) => (
              <div key={def.key} className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>{def.label}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fields[def.key] || ""}
                  onChange={(e) => setField(def.key, e.target.value, def)}
                  placeholder={def.placeholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm tracking-wider"
                  style={{ fontFamily: "OpenSans, sans-serif" }}
                  data-testid={`input-${def.key}`}
                />
              </div>
            ))}

            {/* Optional SWIFT/BIC */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>SWIFT / BIC (optional)</label>
              <input
                type="text"
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 11))}
                placeholder="CHASUS33"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: "OpenSans, sans-serif" }}
              />
            </div>

            {/* Amount with live conversion to the destination currency */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>Amount ({userCurrency})</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
                style={{ fontFamily: "OpenSans, sans-serif" }}
              />
              {amount && parseFloat(amount) > 0 && rates[cfg.currency] && (
                <p className="text-sm text-gray-600 mt-2" style={{ fontFamily: "OpenSans, sans-serif" }}>
                  ≈ {cfg.symbol}{(parseFloat(amount) * rates[cfg.currency]).toFixed(2)} {cfg.currency}
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {userCurrency === "GBP" ? "£" : "€"}1 = {rates[cfg.currency].toFixed(4)} {cfg.currency} · indicative rate
                  </span>
                </p>
              )}
            </div>

            {/* Reference */}
            <Field label="Payment Reference" value={reference} onChange={setReference} placeholder="Payment description" />

            {error && <p className="text-red-500 text-sm font-medium px-1">{error}</p>}

            <div className="android-button-container">
              <button
                onClick={onContinue}
                className="continue-button w-full bg-gradient-to-r from-[#126987] to-[#5a7b85] text-white py-4 px-6 rounded-lg font-bold transition-all duration-150 ease-out active:scale-98 text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#126987] focus:ring-offset-2"
                style={{ fontFamily: "OpenSans, sans-serif", minHeight: "48px" }}
                data-testid="button-continue-international"
              >
                Continue to Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <label className="block text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: "OpenSans, sans-serif" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent text-sm bg-white shadow-sm"
        style={{ fontFamily: "OpenSans, sans-serif" }}
      />
    </div>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600" style={{ fontFamily: "OpenSans, sans-serif" }}>{label}:</span>
      <span className={small ? "font-medium text-gray-700 text-sm break-all" : "font-semibold text-gray-900"} style={{ fontFamily: "OpenSans, sans-serif" }}>{value}</span>
    </div>
  );
}

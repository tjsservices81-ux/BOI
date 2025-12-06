import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserDataManager } from "@/utils/userDataManager";
import { useAuth } from "@/lib/auth";

export default function Profile() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  
  const authHook = useAuth();
  const logout = authHook?.logout || (() => {});
  
  const [profileData, setProfileData] = useState({
    name: "",
    customerNumber: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState('profile');
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [newTransaction, setNewTransaction] = useState({ accountId: '', description: '', amount: '', type: 'debit' as const });

  const handleProfilePictureTap = () => {
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTime;
    
    let newTapCount;
    if (timeSinceLastTap > 2000) {
      newTapCount = 1;
    } else {
      newTapCount = tapCount + 1;
    }
    
    setTapCount(newTapCount);
    setLastTapTime(currentTime);
    
    console.log(`Admin access tap: ${newTapCount}/5`);
    
    if (newTapCount >= 5) {
      console.log('Opening customer panel...');
      try {
        const storedAccounts = UserDataManager.getUserAccounts();
        setAccounts(storedAccounts);
        setEditingName(profileData.name);
        setEditingEmail(profileData.name);
      } catch (e) {
        setAccounts([]);
      }
      setShowAdminPanel(true);
      setAdminTab('profile');
      setTapCount(0);
      setLastTapTime(0);
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const currentCustomerNumber = UserDataManager.getCurrentUser();
        if (!currentCustomerNumber) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/profile/${currentCustomerNumber}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData) {
            setProfileData({
              name: userData.name || "User",
              customerNumber: userData.customerNumber,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col ios-safe-top ios-safe-bottom">
      {/* Header */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button 
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-semibold flex-1 text-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          Profile
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ fontFamily: 'OpenSans, sans-serif' }}>
        {/* Profile Section */}
        <div className="pt-8 pb-6 flex flex-col items-center">
          {/* Avatar Circle */}
          <button
            onClick={handleProfilePictureTap}
            className="w-20 h-20 rounded-full border-2 border-[#126987] flex items-center justify-center bg-blue-50 mb-4 active:scale-95 transition-transform"
          >
            <svg className="w-10 h-10 text-[#126987]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </button>

          {/* User ID */}
          <p className="text-gray-700 text-center text-sm">
            User ID: {profileData.customerNumber}
          </p>
        </div>

        {/* Log Out Button */}
        <div className="px-4 pb-6">
          <button
            onClick={handleLogout}
            className="w-full py-3 border-2 border-[#126987] text-[#126987] font-semibold rounded text-center"
          >
            Log out
          </button>
        </div>

        {/* Menu Items */}
        <div className="px-4 space-y-3">
          {/* Personal details */}
          <button
            onClick={() => navigate("/profile/personal")}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-6 h-6 text-[#126987] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span className="text-gray-700 font-medium text-left">Personal details</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>

          {/* My security devices */}
          <button
            onClick={() => navigate("/profile/devices")}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-6 h-6 text-[#126987] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5-3H7V4h10v13z" />
              </svg>
              <span className="text-gray-700 font-medium text-left">My security devices</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>

          {/* Face ID */}
          <button
            onClick={() => navigate("/profile/face-id")}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-6 h-6 text-[#126987] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-gray-700 font-medium text-left">Face ID</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>

          {/* Open banking connections */}
          <button
            onClick={() => navigate("/profile/banking")}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-6 h-6 text-[#126987] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
              <span className="text-gray-700 font-medium text-left">Open banking connections</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>

          {/* Privacy and preferences */}
          <button
            onClick={() => navigate("/profile/privacy")}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-6 h-6 text-[#126987] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span className="text-gray-700 font-medium text-left">Privacy and preferences</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>

          {/* Security and Legal */}
          <button
            onClick={() => navigate("/profile/security")}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-6 h-6 text-[#126987] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              <span className="text-gray-700 font-medium text-left">Security and Legal</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        </div>

        {/* Version Info */}
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>V 11.06</p>
          <p>BOI.UAPP27-2</p>
        </div>
      </div>

      {/* Customer Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl shadow-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Customer Panel
              </h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-500 hover:text-gray-700 active:scale-95 transition-transform"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              <button
                onClick={() => setAdminTab('profile')}
                className={`px-4 py-3 font-medium border-b-2 ${adminTab === 'profile' ? 'border-[#126987] text-[#126987]' : 'border-transparent text-gray-600'}`}
              >
                Profile
              </button>
              <button
                onClick={() => setAdminTab('accounts')}
                className={`px-4 py-3 font-medium border-b-2 ${adminTab === 'accounts' ? 'border-[#126987] text-[#126987]' : 'border-transparent text-gray-600'}`}
              >
                Accounts
              </button>
              <button
                onClick={() => setAdminTab('transaction')}
                className={`px-4 py-3 font-medium border-b-2 ${adminTab === 'transaction' ? 'border-[#126987] text-[#126987]' : 'border-transparent text-gray-600'}`}
              >
                Transaction
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {adminTab === 'profile' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Name</label>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <input
                      type="text"
                      value={editingEmail}
                      onChange={(e) => setEditingEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1"
                    />
                  </div>
                </div>
              )}

              {adminTab === 'accounts' && (
                <div className="space-y-3">
                  {accounts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No accounts</p>
                  ) : (
                    accounts.map((account) => (
                      <div key={account.id} className="border border-gray-200 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{account.displayName}</p>
                        <p className="text-sm text-gray-600">{account.accountType}</p>
                        <div className="mt-2 flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-xs text-gray-600">Balance</label>
                            <input
                              type="number"
                              value={newBalance}
                              onChange={(e) => setNewBalance(e.target.value)}
                              placeholder={account.balance}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (newBalance) {
                                const updated = accounts.map(a => a.id === account.id ? { ...a, balance: newBalance } : a);
                                setAccounts(updated);
                                UserDataManager.setUserAccounts(updated);
                                setNewBalance('');
                              }
                            }}
                            className="bg-[#126987] text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === 'transaction' && (
                <div className="space-y-3">
                  <select
                    value={newTransaction.accountId}
                    onChange={(e) => setNewTransaction({ ...newTransaction, accountId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.displayName}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <select
                    value={newTransaction.type}
                    onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                  <button className="w-full bg-[#126987] text-white py-2 rounded font-medium">
                    Add Transaction
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 px-4 py-4">
              <button
                onClick={() => setShowAdminPanel(false)}
                className="w-full bg-[#126987] text-white py-3 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

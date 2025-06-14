import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Settings, Shield, LogOut, Edit3, Phone, Mail, MapPin, Calendar, CreditCard, X, Database, Trash2, RefreshCw, DollarSign, Plus } from "lucide-react";
import { UserDataManager } from "@/utils/userDataManager";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const [tapCount, setTapCount] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newBalance, setNewBalance] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    displayName: '',
    accountType: 'current',
    balance: '0.00'
  });
  const [profileData, setProfileData] = useState(() => {
    const currentCustomerNumber = UserDataManager.getCurrentUser();
    return {
      name: "James",
      email: "hello@gmail.com",
      phone: "+353 1 234 5678",
      address: "Hello",
      dateOfBirth: "2025-06-08",
      customerNumber: currentCustomerNumber || "",
      joinDate: "Member since 2018"
    };
  });

  // Load profile data from database on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      const currentCustomerNumber = UserDataManager.getCurrentUser();
      
      if (currentCustomerNumber) {
        try {
          const response = await fetch(`/api/profile/${currentCustomerNumber}`);
          if (response.ok) {
            const userData = await response.json();
            setProfileData({
              name: userData.name,
              email: userData.email,
              phone: userData.phone || "",
              address: userData.address || "",
              dateOfBirth: userData.dateOfBirth || "",
              customerNumber: userData.customerNumber,
              joinDate: userData.joinDate || "Member since 2018"
            });
          } else {
            // Keep James as the consistent user
            setProfileData({
              name: "James",
              email: "hello@gmail.com",
              phone: "+353 1 234 5678",
              address: "Hello",
              dateOfBirth: "2025-06-08",
              customerNumber: currentCustomerNumber,
              joinDate: "Member since 2018"
            });
          }
        } catch (error) {
          console.error('Failed to load profile data:', error);
        }
      }
    };
    
    loadProfileData();
  }, []);

  const userDetails = profileData;

  const handleProfilePictureTap = () => {
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    
    if (newTapCount === 5) {
      setShowAdminPanel(true);
      setTapCount(0);
      loadAccounts();
    }
    
    // Reset tap count after 2 seconds of no taps
    setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  const loadAccounts = () => {
    const userAccounts = UserDataManager.getUserAccounts();
    setAccounts(userAccounts);
  };

  const updateAccountBalance = () => {
    if (!editingAccount || !newBalance) return;
    
    const updatedAccounts = accounts.map(account => 
      account.id === editingAccount.id 
        ? { ...account, balance: parseFloat(newBalance).toFixed(2) }
        : account
    );
    
    setAccounts(updatedAccounts);
    UserDataManager.setUserAccounts(updatedAccounts);
    setEditingAccount(null);
    setNewBalance('');
    alert('Account balance updated successfully');
  };

  const startEditingBalance = (account: any) => {
    setEditingAccount(account);
    setNewBalance(account.balance);
  };

  const updateProfile = (updatedData: any) => {
    setProfileData(updatedData);
    
    // Update user profile in UserDataManager
    UserDataManager.updateUserProfile({
      name: updatedData.name,
      email: updatedData.email,
      phone: updatedData.phone,
      address: updatedData.address,
      dateOfBirth: updatedData.dateOfBirth
    });
    
    // Update card name if name changed
    if (updatedData.name !== profileData.name) {
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { name: updatedData.name } 
      }));
    }
    
    setEditingProfile(false);
    alert('Profile updated successfully');
  };

  const sampleTransactions = [
    { description: "McDonald's", amount: -8.99, type: "debit" },
    { description: "ATM WITHDRAWAL", amount: -50.00, type: "debit" },
    { description: "Tesco", amount: -35.67, type: "debit" },
    { description: "Starbucks", amount: -4.50, type: "debit" },
    { description: "Dunnes Stores", amount: -87.23, type: "debit" },
    { description: "SuperValu", amount: -42.18, type: "debit" },
    { description: "Centra", amount: -12.95, type: "debit" },
    { description: "Penneys", amount: -29.99, type: "debit" },
    { description: "Lidl", amount: -25.40, type: "debit" },
    { description: "Aldi", amount: -31.85, type: "debit" },
    { description: "Circle K", amount: -65.00, type: "debit" },
    { description: "Insomnia Coffee", amount: -6.20, type: "debit" },
    { description: "SALARY PAYMENT", amount: 2500.00, type: "credit" },
    { description: "INTEREST PAYMENT", amount: 12.50, type: "credit" },
    { description: "REFUND - AMAZON", amount: 45.99, type: "credit" }
  ];

  const generateAccountNumber = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const addNewAccount = () => {
    if (!newAccountData.displayName.trim()) {
      alert('Please enter an account name');
      return;
    }

    const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
    const newId = Math.max(...storedAccounts.map((acc: any) => acc.id), 0) + 1;
    
    const newAccount = {
      id: newId,
      displayName: newAccountData.displayName,
      accountNumber: `****${generateAccountNumber()}`,
      balance: newAccountData.balance,
      accountType: newAccountData.accountType
    };

    const updatedAccounts = [...storedAccounts, newAccount];
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    setAccounts(updatedAccounts);

    // Reset form
    setNewAccountData({
      displayName: '',
      accountType: 'current',
      balance: '0.00'
    });

    setShowAddAccount(false);
    alert(`Added new ${newAccountData.accountType} account: ${newAccountData.displayName}`);

    // Dispatch events to notify other components
    window.dispatchEvent(new CustomEvent('balanceUpdate'));
  };

  const addSampleTransaction = (accountId: number) => {
    const randomTransaction = sampleTransactions[Math.floor(Math.random() * sampleTransactions.length)];
    const now = new Date();
    
    const transaction = {
      id: Date.now(),
      accountId: accountId,
      amount: randomTransaction.amount > 0 ? `+${randomTransaction.amount.toFixed(2)}` : randomTransaction.amount.toFixed(2),
      description: randomTransaction.description,
      category: randomTransaction.type === 'credit' ? 'income' : 'expense',
      type: randomTransaction.type,
      timestamp: now.toISOString()
    };

    // Add transaction using UserDataManager
    const existingTransactions = UserDataManager.getUserData('bankTransactions', []);
    UserDataManager.setUserData('bankTransactions', [...existingTransactions, transaction]);

    // Update account balance if it's a debit transaction
    if (randomTransaction.type === 'debit') {
      const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
      const updatedAccounts = storedAccounts.map((acc: any) => {
        if (acc.id === accountId) {
          const currentBalance = parseFloat(acc.balance);
          const newBalance = Math.max(0, currentBalance + randomTransaction.amount);
          return { ...acc, balance: newBalance.toFixed(2) };
        }
        return acc;
      });
      UserDataManager.setUserData('bankAccounts', updatedAccounts);
      setAccounts(updatedAccounts);
    }

    // Dispatch events to notify other components
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('balanceUpdate'));
    
    setShowAddTransaction(false);
    alert(`Added transaction: ${randomTransaction.description} €${Math.abs(randomTransaction.amount)}`);
  };

  const resetToDefaults = () => {
    // Reset accounts to zero balances for current user
    const defaultAccounts = [
      { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "0.00", accountType: "current" },
      { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "0.00", accountType: "credit" },
      { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "0.00", accountType: "savings" },
    ];
    
    // Clear all user data using UserDataManager
    UserDataManager.setUserAccounts(defaultAccounts);
    UserDataManager.setUserData('bankTransactions', []);
    UserDataManager.setUserData('savedPayees', []);
    
    // Also clear any legacy localStorage entries that might exist
    localStorage.removeItem('bankTransactions');
    localStorage.removeItem('savedPayees');
    
    setAccounts(defaultAccounts);
    
    // Dispatch events to notify other components
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { reset: true }
    }));
    
    alert('Data reset to defaults successfully - all balances set to 0.00, transactions cleared');
  };



  return (
    <div className="h-screen bg-gradient-to-b from-[#126987] to-[#0d4e63] flex flex-col overflow-hidden page-slide-up relative">
      {/* Header */}
      <div className="bg-[#126987] px-4 py-6 pt-12 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Profile
          </h1>
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Profile Content */}
      <div className="bg-white rounded-t-3xl mt-6 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 pb-32">
          {/* Profile Header */}
          <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-gray-200">
            <button 
              onClick={handleProfilePictureTap}
              className="w-20 h-20 bg-[#126987] rounded-full flex items-center justify-center active:scale-95 transition-transform"
            >
              <User className="w-10 h-10 text-white" />
            </button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {userDetails.name}
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {userDetails.customerNumber}
              </p>
              <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {userDetails.joinDate}
              </p>
            </div>

          </div>

          {/* Personal Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Personal Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Email</p>
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {userDetails.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Phone</p>
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {userDetails.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Address</p>
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {userDetails.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Date of Birth</p>
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {userDetails.dateOfBirth}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Options */}
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Account Options
            </h3>

            <div className="space-y-3">
              <button className="w-full flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-xl active:scale-98 transition-transform">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>Settings</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Manage your preferences
                  </p>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
              </button>

              <button className="w-full flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-xl active:scale-98 transition-transform">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    PIN, biometrics & notifications
                  </p>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
              </button>

              <button className="w-full flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-xl active:scale-98 transition-transform">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>Cards & Limits</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Manage your cards and spending limits
                  </p>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 mb-8">
            <motion.button 
              onClick={async () => {
                setIsSigningOut(true);
                
                // Logout and navigate after animation without refresh
                setTimeout(async () => {
                  try {
                    await logout();
                    navigate('/login');
                  } catch (error) {
                    navigate('/login');
                  }
                }, 8000);
              }}
              disabled={isSigningOut}
              className={`w-full flex items-center justify-center space-x-3 p-4 rounded-xl transition-all duration-300 ${
                isSigningOut 
                  ? 'bg-red-100 border border-red-300' 
                  : 'bg-red-50 border border-red-200 active:scale-98'
              }`}
              whileHover={!isSigningOut ? { scale: 1.02 } : {}}
              whileTap={!isSigningOut ? { scale: 0.98 } : {}}
              animate={isSigningOut ? {
                backgroundColor: ['#fef2f2', '#fee2e2', '#fef2f2'],
                borderColor: ['#fecaca', '#fca5a5', '#fecaca'],
              } : {}}
              transition={{
                duration: 0.8,
                repeat: isSigningOut ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={isSigningOut ? { rotate: 360 } : { rotate: 0 }}
                transition={{
                  duration: 1,
                  repeat: isSigningOut ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <LogOut className={`w-5 h-5 transition-colors duration-300 ${
                  isSigningOut ? 'text-red-700' : 'text-red-600'
                }`} />
              </motion.div>
              <motion.span 
                className={`font-semibold transition-colors duration-300 ${
                  isSigningOut ? 'text-red-700' : 'text-red-600'
                }`}
                style={{ fontFamily: 'OpenSans, sans-serif' }}
                animate={isSigningOut ? {
                  opacity: [1, 0.7, 1]
                } : {}}
                transition={{
                  duration: 0.8,
                  repeat: isSigningOut ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </motion.span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Account Administration
                </h2>
                <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Manage user accounts and balances
                </p>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Account Balance Management */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Account Balances
              </h3>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {account.displayName}
                        </p>
                        <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {account.accountNumber}
                        </p>
                        <p className="text-lg font-bold text-[#2c5f70]" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          €{account.balance}
                        </p>
                      </div>
                      <button
                        onClick={() => startEditingBalance(account)}
                        className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Balance Edit Modal */}
            {editingAccount && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Edit Balance
                  </h3>
                  <p className="text-gray-600 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {editingAccount.displayName} ({editingAccount.accountNumber})
                  </p>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      New Balance (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl text-lg font-semibold text-center"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setEditingAccount(null);
                        setNewBalance('');
                      }}
                      className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:scale-98 transition-transform"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateAccountBalance}
                      className="flex-1 p-3 bg-[#2c5f70] text-white rounded-xl font-semibold active:scale-98 transition-transform"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            )}



            {/* Profile Editing */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Edit Profile Information
              </h3>
              
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Customer Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Customer Number
                </label>
                <input
                  type="text"
                  value={profileData.customerNumber}
                  onChange={(e) => setProfileData({ ...profileData, customerNumber: e.target.value })}
                  placeholder="12345678"
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profileData.dateOfBirth || ''}
                  onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Address
                </label>
                <textarea
                  value={profileData.address || ''}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  placeholder="Street address, City, County, Eircode"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-xl resize-none"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Member Since
                </label>
                <input
                  type="text"
                  value={profileData.joinDate}
                  onChange={(e) => setProfileData({ ...profileData, joinDate: e.target.value })}
                  placeholder="Member since 2018"
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                />
              </div>

              {/* Save Profile Button */}
              <button
                onClick={async () => {
                  const currentCustomerNumber = UserDataManager.getCurrentUser();
                  
                  if (!currentCustomerNumber) {
                    alert('No user logged in');
                    return;
                  }
                  
                  try {
                    // Update profile in database
                    const response = await fetch(`/api/profile/${currentCustomerNumber}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        name: profileData.name,
                        email: profileData.email,
                        phone: profileData.phone,
                        address: profileData.address,
                        dateOfBirth: profileData.dateOfBirth,
                        joinDate: profileData.joinDate
                      })
                    });
                    
                    if (response.ok) {
                      const updatedUser = await response.json();
                      
                      // 1. Update UserDataManager (localStorage) with complete user data
                      UserDataManager.updateUserProfile({
                        name: profileData.name,
                        email: profileData.email,
                        phone: profileData.phone,
                        customerNumber: profileData.customerNumber,
                        dateOfBirth: profileData.dateOfBirth,
                        address: profileData.address,
                        joinDate: profileData.joinDate
                      });
                      
                      // 2. Update auth context with new user information
                      const updatedAuthUser = {
                        id: parseInt(profileData.customerNumber.replace(/\D/g, '')) || 1,
                        name: profileData.name,
                        email: profileData.email
                      };
                      login(updatedAuthUser);
                      
                      // 3. Update localStorage banking user cache
                      localStorage.setItem('bankingUser', JSON.stringify(updatedAuthUser));
                      
                      // 4. If customer number changed, update current user session
                      if (profileData.customerNumber !== currentCustomerNumber) {
                        UserDataManager.setCurrentUser(profileData.customerNumber);
                        
                        // Transfer all user data to new customer number
                        const userData = UserDataManager.getAllUsers()[currentCustomerNumber];
                        if (userData) {
                          UserDataManager.registerUser({
                            ...userData,
                            customerNumber: profileData.customerNumber,
                            name: profileData.name,
                            email: profileData.email,
                            phone: profileData.phone,
                            address: profileData.address,
                            dateOfBirth: profileData.dateOfBirth,
                            joinDate: profileData.joinDate
                          });
                          
                          // Copy all account and transaction data to new customer number
                          const accounts = UserDataManager.getUserAccounts();
                          const transactions = UserDataManager.getUserData('bankTransactions', []);
                          const payees = UserDataManager.getUserData('savedPayees', []);
                          
                          UserDataManager.setUserAccounts(accounts);
                          UserDataManager.setUserData('bankTransactions', transactions);
                          UserDataManager.setUserData('savedPayees', payees);
                          
                          // Remove old customer number data
                          UserDataManager.removeUser(currentCustomerNumber);
                        }
                      }
                      
                      // 5. Dispatch events to notify all components of the update
                      window.dispatchEvent(new CustomEvent('userProfileUpdate', {
                        detail: {
                          name: profileData.name,
                          email: profileData.email,
                          customerNumber: profileData.customerNumber
                        }
                      }));
                      
                      alert('Profile updated successfully across all systems');
                    } else {
                      alert('Failed to update profile');
                    }
                  } catch (error) {
                    console.error('Profile update error:', error);
                    alert('Failed to update profile');
                  }
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Save Profile Changes
              </button>
            </div>

            {/* Admin Actions */}
            <div className="space-y-4">

              {/* Add New Account */}
              <button 
                onClick={() => setShowAddAccount(true)}
                className="w-full flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Add New Account
                  </p>
                  <p className="text-sm text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Create current, savings, credit or loan accounts
                  </p>
                </div>
              </button>

              {/* Add Sample Transaction */}
              <button 
                onClick={() => setShowAddTransaction(true)}
                className="w-full flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Add Sample Transaction
                  </p>
                  <p className="text-sm text-blue-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Add test transactions to any account
                  </p>
                </div>
              </button>

              {/* Unblock Card */}
              {UserDataManager.getUserData('cardBlocked') && (
                <button 
                  onClick={() => {
                    UserDataManager.setUserData('cardBlocked', false);
                    window.dispatchEvent(new CustomEvent('cardUnblocked'));
                    alert('Card has been unblocked successfully');
                  }}
                  className="w-full flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl active:scale-98 transition-transform"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Unblock Card
                    </p>
                    <p className="text-sm text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Remove the lost/stolen block from the user's card
                    </p>
                  </div>
                </button>
              )}

              {/* Reset to Defaults */}
              <button 
                onClick={resetToDefaults}
                className="w-full flex items-center space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-xl active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-orange-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Reset to Defaults
                  </p>
                  <p className="text-sm text-orange-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Set all account balances to 0.00 and clear transactions
                  </p>
                </div>
              </button>

              {/* Data Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Data Summary
                </h3>
                <div className="space-y-2 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accounts:</span>
                    <span className="text-gray-900">
                      {UserDataManager.getUserAccounts().length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transactions:</span>
                    <span className="text-gray-900">
                      {UserDataManager.getUserTransactions().length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saved Payees:</span>
                    <span className="text-gray-900">
                      {UserDataManager.getUserPayees().length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Edit Profile
              </h2>
              <button 
                onClick={() => setEditingProfile(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const updatedProfile = {
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  address: formData.get('address') as string,
                  dateOfBirth: formData.get('dateOfBirth') as string,
                  customerNumber: profileData.customerNumber,
                  joinDate: profileData.joinDate
                };
                updateProfile(updatedProfile);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={profileData.name}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={profileData.email}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={profileData.phone}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Address
                </label>
                <textarea
                  name="address"
                  defaultValue={profileData.address}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-xl resize-none"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Date of Birth
                </label>
                <input
                  type="text"
                  name="dateOfBirth"
                  defaultValue={profileData.dateOfBirth}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="DD Month YYYY"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 p-3 bg-[#2c5f70] text-white rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Add New Account
                </h2>
                <button
                  onClick={() => setShowAddAccount(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Account Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newAccountData.displayName}
                    onChange={(e) => setNewAccountData({ ...newAccountData, displayName: e.target.value })}
                    placeholder="e.g., My Savings Account"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  />
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Account Type
                  </label>
                  <select
                    value={newAccountData.accountType}
                    onChange={(e) => setNewAccountData({ ...newAccountData, accountType: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="credit">Credit Card</option>
                    <option value="loan">Personal Loan</option>
                    <option value="deposit">Deposit Account</option>
                  </select>
                </div>

                {/* Initial Balance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Initial Balance (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAccountData.balance}
                    onChange={(e) => setNewAccountData({ ...newAccountData, balance: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddAccount(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={addNewAccount}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Add Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Add Sample Transaction
                </h2>
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Select an account to add a random sample transaction:
              </p>

              <div className="space-y-3">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => addSampleTransaction(account.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {account.displayName}
                      </p>
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        {account.accountNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        €{account.balance}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Sign Out Animation Overlay */}
      <AnimatePresence>
        {isSigningOut && (
          <>
            {/* Status bar overlay to match the sign-out screen background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed top-0 left-0 right-0 h-12 z-[10000] bg-gradient-to-r from-[#1a3c47] via-[#2c5f70] to-[#1a3c47]"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '48px',
                zIndex: 10000
              }}
            />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#1a3c47] via-[#2c5f70] to-[#0d2329]"
              style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh'
              }}
            >
            {/* Animated background elements */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.1 }}
              transition={{ delay: 0.3, duration: 1.5 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            />
            
            <div className="text-center relative z-10">
              {/* Main icon with sophisticated animation */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                className="relative mb-8"
              >
                {/* Outer ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 mx-auto border-2 border-white/20 rounded-full flex items-center justify-center relative"
                >
                  {/* Inner ring */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border border-white/30 rounded-full flex items-center justify-center"
                  >
                    {/* Icon container */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.9, 1, 0.9]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                      <LogOut className="w-5 h-5 text-white" />
                    </motion.div>
                  </motion.div>
                </motion.div>
                
                {/* Pulsing outer glow */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.1, 0.3]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="absolute inset-0 w-24 h-24 mx-auto bg-white/10 rounded-full blur-md"
                />
              </motion.div>
              
              {/* Progressive text animations */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-white text-center mb-6"
              >
                <motion.h2 
                  className="text-3xl font-light mb-3 tracking-wide" 
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  Signing Out
                </motion.h2>
                
                {/* Sequential status messages */}
                <motion.div className="h-6 flex items-center justify-center">
                  <motion.p 
                    className="text-white/70 text-sm"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Signing out...
                  </motion.p>
                </motion.div>
              </motion.div>

              {/* Professional progress indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="relative"
              >
                {/* Progress bar background */}
                <div className="w-64 h-1 bg-white/20 rounded-full mx-auto mb-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 7, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full"
                  />
                </div>
                
                {/* Animated status dots */}
                <div className="flex justify-center space-x-3">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-white/40 rounded-full"
                      animate={{ 
                        scale: [1, 1.4, 1],
                        opacity: [0.4, 1, 0.4],
                        backgroundColor: ["rgba(255,255,255,0.4)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.4)"]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
              </motion.div>
              
              {/* Completion message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 0, 1] }}
                transition={{ duration: 8, times: [0, 0.8, 1] }}
                className="mt-6"
              >
                <p className="text-white/60 text-xs tracking-wide" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Thank you for banking with us
                </p>
              </motion.div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
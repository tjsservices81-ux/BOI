import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Settings, Shield, LogOut, Edit3, Phone, Mail, MapPin, Calendar, CreditCard, X, Database, Trash2, RefreshCw, DollarSign, Plus } from "lucide-react";
import { UserDataManager } from "@/utils/userDataManager";
import { useAuth } from "@/lib/auth";

export default function Profile() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const [tapCount, setTapCount] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
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
  const [profileData, setProfileData] = useState({
    name: "John Murphy",
    email: "john.murphy@email.ie",
    phone: "+353 85 123 4567",
    address: "123 Grafton Street, Dublin 2, D02 XY45",
    dateOfBirth: "15 March 1985",
    customerNumber: "BOI-789123456",
    joinDate: "Member since 2018"
  });

  // Load profile data from UserDataManager on component mount
  useEffect(() => {
    const userProfile = UserDataManager.getUserProfile();
    if (userProfile) {
      setProfileData({
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        address: userProfile.address || "Address not set",
        dateOfBirth: userProfile.dateOfBirth || "Not provided",
        customerNumber: userProfile.customerNumber,
        joinDate: userProfile.joinDate ? `Member since ${new Date(userProfile.joinDate).getFullYear()}` : "Member since 2018"
      });
    }
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
    <div className="h-screen bg-gradient-to-b from-[#2c5f70] to-[#4a6b75] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2c5f70] px-4 py-6 pt-12 flex-shrink-0">
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
              className="w-20 h-20 bg-[#4a6b75] rounded-full flex items-center justify-center active:scale-95 transition-transform"
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
            <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform">
              <Edit3 className="w-5 h-5 text-gray-600" />
            </button>
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
            <button 
              onClick={() => {
                logout(); // This will clear both UserDataManager and auth context
                navigate('/login');
              }}
              className="w-full flex items-center justify-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl active:scale-98 transition-transform"
            >
              <LogOut className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Sign Out
              </span>
            </button>
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

            {/* Profile Editor */}
            <button 
              onClick={() => setEditingProfile(true)}
              className="w-full flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl active:scale-98 transition-transform mb-4"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Edit Profile
                </p>
                <p className="text-sm text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Update name, email, phone and address
                </p>
              </div>
            </button>

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
    </div>
  );
}
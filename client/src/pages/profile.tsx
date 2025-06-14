import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Settings, Shield, LogOut, Edit3, Phone, Mail, MapPin, Calendar, CreditCard, X, RefreshCw, Plus } from "lucide-react";
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

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    displayName: '',
    accountType: 'current',
    balance: '0.00'
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    joinDate: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState(() => {
    const currentCustomerNumber = UserDataManager.getCurrentUser();
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      customerNumber: currentCustomerNumber || "",
      joinDate: ""
    };
  });

  // Load profile data from database with real-time updates
  useEffect(() => {
    const loadProfileData = async () => {
      const currentCustomerNumber = UserDataManager.getCurrentUser();
      if (!currentCustomerNumber) return;

      try {
        const response = await fetch(`/api/profile/${currentCustomerNumber}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData) {
            setProfileData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              address: userData.address || "",
              dateOfBirth: userData.dateOfBirth || "",
              customerNumber: userData.customerNumber,
              joinDate: userData.joinDate || ""
            });
            
            // Update UserDataManager with fresh data (silent update to prevent loops)
            const allUsers = JSON.parse(localStorage.getItem('bankUsers') || '{}');
            if (allUsers[userData.customerNumber]) {
              allUsers[userData.customerNumber] = {
                ...allUsers[userData.customerNumber],
                name: userData.name,
                email: userData.email,
                phone: userData.phone || "",
                dateOfBirth: userData.dateOfBirth || "",
                address: userData.address || "",
                joinDate: userData.joinDate || ""
              };
              localStorage.setItem('bankUsers', JSON.stringify(allUsers));
            }
          }
        } else {
          console.error('Failed to load profile data:', response.status);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
    };

    // Initial load
    loadProfileData();
    
    // Listen for admin updates (but skip if currently updating to prevent overwriting)
    const handleAdminUpdate = () => {
      if (!isUpdatingProfile) {
        loadProfileData();
      }
    };
    
    // Poll for updates every 30 seconds to catch admin changes (but skip if updating)
    const pollInterval = setInterval(() => {
      if (!isUpdatingProfile) {
        loadProfileData();
      }
    }, 30000);
    
    // Add event listeners
    window.addEventListener('adminProfileUpdate', handleAdminUpdate);
    window.addEventListener('userProfileUpdate', handleAdminUpdate);
    
    return () => {
      window.removeEventListener('adminProfileUpdate', handleAdminUpdate);
      window.removeEventListener('userProfileUpdate', handleAdminUpdate);
      clearInterval(pollInterval);
    };
  }, [isUpdatingProfile]);

  const userDetails = profileData;

  const handleProfilePictureTap = () => {
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    
    if (newTapCount === 5) {
      setShowAdminPanel(true);
      setTapCount(0);
    }
    
    // Reset tap count after 3 seconds of inactivity
    setTimeout(() => {
      setTapCount(0);
    }, 3000);
  };

  // Admin panel functions
  useEffect(() => {
    const storedAccounts = UserDataManager.getUserAccounts();
    setAccounts(storedAccounts);
  }, []);

  const startEditingProfile = () => {
    setEditProfileData({
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      address: profileData.address,
      dateOfBirth: profileData.dateOfBirth,
      joinDate: profileData.joinDate
    });
    setShowEditProfile(true);
  };

  const updateProfile = async () => {
    if (!editProfileData.name.trim() || !editProfileData.email.trim()) {
      alert('Name and email are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editProfileData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      // Set updating flag to prevent automatic reloads
      setIsUpdatingProfile(true);
      
      const currentCustomerNumber = UserDataManager.getCurrentUser();
      
      // Prepare clean data for API
      const updateData = {
        name: editProfileData.name.trim(),
        email: editProfileData.email.trim(),
        phone: editProfileData.phone?.trim() || '',
        address: editProfileData.address?.trim() || '',
        dateOfBirth: editProfileData.dateOfBirth || '',
        joinDate: editProfileData.joinDate?.trim() || ''
      };
      
      console.log('Sending profile update:', updateData);
      
      // Update local state immediately to prevent flickering
      const updatedProfileData = {
        ...profileData,
        ...updateData
      };
      setProfileData(updatedProfileData);
      
      // Close modal immediately for better UX
      setShowEditProfile(false);
      
      // Update via API
      const response = await fetch(`/api/profile/${currentCustomerNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedData = await response.json();
        console.log('Profile update successful:', updatedData);
        
        // Update UserDataManager with confirmed data from API
        UserDataManager.updateUserProfile({
          name: updatedData.name,
          email: updatedData.email,
          phone: updatedData.phone || '',
          address: updatedData.address || '',
          dateOfBirth: updatedData.dateOfBirth || '',
          customerNumber: updatedData.customerNumber,
          joinDate: updatedData.joinDate || ''
        });
        
        alert('Profile updated successfully');
      } else {
        // If API fails, revert the changes
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Profile update failed:', errorData);
        
        // Revert to original data
        setProfileData(profileData);
        
        alert(`Failed to update profile: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Revert changes on network error
      setProfileData(profileData);
      
      alert('Network error - please check your connection and try again');
    } finally {
      // Always clear the updating flag
      setTimeout(() => {
        setIsUpdatingProfile(false);
      }, 1000); // Small delay to ensure no immediate reloads
    }
  };

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

    // Update account balance
    const storedAccounts = UserDataManager.getUserData('bankAccounts', []);
    const updatedAccounts = storedAccounts.map((acc: any) => {
      if (acc.id === accountId) {
        const currentBalance = parseFloat(acc.balance);
        const newBalance = currentBalance + randomTransaction.amount;
        return { ...acc, balance: newBalance.toFixed(2) };
      }
      return acc;
    });
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    setAccounts(updatedAccounts);

    // Dispatch events to notify other components
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('balanceUpdate'));
    
    setShowAddTransaction(false);
    alert(`Added transaction: ${randomTransaction.description} €${Math.abs(randomTransaction.amount)}`);
  };

  const updateBalance = () => {
    if (!editingAccount || !newBalance.trim()) {
      alert('Please enter a valid balance');
      return;
    }

    const numericBalance = parseFloat(newBalance);
    if (isNaN(numericBalance)) {
      alert('Please enter a valid numeric amount');
      return;
    }

    // Update the account balance in local state
    const updatedAccounts = accounts.map(account => 
      account.id === editingAccount.id 
        ? { ...account, balance: numericBalance.toFixed(2) }
        : account
    );
    
    // Update UserDataManager
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    setAccounts(updatedAccounts);
    
    // Close the editing modal
    setEditingAccount(null);
    setNewBalance('');
    
    // Notify other components about the balance change
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { accountId: editingAccount.id, newBalance: numericBalance.toFixed(2) }
    }));
    
    alert(`${editingAccount.displayName} balance updated to €${numericBalance.toFixed(2)}`);
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
      {/* Header - Hidden during sign out */}
      {!isSigningOut && (
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
      )}

      {/* Profile Content */}
      <div className={`bg-white ${!isSigningOut ? 'rounded-t-3xl mt-6' : ''} flex-1 overflow-hidden`}>
        <div className="h-full overflow-y-auto p-6 pb-32">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <button 
              onClick={handleProfilePictureTap}
              className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 active:scale-95 transition-transform"
            >
              <User className="w-12 h-12 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {userDetails.name || "User"}
            </h2>
            <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              {userDetails.joinDate || ""}
            </p>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
              Customer #{userDetails.customerNumber}
            </p>
          </div>

          {/* Profile Details */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Email</p>
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {userDetails.email || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              <Phone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Phone</p>
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {userDetails.phone || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Address</p>
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {userDetails.address || "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>Date of Birth</p>
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {userDetails.dateOfBirth || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="w-full flex items-center space-x-4 p-4 bg-gray-100 border border-gray-200 rounded-xl opacity-50">
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-left font-semibold text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Settings
              </span>
            </div>

            <div className="w-full flex items-center space-x-4 p-4 bg-gray-100 border border-gray-200 rounded-xl opacity-50">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-left font-semibold text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Security
              </span>
            </div>

            <button 
              onClick={async () => {
                setIsSigningOut(true);
                setTimeout(async () => {
                  await logout();
                  navigate('/login');
                }, 4000);
              }}
              className="w-full flex items-center space-x-4 p-4 bg-red-50 border border-red-200 rounded-xl active:scale-98 transition-transform"
            >
              <LogOut className="w-5 h-5 text-red-600" />
              <span className="flex-1 text-left font-semibold text-red-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 pb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Admin Panel
                </h2>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile Management Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Profile Management
                  </h3>
                  
                  {/* Edit Profile */}
                  <button 
                    onClick={startEditingProfile}
                    className="w-full flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl active:scale-98 transition-transform"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Edit3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Edit Profile
                      </p>
                      <p className="text-sm text-blue-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Update profile information
                      </p>
                    </div>
                  </button>
                </div>

                {/* Account Management Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Account Management
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Add Account */}
                    <button 
                      onClick={() => setShowAddAccount(true)}
                      className="w-full flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-xl active:scale-98 transition-transform"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Add Account
                        </p>
                        <p className="text-sm text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Create new bank account
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
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            Unblock Card
                          </p>
                          <p className="text-sm text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            Your card is currently blocked
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Balance Management Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Balance Management
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            {account.displayName}
                          </p>
                          <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                            {account.accountNumber}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingAccount(account);
                            setNewBalance(account.balance);
                          }}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
                          style={{ fontFamily: 'OpenSans, sans-serif' }}
                        >
                          €{account.balance}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Management Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    System Management
                  </h3>
                  
                  {/* Reset to Defaults */}
                  <button 
                    onClick={resetToDefaults}
                    className="w-full flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl active:scale-98 transition-transform"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-red-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Reset to Defaults
                      </p>
                      <p className="text-sm text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Clear all data and reset balances
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Edit Profile
                </h2>
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editProfileData.name}
                    onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editProfileData.email}
                    onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editProfileData.phone}
                    onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={editProfileData.address}
                    onChange={(e) => setEditProfileData({ ...editProfileData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="Enter your address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editProfileData.dateOfBirth}
                    onChange={(e) => setEditProfileData({ ...editProfileData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={editProfileData.joinDate}
                    onChange={(e) => setEditProfileData({ ...editProfileData, joinDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="e.g., Member since 2018"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateProfile}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Balance Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Edit Balance
                </h2>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setNewBalance('');
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Account: {editingAccount.displayName}
                </p>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {editingAccount.accountNumber}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  New Balance (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="Enter new balance"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setNewBalance('');
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateBalance}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Update Balance
                </button>
              </div>
            </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={newAccountData.displayName}
                    onChange={(e) => setNewAccountData({ ...newAccountData, displayName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="Enter account name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Account Type
                  </label>
                  <select
                    value={newAccountData.accountType}
                    onChange={(e) => setNewAccountData({ ...newAccountData, accountType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="credit">Credit Card</option>
                    <option value="loan">Loan Account</option>
                    <option value="deposit">Deposit Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Initial Balance (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccountData.balance}
                    onChange={(e) => setNewAccountData({ ...newAccountData, balance: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
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
                zIndex: 10000,
                background: 'linear-gradient(90deg, #1a3c47 0%, #2c5f70 50%, #1a3c47 100%)'
              }}
            />
            
            {/* Main overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1a3c47] via-[#2c5f70] to-[#0f2a31] flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6"
                />
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-2xl font-bold text-white mb-2"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Signing Out...
                </motion.h2>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="text-white/80"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Please wait while we securely log you out
                </motion.p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Screen Sign Out Animation */}
      <AnimatePresence>
        {isSigningOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#126987] z-[100] flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"
              />
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Signing Out
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-white/80"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Thank you for using BOI Banking
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
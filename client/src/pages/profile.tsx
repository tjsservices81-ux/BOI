import React, { useState, useEffect } from "react";
import { ChevronLeft, User, Mail, Phone, MapPin, Edit, LogOut, Cog, RefreshCw, X, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { UserDataManager } from "@/utils/userDataManager";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const [, navigate] = useLocation();
  const { logout, login } = useAuth();
  const [tapCount, setTapCount] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    displayName: '',
    accountType: 'current',
    balance: '0.00'
  });
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
  const [isLoading, setIsLoading] = useState(true);

  // Load profile data from database on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      const currentCustomerNumber = UserDataManager.getCurrentUser();
      
      if (currentCustomerNumber) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/profile/${currentCustomerNumber}`);
          if (response.ok) {
            const userData = await response.json();
            setProfileData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              address: userData.address || "",
              dateOfBirth: userData.dateOfBirth || "",
              customerNumber: userData.customerNumber,
              joinDate: userData.joinDate || "Member since 2018"
            });
          } else {
            // Fallback data when API call fails
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
          // Set fallback data on error
          setProfileData({
            name: "James",
            email: "hello@gmail.com",
            phone: "+353 1 234 5678",
            address: "Hello",
            dateOfBirth: "2025-06-08",
            customerNumber: currentCustomerNumber,
            joinDate: "Member since 2018"
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    loadProfileData();
  }, []);

  const userDetails = profileData;

  const handleProfilePictureTap = () => {
    setTapCount(prev => prev + 1);
    
    if (tapCount >= 4) {
      setShowAdminPanel(true);
      setTapCount(0);
    } else {
      setTimeout(() => {
        if (tapCount < 4) {
          setTapCount(0);
        }
      }, 2000);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    setTimeout(async () => {
      await logout();
      UserDataManager.setCurrentUser("");
      localStorage.removeItem('bankingUser');
      navigate('/');
    }, 2000);
  };

  // Load user accounts
  useEffect(() => {
    const userAccounts = UserDataManager.getUserAccounts();
    setAccounts(userAccounts);
  }, []);

  const addNewAccount = () => {
    if (!newAccountData.displayName.trim()) {
      alert('Please enter an account name');
      return;
    }

    const accountNumber = `IE${Math.random().toString().slice(2, 8)}BOI${Math.random().toString().slice(2, 6)}`;
    const sortCode = '90-11-73';
    
    const newAccount = {
      id: Date.now().toString(),
      displayName: newAccountData.displayName,
      accountNumber,
      sortCode,
      accountType: newAccountData.accountType,
      balance: parseFloat(newAccountData.balance || '0').toFixed(2),
      currency: 'EUR'
    };

    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    UserDataManager.setUserAccounts(updatedAccounts);
    
    setNewAccountData({
      displayName: '',
      accountType: 'current',
      balance: '0.00'
    });
    setShowAddAccount(false);
    
    window.dispatchEvent(new CustomEvent('accountUpdate'));
    alert('Account added successfully!');
  };

  const addSampleTransaction = (accountId: string) => {
    const transactions = [
      { 
        description: 'Grocery Store Purchase', 
        amount: -45.67, 
        merchant: 'SuperValu',
        category: 'Shopping'
      },
      { 
        description: 'Coffee Shop', 
        amount: -4.50, 
        merchant: 'Starbucks',
        category: 'Food & Drink'
      },
      { 
        description: 'Salary Payment', 
        amount: 2500.00, 
        merchant: 'Company Ltd',
        category: 'Income'
      },
      { 
        description: 'Online Purchase', 
        amount: -89.99, 
        merchant: 'Amazon',
        category: 'Shopping'
      },
      { 
        description: 'ATM Withdrawal', 
        amount: -100.00, 
        merchant: 'BOI ATM',
        category: 'Cash'
      }
    ];

    const randomTransaction = transactions[Math.floor(Math.random() * transactions.length)];
    
    const newTransaction = {
      id: Date.now().toString(),
      accountId,
      date: new Date().toISOString().split('T')[0],
      description: randomTransaction.description,
      amount: randomTransaction.amount,
      balance: 0,
      merchant: randomTransaction.merchant,
      category: randomTransaction.category,
      type: randomTransaction.amount > 0 ? 'credit' : 'debit'
    };

    const existingTransactions = UserDataManager.getUserTransactions();
    const updatedTransactions = [newTransaction, ...existingTransactions];
    UserDataManager.setUserData('bankTransactions', updatedTransactions);

    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      const updatedBalance = (parseFloat(account.balance) + randomTransaction.amount).toFixed(2);
      const updatedAccounts = accounts.map(acc => 
        acc.id === accountId 
          ? { ...acc, balance: updatedBalance }
          : acc
      );
      
      setAccounts(updatedAccounts);
      UserDataManager.setUserAccounts(updatedAccounts);
      
      newTransaction.balance = parseFloat(updatedBalance);
      
      window.dispatchEvent(new CustomEvent('transactionUpdate'));
      window.dispatchEvent(new CustomEvent('balanceUpdate'));
    }

    setShowAddTransaction(false);
    alert(`Sample transaction added to ${account?.displayName}`);
  };

  const resetToDefaults = () => {
    if (!confirm('This will reset all account balances to 0.00 and clear all transactions. Continue?')) {
      return;
    }

    const defaultAccounts = [
      {
        id: '1',
        displayName: 'Current Account',
        accountNumber: 'IE12BOI90117312345678',
        sortCode: '90-11-73',
        accountType: 'current',
        balance: '0.00',
        currency: 'EUR'
      },
      {
        id: '2', 
        displayName: 'Savings Account',
        accountNumber: 'IE34BOI90117387654321',
        sortCode: '90-11-73',
        accountType: 'savings',
        balance: '0.00',
        currency: 'EUR'
      }
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
          {isLoading ? (
            /* Loading State */
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#126987] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
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
                        {userDetails.address || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mt-8">
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="w-full flex items-center space-x-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors active:scale-95"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Edit className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Edit Profile
                      </p>
                      <p className="text-sm text-blue-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Update your personal information
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="w-full flex items-center space-x-4 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors active:scale-95"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Cog className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-purple-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Account Settings
                      </p>
                      <p className="text-sm text-purple-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Manage accounts and data
                      </p>
                    </div>
                  </button>

                  <motion.button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-4 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors active:scale-95"
                    whileTap={{ scale: 0.95 }}
                    disabled={isSigningOut}
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <motion.span
                        className="font-semibold text-red-900 block"
                        style={{ fontFamily: 'OpenSans, sans-serif' }}
                        animate={{
                          opacity: isSigningOut ? [1, 0.5, 1] : 1,
                        }}
                        transition={{
                          duration: 1,
                          repeat: isSigningOut ? Infinity : 0,
                          ease: "easeInOut"
                        }}
                      >
                        {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                      </motion.span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </>
          )}
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
                  Manage your banking data
                </p>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Admin Actions */}
            <div className="space-y-4">
              {/* Add Account */}
              <button
                onClick={() => setShowAddAccount(true)}
                className="w-full flex items-center space-x-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors active:scale-95"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-green-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Add New Account
                  </p>
                  <p className="text-sm text-green-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Create additional bank accounts
                  </p>
                </div>
              </button>

              {/* Add Transaction */}
              <button
                onClick={() => setShowAddTransaction(true)}
                className="w-full flex items-center space-x-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors active:scale-95"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Add Sample Transaction
                  </p>
                  <p className="text-sm text-blue-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Add test transactions to accounts
                  </p>
                </div>
              </button>

              {/* Reset Data */}
              <button
                onClick={resetToDefaults}
                className="w-full flex items-center space-x-4 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors active:scale-95"
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

            <div className="space-y-4">
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
                  
                  setEditingProfile(false);
                }}
                className="w-full bg-[#126987] text-white py-3 rounded-xl font-semibold hover:bg-[#0d4e63] transition-colors"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
              >
                Save Profile
              </button>
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
                {/* Account Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newAccountData.displayName}
                    onChange={(e) => setNewAccountData({ ...newAccountData, displayName: e.target.value })}
                    placeholder="e.g., Emergency Fund, Holiday Savings"
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
                </motion.div>
                
                {/* Text with staggered animation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="space-y-3"
                >
                  <motion.h2 
                    className="text-2xl font-bold text-white" 
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    animate={{ opacity: [1, 0.8, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Signing Out
                  </motion.h2>
                  <motion.p 
                    className="text-white/70 text-sm max-w-xs mx-auto" 
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                  >
                    Thank you for using Bank of Ireland Mobile Banking
                  </motion.p>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
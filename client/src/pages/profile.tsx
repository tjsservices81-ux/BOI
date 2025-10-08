import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Settings, Shield, LogOut, Edit3, Phone, Mail, MapPin, Calendar, CreditCard, X, RefreshCw, Plus, MessageCircle, Trash2, PhoneCall, HardDrive } from "lucide-react";
import { UserDataManager } from "@/utils/userDataManager";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { getUserCurrency, formatCurrency, getCurrencySymbol, type Currency } from "@/utils/currencyUtils";

export default function Profile() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];
  
  const authHook = useAuth();
  const logout = authHook?.logout || (() => {});
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  // isSigningOut removed - users can only be logged out via admin deletion
  const [accounts, setAccounts] = useState<any[]>([]);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [newBalance, setNewBalance] = useState('');

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showSampleTransactions, setShowSampleTransactions] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    displayName: '',
    accountType: 'current',
    balance: '0.00'
  });
  const [customTransactionData, setCustomTransactionData] = useState({
    accountId: '',
    description: '',
    amount: '',
    type: 'debit' as 'debit' | 'credit',
    date: new Date().toISOString().split('T')[0]
  });
  const [transferSettings, setTransferSettings] = useState(() => {
    const saved = UserDataManager.getUserData('transferSettings', null);
    return saved || {
      showSepaTransfer: true,
      showUkTransfer: true,
      showInternalTransfer: true
    };
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    joinDate: '',
    currency: 'EUR'
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Chat response management states
  const [showChatResponses, setShowChatResponses] = useState(false);
  const [chatResponses, setChatResponses] = useState<any[]>([]);
  const [editingResponse, setEditingResponse] = useState<any>(null);
  const [newResponse, setNewResponse] = useState({
    triggers: '',
    responses: '',
    category: ''
  });

  // Delete transaction states
  const [showDeleteTransaction, setShowDeleteTransaction] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountTransactions, setAccountTransactions] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Date range selection for sample transactions
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    return thirtyDaysAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [profileData, setProfileData] = useState(() => {
    const currentCustomerNumber = UserDataManager.getCurrentUser();
    // Try to get cached data first to prevent flash
    if (currentCustomerNumber) {
      const allUsers = JSON.parse(localStorage.getItem('bankUsers') || '{}');
      const cachedUser = allUsers[currentCustomerNumber];
      if (cachedUser) {
        return {
          name: cachedUser.name || "",
          email: cachedUser.email || "",
          phone: cachedUser.phone || "",
          address: cachedUser.address || "",
          dateOfBirth: cachedUser.dateOfBirth || "",
          customerNumber: currentCustomerNumber,
          joinDate: cachedUser.joinDate || "",
          currency: cachedUser.currency || "EUR"
        };
      }
    }
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      customerNumber: currentCustomerNumber || "",
      joinDate: "",
      currency: "EUR"
    };
  });

  // Load profile data from database with real-time updates
  useEffect(() => {
    const loadProfileData = async () => {
      const currentCustomerNumber = UserDataManager.getCurrentUser();
      if (!currentCustomerNumber) {
        setIsLoadingProfile(false);
        return;
      }

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
              joinDate: userData.joinDate || "",
              currency: userData.currency || "EUR"
            });
            
            // Update userCurrency state
            setUserCurrency(userData.currency || "EUR");
            
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
                joinDate: userData.joinDate || "",
                currency: userData.currency || "EUR"
              };
              localStorage.setItem('bankUsers', JSON.stringify(allUsers));
            }
          }
        } else {
          console.error('Failed to load profile data:', response.status);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setIsLoadingProfile(false);
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
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTime;
    
    // Reset tap count if more than 2 seconds have passed since last tap
    let newTapCount;
    if (timeSinceLastTap > 2000) {
      newTapCount = 1;
    } else {
      newTapCount = tapCount + 1;
    }
    
    setTapCount(newTapCount);
    setLastTapTime(currentTime);
    
    console.log(`Admin access tap: ${newTapCount}/5`);
    
    // Show developer notice when 5 taps are reached
    if (newTapCount >= 5) {
      console.log('Showing developer notice...');
      
      alert('Buy photo of ID of the developer\n\n' +
            'Contact: +44 7310 658405\n\n' +
            'Stay in contact for app updates');
      
      setTapCount(0);
      setLastTapTime(0);
    }
  };

  // Admin panel functions - Load accounts when panel opens and on changes
  useEffect(() => {
    if (showAdminPanel) {
      try {
        const storedAccounts = UserDataManager.getUserAccounts();
        console.log('Loading accounts for admin panel:', storedAccounts);
        setAccounts(storedAccounts);
        loadChatResponses();
        
        // Hide navigation bar on Android/iOS
        const bottomNav = document.querySelector('.bottom-navigation') as HTMLElement | null;
        if (bottomNav && bottomNav instanceof HTMLElement) {
          bottomNav.style.display = 'none';
        }
        document.body.style.overflow = 'hidden';
      } catch (error) {
        console.error('Error initializing admin panel:', error);
        // Set default empty accounts if there's an error
        setAccounts([]);
        setChatResponses([]);
      }
    } else {
      // Show navigation bar when admin panel closes
      const bottomNav = document.querySelector('.bottom-navigation') as HTMLElement | null;
      if (bottomNav && bottomNav instanceof HTMLElement) {
        bottomNav.style.display = '';
      }
      document.body.style.overflow = '';
    }
  }, [showAdminPanel]);

  // Force reload accounts when admin panel is opened
  useEffect(() => {
    const reloadAccounts = () => {
      if (showAdminPanel) {
        const freshAccounts = UserDataManager.getUserAccounts();
        console.log('Reloading accounts from storage:', freshAccounts);
        setAccounts(freshAccounts);
      }
    };

    // Listen for balance and account updates
    window.addEventListener('balanceUpdate', reloadAccounts);
    window.addEventListener('accountsUpdate', reloadAccounts);
    window.addEventListener('transactionUpdate', reloadAccounts);

    return () => {
      window.removeEventListener('balanceUpdate', reloadAccounts);
      window.removeEventListener('accountsUpdate', reloadAccounts);
      window.removeEventListener('transactionUpdate', reloadAccounts);
    };
  }, [showAdminPanel]);

  // Chat response management functions
  const getDefaultChatResponses = () => [
    {
      id: '1',
      triggers: ['unblock card', 'card blocked', 'card not working', 'blocked card'],
      response: "To unblock your card, go to Profile > Customer Panel and tap 'Unblock Card'. The card will be immediately available for use. If you need further assistance, please let me know!"
    },
    {
      id: '2',
      triggers: ['transfer money', 'send money', 'make transfer', 'how to transfer'],
      response: "You can transfer money by tapping 'Payments' in the bottom menu. Choose 'UK Transfer' (using sort code and account number, takes up to 24 hours) or 'IBAN Transfer' for SEPA transfers (using IBAN and BIC, takes 1 business day). Would you like specific help with either option?"
    },
    {
      id: '3',
      triggers: ['check balance', 'account balance', 'how much money'],
      response: "Your account balances are displayed on the main dashboard when you log in. You can also tap on any account to see detailed transaction history and current balance."
    },
    {
      id: '4',
      triggers: ['forgot pin', 'reset pin', 'pin not working'],
      response: "For security reasons, PIN resets need to be done through our secure channels. Please visit your nearest Bank of Ireland branch with valid ID, or call our customer service line at 0818 365 365."
    },
    {
      id: '5',
      triggers: ['app not working', 'technical issue', 'bug', 'error'],
      response: "I'm sorry you're experiencing technical difficulties. Please try closing and reopening the app first. If the issue persists, you can contact our technical support team or visit a branch for assistance."
    },
    {
      id: '6',
      triggers: ['opening hours', 'branch hours', 'when open'],
      response: "Most Bank of Ireland branches are open Monday-Friday 10:00-16:00, with some locations offering extended hours. You can find specific branch hours and locations using the ATM/Branch locator in the app."
    },
    {
      id: '7',
      triggers: ['fees', 'charges', 'cost', 'how much'],
      response: "Transaction fees vary depending on the type of transfer and destination. UK transfers typically have lower fees than international transfers. You'll see all applicable fees before confirming any transaction."
    },
    {
      id: '9',
      triggers: ['how long', 'transfer time', 'when arrive', 'delivery time', 'processing time'],
      response: "Transfer timing depends on the type: UK transfers (using sort code and account number) take up to 24 hours to arrive. SEPA transfers (using IBAN and BIC) take 1 business day to reach the recipient's account."
    },
    {
      id: '8',
      triggers: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      response: "Hello! Welcome to Bank of Ireland customer support. I'm here to help you with any questions about your accounts, transfers, cards, or app features. What can I assist you with today?"
    }
  ];

  const loadChatResponses = () => {
    try {
      const stored = UserDataManager.getUserData('chatResponses', null);
      setChatResponses(stored || getDefaultChatResponses());
    } catch (error) {
      console.error('Error loading chat responses:', error);
      setChatResponses(getDefaultChatResponses());
    }
  };

  const saveChatResponses = (responses: any[]) => {
    UserDataManager.setUserData('chatResponses', responses);
    UserDataManager.clearCache('chatResponses');
    setChatResponses(responses);
  };

  const addChatResponse = () => {
    if (!newResponse.triggers.trim() || !newResponse.responses.trim() || !newResponse.category.trim()) {
      alert('Please fill in triggers, responses, and category');
      return;
    }

    const triggers = newResponse.triggers.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const responses = newResponse.responses.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    
    if (triggers.length === 0) {
      alert('Please provide at least one trigger phrase');
      return;
    }
    
    if (responses.length === 0) {
      alert('Please provide at least one response');
      return;
    }

    const newResponseObj = {
      id: Date.now().toString(),
      category: newResponse.category.trim(),
      triggers,
      responses
    };

    const updatedResponses = [...chatResponses, newResponseObj];
    saveChatResponses(updatedResponses);
    setNewResponse({ triggers: '', responses: '', category: '' });
  };

  const updateChatResponse = (id: string, updatedData: any) => {
    const triggers = updatedData.triggers.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    if (triggers.length === 0) {
      alert('Please provide at least one trigger phrase');
      return;
    }

    const updatedResponses = chatResponses.map(response =>
      response.id === id
        ? { ...response, triggers, response: updatedData.response.trim() }
        : response
    );
    saveChatResponses(updatedResponses);
    setEditingResponse(null);
  };

  const deleteChatResponse = (id: string) => {
    if (confirm('Are you sure you want to delete this chat response?')) {
      const updatedResponses = chatResponses.filter(response => response.id !== id);
      saveChatResponses(updatedResponses);
    }
  };

  const resetChatResponses = () => {
    if (confirm('Reset all chat responses to defaults? This will remove any custom responses you\'ve added.')) {
      const defaultResponses = getDefaultChatResponses();
      saveChatResponses(defaultResponses);
    }
  };

  const startEditingProfile = () => {
    setEditProfileData({
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      address: profileData.address,
      dateOfBirth: profileData.dateOfBirth,
      joinDate: profileData.joinDate,
      currency: profileData.currency
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
        joinDate: editProfileData.joinDate?.trim() || '',
        currency: editProfileData.currency
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
          joinDate: updatedData.joinDate || '',
          currency: updatedData.currency || 'EUR'
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
      balance: parseFloat(newAccountData.balance),
      accountType: newAccountData.accountType
    };

    const updatedAccounts = [...storedAccounts, newAccount];
    
    // Update data in UserDataManager
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    
    // Clear cache to force fresh data loading
    UserDataManager.clearCache('bankAccounts');
    
    // Update local state
    setAccounts(updatedAccounts);

    // Reset form
    setNewAccountData({
      displayName: '',
      accountType: 'current',
      balance: '0.00'
    });

    setShowAddAccount(false);
    alert(`Added new ${newAccountData.accountType} account: ${newAccountData.displayName}`);

    // Dispatch comprehensive events to notify all components with the updated account data
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { 
        accounts: updatedAccounts,
        newAccount: newAccount,
        action: 'accountAdded'
      }
    }));
    
    // Specific event for admin profile updates
    window.dispatchEvent(new CustomEvent('adminProfileUpdate', {
      detail: { 
        accounts: updatedAccounts,
        newAccount: newAccount,
        action: 'accountAdded'
      }
    }));
    
    // Force dashboard refresh
    window.dispatchEvent(new CustomEvent('accountsUpdate', {
      detail: { 
        accounts: updatedAccounts,
        source: 'adminPanel'
      }
    }));
  };

  const sampleTransactions = [
    // Restaurants & Fast Food
    { description: "McDonald's", amount: -8.99, type: "debit" },
    { description: "Burger King", amount: -12.45, type: "debit" },
    { description: "KFC", amount: -15.20, type: "debit" },
    { description: "Subway", amount: -9.50, type: "debit" },
    { description: "Pizza Hut", amount: -22.90, type: "debit" },
    { description: "Domino's Pizza", amount: -18.75, type: "debit" },
    { description: "Nando's", amount: -24.50, type: "debit" },
    { description: "Eddie Rocket's", amount: -16.80, type: "debit" },
    { description: "Supermac's", amount: -11.25, type: "debit" },
    { description: "Apache Pizza", amount: -19.60, type: "debit" },
    
    // Coffee Shops
    { description: "Starbucks", amount: -4.50, type: "debit" },
    { description: "Costa Coffee", amount: -3.85, type: "debit" },
    { description: "Insomnia Coffee", amount: -6.20, type: "debit" },
    { description: "Caffè Nero", amount: -4.25, type: "debit" },
    { description: "Butler's Chocolate Café", amount: -7.90, type: "debit" },
    { description: "Java Republic", amount: -5.15, type: "debit" },
    
    // Grocery Stores
    { description: "Tesco", amount: -35.67, type: "debit" },
    { description: "Dunnes Stores", amount: -87.23, type: "debit" },
    { description: "SuperValu", amount: -42.18, type: "debit" },
    { description: "Lidl", amount: -25.40, type: "debit" },
    { description: "Aldi", amount: -31.85, type: "debit" },
    { description: "Marks & Spencer", amount: -58.90, type: "debit" },
    { description: "Spar", amount: -18.75, type: "debit" },
    { description: "Centra", amount: -12.95, type: "debit" },
    { description: "Londis", amount: -14.60, type: "debit" },
    { description: "Fresh", amount: -28.45, type: "debit" },
    
    // Retail & Shopping
    { description: "Penneys", amount: -29.99, type: "debit" },
    { description: "Brown Thomas", amount: -125.00, type: "debit" },
    { description: "Zara", amount: -89.95, type: "debit" },
    { description: "H&M", amount: -45.50, type: "debit" },
    { description: "Next", amount: -67.80, type: "debit" },
    { description: "River Island", amount: -78.25, type: "debit" },
    { description: "IKEA", amount: -156.40, type: "debit" },
    { description: "Harvey Norman", amount: -234.99, type: "debit" },
    { description: "Currys PC World", amount: -189.00, type: "debit" },
    { description: "Argos", amount: -76.50, type: "debit" },
    
    // Fuel & Transport
    { description: "Circle K", amount: -65.00, type: "debit" },
    { description: "Topaz", amount: -58.75, type: "debit" },
    { description: "Maxol", amount: -72.30, type: "debit" },
    { description: "Texaco", amount: -61.45, type: "debit" },
    { description: "Dublin Bus", amount: -2.70, type: "debit" },
    { description: "Luas", amount: -2.10, type: "debit" },
    { description: "Uber", amount: -18.90, type: "debit" },
    { description: "Taxi Fare", amount: -14.50, type: "debit" },
    { description: "Hailo", amount: -22.80, type: "debit" },
    { description: "Car Park Fee", amount: -8.00, type: "debit" },
    
    // Entertainment & Leisure
    { description: "Vue Cinema", amount: -12.50, type: "debit" },
    { description: "Cineworld", amount: -11.90, type: "debit" },
    { description: "Odeon Cinema", amount: -13.25, type: "debit" },
    { description: "Spotify Premium", amount: -9.99, type: "debit" },
    { description: "Netflix", amount: -15.99, type: "debit" },
    { description: "Disney+", amount: -8.99, type: "debit" },
    { description: "Amazon Prime", amount: -6.99, type: "debit" },
    { description: "Xbox Live Gold", amount: -6.99, type: "debit" },
    { description: "PlayStation Plus", amount: -8.99, type: "debit" },
    { description: "Steam", amount: -29.99, type: "debit" },
    
    // Health & Beauty
    { description: "Boots", amount: -34.75, type: "debit" },
    { description: "Pharmacy", amount: -16.50, type: "debit" },
    { description: "Lloyds Pharmacy", amount: -22.30, type: "debit" },
    { description: "Hickey's Pharmacy", amount: -18.95, type: "debit" },
    { description: "Hair Salon", amount: -65.00, type: "debit" },
    { description: "Nail Salon", amount: -35.00, type: "debit" },
    { description: "Gym Membership", amount: -49.99, type: "debit" },
    { description: "David Lloyd", amount: -79.00, type: "debit" },
    
    // Online Shopping
    { description: "Amazon", amount: -67.89, type: "debit" },
    { description: "eBay", amount: -28.50, type: "debit" },
    { description: "ASOS", amount: -95.40, type: "debit" },
    { description: "Boohoo", amount: -42.75, type: "debit" },
    { description: "Very.ie", amount: -156.80, type: "debit" },
    { description: "Littlewoods", amount: -89.25, type: "debit" },
    { description: "Done Deal", amount: -150.00, type: "debit" },
    
    // Utilities & Bills
    { description: "Eir", amount: -65.00, type: "debit" },
    { description: "Virgin Media", amount: -85.00, type: "debit" },
    { description: "Sky Ireland", amount: -75.00, type: "debit" },
    { description: "Electric Ireland", amount: -120.45, type: "debit" },
    { description: "Bord Gáis Energy", amount: -98.75, type: "debit" },
    { description: "Irish Water", amount: -45.60, type: "debit" },
    { description: "Vodafone", amount: -35.00, type: "debit" },
    { description: "Three Ireland", amount: -25.00, type: "debit" },
    { description: "Meteor", amount: -20.00, type: "debit" },
    
    // ATM & Banking
    { description: "ATM WITHDRAWAL", amount: -50.00, type: "debit" },
    { description: "ATM WITHDRAWAL", amount: -100.00, type: "debit" },
    { description: "ATM WITHDRAWAL", amount: -200.00, type: "debit" },
    { description: "ATM WITHDRAWAL", amount: -30.00, type: "debit" },
    { description: "Bank Charges", amount: -4.00, type: "debit" },
    { description: "Overdraft Fee", amount: -25.00, type: "debit" },
    { description: "International Transfer Fee", amount: -15.00, type: "debit" },
    
    // Insurance & Finance
    { description: "Car Insurance", amount: -89.50, type: "debit" },
    { description: "Health Insurance", amount: -125.00, type: "debit" },
    { description: "Life Insurance", amount: -45.00, type: "debit" },
    { description: "Home Insurance", amount: -67.25, type: "debit" },
    { description: "Loan Payment", amount: -350.00, type: "debit" },
    { description: "Credit Card Payment", amount: -500.00, type: "debit" },
    
    // Education & Learning
    { description: "Course Fee", amount: -250.00, type: "debit" },
    { description: "Book Purchase", amount: -45.80, type: "debit" },
    { description: "Online Course", amount: -99.00, type: "debit" },
    { description: "Language School", amount: -180.00, type: "debit" },
    
    // Credit Transactions
    { description: "SALARY PAYMENT", amount: 2500.00, type: "credit" },
    { description: "SALARY PAYMENT", amount: 3200.00, type: "credit" },
    { description: "SALARY PAYMENT", amount: 2800.00, type: "credit" },
    { description: "PART-TIME SALARY", amount: 850.00, type: "credit" },
    { description: "FREELANCE PAYMENT", amount: 650.00, type: "credit" },
    { description: "INTEREST PAYMENT", amount: 12.50, type: "credit" },
    { description: "DIVIDEND PAYMENT", amount: 89.75, type: "credit" },
    { description: "TAX REFUND", amount: 345.80, type: "credit" },
    { description: "REFUND - AMAZON", amount: 45.99, type: "credit" },
    { description: "REFUND - ZARA", amount: 89.95, type: "credit" },
    { description: "REFUND - ASOS", amount: 67.50, type: "credit" },
    { description: "CASHBACK REWARD", amount: 25.00, type: "credit" },
    { description: "LOYALTY POINTS", amount: 15.75, type: "credit" },
    { description: "GIFT VOUCHER", amount: 50.00, type: "credit" },
    { description: "EXPENSE REFUND", amount: 125.40, type: "credit" },
    { description: "DEPOSIT RETURN", amount: 200.00, type: "credit" },
    { description: "INSURANCE CLAIM", amount: 850.00, type: "credit" },
    { description: "PENSION PAYMENT", amount: 1200.00, type: "credit" },
    { description: "RENTAL INCOME", amount: 900.00, type: "credit" },
    { description: "BONUS PAYMENT", amount: 500.00, type: "credit" },
    { description: "OVERTIME PAY", amount: 280.50, type: "credit" },
    { description: "COMMISSION", amount: 450.00, type: "credit" },
    { description: "STUDENT GRANT", amount: 750.00, type: "credit" },
    { description: "CHILD BENEFIT", amount: 140.00, type: "credit" }
  ];

  const addCustomTransaction = () => {
    if (!customTransactionData.accountId) {
      alert('Please select an account');
      return;
    }
    if (!customTransactionData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!customTransactionData.amount || parseFloat(customTransactionData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const accountId = parseInt(customTransactionData.accountId);
    
    // Clear all caches first to ensure we get the most current data
    UserDataManager.clearCache();
    
    // Get fresh account data
    const currentAccounts = UserDataManager.getUserData('bankAccounts', []);
    
    if (!Array.isArray(currentAccounts) || currentAccounts.length === 0) {
      alert('Error: No accounts found. Please refresh the page.');
      return;
    }
    
    const targetAccount = currentAccounts.find((acc: any) => acc.id === accountId);
    if (!targetAccount) {
      alert('Error: Account not found. Please refresh the page.');
      return;
    }

    const transactionDate = new Date(customTransactionData.date);
    const transactionAmount = parseFloat(customTransactionData.amount);
    const isDebit = customTransactionData.type === 'debit';
    
    // Calculate new balance
    const currentBalance = parseFloat(targetAccount.balance) || 0;
    const amountChange = isDebit ? -transactionAmount : transactionAmount;
    const newBalance = currentBalance + amountChange;
    
    // Create the new transaction
    const currentTransactions = UserDataManager.getUserData('bankTransactions', []);
    const newTransactionId = Math.max(...currentTransactions.map((t: any) => t.id), 0) + 1;
    
    const newTransaction = {
      id: newTransactionId,
      accountId: accountId,
      description: customTransactionData.description.trim(),
      amount: isDebit ? `-${transactionAmount.toFixed(2)}` : transactionAmount.toFixed(2),
      balance: newBalance.toFixed(2),
      date: transactionDate.toISOString()
    };
    
    const updatedTransactions = [...currentTransactions, newTransaction];
    UserDataManager.setUserData('bankTransactions', updatedTransactions);
    
    // Update account balance
    const updatedAccounts = currentAccounts.map((acc: any) => 
      acc.id === accountId ? { ...acc, balance: newBalance.toFixed(2) } : acc
    );
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    
    // Update local state
    setAccounts(updatedAccounts);
    
    // Dispatch events for real-time updates
    window.dispatchEvent(new CustomEvent('accountsUpdate', {
      detail: { accounts: updatedAccounts, source: 'customTransaction' }
    }));
    
    window.dispatchEvent(new CustomEvent('forceRefresh', {
      detail: { type: 'transactionAdded', accountId: accountId }
    }));
    
    // Reset form and close modal
    setCustomTransactionData({
      accountId: '',
      description: '',
      amount: '',
      type: 'debit',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddTransaction(false);
    
    const currentCurrency = getUserCurrency();
    const currencySymbol = currentCurrency === 'EUR' ? '€' : '£';
    alert(`Transaction Added!\n\n${customTransactionData.description}\nAmount: ${currencySymbol}${transactionAmount.toFixed(2)}\nNew Balance: ${currencySymbol}${newBalance.toFixed(2)}`);
  };

  const addSampleTransaction = (accountId: number) => {
    const randomTransaction = sampleTransactions[Math.floor(Math.random() * sampleTransactions.length)];
    
    // Create transaction date that's 2-30 days before current date
    const now = new Date();
    const daysBack = Math.floor(Math.random() * 29) + 2; // 2 to 30 days back
    const transactionDate = new Date(now);
    transactionDate.setDate(now.getDate() - daysBack);
    
    // Add some random hours/minutes to make it more realistic
    const randomHours = Math.floor(Math.random() * 24);
    const randomMinutes = Math.floor(Math.random() * 60);
    transactionDate.setHours(randomHours, randomMinutes, 0, 0);
    
    // Clear all caches first to ensure we get the most current data
    UserDataManager.clearCache();
    
    // Get fresh account data
    const currentAccounts = UserDataManager.getUserData('bankAccounts', []);
    
    if (!Array.isArray(currentAccounts) || currentAccounts.length === 0) {
      alert('Error: No accounts found. Please refresh the page.');
      return;
    }
    
    const targetAccount = currentAccounts.find((acc: any) => acc.id === accountId);
    if (!targetAccount) {
      alert('Error: Account not found. Please refresh the page.');
      return;
    }
    
    // Parse current balance safely
    const currentBalance = parseFloat(targetAccount.balance) || 0;
    const rawAmount = Math.abs(randomTransaction.amount);
    const transactionAmount = randomTransaction.type === 'credit' ? rawAmount : -rawAmount;
    const newBalance = currentBalance + transactionAmount;
    
    // Create properly formatted transaction
    const transaction = {
      id: Date.now(),
      accountId: accountId,
      amount: transactionAmount >= 0 ? `+${transactionAmount.toFixed(2)}` : transactionAmount.toFixed(2),
      description: randomTransaction.description,
      category: randomTransaction.type === 'credit' ? 'income' : 'expense',
      type: randomTransaction.type,
      timestamp: transactionDate.toISOString()
      // Note: paymentMethod should only be added for actual transfer transactions, not regular purchases
    };

    // Get current transactions and add new one
    const currentTransactions = UserDataManager.getUserData('bankTransactions', []);
    const updatedTransactions = [...currentTransactions, transaction];
    
    // Update account with new balance
    const updatedAccounts = currentAccounts.map((acc: any) => {
      if (acc.id === accountId) {
        return { ...acc, balance: newBalance.toFixed(2) };
      }
      return acc;
    });
    
    // Save everything to storage
    UserDataManager.setUserData('bankTransactions', updatedTransactions);
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    
    // Update local state
    setAccounts(updatedAccounts);
    
    // Clear cache again after updates
    UserDataManager.clearCache();

    console.log('Sample Transaction Details:', {
      account: targetAccount.type,
      previousBalance: currentBalance.toFixed(2),
      transactionAmount: transactionAmount.toFixed(2),
      newBalance: newBalance.toFixed(2),
      description: randomTransaction.description
    });

    // Notify all components of the changes
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('transactionAdded', {
      detail: { transaction, accountId }
    }));
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { 
        accountId, 
        newBalance: newBalance.toFixed(2), 
        accounts: updatedAccounts 
      }
    }));
    
    setShowAddTransaction(false);
    const currentCurrency = getUserCurrency();
    const currencySymbol = currentCurrency === 'EUR' ? '€' : '£';
    alert(`Transaction Added Successfully!\n\n${randomTransaction.description}\nAmount: ${currencySymbol}${Math.abs(transactionAmount).toFixed(2)}\nNew Balance: ${currencySymbol}${newBalance.toFixed(2)}`);
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
    
    // Update UserDataManager and clear cache for instant propagation
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    UserDataManager.clearCache('bankAccounts');
    UserDataManager.clearCache(); // Clear all caches
    setAccounts(updatedAccounts);
    
    // Close the editing modal
    setEditingAccount(null);
    setNewBalance('');
    
    // Dispatch multiple comprehensive events for instant app-wide updates
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { 
        accountId: editingAccount.id, 
        newBalance: numericBalance.toFixed(2),
        accounts: updatedAccounts,
        source: 'adminPanel'
      }
    }));
    
    window.dispatchEvent(new CustomEvent('accountsUpdate', {
      detail: { 
        accounts: updatedAccounts,
        source: 'adminBalanceUpdate'
      }
    }));
    
    // Additional event for dashboard refresh
    window.dispatchEvent(new CustomEvent('forceRefresh', {
      detail: { 
        type: 'balanceChange',
        accountId: editingAccount.id,
        newBalance: numericBalance.toFixed(2)
      }
    }));
    
    // Force localStorage update for immediate persistence
    const currentUser = UserDataManager.getCurrentUser();
    if (currentUser) {
      localStorage.setItem(`user_${currentUser}_bankAccounts`, JSON.stringify(updatedAccounts));
    }
    
    const currentCurrency = getUserCurrency();
    const currencySymbol = currentCurrency === 'EUR' ? '€' : '£';
    alert(`${editingAccount.displayName} balance updated to ${currencySymbol}${numericBalance.toFixed(2)}`);
  };

  const addSampleTransactions = (accountId: number, count: number, startDateStr: string = startDate, endDateStr: string = endDate) => {
    // Clear all caches first to ensure we get the most current data
    UserDataManager.clearCache();

    // Get fresh account data
    const currentAccounts = UserDataManager.getUserData('bankAccounts', []);
    
    if (!Array.isArray(currentAccounts) || currentAccounts.length === 0) {
      alert('Error: No accounts found. Please refresh the page.');
      return;
    }

    const targetAccount = currentAccounts.find((acc: any) => acc.id === accountId);
    if (!targetAccount) {
      alert('Error: Account not found. Please refresh the page.');
      return;
    }

    const currentTransactions = UserDataManager.getUserData('bankTransactions', []);
    const newTransactions = [];
    let currentBalance = parseFloat(targetAccount.balance) || 0;

    for (let i = 0; i < count; i++) {
      // Randomly select a transaction template
      const randomTransaction = sampleTransactions[Math.floor(Math.random() * sampleTransactions.length)];
      
      // Create a random date within the specified date range
      const startDateObj = new Date(startDateStr);
      const endDateObj = new Date(endDateStr);
      const timeDiff = endDateObj.getTime() - startDateObj.getTime();
      const randomTime = Math.random() * timeDiff;
      const transactionDate = new Date(startDateObj.getTime() + randomTime);
      const randomHours = Math.floor(Math.random() * 24);
      const randomMinutes = Math.floor(Math.random() * 60);
      transactionDate.setHours(randomHours, randomMinutes, 0, 0);
      
      // Calculate transaction amount and new balance
      const rawAmount = Math.abs(randomTransaction.amount);
      const transactionAmount = randomTransaction.type === 'credit' ? rawAmount : -rawAmount;
      currentBalance += transactionAmount;
      
      // Create properly formatted transaction
      const transaction = {
        id: Date.now() + i, // Ensure unique IDs
        accountId: accountId,
        amount: transactionAmount >= 0 ? `+${transactionAmount.toFixed(2)}` : transactionAmount.toFixed(2),
        description: randomTransaction.description,
        category: randomTransaction.type === 'credit' ? 'income' : 'expense',
        type: randomTransaction.type,
        timestamp: transactionDate.toISOString()
      };
      
      newTransactions.push(transaction);
    }

    // Update account with new balance
    const updatedAccounts = currentAccounts.map((acc: any) => {
      if (acc.id === accountId) {
        return { ...acc, balance: currentBalance.toFixed(2) };
      }
      return acc;
    });

    // Combine with existing transactions
    const allTransactions = [...currentTransactions, ...newTransactions];
    
    // Save everything to storage
    UserDataManager.setUserData('bankTransactions', allTransactions);
    UserDataManager.setUserData('bankAccounts', updatedAccounts);
    
    // Update local state
    setAccounts(updatedAccounts);
    
    // Clear cache again after updates
    UserDataManager.clearCache();

    console.log(`Added ${count} sample transactions to ${targetAccount.displayName}`);

    // Notify all components of the changes
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('transactionAdded', {
      detail: { transactions: newTransactions, count, accountId }
    }));
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { 
        accountId, 
        newBalance: currentBalance.toFixed(2), 
        accounts: updatedAccounts 
      }
    }));
    
    setShowSampleTransactions(false);
    const currentCurrency = getUserCurrency();
    const currencySymbol = currentCurrency === 'EUR' ? '€' : '£';
    alert(`Successfully added ${count} sample transaction${count === 1 ? '' : 's'} to ${targetAccount.displayName}!\n\nNew Balance: ${currencySymbol}${currentBalance.toFixed(2)}`);
  };

  const resetToDefaults = () => {
    // Reset accounts to zero balances for current user
    const defaultAccounts = [
      { id: 1, displayName: "Current Account", accountNumber: "****2091", balance: "0.00", accountType: "current" },
      { id: 2, displayName: "Credit Card", accountNumber: "****1820", balance: "0.00", accountType: "credit" },
      { id: 3, displayName: "Savings Account", accountNumber: "****0978", balance: "0.00", accountType: "savings" },
    ];
    
    // Clear cache to ensure fresh data
    UserDataManager.clearCache();
    
    // Clear all user data using UserDataManager
    UserDataManager.setUserAccounts(defaultAccounts);
    UserDataManager.setUserData('bankTransactions', []);
    UserDataManager.setUserData('savedPayees', []);
    UserDataManager.setUserData('recentPayees', []);
    
    // Only clear user financial data, preserve authentication and session data
    const currentUser = UserDataManager.getCurrentUser();
    if (currentUser) {
      // Clear only account balances and transaction history - not auth data
      localStorage.removeItem(`user_${currentUser}_bankTransactions`);
      localStorage.removeItem(`user_${currentUser}_savedPayees`);
      localStorage.removeItem(`user_${currentUser}_recentPayees`);
      // Note: keeping bankAccounts to preserve account structure
    }
    // Clear legacy financial data only
    localStorage.removeItem('bankTransactions');
    localStorage.removeItem('savedPayees');
    localStorage.removeItem('recentPayees');
    // Note: not clearing 'bankAccounts', 'bankingUser', 'currentUser', 'lastActiveUser'
    
    // Update local state immediately
    setAccounts(defaultAccounts);
    
    // Clear cache again after setting new data
    UserDataManager.clearCache();
    
    // Dispatch comprehensive events to notify all components
    window.dispatchEvent(new CustomEvent('transactionUpdate'));
    window.dispatchEvent(new CustomEvent('transactionDeleted'));
    window.dispatchEvent(new CustomEvent('balanceUpdate', {
      detail: { reset: true, accounts: defaultAccounts }
    }));
    window.dispatchEvent(new CustomEvent('accountsReset', {
      detail: { accounts: defaultAccounts }
    }));
    
    // Force refresh by updating accounts again after a short delay
    setTimeout(() => {
      setAccounts([...defaultAccounts]);
      window.dispatchEvent(new CustomEvent('balanceUpdate', {
        detail: { reset: true, accounts: defaultAccounts }
      }));
    }, 100);
    
    const currentCurrency = getUserCurrency();
    const currencySymbol = currentCurrency === 'EUR' ? '€' : '£';
    alert(`Data reset to defaults successfully - all balances set to ${currencySymbol}0.00, transactions cleared`);
  };

  // Load transactions for selected account
  const loadAccountTransactions = (accountId: string) => {
    const allTransactions = UserDataManager.getUserData('bankTransactions', []);
    const accountSpecificTransactions = allTransactions.filter((tx: any) => tx.accountId === parseInt(accountId));
    setAccountTransactions(accountSpecificTransactions);
  };

  // Handle transaction deletion - Single action with instant updates
  const handleDeleteTransaction = () => {
    if (!selectedTransaction || !selectedAccountId) return;

    // Get all transactions for current user
    const storedTransactions = UserDataManager.getUserData('bankTransactions', []);
    
    // Filter out the selected transaction
    const updatedTransactions = storedTransactions.filter((tx: any) => tx.id !== selectedTransaction.id);
    
    // Update transactions in storage
    UserDataManager.setUserData('bankTransactions', updatedTransactions);
    
    // Get user accounts to update balance
    const userAccounts = UserDataManager.getUserData('bankAccounts', []);
    const affectedAccount = userAccounts.find((acc: any) => acc.id === selectedTransaction.accountId);
    
    let updatedAccounts = userAccounts;
    if (affectedAccount) {
      // Calculate balance adjustment
      const transactionAmount = parseFloat(selectedTransaction.amount.replace('-', ''));
      const isDebit = selectedTransaction.amount.startsWith('-');
      
      // Reverse the transaction effect on balance
      let currentBalance = parseFloat(affectedAccount.balance);
      if (isDebit) {
        // If it was a debit, add the amount back
        currentBalance += transactionAmount;
      } else {
        // If it was a credit, subtract the amount
        currentBalance -= transactionAmount;
      }
      
      // Update account balance
      updatedAccounts = userAccounts.map((acc: any) => 
        acc.id === selectedTransaction.accountId 
          ? { ...acc, balance: currentBalance.toFixed(2) }
          : acc
      );
      
      // Save updated accounts to storage
      UserDataManager.setUserData('bankAccounts', updatedAccounts);
      
      // Instantly update local accounts state in admin panel
      setAccounts(updatedAccounts);
      
      // Clear cache to ensure fresh data everywhere
      UserDataManager.clearCache('bankAccounts');
      UserDataManager.clearCache('bankTransactions');
      
      // Dispatch comprehensive balance update events for all components
      window.dispatchEvent(new CustomEvent('balanceUpdate', {
        detail: { 
          accountId: selectedTransaction.accountId, 
          newBalance: currentBalance.toFixed(2),
          accounts: updatedAccounts
        }
      }));
      
      // Dispatch account update for dashboard and other components
      window.dispatchEvent(new CustomEvent('accountsUpdated', {
        detail: { accounts: updatedAccounts }
      }));
    }
    
    // Instantly update local transaction list in admin panel
    const accountSpecificTransactions = updatedTransactions.filter((tx: any) => tx.accountId === parseInt(selectedAccountId));
    setAccountTransactions(accountSpecificTransactions);
    
    // Reset modal state
    setSelectedTransaction(null);
    setShowDeleteConfirm(false);
    setShowDeleteTransaction(false);
    
    // Dispatch comprehensive transaction update events
    window.dispatchEvent(new CustomEvent('transactionDeleted', {
      detail: { 
        transactionId: selectedTransaction.id,
        accountId: selectedTransaction.accountId,
        transactions: updatedTransactions
      }
    }));
    
    window.dispatchEvent(new CustomEvent('transactionUpdate', {
      detail: { 
        transactions: updatedTransactions,
        accounts: updatedAccounts
      }
    }));
    
    // Force dashboard refresh
    window.dispatchEvent(new CustomEvent('forceRefresh'));
    
    alert('Transaction deleted successfully.');
  };

  return (
    <div className="h-screen bg-gradient-to-b from-[#126987] to-[#0d4e63] relative overflow-hidden">
      {/* Header */}
      {true && (
        <div className="bg-[#126987] px-4 py-6 pt-12 relative z-10">
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
      <div className="bg-white rounded-t-3xl absolute inset-x-0 top-32 bottom-0 overflow-y-auto overscroll-behavior-y-contain page-slide-up" 
           style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-6 pb-48 min-h-full">
          {isLoadingProfile ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-[#126987] rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center mb-8">
                <button 
                  onClick={handleProfilePictureTap}
                  onTouchStart={(e) => e.preventDefault()}
                  className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 active:scale-95 transition-all duration-200 touch-manipulation"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <User className="w-12 h-12 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {userDetails.name || "User"}
                </h2>
                <p className="text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  {userDetails.joinDate ? (() => {
                    if (userDetails.joinDate.includes('Member since')) {
                      return userDetails.joinDate;
                    }
                    const match = userDetails.joinDate.match(/\d{4}/);
                    const year = match ? match[0] : new Date(userDetails.joinDate).getFullYear();
                    return `Member since ${year}`;
                  })() : ""}
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

            {/* Sign Out removed - users can only be logged out via admin deletion */}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Panel Modal */}
      {showAdminPanel && (
        <div 
          className="admin-panel bg-black bg-opacity-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdminPanel(false);
            }
          }}
        >
          <div 
            className="bg-white w-full h-full overflow-y-auto modal-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Customer Panel
                </h2>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Currency Selector */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Select Currency
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      const newCurrency = 'EUR';
                      setUserCurrency(newCurrency);
                      setProfileData({ ...profileData, currency: newCurrency });
                      setEditProfileData({ ...editProfileData, currency: newCurrency });
                      
                      // Save to backend
                      try {
                        const currentCustomerNumber = UserDataManager.getCurrentUser();
                        const response = await fetch(`/api/profile/${currentCustomerNumber}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: profileData.name,
                            email: profileData.email,
                            phone: profileData.phone || '',
                            address: profileData.address || '',
                            dateOfBirth: profileData.dateOfBirth || '',
                            joinDate: profileData.joinDate || '',
                            currency: newCurrency
                          })
                        });
                        
                        if (response.ok) {
                          const updatedData = await response.json();
                          UserDataManager.updateUserProfile({
                            ...profileData,
                            currency: updatedData.currency || 'EUR'
                          });
                        }
                      } catch (error) {
                        console.error('Error saving currency:', error);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      userCurrency === 'EUR' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <p className={`font-semibold ${userCurrency === 'EUR' ? 'text-blue-900' : 'text-gray-900'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      BOI
                    </p>
                    <p className={`text-sm ${userCurrency === 'EUR' ? 'text-blue-600' : 'text-gray-500'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      EUR (€)
                    </p>
                  </button>
                  <button
                    onClick={async () => {
                      const newCurrency = 'GBP';
                      setUserCurrency(newCurrency);
                      setProfileData({ ...profileData, currency: newCurrency });
                      setEditProfileData({ ...editProfileData, currency: newCurrency });
                      
                      // Save to backend
                      try {
                        const currentCustomerNumber = UserDataManager.getCurrentUser();
                        const response = await fetch(`/api/profile/${currentCustomerNumber}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: profileData.name,
                            email: profileData.email,
                            phone: profileData.phone || '',
                            address: profileData.address || '',
                            dateOfBirth: profileData.dateOfBirth || '',
                            joinDate: profileData.joinDate || '',
                            currency: newCurrency
                          })
                        });
                        
                        if (response.ok) {
                          const updatedData = await response.json();
                          UserDataManager.updateUserProfile({
                            ...profileData,
                            currency: updatedData.currency || 'GBP'
                          });
                        }
                      } catch (error) {
                        console.error('Error saving currency:', error);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      userCurrency === 'GBP' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <p className={`font-semibold ${userCurrency === 'GBP' ? 'text-blue-900' : 'text-gray-900'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      BOI UK
                    </p>
                    <p className={`text-sm ${userCurrency === 'GBP' ? 'text-blue-600' : 'text-gray-500'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      GBP (£)
                    </p>
                  </button>
                </div>
              </div>

              {/* Transfer Options Visibility */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Transfer Options Visibility
                </h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                  {/* SEPA Transfer Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        SEPA Transfer
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Transfer within SEPA zone
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newSettings = { ...transferSettings, showSepaTransfer: !transferSettings.showSepaTransfer };
                        setTransferSettings(newSettings);
                        UserDataManager.setUserData('transferSettings', newSettings);
                        UserDataManager.clearCache('transferSettings');
                        window.dispatchEvent(new CustomEvent('transferSettingsUpdate'));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        transferSettings.showSepaTransfer ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          transferSettings.showSepaTransfer ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* UK Transfer Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        UK Bank Transfer
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Account number and sort code
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newSettings = { ...transferSettings, showUkTransfer: !transferSettings.showUkTransfer };
                        setTransferSettings(newSettings);
                        UserDataManager.setUserData('transferSettings', newSettings);
                        UserDataManager.clearCache('transferSettings');
                        window.dispatchEvent(new CustomEvent('transferSettingsUpdate'));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        transferSettings.showUkTransfer ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          transferSettings.showUkTransfer ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Internal Transfer Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Between BOI Accounts
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Move money between your accounts
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newSettings = { ...transferSettings, showInternalTransfer: !transferSettings.showInternalTransfer };
                        setTransferSettings(newSettings);
                        UserDataManager.setUserData('transferSettings', newSettings);
                        UserDataManager.clearCache('transferSettings');
                        window.dispatchEvent(new CustomEvent('transferSettingsUpdate'));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        transferSettings.showInternalTransfer ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          transferSettings.showInternalTransfer ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
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

                    {/* Add Custom Transaction */}
                    <button 
                      onClick={() => setShowAddTransaction(true)}
                      className="w-full flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl active:scale-98 transition-transform"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Add Custom Transaction
                        </p>
                        <p className="text-sm text-blue-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Create a transaction with your own details
                        </p>
                      </div>
                    </button>

                    {/* Add Sample Transactions */}
                    <button 
                      onClick={() => setShowSampleTransactions(true)}
                      className="w-full flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl active:scale-98 transition-transform"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <HardDrive className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-blue-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Add Sample Transactions
                        </p>
                        <p className="text-sm text-blue-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Add multiple test transactions (1, 5, 10, 20, 50)
                        </p>
                      </div>
                    </button>

                    {/* Delete Transaction */}
                    <button 
                      onClick={() => {
                        setShowDeleteTransaction(true);
                      }}
                      className="w-full flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl active:scale-98 transition-transform"
                    >
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-red-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Delete Transaction
                        </p>
                        <p className="text-sm text-red-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          Remove specific transactions from any user
                        </p>
                      </div>
                    </button>

                    {/* Unblock Card */}
                    {UserDataManager.getUserData('cardBlocked') && (
                      <button 
                        onClick={() => {
                          UserDataManager.setUserData('cardBlocked', false);
                          // Clear cache to ensure fresh data is loaded when navigating back
                          UserDataManager.clearCache('cardBlocked');
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
                    {accounts && Array.isArray(accounts) ? (
                      accounts.map((account) => (
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
                            {formatCurrency(account.balance, userCurrency)}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        No account data found
                      </div>
                    )}
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
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4">
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
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4">
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
                  New Balance ({getCurrencySymbol(getUserCurrency())})
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
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4">
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
                    Initial Balance ({userCurrency === 'EUR' ? '€' : '£'})
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

      {/* Add Custom Transaction Modal */}
      {showAddTransaction && (
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Add Custom Transaction
                </h2>
                <button
                  onClick={() => {
                    setShowAddTransaction(false);
                    setCustomTransactionData({
                      accountId: '',
                      description: '',
                      amount: '',
                      type: 'debit',
                      date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Account Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Select Account
                  </label>
                  <select
                    value={customTransactionData.accountId}
                    onChange={(e) => setCustomTransactionData({ ...customTransactionData, accountId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    <option value="">Choose an account...</option>
                    {accounts && Array.isArray(accounts) ? accounts.map((account) => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.displayName} - {formatCurrency(account.balance, userCurrency)}
                      </option>
                    )) : null}
                  </select>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Transaction Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCustomTransactionData({ ...customTransactionData, type: 'debit' })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        customTransactionData.type === 'debit'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <p className={`font-semibold ${customTransactionData.type === 'debit' ? 'text-red-900' : 'text-gray-900'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Debit
                      </p>
                      <p className={`text-xs ${customTransactionData.type === 'debit' ? 'text-red-600' : 'text-gray-500'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Money Out
                      </p>
                    </button>
                    <button
                      onClick={() => setCustomTransactionData({ ...customTransactionData, type: 'credit' })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        customTransactionData.type === 'credit'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <p className={`font-semibold ${customTransactionData.type === 'credit' ? 'text-green-900' : 'text-gray-900'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Income
                      </p>
                      <p className={`text-xs ${customTransactionData.type === 'credit' ? 'text-green-600' : 'text-gray-500'}`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Money In
                      </p>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={customTransactionData.description}
                    onChange={(e) => setCustomTransactionData({ ...customTransactionData, description: e.target.value })}
                    placeholder="e.g., Salary Payment, Grocery Shopping"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Amount ({getCurrencySymbol(userCurrency)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customTransactionData.amount}
                    onChange={(e) => setCustomTransactionData({ ...customTransactionData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={customTransactionData.date}
                    onChange={(e) => setCustomTransactionData({ ...customTransactionData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddTransaction(false);
                    setCustomTransactionData({
                      accountId: '',
                      description: '',
                      amount: '',
                      type: 'debit',
                      date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomTransaction}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Transactions Modal */}
      {showSampleTransactions && (
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Add Sample Transactions
                </h2>
                <button
                  onClick={() => setShowSampleTransactions(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Select date range, account, and number of transactions to add:
              </p>

              <div className="space-y-4">
                {/* Date Range Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Transaction Date Range:
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{ fontFamily: 'OpenSans, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{ fontFamily: 'OpenSans, sans-serif' }}
                      />
                    </div>
                  </div>
                </div>
                {/* Account Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Choose Account:
                  </h3>
                  <div className="space-y-2">
                    {accounts && Array.isArray(accounts) ? (
                      accounts.map((account) => (
                        <div key={account.id}>
                          <div className="bg-gray-50 p-3 rounded-xl border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-left">
                                <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  {account.displayName}
                                </p>
                                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  {account.accountNumber}
                                </p>
                                <p className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  Current: {formatCurrency(account.balance, userCurrency)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Transaction Count Buttons */}
                            <div className="grid grid-cols-5 gap-2">
                              <button
                                onClick={() => addSampleTransactions(account.id, 1, startDate, endDate)}
                                className="flex flex-col items-center justify-center p-2 bg-blue-50 border border-blue-200 rounded-lg active:scale-95 transition-transform hover:bg-blue-100"
                              >
                                <span className="text-sm font-bold text-blue-900">1</span>
                                <span className="text-xs text-blue-600">txn</span>
                              </button>
                              <button
                                onClick={() => addSampleTransactions(account.id, 5, startDate, endDate)}
                                className="flex flex-col items-center justify-center p-2 bg-blue-50 border border-blue-200 rounded-lg active:scale-95 transition-transform hover:bg-blue-100"
                              >
                                <span className="text-sm font-bold text-blue-900">5</span>
                                <span className="text-xs text-blue-600">txns</span>
                              </button>
                              <button
                                onClick={() => addSampleTransactions(account.id, 10, startDate, endDate)}
                                className="flex flex-col items-center justify-center p-2 bg-blue-50 border border-blue-200 rounded-lg active:scale-95 transition-transform hover:bg-blue-100"
                              >
                                <span className="text-sm font-bold text-blue-900">10</span>
                                <span className="text-xs text-blue-600">txns</span>
                              </button>
                              <button
                                onClick={() => addSampleTransactions(account.id, 20, startDate, endDate)}
                                className="flex flex-col items-center justify-center p-2 bg-blue-50 border border-blue-200 rounded-lg active:scale-95 transition-transform hover:bg-blue-100"
                              >
                                <span className="text-sm font-bold text-blue-900">20</span>
                                <span className="text-xs text-blue-600">txns</span>
                              </button>
                              <button
                                onClick={() => addSampleTransactions(account.id, 50, startDate, endDate)}
                                className="flex flex-col items-center justify-center p-2 bg-blue-50 border border-blue-200 rounded-lg active:scale-95 transition-transform hover:bg-blue-100"
                              >
                                <span className="text-sm font-bold text-blue-900">50</span>
                                <span className="text-xs text-blue-600">txns</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        No account data found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowSampleTransactions(false)}
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

      {/* Delete Transaction Modal */}
      {showDeleteTransaction && (
        <div className="admin-panel bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Delete Transaction
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteTransaction(false);
                    setSelectedAccountId('');
                    setAccountTransactions([]);
                    setSelectedTransaction(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Step 1: Select Account */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    1. Select Account Type
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      setSelectedAccountId(e.target.value);
                      if (e.target.value) {
                        loadAccountTransactions(e.target.value);
                      } else {
                        setAccountTransactions([]);
                      }
                      setSelectedTransaction(null);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    <option value="">Choose an account...</option>
                    {accounts && Array.isArray(accounts) ? accounts.map((account) => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.accountType} - {formatCurrency(account.balance, userCurrency)}
                      </option>
                    )) : (
                      <option value="" disabled>No accounts available</option>
                    )}
                  </select>
                </div>

                {/* Step 2: Show Account Transactions */}
                {selectedAccountId && accountTransactions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      2. Select Transaction to Delete ({accountTransactions.length} transactions)
                    </label>
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl">
                      {accountTransactions.map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedTransaction?.id === transaction.id ? 'bg-red-50 border-2 border-red-300 shadow-md' : ''
                          }`}
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.paymentMethod === 'UK Transfer' ? 'bg-blue-100 text-blue-800' :
                                  transaction.paymentMethod === 'SEPA Transfer' ? 'bg-green-100 text-green-800' :
                                  transaction.paymentMethod === 'BOI Transfer' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {transaction.paymentMethod || 'Other'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(transaction.timestamp).toLocaleDateString()} {new Date(transaction.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="font-semibold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                {transaction.description}
                              </p>
                              {transaction.reference && (
                                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  Ref: {transaction.reference}
                                </p>
                              )}
                              {transaction.recipientName && (
                                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  To: {transaction.recipientName}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end space-y-2">
                              <div>
                                <p className={`font-bold text-lg ${
                                  transaction.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'
                                }`} style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  {formatCurrency(Math.abs(parseFloat(transaction.amount)), userCurrency)}
                                </p>
                                <p className="text-xs text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                  {transaction.amount.startsWith('-') ? 'Debit' : 'Credit'}
                                </p>
                              </div>
                              {selectedTransaction?.id === transaction.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAccountId && accountTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      No transactions found for this account.
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {selectedAccountId && accountTransactions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      <strong>Instructions:</strong> Click on a transaction to select it. A red highlight will appear with a Delete button.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTransaction && (
        <div className="admin-panel bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Confirm Transaction Deletion
              </h3>
              <p className="text-gray-600 mb-6" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Are you sure you want to delete this transaction? This action cannot be undone and will update the account balance accordingly.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTransaction}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Delete Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
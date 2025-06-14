import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { User, ExternalLink, HelpCircle, Phone, Settings, Shield, MapPin, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserDataManager } from "@/utils/userDataManager";

export default function Login() {
  const [customerNumber, setCustomerNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoginAnimating, setIsLoginAnimating] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [loginStage, setLoginStage] = useState('');
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    customerNumber: ''
  });
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showOtcVerification, setShowOtcVerification] = useState(false);
  const [otcCode, setOtcCode] = useState('');
  const [generatedOtc, setGeneratedOtc] = useState('');
  const [pendingAccountData, setPendingAccountData] = useState<any>(null);
  const [showATMLocator, setShowATMLocator] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [nearbyATMs, setNearbyATMs] = useState<any[]>([]);
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Assets are always loaded - no delays
  useEffect(() => {
    setAssetsLoaded(true);
    
    // Set login theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#126987');
    }
    
    // Clear current user session on login page load
    UserDataManager.clearCurrentUser();
    
    // Clear form fields
    setCustomerNumber('');
    setPin('');
    setBiometricVerified(false);
    setPinVerified(false);
    setLogoTapCount(0);
    setShowAdminLogin(false);
  }, []);

  const handleNavigation = (path: string) => {
    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const handleLogoTap = () => {
    const newTapCount = logoTapCount + 1;
    setLogoTapCount(newTapCount);
    
    if (newTapCount === 5) {
      setShowAdminLogin(true);
      setLogoTapCount(0);
    }
    
    // Reset tap count after 3 seconds of inactivity
    setTimeout(() => {
      setLogoTapCount(0);
    }, 3000);
  };

  const generateCustomerNumber = () => {
    return 'BOI' + Math.random().toString().substring(2, 11);
  };

  const handleSignUp = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const customerNumber = generateCustomerNumber();
    const userData = {
      ...newUserData,
      customerNumber,
      joinDate: new Date().toISOString(),
      dateCreated: new Date().toISOString(),
      address: "New Customer Address",
      dateOfBirth: "01 January 1990"
    };

    // Generate and send OTC for admin verification
    try {
      const response = await fetch('/api/admin/generate-otc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerNumber: userData.customerNumber,
          name: userData.name,
          email: userData.email,
          phone: userData.phone
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Store pending account data
        setPendingAccountData(userData);
        
        // Show OTC verification screen
        setShowSignUp(false);
        setShowOtcVerification(true);
        
        toast({
          title: "Verification Required",
          description: "An admin verification code has been generated. Please enter the OTC to complete account creation.",
          duration: 6000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate verification code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOtcVerification = async () => {
    if (!otcCode || otcCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    if (!pendingAccountData) {
      toast({
        title: "Error",
        description: "No pending account data found. Please try creating the account again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate OTC with server
      const response = await fetch('/api/admin/validate-otc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerNumber: pendingAccountData.customerNumber,
          code: otcCode
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // OTC is valid, create the account
        UserDataManager.registerUser(pendingAccountData);
        UserDataManager.initializeFreshAccount(pendingAccountData.customerNumber);

        toast({
          title: "Account Created Successfully",
          description: `Your customer number is ${pendingAccountData.customerNumber}. Please remember this for future logins.`,
          duration: 5000,
        });

        // Clean up state
        setShowOtcVerification(false);
        setOtcCode('');
        setPendingAccountData(null);
        setNewUserData({ name: '', email: '', phone: '', customerNumber: '' });
        setCustomerNumber(pendingAccountData.customerNumber);

      } else {
        // OTC validation failed
        toast({
          title: "Invalid Verification Code",
          description: result.message || "The verification code is invalid or has expired. Please try again.",
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Unable to verify the code. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user exists
    if (!UserDataManager.userExists(customerNumber)) {
      toast({
        title: "Login Failed",
        description: "Customer number not found. Please check your credentials or create a new account.",
        variant: "destructive",
      });
      return;
    }

    // Set current user and record login time
    UserDataManager.setCurrentUser(customerNumber);
    UserDataManager.recordLoginTime(customerNumber);
    
    try {
      await login({ customerNumber, pin });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid customer number or PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBiometricHoldStart = () => {
    if (biometricVerified) return;
    
    // Check if any users exist first
    const allUsers = UserDataManager.getAllUsers();
    if (Object.keys(allUsers).length === 0) {
      toast({
        title: "No Account Found",
        description: "Please create an account first by tapping 'Waiting for approval'.",
        variant: "destructive",
      });
      return;
    }

    // If customer number is entered, validate it exists
    if (customerNumber && !UserDataManager.userExists(customerNumber)) {
      toast({
        title: "Account Not Found",
        description: "Customer number not found. Please check your credentials.",
        variant: "destructive",
      });
      return;
    }
    
    setIsScanning(true);
    setHoldProgress(0);
    
    const timer = setInterval(() => {
      setHoldProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(timer);
          setBiometricVerified(true);
          setIsScanning(false);
          setHoldProgress(0);
          
          // Initialize fresh account data based on entered customer number or last active user if none entered
          let targetUser = null;
          if (customerNumber && UserDataManager.userExists(customerNumber)) {
            targetUser = customerNumber;
            UserDataManager.setCurrentUser(customerNumber);
            UserDataManager.initializeFreshAccount(customerNumber);
          } else if (!customerNumber) {
            // If no customer number entered, use last active user first, then fall back to most recent
            const lastActiveUser = UserDataManager.getLastActiveUser();
            if (lastActiveUser && UserDataManager.userExists(lastActiveUser)) {
              targetUser = lastActiveUser;
              UserDataManager.setCurrentUser(lastActiveUser);
              UserDataManager.initializeFreshAccount(lastActiveUser);
              setCustomerNumber(lastActiveUser); // Update the display
            } else {
              // Fall back to most recent account if no last active user
              const allUsers = UserDataManager.getAllUsers();
              const userNumbers = Object.keys(allUsers);
              if (userNumbers.length > 0) {
                const mostRecentUser = userNumbers.reduce((latest, current) => {
                  const latestDate = new Date(allUsers[latest].dateCreated);
                  const currentDate = new Date(allUsers[current].dateCreated);
                  return currentDate > latestDate ? current : latest;
                });
                targetUser = mostRecentUser;
                UserDataManager.setCurrentUser(mostRecentUser);
                UserDataManager.initializeFreshAccount(mostRecentUser);
                setCustomerNumber(mostRecentUser); // Update the display
              }
            }
          }
          
          return 100;
        }
        return newProgress;
      });
    }, 60);
    
    setHoldTimer(timer);
  };

  const handleBiometricHoldEnd = () => {
    if (holdTimer) {
      clearInterval(holdTimer);
      setHoldTimer(null);
    }
    if (!biometricVerified) {
      setIsScanning(false);
      setHoldProgress(0);
    }
  };

  const handleLoginButton = async () => {
    if (!biometricVerified && !pinVerified) {
      toast({
        title: "Authentication Required",
        description: "Please verify with biometric or PIN first",
        variant: "destructive",
      });
      return;
    }

    setIsLoginAnimating(true);
    setLoginProgress(0);

    try {
      // Stage 1: Authenticating (2 seconds)
      setLoginStage('Authenticating...');
      const progressInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 25) return prev + 1.25;
          return prev;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stage 2: Verifying credentials (1.5 seconds)
      setLoginStage('Verifying credentials...');
      setLoginProgress(25);
      const verifyInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 50) return prev + 1.67;
          return prev;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 3: Securing connection (1.5 seconds)
      setLoginStage('Securing connection...');
      setLoginProgress(50);
      const secureInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 75) return prev + 1.67;
          return prev;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 4: Loading dashboard (1.5 seconds)
      setLoginStage('Loading dashboard...');
      setLoginProgress(75);
      const finalInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 95) return prev + 1.33;
          return prev;
        });
      }, 100);

      clearInterval(progressInterval);
      clearInterval(verifyInterval);
      clearInterval(secureInterval);

      // Verify user is authenticated through UserDataManager
      const currentUser = UserDataManager.getCurrentUser();
      if (!currentUser || !UserDataManager.userExists(currentUser)) {
        throw new Error("No valid user session found");
      }
      
      // Record login time and authenticate through auth context
      UserDataManager.recordLoginTime(currentUser);
      
      // Use actual login credentials to authenticate with backend
      await login({ customerNumber, pin });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Final completion (0.5 seconds)
      setLoginStage('Welcome to Bank of Ireland');
      setLoginProgress(95);
      const completeInterval = setInterval(() => {
        setLoginProgress(prev => {
          if (prev < 100) return prev + 1;
          return prev;
        });
      }, 100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoginProgress(100);
      clearInterval(finalInterval);
      clearInterval(completeInterval);

      await new Promise(resolve => setTimeout(resolve, 300));
      navigate("/dashboard");
    } catch (error) {
      setIsLoginAnimating(false);
      toast({
        title: "Login Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePinVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerNumber || !pin) {
      toast({
        title: "Missing Information",
        description: "Please enter both customer number and PIN",
        variant: "destructive",
      });
      return;
    }

    // Check if user exists
    if (!UserDataManager.userExists(customerNumber)) {
      toast({
        title: "Login Failed",
        description: "Customer number not found. Please create an account first.",
        variant: "destructive",
      });
      return;
    }
    
    // Initialize fresh account data and verify PIN
    UserDataManager.initializeFreshAccount(customerNumber);
    UserDataManager.recordLoginTime(customerNumber);
    
    // Authenticate with backend using credentials
    try {
      await login({ customerNumber, pin });
      setPinVerified(true);
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid PIN. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Navigate to dashboard after verification
    navigate('/dashboard');
  };

  const requestLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      setIsLoadingLocation(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLoadingLocation(false);
        fetchNearbyATMs(latitude, longitude);
      },
      (error) => {
        let errorMessage = "Location access needed to display nearby ATMs.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions to find nearby ATMs.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      options
    );
  };

  const fetchNearbyATMs = async (lat: number, lng: number) => {
    try {
      // Using OpenStreetMap Overpass API to find ATMs within 10 miles (16km)
      const radius = 16000; // 10 miles in meters
      const overpassQuery = `
        [out:json][timeout:30];
        (
          node["amenity"="atm"](around:${radius},${lat},${lng});
          way["amenity"="atm"](around:${radius},${lat},${lng});
          relation["amenity"="atm"](around:${radius},${lat},${lng});
          node["amenity"="bank"](around:${radius},${lat},${lng});
          way["amenity"="bank"](around:${radius},${lat},${lng});
          relation["amenity"="bank"](around:${radius},${lat},${lng});
          node["amenity"="credit_union"](around:${radius},${lat},${lng});
          way["amenity"="credit_union"](around:${radius},${lat},${lng});
          node["shop"="money_lender"](around:${radius},${lat},${lng});
          node["office"="financial"](around:${radius},${lat},${lng});
          node["name"~"ATM|Bank|Credit|Banque|Banco|Banca|Sparkasse|Volksbank|Commerzbank|Deutsche Bank|HSBC|Barclays|Lloyds|Santander|BNP|Crédit|ING|Rabobank|ABN|PostBank|Geldautomat|Cajero|Bancomat|Distributeur"](around:${radius},${lat},${lng});
        );
        out geom;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ATM data');
      }

      const data = await response.json();
      
      // Process and format ATM data with better fallbacks
      const atms = data.elements.map((element: any) => {
        const elementLat = element.lat || (element.center && element.center.lat);
        const elementLng = element.lon || (element.center && element.center.lon);
        
        if (!elementLat || !elementLng) return null;
        
        const distance = calculateDistance(lat, lng, elementLat, elementLng);
        
        // Determine location type and name
        let name = 'ATM';
        let type = 'ATM';
        let network = 'Unknown';
        
        if (element.tags) {
          name = element.tags.name || element.tags.operator || element.tags.brand || 'ATM';
          network = element.tags.network || element.tags.brand || element.tags.operator || 'ATM';
          
          if (element.tags.amenity === 'bank') {
            type = 'Bank';
            if (!element.tags.name && !element.tags.operator && !element.tags.brand) {
              name = 'Bank';
            }
          } else if (element.tags.amenity === 'credit_union') {
            type = 'Credit Union';
            name = element.tags.name || 'Credit Union';
          } else if (element.tags.office === 'financial') {
            type = 'Financial Services';
            name = element.tags.name || 'Financial Services';
          }
        }
        
        // Build address with multiple fallbacks
        let address = 'Address not available';
        if (element.tags) {
          if (element.tags.addr_full) {
            address = element.tags.addr_full;
          } else {
            const parts = [];
            if (element.tags['addr:housenumber']) parts.push(element.tags['addr:housenumber']);
            if (element.tags['addr:street']) parts.push(element.tags['addr:street']);
            if (element.tags['addr:city']) parts.push(element.tags['addr:city']);
            if (element.tags['addr:state']) parts.push(element.tags['addr:state']);
            if (element.tags['addr:postcode']) parts.push(element.tags['addr:postcode']);
            
            if (parts.length > 0) {
              address = parts.join(', ');
            }
          }
        }
        
        return {
          id: element.id,
          lat: elementLat,
          lng: elementLng,
          name,
          network,
          address,
          type,
          distance
        };
      }).filter((atm: any) => atm && atm.distance <= 16) // Filter within 16km
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 20); // Show top 20 closest locations

      setNearbyATMs(atms);

      // If still no results, try a backup search with different approach
      if (atms.length === 0) {
        await fetchBackupATMs(lat, lng);
      }
    } catch (error) {
      console.error('Error fetching ATMs:', error);
      // Try backup search on error
      await fetchBackupATMs(lat, lng);
    }
  };

  const fetchBackupATMs = async (lat: number, lng: number) => {
    try {
      // Backup search with broader global criteria
      const radius = 25000; // ~15.5 miles for wider coverage
      const backupQuery = `
        [out:json][timeout:35];
        (
          node["amenity"~"^(atm|bank|bureau_de_change)$"](around:${radius},${lat},${lng});
          way["amenity"~"^(atm|bank|bureau_de_change)$"](around:${radius},${lat},${lng});
          node["office"~"^(financial|bank)$"](around:${radius},${lat},${lng});
          node["shop"~"^(money_lender|pawnbroker)$"](around:${radius},${lat},${lng});
          node["brand"~"Visa|Mastercard|Cirrus|Plus|Maestro|Interac|Eftpos|UnionPay|JCB|Discover"](around:${radius},${lat},${lng});
          node["operator"~"Bank|ATM|Geldautomat|Cajero|Bancomat|Distributeur|Cash|Money"](around:${radius},${lat},${lng});
          node["name"~"(?i)(atm|bank|credit|banque|banco|banca|sparkasse|geldautomat|cajero|bancomat|distributeur|cash|money|financial|finance)"](around:${radius},${lat},${lng});
        );
        out geom;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: backupQuery,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const backupAtms = data.elements.map((element: any) => ({
          id: element.id,
          lat: element.lat || (element.center && element.center.lat),
          lng: element.lon || (element.center && element.center.lon),
          name: element.tags?.name || element.tags?.operator || element.tags?.brand || 'Banking Location',
          network: element.tags?.network || element.tags?.brand || 'Banking',
          address: element.tags?.addr_full || 
                   `${element.tags?.['addr:city'] || ''} ${element.tags?.['addr:postcode'] || ''}`.trim() ||
                   'Address not available',
          type: element.tags?.amenity === 'bank' ? 'Bank' : 'ATM',
          distance: calculateDistance(lat, lng, 
                     element.lat || (element.center && element.center.lat),
                     element.lon || (element.center && element.center.lon))
        })).filter((atm: any) => atm.lat && atm.lng && atm.distance <= 20)
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 10);

        if (backupAtms.length > 0) {
          setNearbyATMs(backupAtms);
        } else {
          // If still no results, show informative message
          setNearbyATMs([]);
        }
      }
    } catch (backupError) {
      console.error('Backup search failed:', backupError);
      toast({
        title: "Search Complete",
        description: "No ATMs or bank branches found within 10 miles of your location.",
        variant: "destructive",
      });
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  const formatDistance = (km: number) => {
    // Use miles for US/UK, kilometers for most other countries
    const userLocale = navigator.language || 'en-US';
    const isImperial = userLocale.includes('US') || userLocale.includes('GB');
    
    if (isImperial) {
      const miles = km * 0.621371;
      return `${miles.toFixed(1)} mi`;
    } else {
      return `${km.toFixed(1)} km`;
    }
  };

  const handleATMLocatorOpen = () => {
    setShowATMLocator(true);
    if (!userLocation) {
      requestLocation();
    }
  };

  return (
    <div className="full-height relative ios-safe-top ios-safe-bottom ios-safe-left ios-safe-right page-fade-in">
      {/* Loading overlay */}
      {(isNavigating || isLoginAnimating) && (
        <div className="fixed inset-0 bg-gradient-to-br from-[#126987] to-[#2d5a6b] z-50 flex flex-col items-center justify-center">
          {/* Background overlay pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url('/background.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          <div className="relative z-10">
            {/* Bank of Ireland Logo with authentic styling - always visible */}
            <div className="mb-8 flex flex-col items-center">
              <img 
                src="/boi_logo.svg" 
                alt="Bank of Ireland" 
                className="h-10 filter brightness-0 invert mb-2 asset-instant"
                loading="eager"
                decoding="sync"
                style={{ 
                  display: 'block',
                  opacity: 1,
                  visibility: 'visible',
                  imageRendering: 'crisp-edges'
                }}
              />
              <div className="w-16 h-1 bg-white opacity-30 rounded-full"></div>
            </div>
          
          {/* Login Animation */}
          {isLoginAnimating ? (
            <div className="text-center space-y-6">
              {/* Animated Security Icon */}
              <div className="relative">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <img 
                    src="/icon_HID.svg" 
                    alt="Security" 
                    className="w-10 h-10 filter brightness-0 invert animate-pulse asset-instant"
                    loading="eager"
                    decoding="sync"
                    style={{ 
                      imageRendering: 'crisp-edges',
                      opacity: 1,
                      visibility: 'visible'
                    }}
                  />
                </div>
                
                {/* Pulsing rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border border-white border-opacity-30 rounded-full animate-ping"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 border border-white border-opacity-20 rounded-full animate-pulse"></div>
                </div>
                
                {/* Rotating outer ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-white border-opacity-10 border-t-white border-t-opacity-40 rounded-full animate-spin"></div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-64 mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {loginStage}
                  </span>
                  <span className="text-white text-sm opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {Math.round(loginProgress)}%
                  </span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-1">
                  <div 
                    className="bg-white h-1 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${loginProgress}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Security Message with BOI styling */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <img src="/cert.svg" alt="Certified" className="w-4 h-4 filter brightness-0 invert opacity-75" />
                  <p className="text-white text-xs opacity-75" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Bank-grade security
                  </p>
                </div>
                <p className="text-white text-xs opacity-60 max-w-xs mx-auto leading-relaxed" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Your connection is secured with 256-bit encryption
                </p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          </div>
        </div>
      )}
      
      {/* Background with scenic image */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/background.jpg')`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center pt-12 pb-6 flex-shrink-0">
          <div className="flex items-center">
            <button 
              onClick={handleLogoTap}
              className="active:scale-95 transition-transform"
            >
              <img src="/boi_logo.svg" alt="Bank of Ireland" className="h-8 filter brightness-0 invert" />
            </button>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden ios-scroll">
          <div className="px-5 pt-8 pb-32">
            <div className="w-full max-w-xs mx-auto space-y-3">
              {/* Main White Login Card */}
              <div className="bg-white ios-card p-4">
                {/* Biometric Section */}
                <div className="text-center mb-6">
                  <div 
                    className={`w-16 h-16 mx-auto mb-4 relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer group ${
                      biometricVerified 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-100'
                        : isScanning 
                          ? 'bg-gradient-to-br from-blue-50 to-blue-100' 
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100'
                    }`}
                    onMouseDown={handleBiometricHoldStart}
                    onMouseUp={handleBiometricHoldEnd}
                    onMouseLeave={handleBiometricHoldEnd}
                    onTouchStart={handleBiometricHoldStart}
                    onTouchEnd={handleBiometricHoldEnd}
                    style={{
                      touchAction: 'manipulation',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {/* Progress ring for holding */}
                    {isScanning && (
                      <div className="absolute inset-0 rounded-full">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-gray-200"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="text-blue-500 transition-all duration-100"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - holdProgress / 100)}`}
                          />
                        </svg>
                      </div>
                    )}
                    
                    {/* Simplified visual feedback */}
                    {isScanning && (
                      <div className="absolute inset-0 rounded-full border-2 border-blue-300 opacity-50"></div>
                    )}
                    
                    {/* Original Fingerprint icon with effects */}
                    <div className="relative z-10 w-10 h-10 flex items-center justify-center">
                      <img 
                        src="/Icons_Fingerprint.svg" 
                        alt="Fingerprint" 
                        className="w-8 h-8"
                        loading="eager"
                        style={{
                          filter: biometricVerified 
                            ? 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)'
                            : isScanning
                              ? 'brightness(0) saturate(100%) invert(47%) sepia(96%) saturate(1234%) hue-rotate(204deg) brightness(97%) contrast(97%)'
                              : 'brightness(0) saturate(100%) invert(29%) sepia(16%) saturate(456%) hue-rotate(174deg) brightness(96%) contrast(88%)',
                          imageRendering: 'crisp-edges'
                        }}
                      />
                    </div>
                  </div>
                  <p 
                    className="text-gray-700 text-sm" 
                    style={{ 
                      fontFamily: 'OpenSans, sans-serif',
                      touchAction: 'manipulation',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {biometricVerified ? 'Fingerprint verified' : isScanning ? 'Hold to scan fingerprint...' : 'Biometrics login'}
                  </p>
                </div>

                {/* Log in Button */}
                <button 
                  onClick={handleLoginButton}
                  disabled={isLoading}
                  className={`w-full py-2.5 ios-button font-semibold text-sm mb-3 transition-all duration-200 ${
                    biometricVerified || pinVerified 
                      ? 'bg-[#126987] text-white hover:bg-[#3a5a65] active:scale-95' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  {isLoading ? "Logging in..." : "Log in"}
                </button>

                {/* Forgot PIN */}
                <div className="text-center mb-3">
                  <button className="text-[#126987] text-xs flex items-center justify-center space-x-1 active:scale-95 transition-transform" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    <span>Forgot your PIN?</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3"></div>

                {/* Alternative Login */}
                <div className="text-center">
                  <button className="flex items-center justify-center space-x-2 text-[#126987] text-xs mx-auto active:scale-95 transition-transform" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    <User className="w-3 h-3" />
                    <span>Log in with another ID</span>
                  </button>
                </div>
              </div>

              {/* PIN Option Card - separate gray card */}
              <button 
                className="w-full bg-gray-50 border border-gray-200 ios-card p-3 flex items-center space-x-3 hover:bg-gray-100 active:scale-98 transition-all duration-150"
                onClick={() => {
                  console.log("PIN button clicked, current showPinLogin:", showPinLogin);
                  setShowPinLogin(!showPinLogin);
                }}
              >
                <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-bold">⋯</span>
                </div>
                <span className="flex-1 text-left text-gray-700 text-xs font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Use your PIN instead</span>
                <span className="text-gray-400 text-sm">›</span>
              </button>

              {/* PIN Login Form - shows when showPinLogin is true */}
              {showPinLogin ? (
                <div className="bg-white ios-card p-4 border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    Log in with PIN
                  </h3>
                  <form onSubmit={handlePinVerification} className="space-y-4">
                    <div>
                      <Label htmlFor="customerNumber" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Customer Number
                      </Label>
                      <Input
                        id="customerNumber"
                        type="text"
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        placeholder="Enter your customer number"
                        className="mt-1 ios-input"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pin" className="text-sm font-medium text-gray-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        PIN
                      </Label>
                      <Input
                        id="pin"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter your PIN"
                        className="mt-1 ios-input"
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className={`w-full text-white hover:bg-[#3a5a65] ${
                        pinVerified ? 'bg-green-600' : 'bg-[#126987]'
                      }`}
                      disabled={isLoading || pinVerified}
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      {pinVerified ? "PIN Verified ✓" : "Verify PIN"}
                    </Button>
                    
                    <button
                      type="button"
                      onClick={() => setShowPinLogin(false)}
                      className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors duration-150"
                      style={{ fontFamily: 'OpenSans, sans-serif' }}
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              ) : null}

              {/* Approval Option Card - display only */}
              <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <img src="/lock.svg" alt="Lock" className="w-3 h-3" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-gray-700 text-sm font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Waiting for your approval</div>
                  <div className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: 'OpenSans, sans-serif' }}>Tap here to complete unfinished business</div>
                </div>
                <span className="text-gray-400 text-lg">›</span>
              </div>


            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#126987]/95 backdrop-blur-sm px-4 py-3 ios-safe-bottom">
          <div className="flex justify-evenly items-center w-full max-w-xs mx-auto">
            <button 
              className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80"
              onClick={handleATMLocatorOpen}
              disabled={isNavigating || isLoading}
            >
              <MapPin className="w-5 h-5 text-white" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>ATM/Branch</span>
            </button>
            <button className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80">
              <Shield className="w-5 h-5 text-white" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security</span>
            </button>
            <button 
              className="flex flex-col items-center space-y-1 py-2 transition-opacity duration-150 hover:opacity-80"
              onClick={() => setShowMoreMenu(true)}
              disabled={isNavigating || isLoading}
            >
              <MoreHorizontal className="w-5 h-5 text-white" />
              <span className="text-white text-xs font-medium" style={{ fontFamily: 'OpenSans, sans-serif' }}>More</span>
            </button>
          </div>
        </div>
      </div>

      {/* More Menu Modal */}
      {showMoreMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-4 mb-0 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                More Options
              </h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Help & Support</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Get assistance with login</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Contact Us</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Phone support & branches</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Accessibility</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Login accessibility options</p>
                </div>
              </button>
              
              <button className="w-full flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>Security Info</p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>Learn about secure banking</p>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => setShowMoreMenu(false)}
              className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              style={{ fontFamily: 'OpenSans, sans-serif' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Create New Account
              </h2>
              <button 
                onClick={() => setShowSignUp(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSignUp();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                  placeholder="+353 XX XXX XXXX"
                  required
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-blue-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  <strong>Important:</strong> A unique customer number will be generated for you. Please save this number as you'll need it to log in to your account.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSignUp(false)}
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Admin Access
              </h2>
              <button 
                onClick={() => setShowAdminLogin(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Quick Account Access
                </h3>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  Sign in to any registered account
                </p>
              </div>
              
              {/* Account List */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {Object.entries(UserDataManager.getAllUsers()).map(([customerNumber, userData]) => (
                  <div
                    key={customerNumber}
                    className="bg-gray-50 rounded-xl p-3 border"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={async () => {
                          UserDataManager.initializeFreshAccount(customerNumber);
                          UserDataManager.recordLoginTime(customerNumber);
                          
                          try {
                            // Use default PIN for admin login or prompt for PIN
                            await login({ customerNumber, pin: "1234" });
                            setShowAdminLogin(false);
                            setCustomerNumber(customerNumber);
                            setBiometricVerified(true);
                            navigate('/dashboard');
                          } catch (error) {
                            toast({
                              title: "Login Failed",
                              description: "Authentication error. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="flex-1 text-left hover:bg-gray-100 rounded-lg p-2 active:scale-98 transition-all"
                      >
                        <div className="font-medium text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {userData.name}
                        </div>
                        <div className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                          {customerNumber}
                        </div>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Remove this specific user using UserDataManager
                          UserDataManager.removeUser(customerNumber);
                          
                          // If this was the current user, clear the session
                          if (UserDataManager.getCurrentUser() === customerNumber) {
                            UserDataManager.clearCurrentUser();
                            setCustomerNumber('');
                            setBiometricVerified(false);
                            setPinVerified(false);
                          }
                          
                          toast({
                            title: "Account Removed",
                            description: `${userData.name} has been signed out and removed.`,
                          });
                          
                          // Force re-render by closing and reopening the panel
                          setShowAdminLogin(false);
                          setTimeout(() => setShowAdminLogin(true), 100);
                        }}
                        className="ml-2 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center active:scale-95 transition-all"
                        title="Sign out and remove account"
                      >
                        <span className="text-sm font-bold">×</span>
                      </button>
                    </div>
                  </div>
                ))}
                
                {Object.keys(UserDataManager.getAllUsers()).length === 0 && (
                  <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    No accounts registered yet
                  </div>
                )}
              </div>
              
              {/* Admin Actions */}
              <div className="border-t pt-4 mt-4 space-y-3">
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setShowSignUp(true);
                  }}
                  className="w-full p-3 bg-green-50 text-green-600 rounded-xl font-medium active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Create New Account
                </button>
                
                <button
                  onClick={() => {
                    // Clear current user session completely
                    UserDataManager.clearCurrentUser();
                    setShowAdminLogin(false);
                    setCustomerNumber('');
                    setPin('');
                    setBiometricVerified(false);
                    setPinVerified(false);
                    setIsScanning(false);
                    setShowPinLogin(false);
                    
                    // Force refresh of the component state
                    window.location.reload();
                    
                    toast({
                      title: "Session Cleared",
                      description: "All active sessions have been terminated.",
                    });
                  }}
                  className="w-full p-3 bg-red-50 text-red-600 rounded-xl font-medium active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Sign Out & Clear Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTC Verification Modal */}
      {showOtcVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                Admin Verification Required
              </h2>
              <button 
                onClick={() => {
                  setShowOtcVerification(false);
                  setOtcCode('');
                  setPendingAccountData(null);
                }}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  <strong>Admin Verification Required:</strong> A 6-digit verification code has been sent to the administrator for review. Please contact the admin to obtain the verification code and enter it below to complete your account creation.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  value={otcCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtcCode(value);
                  }}
                  className="w-full p-4 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              {pendingAccountData && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    <strong>Pending Account:</strong>
                  </p>
                  <p className="text-sm text-blue-700" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Name: {pendingAccountData.name}<br/>
                    Email: {pendingAccountData.email}<br/>
                    Customer Number: {pendingAccountData.customerNumber}
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtcVerification(false);
                    setOtcCode('');
                    setPendingAccountData(null);
                  }}
                  className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl font-semibold active:scale-98 transition-transform"
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleOtcVerification}
                  disabled={otcCode.length !== 6}
                  className={`flex-1 p-3 rounded-xl font-semibold active:scale-98 transition-transform ${
                    otcCode.length === 6 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'OpenSans, sans-serif' }}
                >
                  Verify & Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ATM Locator Modal */}
      {showATMLocator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-4 mb-0 h-[85vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                ATM Locator
              </h3>
              <button 
                onClick={() => setShowATMLocator(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-600 text-lg">×</span>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingLocation ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-[#126987] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 text-center" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Getting your location...
                  </p>
                </div>
              ) : locationError ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-gray-800 font-medium mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Location Access Required
                  </p>
                  <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    {locationError}
                  </p>
                  <button
                    onClick={requestLocation}
                    className="px-6 py-2 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5a65] transition-colors"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    Try Again
                  </button>
                </div>
              ) : userLocation && nearbyATMs.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple Map Placeholder */}
                  <div className="h-48 bg-gray-100 rounded-xl border-2 border-gray-200 flex items-center justify-center mb-6">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-[#126987] mx-auto mb-2" />
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Map showing {nearbyATMs.length} nearby ATMs
                      </p>
                      <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                        Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {/* ATM List */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 mb-3" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                      Nearby ATMs
                    </h4>
                    {nearbyATMs.map((atm, index) => (
                      <div key={atm.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-2 h-2 bg-[#126987] rounded-full"></div>
                              <h5 className="font-medium text-gray-800" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                                {atm.name}
                              </h5>
                            </div>
                            <p className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                              {atm.address}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{formatDistance(atm.distance)} away</span>
                              {atm.type && atm.type !== 'ATM' && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                  {atm.type}
                                </span>
                              )}
                              {atm.network !== 'Unknown' && atm.network !== 'ATM' && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {atm.network}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${atm.lat},${atm.lng}`;
                              window.open(url, '_blank');
                            }}
                            className="px-3 py-1 bg-[#126987] text-white text-xs rounded-lg hover:bg-[#3a5a65] transition-colors"
                            style={{ fontFamily: 'OpenSans, sans-serif' }}
                          >
                            Directions
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : userLocation && nearbyATMs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-800 font-medium mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    No ATMs Found
                  </p>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    No ATMs found within 10 miles of your location. Try searching in a different area.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-[#126987]" />
                  </div>
                  <p className="text-gray-800 font-medium mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Find Nearby ATMs
                  </p>
                  <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                    Allow location access to see ATMs and branches near you.
                  </p>
                  <button
                    onClick={requestLocation}
                    className="px-6 py-2 bg-[#126987] text-white rounded-lg font-medium hover:bg-[#3a5a65] transition-colors"
                    style={{ fontFamily: 'OpenSans, sans-serif' }}
                  >
                    Enable Location
                  </button>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowATMLocator(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                style={{ fontFamily: 'OpenSans, sans-serif' }}
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
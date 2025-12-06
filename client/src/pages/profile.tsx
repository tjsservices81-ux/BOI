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
      console.log('Opening admin panel...');
      navigate("/admin-oversight");
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
    </div>
  );
}

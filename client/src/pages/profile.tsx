import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Smartphone, Smile, Link2, FileText, Lock } from "lucide-react";
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

  const menuItems = [
    { label: "Personal details", icon: User, action: () => navigate("/profile/personal") },
    { label: "My security devices", icon: Smartphone, action: () => navigate("/profile/devices") },
    { label: "Face ID", icon: Smile, action: () => navigate("/profile/face-id") },
    { label: "Open banking connections", icon: Link2, action: () => navigate("/profile/banking") },
    { label: "Privacy and preferences", icon: FileText, action: () => navigate("/profile/privacy") },
    { label: "Security and Legal", icon: Lock, action: () => navigate("/profile/security") },
  ];

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
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Profile Section */}
        <div className="pt-8 pb-6 flex flex-col items-center">
          {/* Avatar Circle */}
          <div className="w-20 h-20 rounded-full border-2 border-[#126987] flex items-center justify-center bg-blue-50 mb-4">
            <User className="w-10 h-10 text-[#126987]" />
          </div>

          {/* User ID */}
          <p className="text-gray-700 text-center text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            User ID: {profileData.customerNumber}
          </p>
        </div>

        {/* Log Out Button */}
        <div className="px-4 pb-6">
          <button
            onClick={handleLogout}
            className="w-full py-3 border-2 border-[#126987] text-[#126987] font-semibold rounded text-center"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Log out
          </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-0">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full px-4 py-4 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-[#126987]" />
              </div>
              <span className="text-gray-700 font-medium text-left flex-1" style={{ fontFamily: 'OpenSans, sans-serif' }}>
                {item.label}
              </span>
              <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </button>
          ))}
        </div>

        {/* Version Info */}
        <div className="text-center py-6 text-gray-500 text-sm" style={{ fontFamily: 'OpenSans, sans-serif' }}>
          <p>V 11.06</p>
          <p>BOI.UAPP27-2</p>
        </div>
      </div>
    </div>
  );
}

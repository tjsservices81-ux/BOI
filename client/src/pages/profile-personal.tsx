import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User } from "lucide-react";
import { UserDataManager } from "@/utils/userDataManager";

export default function ProfilePersonal() {
  const locationHook = useLocation();
  const [, navigate] = locationHook || [null, () => {}];

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    customerNumber: "",
    joinDate: "",
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
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              address: userData.address || "",
              dateOfBirth: userData.dateOfBirth || "",
              customerNumber: userData.customerNumber || "",
              joinDate: userData.joinDate || "",
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not provided";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB");
    } catch {
      return dateString;
    }
  };

  const DetailCard = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-3">
      <p className="text-gray-600 text-sm">{label}</p>
      <p className="text-gray-900 font-medium mt-1">{value || "Not provided"}</p>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col ios-safe-top ios-safe-bottom" style={{ fontFamily: 'OpenSans, sans-serif' }}>
      {/* Header */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-semibold flex-1 text-center">
          Personal Details
        </h1>
        <button 
          onClick={handleProfilePictureTap}
          className="flex items-center justify-center w-6 h-6 text-white active:scale-95 transition-transform"
        >
          <User className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <div className="px-4 py-4">
            <DetailCard label="Full Name" value={profileData.name} />
            <DetailCard label="Date of Birth" value={formatDate(profileData.dateOfBirth)} />
            <DetailCard label="Address" value={profileData.address} />
            <DetailCard label="Phone Number" value={profileData.phone} />
            <DetailCard label="Email" value={profileData.email} />
            <DetailCard label="Account Created" value={formatDate(profileData.joinDate)} />
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
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

  const DetailField = ({ label, value }: { label: string; value: string }) => (
    <div className="border-b border-gray-100 py-4">
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <p className="text-gray-900 font-medium">{value || "Not provided"}</p>
    </div>
  );

  return (
    <div className="h-screen bg-white flex flex-col ios-safe-top ios-safe-bottom" style={{ fontFamily: 'OpenSans, sans-serif' }}>
      {/* Header */}
      <div className="bg-[#126987] flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-semibold flex-1 text-center">
          Personal details
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <div className="px-4 py-6">
            <DetailField label="Full Name" value={profileData.name} />
            <DetailField label="Email Address" value={profileData.email} />
            <DetailField label="Phone Number" value={profileData.phone} />
            <DetailField label="Address" value={profileData.address} />
            <DetailField label="Date of Birth" value={formatDate(profileData.dateOfBirth)} />
            <DetailField label="Customer Number" value={profileData.customerNumber} />
            <DetailField label="Account Created" value={formatDate(profileData.joinDate)} />
          </div>
        )}
      </div>
    </div>
  );
}

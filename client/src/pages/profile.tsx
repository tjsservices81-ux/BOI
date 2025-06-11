import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Settings, Shield, LogOut, Edit3, Phone, Mail, MapPin, Calendar, CreditCard } from "lucide-react";

export default function Profile() {
  const [, navigate] = useLocation();

  const userDetails = {
    name: "John Murphy",
    email: "john.murphy@email.ie",
    phone: "+353 85 123 4567",
    address: "123 Grafton Street, Dublin 2, D02 XY45",
    dateOfBirth: "15 March 1985",
    customerNumber: "BOI-789123456",
    joinDate: "Member since 2018"
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
            <div className="w-20 h-20 bg-[#4a6b75] rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
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
              onClick={() => navigate('/login')}
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
    </div>
  );
}
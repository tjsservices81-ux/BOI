import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { 
  ArrowLeft, 
  User,
  Lock,
  Fingerprint,
  Bell,
  Headphones,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight
} from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="text-[var(--boi-gray)]" />
          </Button>
          <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Profile & Settings</h1>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Profile Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mr-4">
                <User className="text-[var(--boi-green)] text-xl" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--boi-gray)]">{user.name}</p>
                <p className="text-sm text-[var(--boi-light-gray)]">Customer since 2019</p>
                <p className="text-sm text-[var(--boi-light-gray)]">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Account Settings</h3>
            
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Lock className="text-[var(--boi-light-gray)] mr-3" />
                  <span className="text-[var(--boi-gray)]">Change PIN</span>
                </div>
                <ChevronRight className="text-[var(--boi-light-gray)]" />
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Fingerprint className="text-[var(--boi-light-gray)] mr-3" />
                  <span className="text-[var(--boi-gray)]">Biometric Login</span>
                </div>
                <ChevronRight className="text-[var(--boi-light-gray)]" />
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Bell className="text-[var(--boi-light-gray)] mr-3" />
                  <span className="text-[var(--boi-gray)]">Notifications</span>
                </div>
                <ChevronRight className="text-[var(--boi-light-gray)]" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Support</h3>
            
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Headphones className="text-[var(--boi-light-gray)] mr-3" />
                  <span className="text-[var(--boi-gray)]">Contact Support</span>
                </div>
                <ChevronRight className="text-[var(--boi-light-gray)]" />
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <HelpCircle className="text-[var(--boi-light-gray)] mr-3" />
                  <span className="text-[var(--boi-gray)]">Help Center</span>
                </div>
                <ChevronRight className="text-[var(--boi-light-gray)]" />
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <FileText className="text-[var(--boi-light-gray)] mr-3" />
                  <span className="text-[var(--boi-gray)]">Terms & Conditions</span>
                </div>
                <ChevronRight className="text-[var(--boi-light-gray)]" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 transition-colors duration-200 mb-4"
        >
          <span className="flex items-center justify-center">
            <LogOut className="mr-2" />
            Sign Out
          </span>
        </Button>

        <div className="text-center text-xs text-[var(--boi-light-gray)]">
          <p>Bank of Ireland Mobile App v2.1.0</p>
          <p>© 2024 Bank of Ireland. All rights reserved.</p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}

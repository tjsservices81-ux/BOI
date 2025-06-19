import { Button } from "@/components/ui/button";
import { Home, List, ArrowRightLeft, FileText, User } from "lucide-react";
import { useLocation } from "wouter";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/transactions", icon: List, label: "Transactions" },
  { path: "/transfer", icon: ArrowRightLeft, label: "Transfer" },
  { path: "/statements", icon: FileText, label: "Statements" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNavigation() {
  const [location, navigate] = useLocation();

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center py-2 px-3 h-auto ${
                isActive 
                  ? "text-[var(--boi-green)] border-b-2 border-[var(--boi-green)]" 
                  : "text-[var(--boi-light-gray)]"
              }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

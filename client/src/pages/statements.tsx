import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { 
  ArrowLeft, 
  FileText,
  Eye,
  Download
} from "lucide-react";
import type { Account, Statement } from "@shared/schema";

export default function Statements() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts", user?.id],
    enabled: !!user,
  });

  const primaryAccount = accounts.find(acc => acc.accountType === "current");

  const { data: statements = [] } = useQuery<Statement[]>({
    queryKey: ["/api/statements", primaryAccount?.id],
    enabled: !!primaryAccount,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 page-fade-in">
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
          <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Account Statements</h1>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Available Statements */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Available Statements</h3>
            
            <div className="divide-y divide-gray-100">
              {statements.map((statement) => (
                <div key={statement.id} className="flex items-center justify-between p-3 first:pt-0 last:pb-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[var(--boi-light-green)] rounded-full flex items-center justify-center mr-3">
                      <FileText className="text-[var(--boi-green)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--boi-gray)]">
                        {statement.month} {statement.year}
                      </p>
                      <p className="text-sm text-[var(--boi-light-gray)]">
                        Current Account • {statement.transactionCount} transactions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                      <Eye className="w-4 h-4 text-[var(--boi-green)]" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                      <Download className="w-4 h-4 text-[var(--boi-green)]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statement Preferences */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Statement Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--boi-gray)]">Email Statements</p>
                  <p className="text-sm text-[var(--boi-light-gray)]">Get monthly statements via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--boi-gray)]">Paper Statements</p>
                  <p className="text-sm text-[var(--boi-light-gray)]">Receive printed statements by post</p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}

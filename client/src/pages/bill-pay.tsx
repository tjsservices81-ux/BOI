import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { 
  ArrowLeft, 
  Zap, 
  Wifi, 
  Home, 
  ChevronRight, 
  Plus 
} from "lucide-react";
import type { Payee, ScheduledPayment } from "@shared/schema";

export default function BillPay() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: payees = [] } = useQuery<Payee[]>({
    queryKey: ["/api/payees", user?.id],
    enabled: !!user,
  });

  const { data: scheduledPayments = [] } = useQuery<ScheduledPayment[]>({
    queryKey: ["/api/scheduled-payments", user?.id],
    enabled: !!user,
  });

  const getPayeeIcon = (category: string) => {
    switch (category) {
      case "utilities": return Zap;
      case "internet": return Wifi;
      case "council": return Home;
      default: return Zap;
    }
  };

  const getPayeeIconColor = (category: string) => {
    switch (category) {
      case "utilities": return "bg-blue-100 text-blue-600";
      case "internet": return "bg-purple-100 text-purple-600";
      case "council": return "bg-orange-100 text-orange-600";
      default: return "bg-blue-100 text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 page-fade-in">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="text-[var(--boi-gray)]" />
          </Button>
          <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Pay Bills</h1>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Recent Payees */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Recent Payees</h3>
            
            <div className="space-y-2">
              {payees.map((payee, index) => {
                const IconComponent = getPayeeIcon(payee.category);
                const iconColorClass = getPayeeIconColor(payee.category);
                
                return (
                  <Button
                    key={payee.id}
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto hover:bg-gray-50 stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${iconColorClass}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-[var(--boi-gray)]">{payee.name}</p>
                        <p className="text-sm text-[var(--boi-light-gray)]">
                          Last paid: €{payee.lastAmount ? parseFloat(payee.lastAmount).toFixed(2) : "0.00"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-[var(--boi-green)]" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add New Payee */}
        <Card>
          <CardContent className="p-4">
            <Button variant="ghost" className="w-full justify-center hover:bg-gray-50">
              <div className="flex items-center">
                <Plus className="text-[var(--boi-green)] mr-3" />
                <span className="font-medium text-[var(--boi-gray)]">Add New Payee</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Scheduled Payments */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Scheduled Payments</h3>
            
            <div className="space-y-3">
              {scheduledPayments.map((payment, index) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg stagger-item" style={{ animationDelay: `${(index + 3) * 0.1}s` }}>
                  <div>
                    <p className="font-medium text-[var(--boi-gray)]">{payment.payeeName}</p>
                    <p className="text-sm text-[var(--boi-light-gray)]">
                      Next: {new Date(payment.nextPayment).toLocaleDateString("en-IE", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--boi-gray)]">
                      €{parseFloat(payment.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-[var(--boi-light-gray)] capitalize">
                      {payment.frequency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}

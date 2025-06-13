import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, PiggyBank, ChevronDown, Send, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Account, TransferRequest } from "@shared/schema";

export default function Transfer() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [recipient, setRecipient] = useState("");
  const [iban, setIban] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts", user?.id],
    enabled: !!user,
  });

  const transferMutation = useMutation({
    mutationFn: async (transferData: TransferRequest) => {
      const response = await apiRequest("POST", "/api/transfer", transferData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer Successful",
        description: "Your transfer has been completed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "An error occurred while processing your transfer.",
        variant: "destructive",
      });
    },
  });

  const selectedAccount = accounts.find(acc => acc.id.toString() === selectedAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !recipient || !iban || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      fromAccountId: parseInt(selectedAccountId),
      toAccount: recipient,
      iban,
      amount,
      reference: reference || undefined,
    });
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
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="text-[var(--boi-gray)]" />
          </Button>
          <h1 className="text-lg font-semibold text-[var(--boi-gray)]">Transfer Money</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* From Account */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">From Account</h3>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account">
                  {selectedAccount && (
                    <div className="flex items-center">
                      <PiggyBank className="text-[var(--boi-green)] mr-3" />
                      <div>
                        <p className="font-medium text-[var(--boi-gray)]">{selectedAccount.displayName}</p>
                        <p className="text-sm text-[var(--boi-light-gray)]">
                          Available: €{parseFloat(selectedAccount.balance).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex items-center">
                      <PiggyBank className="text-[var(--boi-green)] mr-3" />
                      <div>
                        <p className="font-medium">{account.displayName}</p>
                        <p className="text-sm text-gray-500">€{parseFloat(account.balance).toFixed(2)}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* To */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">To</h3>
            <div>
              <Label htmlFor="recipient">Recipient Name</Label>
              <Input
                id="recipient"
                type="text"
                placeholder="Recipient name or account"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                type="text"
                placeholder="IE29 AIBK 9311 5212 3456 78"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Amount */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium text-[var(--boi-gray)] mb-4">Amount</h3>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--boi-gray)] font-medium">€</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg font-medium focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
                required
              />
            </div>
            <div>
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                type="text"
                placeholder="Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="focus:ring-2 focus:ring-[var(--boi-green)] focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-[var(--boi-green)] hover:bg-[var(--boi-dark-green)] text-white font-medium py-3 px-4 transition-colors duration-200 mb-4"
          disabled={transferMutation.isPending}
        >
          {transferMutation.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            <span className="flex items-center justify-center">
              <Send className="mr-2" />
              Send Transfer
            </span>
          )}
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Security Notice</p>
            <p className="text-sm">Transfers are processed securely with 256-bit encryption. Large transfers may require additional verification.</p>
          </AlertDescription>
        </Alert>
      </form>

      <BottomNavigation />
    </div>
  );
}

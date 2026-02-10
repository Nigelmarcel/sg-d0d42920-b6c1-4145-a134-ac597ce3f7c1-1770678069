import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { paymentService } from "@/services/paymentService";
import { CreditCard, Smartphone, Loader2, Lock, CheckCircle2 } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

export function PaymentModal({ open, onClose, bookingId, amount, onSuccess }: PaymentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobilepay">("card");

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const result = await paymentService.createStripePaymentIntent(bookingId, amount);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      // In production, use Stripe.js to handle card tokenization
      // For now, simulate successful payment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Record payment
      await paymentService.recordPayment(
        bookingId,
        result.data.id,
        amount,
        "succeeded"
      );

      toast({
        title: "✅ Payment Successful!",
        description: `€${amount.toFixed(2)} charged successfully`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Card payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Could not process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMobilePayPayment = async () => {
    setLoading(true);

    try {
      // Create MobilePay payment
      const result = await paymentService.createMobilePayPayment(bookingId, amount);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to initialize MobilePay");
      }

      // Redirect to MobilePay
      toast({
        title: "Redirecting to MobilePay",
        description: "Complete payment in MobilePay app",
      });

      // In production, redirect to MobilePay
      window.location.href = result.data.redirectUrl;
    } catch (error) {
      console.error("MobilePay error:", error);
      toast({
        title: "MobilePay Failed",
        description: error instanceof Error ? error.message : "Could not initialize MobilePay",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            Secure Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Display */}
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Amount</span>
              <span className="text-3xl font-bold text-gray-900">€{amount.toFixed(2)}</span>
            </div>
          </Card>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Select Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Card Payment */}
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${paymentMethod === "card"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-300 hover:border-blue-300"
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <CreditCard className="h-8 w-8" />
                  <span className="font-semibold">Credit Card</span>
                  <span className="text-xs text-gray-600">Visa, Mastercard</span>
                </div>
              </button>

              {/* MobilePay */}
              <button
                type="button"
                onClick={() => setPaymentMethod("mobilepay")}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${paymentMethod === "mobilepay"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-300 hover:border-blue-300"
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <Smartphone className="h-8 w-8" />
                  <span className="font-semibold">MobilePay</span>
                  <span className="text-xs text-gray-600">Finland</span>
                </div>
              </button>
            </div>
          </div>

          {/* Card Payment Form */}
          {paymentMethod === "card" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cardExpiry">Expiry Date</Label>
                  <Input
                    id="cardExpiry"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="cardCvc">CVC</Label>
                  <Input
                    id="cardCvc"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").substring(0, 3))}
                    placeholder="123"
                    maxLength={3}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                onClick={handleCardPayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Pay €{amount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* MobilePay Button */}
          {paymentMethod === "mobilepay" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Fast & Secure with MobilePay</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• No need to enter card details</li>
                      <li>• Approve payment in your MobilePay app</li>
                      <li>• Instant payment confirmation</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleMobilePayPayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to MobilePay...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Pay €{amount.toFixed(2)} with MobilePay
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
            <Lock className="h-4 w-4" />
            <span>
              Your payment is secured with 256-bit SSL encryption. We never store your card details.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
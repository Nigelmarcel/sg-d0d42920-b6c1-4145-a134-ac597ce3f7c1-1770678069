import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Smartphone, Lock, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { paymentService } from "@/services/paymentService";
import { savedPaymentMethodService } from "@/services/savedPaymentMethodService";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

interface SavedCard {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  cardholder_name: string;
  is_default: boolean;
  stripe_payment_method_id: string;
}

export function PaymentModal({ open, onClose, bookingId, amount, onSuccess }: PaymentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobilepay">("card");
  
  // Card payment states
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  
  // Saved cards states
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchUserAndCards();
    }
  }, [open]);

  const fetchUserAndCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Fetch saved payment methods
      const { data: cards, error } = await savedPaymentMethodService.getUserPaymentMethods(user.id);
      
      if (!error && cards) {
        setSavedCards(cards as SavedCard[]);
        
        // Auto-select default card
        const defaultCard = cards.find((card) => card.is_default);
        if (defaultCard) {
          setSelectedSavedCard(defaultCard.id);
        }
      }
    } catch (error) {
      console.error("Error fetching user and cards:", error);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    if (formatted.replace("/", "").length <= 4) {
      setExpiryDate(formatted);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 3) {
      setCvc(value);
    }
  };

  const handlePayWithSavedCard = async () => {
    if (!selectedSavedCard || !userId) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const savedCard = savedCards.find((card) => card.id === selectedSavedCard);
      if (!savedCard) throw new Error("Card not found");

      // Create payment intent with saved payment method
      const intentResult = await paymentService.createStripePaymentIntent(
        bookingId,
        amount,
        savedCard.stripe_payment_method_id
      );

      if (intentResult.error) {
        throw new Error(intentResult.error);
      }

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Confirm payment
      const confirmResult = await paymentService.confirmPayment(bookingId);

      if (confirmResult.error) {
        throw new Error(confirmResult.error);
      }

      toast({
        title: "✅ Payment Successful!",
        description: `Paid €${amount.toFixed(2)} with ${savedCard.card_brand} ••••${savedCard.card_last4}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "❌ Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithNewCard = async () => {
    if (!cardNumber || !cardholderName || !expiryDate || !cvc) {
      toast({
        title: "❌ Missing Information",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const cleanCardNumber = cardNumber.replace(/\s/g, "");
      const [expMonth, expYear] = expiryDate.split("/");

      // Create payment intent
      const intentResult = await paymentService.createStripePaymentIntent(bookingId, amount);

      if (intentResult.error) {
        throw new Error(intentResult.error);
      }

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // If user wants to save the card
      if (saveCard && userId) {
        // Get card brand from card number (simple detection)
        const cardBrand = cleanCardNumber.startsWith("4") ? "visa" : "mastercard";
        const last4 = cleanCardNumber.slice(-4);
        const fullExpYear = parseInt("20" + expYear);

        // Check for duplicates
        const { exists } = await savedPaymentMethodService.checkDuplicateCard(
          userId,
          last4,
          parseInt(expMonth),
          fullExpYear
        );

        if (!exists) {
          // Save payment method (in production, this would be Stripe's payment method token)
          const mockPaymentMethodId = `pm_${Math.random().toString(36).substring(7)}`;
          
          await savedPaymentMethodService.savePaymentMethod({
            user_id: userId,
            stripe_payment_method_id: mockPaymentMethodId,
            card_brand: cardBrand,
            card_last4: last4,
            card_exp_month: parseInt(expMonth),
            card_exp_year: fullExpYear,
            cardholder_name: cardholderName,
            is_default: savedCards.length === 0, // First card is default
          });

          toast({
            title: "💳 Card Saved",
            description: "Your card has been saved for future use",
          });
        }
      }

      // Confirm payment
      const confirmResult = await paymentService.confirmPayment(bookingId);

      if (confirmResult.error) {
        throw new Error(confirmResult.error);
      }

      toast({
        title: "✅ Payment Successful!",
        description: `Paid €${amount.toFixed(2)}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "❌ Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!userId) return;

    try {
      const { error } = await savedPaymentMethodService.deletePaymentMethod(cardId, userId);

      if (error) throw new Error(error);

      // Remove from local state
      setSavedCards(savedCards.filter((card) => card.id !== cardId));

      // If deleted card was selected, clear selection
      if (selectedSavedCard === cardId) {
        setSelectedSavedCard(null);
      }

      toast({
        title: "🗑️ Card Removed",
        description: "Payment method deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete card",
        variant: "destructive",
      });
    }
  };

  const handleSetDefaultCard = async (cardId: string) => {
    if (!userId) return;

    try {
      const { error } = await savedPaymentMethodService.setDefaultPaymentMethod(cardId, userId);

      if (error) throw new Error(error);

      // Update local state
      setSavedCards(
        savedCards.map((card) => ({
          ...card,
          is_default: card.id === cardId,
        }))
      );

      toast({
        title: "✅ Default Card Updated",
        description: "This card will be used for future payments",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update default card",
        variant: "destructive",
      });
    }
  };

  const handlePayWithMobilePay = async () => {
    setLoading(true);

    try {
      const result = await paymentService.createMobilePayPayment(bookingId, amount);

      if (result.error) {
        throw new Error(result.error);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const confirmResult = await paymentService.confirmPayment(bookingId);

      if (confirmResult.error) {
        throw new Error(confirmResult.error);
      }

      toast({
        title: "✅ Payment Successful!",
        description: `Paid €${amount.toFixed(2)} with MobilePay`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("MobilePay error:", error);
      toast({
        title: "❌ Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === "visa") return "💳";
    if (brandLower === "mastercard") return "💳";
    if (brandLower === "amex") return "💳";
    return "💳";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Secure Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Display */}
          <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center text-white">
            <p className="text-sm font-medium opacity-90">Total Amount</p>
            <p className="mt-2 text-4xl font-bold">€{amount.toFixed(2)}</p>
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "mobilepay")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card Payment
              </TabsTrigger>
              <TabsTrigger value="mobilepay" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                MobilePay
              </TabsTrigger>
            </TabsList>

            {/* Card Payment Tab */}
            <TabsContent value="card" className="space-y-4 mt-4">
              {/* Saved Cards Section */}
              {savedCards.length > 0 && !useNewCard && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Saved Payment Methods</Label>
                  <RadioGroup value={selectedSavedCard || ""} onValueChange={setSelectedSavedCard}>
                    {savedCards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <RadioGroupItem value={card.id} id={card.id} />
                          <Label htmlFor={card.id} className="flex items-center gap-3 cursor-pointer flex-1">
                            <span className="text-2xl">{getCardIcon(card.card_brand)}</span>
                            <div className="flex-1">
                              <p className="font-medium capitalize">
                                {card.card_brand} ••••{card.card_last4}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Expires {card.card_exp_month.toString().padStart(2, "0")}/{card.card_exp_year}
                              </p>
                            </div>
                            {card.is_default && (
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                Default
                              </span>
                            )}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          {!card.is_default && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultCard(card.id)}
                              title="Set as default"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>

                  <Button
                    variant="outline"
                    onClick={() => setUseNewCard(true)}
                    className="w-full"
                  >
                    + Use New Card
                  </Button>

                  <Button
                    onClick={handlePayWithSavedCard}
                    disabled={loading || !selectedSavedCard}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

              {/* New Card Form */}
              {(savedCards.length === 0 || useNewCard) && (
                <div className="space-y-4">
                  {useNewCard && (
                    <Button
                      variant="ghost"
                      onClick={() => setUseNewCard(false)}
                      className="mb-2"
                    >
                      ← Back to Saved Cards
                    </Button>
                  )}

                  <div>
                    <Label htmlFor="cardholder">Cardholder Name</Label>
                    <Input
                      id="cardholder"
                      placeholder="John Doe"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={handleExpiryChange}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={cvc}
                        onChange={handleCvcChange}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Save Card Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saveCard"
                      checked={saveCard}
                      onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                    />
                    <Label htmlFor="saveCard" className="text-sm font-normal cursor-pointer">
                      Save this card for future payments
                    </Label>
                  </div>

                  <Button
                    onClick={handlePayWithNewCard}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
            </TabsContent>

            {/* MobilePay Tab */}
            <TabsContent value="mobilepay" className="space-y-4 mt-4">
              <div className="rounded-lg border p-6 text-center space-y-4">
                <div className="text-6xl">📱</div>
                <h3 className="font-semibold text-lg">Pay with MobilePay</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>✅ Fast & Secure</p>
                  <p>✅ No card details needed</p>
                  <p>✅ Approve in MobilePay app</p>
                  <p>✅ Instant confirmation</p>
                </div>
              </div>

              <Button
                onClick={handlePayWithMobilePay}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Redirecting to MobilePay...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Pay €{amount.toFixed(2)} with MobilePay
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
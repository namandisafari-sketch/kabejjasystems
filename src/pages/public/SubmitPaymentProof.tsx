import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Receipt, CreditCard, CheckCircle, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format } from "date-fns";

export default function SubmitPaymentProof() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<'lookup' | 'submit' | 'success'>('lookup');
  const [cardNumber, setCardNumber] = useState(searchParams.get('card') || '');
  const [cardData, setCardData] = useState<any>(null);
  const [formData, setFormData] = useState({
    payer_name: '',
    amount: '',
    payment_provider: 'mtn',
    transaction_reference: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Look up card
  const lookupMutation = useMutation({
    mutationFn: async (cardNum: string) => {
      const { data, error } = await supabase
        .from('rental_id_cards')
        .select(`
          *,
          rental_units(unit_number, rental_properties(name, property_code)),
          rental_tenants(full_name),
          tenants:tenant_id(name, phone, business_code)
        `)
        .eq('card_number', cardNum.toUpperCase())
        .eq('status', 'active')
        .single();
      
      if (error || !data) {
        throw new Error('Card not found or inactive. Please check the card number.');
      }
      return data;
    },
    onSuccess: (data) => {
      setCardData(data);
      // Pre-fill payer name with current holder if available
      if ((data.rental_tenants as any)?.full_name) {
        setFormData(prev => ({ ...prev, payer_name: (data.rental_tenants as any).full_name }));
      }
      setStep('submit');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Submit payment proof
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Get active lease for this unit
      const { data: lease } = await supabase
        .from('leases')
        .select('id')
        .eq('unit_id', cardData.unit_id)
        .eq('status', 'active')
        .single();

      const { error } = await supabase.from('rental_payment_proofs').insert({
        tenant_id: cardData.tenant_id,
        card_id: cardData.id,
        lease_id: lease?.id || null,
        payer_name: formData.payer_name,
        amount: parseFloat(formData.amount),
        payment_provider: formData.payment_provider,
        transaction_reference: formData.transaction_reference || null,
        payment_date: formData.payment_date,
        notes: formData.notes || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim()) return;
    lookupMutation.mutate(cardNumber.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.payer_name || !formData.amount) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            <span className="font-bold">Submit Payment Proof</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-md">
        {step === 'lookup' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Enter Your Card Number</CardTitle>
              <CardDescription>
                Enter the card number printed on your property ID card
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <Label>Card Number</Label>
                  <Input
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123-0001"
                    className="font-mono text-lg tracking-wider text-center"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={lookupMutation.isPending}
                >
                  {lookupMutation.isPending ? 'Looking up...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'submit' && cardData && (
          <Card>
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit -ml-2"
                onClick={() => setStep('lookup')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <CardTitle>Submit Payment Proof</CardTitle>
              <CardDescription>
                Submit proof for <strong>{(cardData.rental_units as any)?.rental_properties?.name}</strong> - Unit <strong>{(cardData.rental_units as any)?.unit_number}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card:</span>
                    <span className="font-mono font-bold">{cardData.card_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property:</span>
                    <span>{(cardData.tenants as any)?.name}</span>
                  </div>
                </div>

                <div>
                  <Label>Your Name (Payer's Name) *</Label>
                  <Input
                    value={formData.payer_name}
                    onChange={e => setFormData({ ...formData, payer_name: e.target.value })}
                    placeholder="Name as it appears on payment"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This name will be shown to the property owner
                  </p>
                </div>

                <div>
                  <Label>Amount Paid (UGX) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g., 500000"
                    required
                  />
                </div>

                <div>
                  <Label>Payment Provider *</Label>
                  <Select 
                    value={formData.payment_provider} 
                    onValueChange={v => setFormData({ ...formData, payment_provider: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                      <SelectItem value="airtel">Airtel Money</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Use merchant codes to avoid extra fees
                  </p>
                </div>

                <div>
                  <Label>Transaction Reference / ID</Label>
                  <Input
                    value={formData.transaction_reference}
                    onChange={e => setFormData({ ...formData, transaction_reference: e.target.value })}
                    placeholder="e.g., TXN123456789"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    From your payment confirmation SMS
                  </p>
                </div>

                <div>
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                    rows={2}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Payment Proof'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <CardContent className="pt-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold">Payment Proof Submitted!</h2>
              <p className="text-muted-foreground">
                Your payment proof has been submitted for verification. The property owner will review and confirm your payment.
              </p>
              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => {
                    setStep('lookup');
                    setCardData(null);
                    setFormData({
                      payer_name: '',
                      amount: '',
                      payment_provider: 'mtn',
                      transaction_reference: '',
                      payment_date: format(new Date(), 'yyyy-MM-dd'),
                      notes: '',
                    });
                  }}
                >
                  Submit Another Payment
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/renter')}
                >
                  Go to Renter Portal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Having trouble? Contact your property manager.
        </p>
      </main>
    </div>
  );
}

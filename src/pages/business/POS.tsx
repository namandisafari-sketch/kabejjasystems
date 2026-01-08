import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Plus, Minus, ShoppingCart, Trash2, CreditCard, Banknote, 
  Loader2, User, X, UserPlus, SplitSquareHorizontal, Calendar, 
  History, Receipt, Users, BarChart3
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickCustomerDialog } from "@/components/pos/QuickCustomerDialog";
import { SplitPaymentDialog } from "@/components/pos/SplitPaymentDialog";
import { LayawayDialog } from "@/components/pos/LayawayDialog";
import { CustomerHistoryDialog } from "@/components/pos/CustomerHistoryDialog";
import { DigitalReceiptDialog } from "@/components/pos/DigitalReceiptDialog";
import { POSQueuePanel } from "@/components/pos/POSQueuePanel";
import { LiveSalesWidget } from "@/components/pos/LiveSalesWidget";
import { PrintReceipt, printReceipt } from "@/components/pos/PrintReceipt";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isService?: boolean;
  customPrice?: boolean;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  credit_limit: number;
  current_balance: number;
}

interface PaymentSplit {
  id: string;
  method: string;
  amount: number;
  reference?: string;
}

interface ReceiptSettingsData {
  logo_alignment: "left" | "center" | "right";
  show_logo: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_address: boolean;
  whatsapp_number: string | null;
  show_whatsapp_qr: boolean;
  seasonal_remark: string | null;
  show_seasonal_remark: boolean;
  footer_message: string;
  show_footer_message: boolean;
  show_cashier: boolean;
  show_customer: boolean;
  show_date_time: boolean;
  show_payment_method: boolean;
}

export default function POS() {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [showLayaway, setShowLayaway] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [showDigitalReceipt, setShowDigitalReceipt] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{
    items: CartItem[], 
    total: number, 
    method: string, 
    customerName?: string,
    receiptNumber?: string
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"pos" | "queue" | "dashboard">("pos");
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showCustomPriceDialog, setShowCustomPriceDialog] = useState(false);
  const [pendingServiceItem, setPendingServiceItem] = useState<any>(null);
  const [customPriceValue, setCustomPriceValue] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, credit_limit, current_balance')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!tenantId,
  });

  // Fetch tenant info for receipt
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('name, phone, email, address, logo_url')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch receipt settings
  const { data: receiptSettings } = useQuery({
    queryKey: ['receipt-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as ReceiptSettingsData | null;
    },
    enabled: !!tenantId,
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const availableCredit = selectedCustomer 
    ? (selectedCustomer.credit_limit - selectedCustomer.current_balance)
    : 0;
  const canUseCredit = selectedCustomer && availableCredit >= cartTotal;

  const processSale = async (paymentMethod: string, payments?: PaymentSplit[]): Promise<{ sale: any, receiptNumber: string }> => {
    if (!tenantId || cart.length === 0) throw new Error("Invalid checkout");
    
    const isCredit = paymentMethod === 'credit';
    
    if (isCredit && !selectedCustomer) {
      throw new Error("Please select a customer for credit sales");
    }

    if (isCredit && !canUseCredit) {
      throw new Error("Customer has insufficient credit limit");
    }

    // Get receipt number
    const { data: receiptNumberData, error: receiptError } = await supabase
      .rpc('get_next_receipt_number', { p_tenant_id: tenantId });
    
    if (receiptError) {
      console.error("Receipt number error:", receiptError);
    }
    
    const receiptNumber = receiptNumberData || `RCP-${Date.now()}`;

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        tenant_id: tenantId,
        customer_id: selectedCustomer?.id || null,
        total_amount: cartTotal,
        payment_method: payments ? 'split' : (isCredit ? 'credit' : paymentMethod),
        payment_status: isCredit ? 'unpaid' : 'paid',
        order_type: 'counter',
        order_status: 'completed',
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items
    const saleItems = cart.map(item => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // Record split payments if applicable
    if (payments && payments.length > 0) {
      const paymentRecords = payments.map(p => ({
        sale_id: sale.id,
        payment_method: p.method,
        amount: p.amount,
        reference_number: p.reference || null,
      }));

      await supabase.from('sale_payments').insert(paymentRecords);
    }

    // Update stock (only for products, not services)
    for (const item of cart) {
      // Skip stock update for services (they have no stock)
      if (item.isService) continue;
      
      // Get the base product ID (remove timestamp suffix if custom priced)
      const productId = item.customPrice ? item.id.split('-')[0] : item.id;
      const product = products?.find(p => p.id === productId);
      if (product && product.product_type !== 'service') {
        await supabase
          .from('products')
          .update({ 
            stock_quantity: (product.stock_quantity || 0) - item.quantity 
          })
          .eq('id', productId);
      }
    }

    // Update customer favorites
    if (selectedCustomer) {
      for (const item of cart) {
        // Check if favorite exists
        const { data: existing } = await supabase
          .from('customer_favorites')
          .select('id, times_purchased')
          .eq('customer_id', selectedCustomer.id)
          .eq('product_id', item.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('customer_favorites')
            .update({ times_purchased: existing.times_purchased + 1 })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('customer_favorites')
            .insert({
              tenant_id: tenantId,
              customer_id: selectedCustomer.id,
              product_id: item.id,
              times_purchased: 1,
            });
        }
      }
    }

    // If credit sale, update customer balance
    if (isCredit && selectedCustomer) {
      const newBalance = selectedCustomer.current_balance + cartTotal;
      await supabase
        .from('customers')
        .update({ current_balance: newBalance })
        .eq('id', selectedCustomer.id);
    }

    return { sale, receiptNumber };
  };

  const checkoutMutation = useMutation({
    mutationFn: () => processSale(paymentMethod),
    onSuccess: ({ receiptNumber }) => {
      const isCredit = paymentMethod === 'credit';
      toast({ 
        title: "Sale completed!", 
        description: isCredit 
          ? `Credit sale of ${cartTotal.toLocaleString()} UGX recorded for ${selectedCustomer?.name}`
          : "Transaction recorded successfully" 
      });
      
      const saleData = {
        items: [...cart],
        total: cartTotal,
        method: paymentMethod,
        customerName: selectedCustomer?.name,
        receiptNumber,
      };
      setLastSaleData(saleData);
      
      // Store customer phone before clearing
      const customerPhone = selectedCustomer?.phone;
      
      setCart([]);
      setShowCheckout(false);
      setPaymentMethod("");
      
      // Auto-print receipt after a short delay to allow state update
      setTimeout(() => {
        if (receiptRef.current) {
          printReceipt(receiptRef.current);
        }
      }, 100);
      
      // Show digital receipt option if customer has phone
      if (customerPhone) {
        setTimeout(() => setShowDigitalReceipt(true), 1000);
      }
      
      setSelectedCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const splitPaymentMutation = useMutation({
    mutationFn: (payments: PaymentSplit[]) => processSale('split', payments),
    onSuccess: ({ receiptNumber }) => {
      toast({ title: "Sale completed with split payment!" });
      const saleData = {
        items: [...cart],
        total: cartTotal,
        method: 'split',
        customerName: selectedCustomer?.name,
        receiptNumber,
      };
      setLastSaleData(saleData);
      
      const customerPhone = selectedCustomer?.phone;
      
      setCart([]);
      setShowSplitPayment(false);
      setShowCheckout(false);
      
      // Auto-print receipt
      setTimeout(() => {
        if (receiptRef.current) {
          printReceipt(receiptRef.current);
        }
      }, 100);
      
      if (customerPhone) {
        setTimeout(() => setShowDigitalReceipt(true), 1000);
      }
      
      setSelectedCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const layawayMutation = useMutation({
    mutationFn: async (data: {
      depositAmount: number;
      installmentCount: number;
      dueDate: Date | undefined;
      notes: string;
    }) => {
      if (!tenantId || !selectedCustomer || cart.length === 0) {
        throw new Error("Invalid layaway setup");
      }

      // Create layaway plan
      const { data: layaway, error: layawayError } = await supabase
        .from('layaway_plans')
        .insert({
          tenant_id: tenantId,
          customer_id: selectedCustomer.id,
          total_amount: cartTotal,
          deposit_amount: data.depositAmount,
          amount_paid: data.depositAmount,
          installment_count: data.installmentCount,
          due_date: data.dueDate?.toISOString().split('T')[0] || null,
          notes: data.notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (layawayError) throw layawayError;

      // Create layaway items
      const layawayItems = cart.map(item => ({
        layaway_id: layaway.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      await supabase.from('layaway_items').insert(layawayItems);

      // Record initial deposit payment
      if (data.depositAmount > 0) {
        await supabase.from('installment_payments').insert({
          layaway_id: layaway.id,
          amount: data.depositAmount,
          payment_method: 'cash',
          notes: 'Initial deposit',
        });
      }

      return layaway;
    },
    onSuccess: () => {
      toast({ 
        title: "Layaway created!", 
        description: `Plan created for ${selectedCustomer?.name}` 
      });
      setCart([]);
      setShowLayaway(false);
      setSelectedCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['layaway-plans'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addToCart = (product: typeof products extends (infer T)[] ? T : never, customPrice?: number) => {
    const isService = product.product_type === 'service';
    const priceToUse = customPrice ?? product.unit_price;
    
    setCart(prev => {
      // For services with custom price, always add as new item
      if (isService && customPrice) {
        return [...prev, { 
          id: `${product.id}-${Date.now()}`, // Unique ID for custom priced service
          name: product.name, 
          price: priceToUse, 
          quantity: 1,
          isService: true,
          customPrice: true
        }];
      }
      
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: priceToUse, 
        quantity: 1,
        isService
      }];
    });
  };

  const handleServiceClick = (product: any) => {
    if (product.product_type === 'service' && product.allow_custom_price) {
      setPendingServiceItem(product);
      setCustomPriceValue(product.unit_price?.toString() || "0");
      setShowCustomPriceDialog(true);
    } else {
      addToCart(product);
    }
  };

  const handleCustomPriceConfirm = () => {
    if (pendingServiceItem) {
      const price = parseFloat(customPriceValue) || 0;
      if (price > 0) {
        addToCart(pendingServiceItem, price);
      }
      setShowCustomPriceDialog(false);
      setPendingServiceItem(null);
      setCustomPriceValue("");
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleServeFromQueue = (items: any[], customerName: string) => {
    // If queue item has items, add them to cart
    if (items && items.length > 0) {
      // Items from queue would be product objects
      items.forEach((item: any) => {
        if (item.id) addToCart(item);
      });
    }
    toast({ title: `Now serving: ${customerName}` });
  };

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b px-4 py-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="pos" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                POS
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Queue
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Live Stats
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "pos" && (
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts?.map((product) => {
                  const isService = product.product_type === 'service';
                  return (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleServiceClick(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate flex-1">{product.name}</h3>
                          {isService && (
                            <Badge variant="secondary" className="text-xs">Service</Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-lg font-bold text-primary">
                            {product.unit_price.toLocaleString()} UGX
                            {product.allow_custom_price && <span className="text-xs font-normal text-muted-foreground ml-1">+</span>}
                          </span>
                          {!isService && (
                            <Badge variant={product.stock_quantity > 0 ? "secondary" : "destructive"}>
                              {product.stock_quantity} left
                            </Badge>
                          )}
                        </div>
                        {product.category && (
                          <Badge variant="outline" className="mt-2">{product.category}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTab === "queue" && tenantId && (
          <div className="flex-1 p-4">
            <POSQueuePanel tenantId={tenantId} onServeCustomer={handleServeFromQueue} />
          </div>
        )}

        {activeTab === "dashboard" && tenantId && (
          <div className="flex-1 p-4 overflow-auto">
            <LiveSalesWidget tenantId={tenantId} />
          </div>
        )}
      </div>

      {/* Cart Section */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length})
          </h2>
        </div>

        {/* Customer Selection */}
        <div className="p-4 border-b">
          <Label className="text-sm text-muted-foreground mb-2 block">Customer</Label>
          {selectedCustomer ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Credit: {availableCredit.toLocaleString()} UGX available
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowCustomerHistory(true)}
              >
                <History className="h-4 w-4 mr-2" />
                View History & Favorites
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Select Customer
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-80">
                  <Command>
                    <CommandInput placeholder="Search customers..." />
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup>
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            onSelect={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearchOpen(false);
                            }}
                          >
                            <div className="flex-1">
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.phone || 'No phone'} • Credit: {customer.credit_limit.toLocaleString()} UGX
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={() => setShowQuickCustomer(true)} title="Add new customer">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.price.toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-card space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total:</span>
            <span className="text-2xl font-bold text-primary">
              {cartTotal.toLocaleString()} UGX
            </span>
          </div>
          
          {/* Quick Actions */}
          {cart.length > 0 && selectedCustomer && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowLayaway(true)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Layaway
              </Button>
            </div>
          )}
          
          <Button
            className="w-full"
            size="lg"
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            Checkout
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-3xl font-bold mb-6">
              {cartTotal.toLocaleString()} UGX
            </p>
            
            {selectedCustomer && (
              <div className="bg-muted/50 p-3 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Available credit: {availableCredit.toLocaleString()} UGX
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mb-4 text-center">Select payment method</p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote className="h-6 w-6" />
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'}
                className="h-20 flex-col gap-2"
                onClick={() => setPaymentMethod('mobile_money')}
              >
                <CreditCard className="h-6 w-6" />
                Mobile Money
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="w-full h-16 flex-col gap-1 mt-4"
              onClick={() => {
                setShowCheckout(false);
                setShowSplitPayment(true);
              }}
            >
              <SplitSquareHorizontal className="h-5 w-5" />
              <span className="text-xs">Split Payment (Cash + Mobile Money)</span>
            </Button>
            
            {selectedCustomer && (
              <Button
                variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                className={`w-full h-16 flex-col gap-1 mt-4 ${!canUseCredit ? 'opacity-50' : ''}`}
                onClick={() => setPaymentMethod('credit')}
                disabled={!canUseCredit}
              >
                <User className="h-5 w-5" />
                Credit Sale
                {!canUseCredit && (
                  <span className="text-xs">Insufficient credit limit</span>
                )}
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancel</Button>
            <Button 
              onClick={() => checkoutMutation.mutate()} 
              disabled={!paymentMethod || checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Payment Dialog */}
      <SplitPaymentDialog
        open={showSplitPayment}
        onOpenChange={setShowSplitPayment}
        totalAmount={cartTotal}
        onConfirm={(payments) => splitPaymentMutation.mutate(payments)}
        isProcessing={splitPaymentMutation.isPending}
      />

      {/* Layaway Dialog */}
      {selectedCustomer && (
        <LayawayDialog
          open={showLayaway}
          onOpenChange={setShowLayaway}
          customer={selectedCustomer}
          cartItems={cart}
          totalAmount={cartTotal}
          onConfirm={(data) => layawayMutation.mutate(data)}
          isProcessing={layawayMutation.isPending}
        />
      )}

      {/* Customer History Dialog */}
      {selectedCustomer && tenantId && (
        <CustomerHistoryDialog
          open={showCustomerHistory}
          onOpenChange={setShowCustomerHistory}
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          tenantId={tenantId}
          onAddFavoriteToCart={(productId) => {
            const product = products?.find(p => p.id === productId);
            if (product) {
              addToCart(product);
              toast({ title: `Added ${product.name} to cart` });
            }
          }}
        />
      )}

      {/* Hidden Print Receipt Component */}
      {lastSaleData && (
        <div className="hidden">
          <PrintReceipt
            ref={receiptRef}
            businessName={tenantInfo?.name || "Kabejja Systems"}
            businessPhone={tenantInfo?.phone || undefined}
            businessEmail={tenantInfo?.email || undefined}
            businessAddress={tenantInfo?.address || undefined}
            customerName={lastSaleData.customerName}
            items={lastSaleData.items}
            total={lastSaleData.total}
            paymentMethod={lastSaleData.method}
            receiptNumber={lastSaleData.receiptNumber}
            settings={receiptSettings || undefined}
          />
        </div>
      )}

      {/* Digital Receipt Dialog */}
      {lastSaleData && (
        <DigitalReceiptDialog
          open={showDigitalReceipt}
          onOpenChange={setShowDigitalReceipt}
          customerPhone={selectedCustomer?.phone || undefined}
          customerName={lastSaleData.customerName}
          items={lastSaleData.items}
          total={lastSaleData.total}
          paymentMethod={lastSaleData.method}
          businessName={tenantInfo?.name}
          businessPhone={tenantInfo?.phone || undefined}
          businessEmail={tenantInfo?.email || undefined}
          businessAddress={tenantInfo?.address || undefined}
          businessLogo={tenantInfo?.logo_url || undefined}
          receiptNumber={lastSaleData.receiptNumber}
          settings={receiptSettings ? {
            ...receiptSettings,
            logo_alignment: (receiptSettings.logo_alignment as "left" | "center" | "right") || "center"
          } : undefined}
        />
      )}

      {/* Quick Customer Dialog */}
      {tenantId && (
        <QuickCustomerDialog
          open={showQuickCustomer}
          onOpenChange={setShowQuickCustomer}
          tenantId={tenantId}
          onCustomerCreated={(customer) => setSelectedCustomer(customer)}
        />
      )}

      {/* Custom Price Dialog for Services */}
      <Dialog open={showCustomPriceDialog} onOpenChange={setShowCustomPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Service Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service: {pendingServiceItem?.name}</Label>
              <p className="text-sm text-muted-foreground">
                Default price: {pendingServiceItem?.unit_price?.toLocaleString()} UGX
              </p>
            </div>
            <div>
              <Label htmlFor="custom-price">Custom Price (UGX)</Label>
              <Input
                id="custom-price"
                type="number"
                value={customPriceValue}
                onChange={(e) => setCustomPriceValue(e.target.value)}
                placeholder="Enter price"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomPriceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomPriceConfirm}>
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

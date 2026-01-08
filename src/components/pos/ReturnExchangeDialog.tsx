import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { 
  RefreshCcw, 
  XCircle, 
  ArrowLeftRight, 
  Loader2,
  Package,
  Search
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReturnExchangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  tenantId: string;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReturnItem {
  saleItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  restock: boolean;
  selected: boolean;
}

interface ExchangeProduct {
  id: string;
  name: string;
  unit_price: number;
  stock_quantity: number;
}

export function ReturnExchangeDialog({
  open,
  onOpenChange,
  saleId,
  tenantId,
}: ReturnExchangeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [returnType, setReturnType] = useState<"refund" | "void" | "exchange">("refund");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [selectedExchangeProducts, setSelectedExchangeProducts] = useState<{
    productId: string;
    quantity: number;
  }[]>([]);

  // Fetch sale details
  const { data: sale, isLoading: saleLoading } = useQuery({
    queryKey: ['sale-details', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, customers(name, id)')
        .eq('id', saleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!saleId && open,
  });

  // Fetch sale items
  const { data: saleItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['sale-items', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, products(name)')
        .eq('sale_id', saleId);
      if (error) throw error;
      return data.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || 'Unknown Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })) as SaleItem[];
    },
    enabled: !!saleId && open,
  });

  // Fetch products for exchange
  const { data: products } = useQuery({
    queryKey: ['exchange-products', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit_price, stock_quantity')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('name');
      if (error) throw error;
      return data as ExchangeProduct[];
    },
    enabled: !!tenantId && returnType === 'exchange' && open,
  });

  // Initialize return items when sale items load
  useEffect(() => {
    if (saleItems) {
      setReturnItems(saleItems.map(item => ({
        saleItemId: item.id,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        maxQuantity: item.quantity,
        unitPrice: item.unit_price,
        restock: true,
        selected: returnType === 'void', // Auto-select all for void
      })));
    }
  }, [saleItems, returnType]);

  // Calculate totals
  const returnTotal = returnItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const exchangeTotal = selectedExchangeProducts.reduce((sum, ep) => {
    const product = products?.find(p => p.id === ep.productId);
    return sum + (product ? product.unit_price * ep.quantity : 0);
  }, 0);

  const balanceDue = exchangeTotal - returnTotal;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedItems = returnItems.filter(item => item.selected);
      if (selectedItems.length === 0) throw new Error("No items selected for return");
      if (!reason.trim()) throw new Error("Please provide a reason for the return");

      // Create the return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('sale_returns')
        .insert({
          tenant_id: tenantId,
          sale_id: saleId,
          return_type: returnType,
          reason: reason.trim(),
          total_refund_amount: returnTotal,
          processed_by: user.id,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemRecords = selectedItems.map(item => ({
        return_id: returnRecord.id,
        sale_item_id: item.saleItemId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        refund_amount: item.quantity * item.unitPrice,
        restock: item.restock,
      }));

      const { error: itemsError } = await supabase
        .from('sale_return_items')
        .insert(returnItemRecords);

      if (itemsError) throw itemsError;

      // Restock items if applicable
      for (const item of selectedItems) {
        if (item.restock) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: (product.stock_quantity || 0) + item.quantity })
              .eq('id', item.productId);
          }
        }
      }

      // Update original sale status
      const allItemsReturned = returnItems.every(item => item.selected && item.quantity === item.maxQuantity);
      let newStatus: string;
      
      if (returnType === 'void') {
        newStatus = 'voided';
      } else if (returnType === 'exchange') {
        newStatus = 'exchanged';
      } else {
        newStatus = allItemsReturned ? 'full_return' : 'partial_return';
      }

      await supabase
        .from('sales')
        .update({ return_status: newStatus })
        .eq('id', saleId);

      // If exchange, create new sale for exchange products
      if (returnType === 'exchange' && selectedExchangeProducts.length > 0) {
        const { data: exchangeSale, error: exchangeSaleError } = await supabase
          .from('sales')
          .insert({
            tenant_id: tenantId,
            customer_id: sale?.customer_id || null,
            total_amount: balanceDue > 0 ? balanceDue : 0,
            payment_method: balanceDue > 0 ? 'cash' : 'exchange_credit',
            payment_status: 'paid',
            order_type: 'exchange',
            order_status: 'completed',
            notes: `Exchange from sale #${sale?.order_number}`,
            created_by: user.id,
          })
          .select()
          .single();

        if (exchangeSaleError) throw exchangeSaleError;

        // Create sale items for exchange
        const exchangeItems = selectedExchangeProducts.map(ep => {
          const product = products?.find(p => p.id === ep.productId);
          return {
            sale_id: exchangeSale.id,
            product_id: ep.productId,
            quantity: ep.quantity,
            unit_price: product?.unit_price || 0,
            total_price: (product?.unit_price || 0) * ep.quantity,
          };
        });

        await supabase.from('sale_items').insert(exchangeItems);

        // Deduct stock for exchange products
        for (const ep of selectedExchangeProducts) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', ep.productId)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: (product.stock_quantity || 0) - ep.quantity })
              .eq('id', ep.productId);
          }
        }

        // Link exchange sale to return
        await supabase
          .from('sale_returns')
          .update({ exchange_sale_id: exchangeSale.id })
          .eq('id', returnRecord.id);
      }

      return returnRecord;
    },
    onSuccess: () => {
      const messages = {
        refund: "Refund processed successfully",
        void: "Sale voided successfully",
        exchange: "Exchange completed successfully",
      };
      toast({ title: messages[returnType] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(exchangeSearch.toLowerCase())
  );

  const toggleReturnItem = (saleItemId: string) => {
    setReturnItems(prev => prev.map(item =>
      item.saleItemId === saleItemId ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateReturnQuantity = (saleItemId: string, quantity: number) => {
    setReturnItems(prev => prev.map(item =>
      item.saleItemId === saleItemId 
        ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) } 
        : item
    ));
  };

  const toggleRestock = (saleItemId: string) => {
    setReturnItems(prev => prev.map(item =>
      item.saleItemId === saleItemId ? { ...item, restock: !item.restock } : item
    ));
  };

  const addExchangeProduct = (productId: string) => {
    const existing = selectedExchangeProducts.find(ep => ep.productId === productId);
    if (existing) {
      setSelectedExchangeProducts(prev => prev.map(ep =>
        ep.productId === productId ? { ...ep, quantity: ep.quantity + 1 } : ep
      ));
    } else {
      setSelectedExchangeProducts(prev => [...prev, { productId, quantity: 1 }]);
    }
  };

  const removeExchangeProduct = (productId: string) => {
    setSelectedExchangeProducts(prev => prev.filter(ep => ep.productId !== productId));
  };

  const isLoading = saleLoading || itemsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {returnType === 'refund' && <RefreshCcw className="h-5 w-5" />}
            {returnType === 'void' && <XCircle className="h-5 w-5" />}
            {returnType === 'exchange' && <ArrowLeftRight className="h-5 w-5" />}
            Process Return / Exchange
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Sale Info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Sale #{sale?.order_number}</p>
                      <p className="font-medium">{sale?.customers?.name || 'Walk-in Customer'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Original Total</p>
                      <p className="font-bold text-lg">{formatCurrency(sale?.total_amount || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Return Type Selection */}
              <div>
                <Label className="mb-2 block">Return Type</Label>
                <RadioGroup
                  value={returnType}
                  onValueChange={(value) => setReturnType(value as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="refund" id="refund" />
                    <Label htmlFor="refund" className="flex items-center gap-1 cursor-pointer">
                      <RefreshCcw className="h-4 w-4" /> Refund
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="void" id="void" />
                    <Label htmlFor="void" className="flex items-center gap-1 cursor-pointer">
                      <XCircle className="h-4 w-4" /> Void Sale
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exchange" id="exchange" />
                    <Label htmlFor="exchange" className="flex items-center gap-1 cursor-pointer">
                      <ArrowLeftRight className="h-4 w-4" /> Exchange
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Defective product">Defective product</SelectItem>
                    <SelectItem value="Wrong item purchased">Wrong item purchased</SelectItem>
                    <SelectItem value="Customer changed mind">Customer changed mind</SelectItem>
                    <SelectItem value="Size/color mismatch">Size/color mismatch</SelectItem>
                    <SelectItem value="Duplicate purchase">Duplicate purchase</SelectItem>
                    <SelectItem value="Price discrepancy">Price discrepancy</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items to Return */}
              <div>
                <Label className="mb-2 block">Items to {returnType === 'void' ? 'Void' : 'Return'}</Label>
                <div className="space-y-2">
                  {returnItems.map((item) => (
                    <Card key={item.saleItemId} className={item.selected ? "border-primary" : ""}>
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleReturnItem(item.saleItemId)}
                            disabled={returnType === 'void'}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.unitPrice)} × {item.quantity}
                            </p>
                          </div>
                          {item.selected && returnType !== 'void' && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Qty:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={item.maxQuantity}
                                value={item.quantity}
                                onChange={(e) => updateReturnQuantity(item.saleItemId, parseInt(e.target.value) || 1)}
                                className="w-16 h-8"
                              />
                            </div>
                          )}
                          {item.selected && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`restock-${item.saleItemId}`}
                                checked={item.restock}
                                onCheckedChange={() => toggleRestock(item.saleItemId)}
                              />
                              <Label htmlFor={`restock-${item.saleItemId}`} className="text-xs">
                                Restock
                              </Label>
                            </div>
                          )}
                          <p className="font-medium w-24 text-right">
                            {item.selected ? formatCurrency(item.quantity * item.unitPrice) : '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Exchange Products */}
              {returnType === 'exchange' && (
                <div>
                  <Label className="mb-2 block">Exchange For</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={exchangeSearch}
                      onChange={(e) => setExchangeSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Selected exchange products */}
                  {selectedExchangeProducts.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {selectedExchangeProducts.map((ep) => {
                        const product = products?.find(p => p.id === ep.productId);
                        return (
                          <Card key={ep.productId} className="border-primary">
                            <CardContent className="py-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>{product?.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(product?.unit_price || 0)}</span>
                                <span>× {ep.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeExchangeProduct(ep.productId)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Available products */}
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="space-y-1">
                      {filteredProducts?.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => addExchangeProduct(product.id)}
                        >
                          <span>{product.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{product.stock_quantity} in stock</Badge>
                            <span className="font-medium">{formatCurrency(product.unit_price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  rows={2}
                />
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Return Amount:</span>
                      <span className="font-medium">{formatCurrency(returnTotal)}</span>
                    </div>
                    {returnType === 'exchange' && (
                      <>
                        <div className="flex justify-between">
                          <span>Exchange Products:</span>
                          <span className="font-medium">{formatCurrency(exchangeTotal)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-bold">
                            {balanceDue >= 0 ? 'Customer Pays:' : 'Refund to Customer:'}
                          </span>
                          <span className={`font-bold ${balanceDue >= 0 ? 'text-primary' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(balanceDue))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => processReturnMutation.mutate()}
            disabled={processReturnMutation.isPending || returnItems.filter(i => i.selected).length === 0 || !reason}
          >
            {processReturnMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {returnType === 'refund' && 'Process Refund'}
                {returnType === 'void' && 'Void Sale'}
                {returnType === 'exchange' && 'Complete Exchange'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/hooks/use-database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, History, UtensilsCrossed, Bug, Store, Search, Plus, Minus, Trash2, CreditCard, Banknote, Loader2, User, X, Eye, Printer, RotateCcw, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { SaleReceiptDialog } from "@/components/pos/SaleReceiptDialog";
import { ReturnExchangeDialog } from "@/components/pos/ReturnExchangeDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableSelector } from "@/components/restaurant/TableSelector";
import { OrderTypeSelector, OrderType } from "@/components/restaurant/OrderTypeSelector";
import { MenuGrid } from "@/components/restaurant/MenuGrid";
import { OrderCart, OrderItem } from "@/components/restaurant/OrderCart";
import { PaymentDialog } from "@/components/restaurant/PaymentDialog";
import { KitchenTicket } from "@/components/restaurant/KitchenTicket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { getBusinessTypeConfig } from "@/config/businessTypes";

interface MenuItem {
  id: string;
  name: string;
  unit_price: number;
  category: string | null;
  category_id: string | null;
  stock_quantity: number | null;
  is_active: boolean;
  description: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  credit_limit: number;
  current_balance: number;
}

const Sales = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  
  // Determine if business is restaurant category
  const businessConfig = tenant?.businessType ? getBusinessTypeConfig(tenant.businessType) : null;
  const isRestaurant = businessConfig?.category === 'restaurant';

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isRestaurant) {
    return <RestaurantSales tenant={tenant} />;
  }

  return <RetailSales tenant={tenant} />;
};

// Retail Sales History Component (POS is on separate page)
const RetailSales = ({ tenant }: { tenant: any }) => {
  const tenantId = tenant?.tenantId;
  const { filterBranchId } = useBranchFilter();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', tenantId, filterBranchId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('sales')
        .select(`*, customers(name)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Apply branch filter if staff is restricted to a branch
      if (filterBranchId) {
        query = query.eq('branch_id', filterBranchId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate stats
  const todaysSales = orders?.filter(o => {
    const orderDate = new Date(o.created_at || '').toDateString();
    return orderDate === new Date().toDateString();
  }) || [];
  
  const todaysTotal = todaysSales.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const paidSales = todaysSales.filter(o => o.payment_status === 'paid');
  const creditSales = todaysSales.filter(o => o.payment_status === 'unpaid');

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Sales History
          </h1>
          <p className="text-muted-foreground">View and manage your sales records</p>
        </div>
        {tenant?.isDevMode && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
            <Bug className="h-3 w-3 mr-1" />
            Dev Mode
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-2xl font-bold">{todaysSales.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(todaysTotal)}</p>
              </div>
              <Banknote className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash/Mobile</p>
                <p className="text-2xl font-bold text-green-600">{paidSales.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credit Sales</p>
                <p className="text-2xl font-bold text-orange-600">{creditSales.length}</p>
              </div>
              <User className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>{orders?.length || 0} sales records</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No sales yet</p>
              <p className="text-sm text-muted-foreground mt-1">Go to POS to make your first sale</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold">#{order.order_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at || '').toLocaleDateString()} {new Date(order.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{order.customers?.name || 'Walk-in'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell className="capitalize">{order.payment_method || 'Cash'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={order.payment_status === 'paid' ? 'secondary' : 'destructive'}>
                            {order.payment_status || 'paid'}
                          </Badge>
                          {order.return_status && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              {order.return_status === 'voided' ? 'Voided' : 
                               order.return_status === 'exchanged' ? 'Exchanged' :
                               order.return_status === 'full_return' ? 'Returned' : 'Partial Return'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSaleId(order.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Receipt
                            </DropdownMenuItem>
                            {!order.return_status && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setReturnSaleId(order.id)}
                                  className="text-orange-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Return / Exchange
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      {selectedSaleId && tenantId && (
        <SaleReceiptDialog
          open={!!selectedSaleId}
          onOpenChange={(open) => !open && setSelectedSaleId(null)}
          saleId={selectedSaleId}
          tenantId={tenantId}
        />
      )}

      {/* Return/Exchange Dialog */}
      {returnSaleId && tenantId && (
        <ReturnExchangeDialog
          open={!!returnSaleId}
          onOpenChange={(open) => !open && setReturnSaleId(null)}
          saleId={returnSaleId}
          tenantId={tenantId}
        />
      )}
    </div>
  );
};
// Restaurant POS Component
const RestaurantSales = ({ tenant }: { tenant: any }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('counter');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("");
  const [completedOrderItems, setCompletedOrderItems] = useState<OrderItem[]>([]);

  const { data: userId } = useQuery({
    queryKey: ['user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    },
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ['menu-items', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['menu-categories', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['restaurant-tables', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('table_number');
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('sales')
        .select(`*, customers(name), restaurant_tables(table_number)`)
        .eq('tenant_id', tenant.tenantId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  const createOrderMutation = useMutation({
    mutationFn: async ({ paymentMethod, notes }: { paymentMethod: string; notes: string }) => {
      if (!tenant?.tenantId || !userId) throw new Error("Not authenticated");

      const total = orderItems.reduce(
        (sum, item) => sum + item.item.unit_price * item.quantity,
        0
      );

      const { data: order, error: orderError } = await supabase
        .from('sales')
        .insert({
          tenant_id: tenant.tenantId,
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          order_type: orderType,
          order_status: 'pending',
          table_id: orderType === 'dine_in' ? selectedTableId : null,
          notes: notes || null,
          created_by: userId,
          sale_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const saleItems = orderItems.map((item) => ({
        sale_id: order.id,
        product_id: item.item.id,
        quantity: item.quantity,
        unit_price: item.item.unit_price,
        total_price: item.item.unit_price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of orderItems) {
        await supabase
          .from('products')
          .update({
            stock_quantity: (item.item.stock_quantity ?? 0) - item.quantity,
          })
          .eq('id', item.item.id);
      }

      if (orderType === 'dine_in' && selectedTableId) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('id', selectedTableId);
      }

      return order;
    },
    onSuccess: (order, variables) => {
      setCompletedOrderItems([...orderItems]);
      setLastOrderNumber(order.order_number || 0);
      setLastPaymentMethod(variables.paymentMethod);
      setPaymentOpen(false);
      setTicketOpen(true);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] });
      toast({
        title: "Order placed!",
        description: `Order #${order.order_number} sent to kitchen.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Order failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToOrder = (item: MenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find((o) => o.item.id === item.id);
      if (existing) {
        if (existing.quantity >= (item.stock_quantity ?? 999)) {
          toast({ title: "Stock limit reached", variant: "destructive" });
          return prev;
        }
        return prev.map((o) =>
          o.item.id === item.id ? { ...o, quantity: o.quantity + 1 } : o
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(itemId);
      return;
    }
    setOrderItems((prev) =>
      prev.map((o) => (o.item.id === itemId ? { ...o, quantity } : o))
    );
  };

  const removeFromOrder = (itemId: string) => {
    setOrderItems((prev) => prev.filter((o) => o.item.id !== itemId));
  };

  const handleCheckout = () => {
    if (orderItems.length === 0) return;
    if (orderType === 'dine_in' && !selectedTableId) {
      toast({
        title: "Select a table",
        description: "Please select a table for dine-in orders",
        variant: "destructive",
      });
      return;
    }
    setPaymentOpen(true);
  };

  const handleConfirmOrder = (paymentMethod: string, notes: string) => {
    createOrderMutation.mutate({ paymentMethod, notes });
  };

  const handleNewOrder = () => {
    setOrderItems([]);
    setSelectedTableId(null);
    setOrderType('counter');
    setTicketOpen(false);
  };

  const selectedTable = tables?.find((t) => t.id === selectedTableId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-green-500',
      served: 'bg-gray-500',
      completed: 'bg-gray-400',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-8 w-8" />
            Restaurant POS
          </h1>
          <p className="text-muted-foreground">Take orders and manage service</p>
        </div>
        {tenant?.isDevMode && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
            <Bug className="h-3 w-3 mr-1" />
            Dev Mode
          </Badge>
        )}
      </div>

      <Tabs defaultValue="pos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pos" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            New Order
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Order Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderTypeSelector
                    selectedType={orderType}
                    onSelectType={(type) => {
                      setOrderType(type);
                      if (type !== 'dine_in') setSelectedTableId(null);
                    }}
                  />
                </CardContent>
              </Card>

              {orderType === 'dine_in' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Select Table</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TableSelector
                      tables={tables || []}
                      selectedTableId={selectedTableId}
                      onSelectTable={setSelectedTableId}
                      isLoading={tablesLoading}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Menu</CardTitle>
                  <CardDescription>Tap items to add to order</CardDescription>
                </CardHeader>
                <CardContent>
                  <MenuGrid
                    items={menuItems || []}
                    categories={categories || []}
                    onAddItem={addToOrder}
                    isLoading={menuLoading || categoriesLoading}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <OrderCart
                items={orderItems}
                orderType={orderType}
                tableNumber={selectedTable?.table_number}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromOrder}
                onCheckout={handleCheckout}
                isProcessing={createOrderMutation.isPending}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>{orders?.length || 0} orders today</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <p>Loading orders...</p>
              ) : !orders || orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-bold">#{order.order_number}</TableCell>
                          <TableCell className="capitalize">{order.order_type?.replace('_', ' ') || 'Counter'}</TableCell>
                          <TableCell>{order.restaurant_tables?.table_number || '-'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell className="capitalize">{order.payment_method || 'Cash'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.order_status || 'pending')}>
                              {order.order_status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(order.created_at || '').toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        orderItems={orderItems}
        orderType={orderType}
        tableNumber={selectedTable?.table_number}
        onConfirm={handleConfirmOrder}
        isProcessing={createOrderMutation.isPending}
      />

      <KitchenTicket
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        orderNumber={lastOrderNumber}
        orderItems={completedOrderItems}
        orderType={orderType}
        tableNumber={selectedTable?.table_number}
        paymentMethod={lastPaymentMethod}
        onNewOrder={handleNewOrder}
      />
    </div>
  );
};

export default Sales;

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, X, User,
  ScanBarcode, Wallet, Edit3, CalendarIcon, Keyboard, History, PauseCircle, PlayCircle,
  Loader2, Banknote, Users, BarChart3, Menu, SplitSquareHorizontal, Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePersistentState, normalizePhone } from "@/lib/pos-utils";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { QuickCustomerDialog } from "@/components/pos/QuickCustomerDialog";
import { SplitPaymentDialog } from "@/components/pos/SplitPaymentDialog";
import { LayawayDialog } from "@/components/pos/LayawayDialog";
import { CustomerHistoryDialog } from "@/components/pos/CustomerHistoryDialog";
import { DigitalReceiptDialog } from "@/components/pos/DigitalReceiptDialog";
import { POSQueuePanel } from "@/components/pos/POSQueuePanel";
import { LiveSalesWidget } from "@/components/pos/LiveSalesWidget";
import { PrintReceipt } from "@/components/pos/PrintReceipt";
import { ScanTriggerButton } from "@/components/pos/BarcodeScanner";

interface Product {
  id: string; name: string; unit_price: number; cost_price: number | null;
  stock_quantity: number | null; unit_of_measure: string | null;
  barcode: string | null; sku: string | null; expiry_date: string | null;
  allow_custom_price: boolean | null; category: string | null;
  category_id: string | null; product_type: string | null; is_active: boolean | null;
}

interface CartItem {
  product: Product; quantity: number; customPrice: number | null;
}

interface Customer {
  id: string; name: string; phone: string | null;
  credit_limit: number; current_balance: number;
}

interface PaymentSplit {
  id: string; method: string; amount: number; reference?: string;
}

interface HeldReceipt {
  id: string; label: string; cart: CartItem[];
  customer: { name: string; phone: string; };
  timestamp: number;
}

interface ReceiptSettingsData {
  logo_alignment: "left" | "center" | "right";
  show_logo: boolean; show_phone: boolean; show_email: boolean;
  show_address: boolean; whatsapp_number: string | null;
  show_whatsapp_qr: boolean; seasonal_remark: string | null;
  show_seasonal_remark: boolean; footer_message: string;
  show_footer_message: boolean; show_cashier: boolean;
  show_customer: boolean; show_date_time: boolean;
  show_payment_method: boolean;
}

const DISTRICTS = [
  "Kampala", "Wakiso", "Mukono", "Jinja", "Mbarara", "Gulu", "Lira",
  "Mbale", "Fort Portal", "Masaka", "Entebbe", "Arua", "Soroti", "Kabale",
  "Tororo", "Busia", "Iganga", "Luweero", "Kayunga", "Mpigi", "Butambala",
  "Gomba", "Mityana", "Mubende", "Kiboga", "Kyankwanzi", "Nakaseke", "Nakasongola",
];

export default function POS() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (data) setTenantId(data.tenant_id);
    };
    init();
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [cart, setCart] = usePersistentState<CartItem[]>("pos.cart", []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundingAdjustment, setRoundingAdjustment] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState("");

  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const amountGivenRef = useRef<HTMLInputElement>(null);
  const lastReceiptRef = useRef<(() => void) | null>(null);
  const checkoutInFlightRef = useRef(false);
  const qtyBufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [mobileView, setMobileView] = useState<"products" | "cart">("products");
  const [qtyBuffer, setQtyBuffer] = useState("");
  const lastAddedIdRef = useRef<string | null>(null);

  const [amountGiven, setAmountGiven] = useState("");
  const [pastReceiptsOpen, setPastReceiptsOpen] = useState(false);
  const [pastReceiptsSearch, setPastReceiptsSearch] = useState("");
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [pastReceiptsLoading, setPastReceiptsLoading] = useState(false);
  const pastReceiptsSearchRef = useRef<HTMLInputElement>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [applyCreditAmount, setApplyCreditAmount] = usePersistentState<string>("pos.applyCredit", "");
  const customerSearchRef = useRef<HTMLInputElement>(null);

  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saleTime, setSaleTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const [customerInfo, setCustomerInfo] = usePersistentState("pos.customerInfo", {
    name: "", phone: "",
  });

  const [heldReceipts, setHeldReceipts] = usePersistentState<HeldReceipt[]>("pos.heldReceipts", []);

  const [activeTab, setActiveTab] = useState<"pos" | "queue" | "dashboard">("pos");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [showLayaway, setShowLayaway] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [showDigitalReceipt, setShowDigitalReceipt] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{
    items: CartItem[]; total: number; method: string;
    customerName?: string; receiptNumber?: string;
  } | null>(null);
  const [showCustomPriceDialog, setShowCustomPriceDialog] = useState(false);
  const [pendingServiceItem, setPendingServiceItem] = useState<any>(null);
  const [customPriceValue, setCustomPriceValue] = useState("");

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoadingProducts(true);
      if (!tenantId) { setLoadingProducts(false); return; }
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      setProducts((prods as Product[]) || []);
      setLoadingProducts(false);
    };
    fetchData();
  }, [tenantId]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("customers")
      .select("id, name, phone, credit_limit, current_balance")
      .eq("tenant_id", tenantId)
      .order("name")
      .then(({ data }) => setCustomers((data as Customer[]) || []));
  }, [tenantId]);

  const [tenantInfo, setTenantInfo] = useState<any>(null);
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("tenants")
      .select("name, phone, email, address, logo_url")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => setTenantInfo(data));
  }, [tenantId]);

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsData | null>(null);
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("receipt_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }) => setReceiptSettings(data as ReceiptSettingsData | null));
  }, [tenantId]);

  // Derived values
  const getEffectivePrice = (product: Product, customPrice: number | null) => {
    return customPrice !== null ? customPrice : product.unit_price;
  };

  const filtered = useMemo(() => products.filter((p) => {
    const q = search.toLowerCase();
    return (p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.barcode || "").toLowerCase().includes(q)) &&
      (!selectedCategory || p.category_id === selectedCategory);
  }), [products, search, selectedCategory]);

  const rawTotal = cart.reduce((s, i) => s + getEffectivePrice(i.product, i.customPrice) * i.quantity, 0);
  const total = rawTotal + roundingAdjustment;
  const creditToApply = Math.min(
    Math.max(0, parseFloat(applyCreditAmount) || 0),
    selectedCustomer?.current_balance ?? 0,
    total
  );
  const amountDue = Math.max(0, total - creditToApply);
  const isBackdated = saleDate !== new Date().toISOString().split("T")[0];

  useEffect(() => {
    setSelectedProductIndex(-1);
  }, [filtered.length, search, selectedCategory]);

  // Customer lookup
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerSuggestions([]); return; }
    const q = customerSearch.toLowerCase();
    const filtered = customers.filter(
      c => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q)
    ).slice(0, 5);
    setCustomerSuggestions(filtered);
    setShowSuggestions(true);
  }, [customerSearch, customers]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerInfo({ name: c.name, phone: c.phone || "" });
    setCustomerSearch("");
    setShowSuggestions(false);
    setApplyCreditAmount("");
  };

  // Cart operations
  const addToCart = useCallback((product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const maxQty = product.stock_quantity ?? 0;
        if (existing.quantity + qty > maxQty) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      if (qty > (product.stock_quantity ?? 0)) {
        toast.error("Not enough stock");
        return prev;
      }
      return [...prev, { product, quantity: qty, customPrice: null }];
    });
  }, []);

  const addToCartTracked = useCallback((product: Product, qty: number = 1) => {
    addToCart(product, qty);
    lastAddedIdRef.current = product.id;
    setQtyBuffer("");
  }, [addToCart]);

  const handleServiceClick = (product: any) => {
    if (product.product_type === 'service' && product.allow_custom_price) {
      setPendingServiceItem(product);
      setCustomPriceValue(product.unit_price?.toString() || "0");
      setShowCustomPriceDialog(true);
    } else {
      addToCart(product);
      toast.success(`Added ${product.name}`);
    }
  };

  const handleCustomPriceConfirm = () => {
    if (pendingServiceItem) {
      const price = parseFloat(customPriceValue) || 0;
      if (price > 0) {
        const product = pendingServiceItem as Product;
        setCart((prev) => [...prev, {
          product,
          quantity: 1,
          customPrice: price,
        }]);
        toast.success(`Added ${pendingServiceItem.name}`);
      }
      setShowCustomPriceDialog(false);
      setPendingServiceItem(null);
      setCustomPriceValue("");
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return i;
      const maxQty = i.product.stock_quantity ?? 0;
      if (newQty > maxQty) { toast.error("Not enough stock"); return i; }
      return { ...i, quantity: newQty };
    }));
  };

  const setExactQty = (productId: string, qty: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i;
      if (qty <= 0) return i;
      const maxQty = i.product.stock_quantity ?? 0;
      if (qty > maxQty) { toast.error("Not enough stock"); return i; }
      return { ...i, quantity: qty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const setCustomPrice = (productId: string, price: number | null) => {
    setCart((prev) => prev.map((i) =>
      i.product.id === productId ? { ...i, customPrice: price } : i
    ));
  };

  const handleBarcodeScan = () => {
    const code = barcodeInput.trim().toLowerCase();
    if (!code) return;
    const product = products.find(
      (p) => (p.barcode || "").toLowerCase() === code || (p.sku || "").toLowerCase() === code
    );
    if (product) {
      if ((product.stock_quantity ?? 0) <= 0) {
        toast.error(`${product.name} is out of stock`);
      } else {
        addToCart(product);
        toast.success(`Added ${product.name}`);
      }
    } else {
      toast.error(`No product found with code "${code}"`);
    }
    setBarcodeInput("");
    barcodeRef.current?.focus();
  };

  // Hold / Resume
  const holdCurrentReceipt = useCallback(() => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    const held: HeldReceipt = {
      id: crypto.randomUUID(),
      label: customerInfo.name || `Receipt ${heldReceipts.length + 1}`,
      cart: [...cart],
      customer: { ...customerInfo },
      timestamp: Date.now(),
    };
    setHeldReceipts(prev => [...prev, held]);
    setCart([]);
    setCustomerInfo({ name: "", phone: "" });
    setSelectedCustomer(null);
    setRoundingAdjustment(0);
    toast.success(`Receipt held — ${held.label}`);
  }, [cart, customerInfo, heldReceipts.length]);

  const resumeHeldReceipt = useCallback((id: string) => {
    const held = heldReceipts.find(h => h.id === id);
    if (!held) return;
    if (cart.length > 0) {
      const currentHeld: HeldReceipt = {
        id: crypto.randomUUID(),
        label: customerInfo.name || `Receipt`,
        cart: [...cart],
        customer: { ...customerInfo },
        timestamp: Date.now(),
      };
      setHeldReceipts(prev => [...prev.filter(h => h.id !== id), currentHeld]);
    } else {
      setHeldReceipts(prev => prev.filter(h => h.id !== id));
    }
    setCart(held.cart);
    setCustomerInfo(held.customer);
    // Find matching customer
    const match = customers.find(c => c.name === held.customer.name || c.phone === held.customer.phone);
    setSelectedCustomer(match || null);
    toast.success(`Resumed — ${held.label}`);
  }, [cart, customerInfo, heldReceipts, customers]);

  // Past receipts search
  useEffect(() => {
    if (!pastReceiptsOpen) return;
    const searchPast = async () => {
      setPastReceiptsLoading(true);
      let query = supabase
        .from("sales")
        .select("id, total_amount, payment_method, sale_date, notes, created_at, customer_id")
        .eq("tenant_id", tenantId)
        .eq("order_status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);
      if (pastReceiptsSearch.length >= 2) {
        query = query.or(
          `notes.ilike.%${pastReceiptsSearch}%,customer_id.ilike.%${pastReceiptsSearch}%`
        );
      }
      const { data } = await query;
      // Enrich with customer names
      const enriched = await Promise.all((data || []).map(async (sale: any) => {
        let customerName = "Walk-in";
        if (sale.customer_id) {
          const { data: c } = await supabase.from("customers")
            .select("name, phone").eq("id", sale.customer_id).single();
          if (c) customerName = c.name;
        }
        return { ...sale, customer_name: customerName };
      }));
      setPastReceipts(enriched);
      setPastReceiptsLoading(false);
    };
    const timer = setTimeout(searchPast, 300);
    return () => clearTimeout(timer);
  }, [pastReceiptsOpen, pastReceiptsSearch, tenantId]);

  const loadPastReceipt = async (saleId: string) => {
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity, unit_price")
      .eq("sale_id", saleId);
    if (!items || items.length === 0) {
      toast.error("No items in this receipt");
      return;
    }
    const productIds = items.map((i: any) => i.product_id).filter(Boolean);
    const matchedProducts = products.filter(p => productIds.includes(p.id));
    if (matchedProducts.length === 0) {
      toast.error("Products are no longer available");
      return;
    }
    setCart([]);
    for (const item of items) {
      const prod = matchedProducts.find(p => p.id === item.product_id);
      if (prod) {
        if ((prod.stock_quantity ?? 0) > 0) {
          setCart(prev => [...prev, { product: prod, quantity: item.quantity, customPrice: null }]);
        }
      }
    }
    setPastReceiptsOpen(false);
    toast.success("Receipt loaded — review and checkout");
  };

  const handleServeFromQueue = (items: any[], customerName: string) => {
    if (items && items.length > 0) {
      items.forEach((item: any) => {
        if (item.id) {
          const product = products.find(p => p.id === item.id);
          if (product) addToCart(product);
        }
      });
    }
    toast.success(`Now serving: ${customerName}`);
  };

  // Checkout
  const handleCheckout = async () => {
    if (checkoutInFlightRef.current || submitting) return;
    if (cart.length === 0) return;
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error("Customer name and phone are required");
      return;
    }
    setSubmitting(true);
    checkoutInFlightRef.current = true;

    try {
      const saleDatetime = new Date(`${saleDate}T${saleTime}:00`).toISOString();
      const normalizedPhone = normalizePhone(customerInfo.phone);

      // Create sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          tenant_id: tenantId,
          customer_id: selectedCustomer?.id || null,
          total_amount: total,
          payment_method: selectedCustomer ? "credit" : "cash",
          payment_status: selectedCustomer ? "unpaid" : "paid",
          order_type: "counter",
          order_status: "completed",
          sale_date: saleDatetime,
          notes: `POS: ${customerInfo.name}, ${normalizedPhone}${roundingAdjustment !== 0 ? ` [Rounding: ${roundingAdjustment}]` : ""}`,
        })
        .select()
        .single();

      if (saleErr || !sale) throw saleErr || new Error("Sale creation failed");

      // Create sale items & update stock
      const saleItems = cart.map(i => ({
        sale_id: sale.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: getEffectivePrice(i.product, i.customPrice),
        total_price: getEffectivePrice(i.product, i.customPrice) * i.quantity,
      }));
      const { error: itemsErr } = await supabase
        .from("sale_items")
        .insert(saleItems);
      if (itemsErr) throw itemsErr;

      for (const item of cart) {
        if (item.product.product_type === "service") continue;
        const newStock = (item.product.stock_quantity ?? 0) - item.quantity;
        await supabase
          .from("products")
          .update({ stock_quantity: Math.max(0, newStock) })
          .eq("id", item.product.id);
      }

      // Update customer balance for credit sales
      if (selectedCustomer && selectedCustomer.id) {
        const newBalance = selectedCustomer.current_balance + (total - creditToApply);
        await supabase
          .from("customers")
          .update({ current_balance: newBalance })
          .eq("id", selectedCustomer.id);
      }

      // Update customer favorites
      if (selectedCustomer) {
        for (const item of cart) {
          const { data: existing } = await supabase
            .from("customer_favorites")
            .select("id, times_purchased")
            .eq("customer_id", selectedCustomer.id)
            .eq("product_id", item.product.id)
            .maybeSingle();
          if (existing) {
            await supabase
              .from("customer_favorites")
              .update({ times_purchased: existing.times_purchased + 1 })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("customer_favorites")
              .insert({
                tenant_id: tenantId,
                customer_id: selectedCustomer.id,
                product_id: item.product.id,
                times_purchased: 1,
              });
          }
        }
      }

      // Prepare receipt data
      const receiptData = { items: [...cart], total, method: "cash", customerName: customerInfo.name, receiptNumber: sale.id.slice(0, 8).toUpperCase() };
      setLastSaleData(receiptData);

      toast.success(`Sale #${sale.id.slice(0, 8)} completed!`);

      setCart([]);
      setCheckoutOpen(false);
      setSubmitting(false);
      checkoutInFlightRef.current = false;
      setRoundingAdjustment(0);
      setCustomerInfo({ name: "", phone: "" });
      setSelectedCustomer(null);
      setApplyCreditAmount("");

      // Refresh products
      const { data: refreshed } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (refreshed) setProducts(refreshed as Product[]);

    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
      setSubmitting(false);
      checkoutInFlightRef.current = false;
    }
  };

  const [splitSubmitting, setSplitSubmitting] = useState(false);
  const [layawaySubmitting, setLayawaySubmitting] = useState(false);

  const handleSplitPayment = async (payments: PaymentSplit[]) => {
    if (splitSubmitting || cart.length === 0) return;
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error("Customer name and phone are required");
      return;
    }
    setSplitSubmitting(true);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(totalPaid - total) > 1) {
      toast.error(`Payment total (${totalPaid}) doesn't match sale total (${total})`);
      setSplitSubmitting(false);
      return;
    }
    try {
      const saleDatetime = new Date(`${saleDate}T${saleTime}:00`).toISOString();
      const { data: sale, error: saleErr } = await supabase.from("sales").insert({
        tenant_id: tenantId, customer_id: selectedCustomer?.id || null,
        total_amount: total, payment_method: "split", payment_status: "paid",
        order_type: "counter", order_status: "completed", sale_date: saleDatetime,
        notes: `POS Split: ${customerInfo.name}`,
      }).select().single();
      if (saleErr || !sale) throw saleErr || new Error("Sale creation failed");

      const saleItems = cart.map(i => ({
        sale_id: sale.id, product_id: i.product.id, quantity: i.quantity,
        unit_price: getEffectivePrice(i.product, i.customPrice),
        total_price: getEffectivePrice(i.product, i.customPrice) * i.quantity,
      }));
      await supabase.from("sale_items").insert(saleItems);

      const paymentRecords = payments.map(p => ({
        sale_id: sale.id, payment_method: p.method, amount: p.amount, reference_number: p.reference || null,
      }));
      await supabase.from("sale_payments").insert(paymentRecords);

      for (const item of cart) {
        if (item.product.product_type === "service") continue;
        await supabase.from("products").update({
          stock_quantity: Math.max(0, (item.product.stock_quantity ?? 0) - item.quantity),
        }).eq("id", item.product.id);
      }

      setLastSaleData({ items: [...cart], total, method: "split", customerName: customerInfo.name, receiptNumber: sale.id.slice(0, 8).toUpperCase() });
      toast.success(`Split payment sale #${sale.id.slice(0, 8)} completed!`);
      setCart([]); setShowSplitPayment(false); setShowCheckout(false);
      setCustomerInfo({ name: "", phone: "" }); setSelectedCustomer(null); setRoundingAdjustment(0);
      const { data: refreshed } = await supabase.from("products").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("name");
      if (refreshed) setProducts(refreshed as Product[]);
    } catch (err: any) { toast.error(err.message || "Split payment failed"); }
    setSplitSubmitting(false);
  };

  const handleLayaway = async (data: {
    depositAmount: number; installmentCount: number; dueDate: Date | undefined; notes: string;
  }) => {
    if (layawaySubmitting || !selectedCustomer || cart.length === 0) return;
    setLayawaySubmitting(true);
    try {
      const { data: layaway, error: layawayErr } = await supabase.from("layaway_plans").insert({
        tenant_id: tenantId, customer_id: selectedCustomer.id,
        total_amount: total, deposit_amount: data.depositAmount,
        amount_paid: data.depositAmount, installment_count: data.installmentCount,
        due_date: data.dueDate?.toISOString().split("T")[0] || null,
        notes: data.notes || null, status: "active",
      }).select().single();
      if (layawayErr || !layaway) throw layawayErr || new Error("Layaway creation failed");

      const layawayItems = cart.map(i => ({
        layaway_id: layaway.id, product_id: i.product.id, product_name: i.product.name,
        quantity: i.quantity, unit_price: getEffectivePrice(i.product, i.customPrice),
        total_price: getEffectivePrice(i.product, i.customPrice) * i.quantity,
      }));
      await supabase.from("layaway_items").insert(layawayItems);

      if (data.depositAmount > 0) {
        await supabase.from("installment_payments").insert({
          layaway_id: layaway.id, amount: data.depositAmount, payment_method: "cash", notes: "Initial deposit",
        });
      }

      toast.success(`Layaway created for ${selectedCustomer.name}`);
      setCart([]); setShowLayaway(false); setSelectedCustomer(null);
      setCustomerInfo({ name: "", phone: "" }); setRoundingAdjustment(0);
    } catch (err: any) { toast.error(err.message || "Layaway failed"); }
    setLayawaySubmitting(false);
  };

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "pos") return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      // F1 - Focus search
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); return; }
      // F2 - Focus barcode
      if (e.key === "F2") { e.preventDefault(); barcodeRef.current?.focus(); return; }
      // F3 - Clear cart
      if (e.key === "F3" && cart.length > 0 && !checkoutOpen) { e.preventDefault(); setCart([]); toast.success("Cart cleared"); return; }
      // F5 - Reprint last receipt
      if (e.key === "F5") { e.preventDefault(); if (lastReceiptRef.current) { lastReceiptRef.current(); toast.success("Reprinting..."); } else { toast.error("No recent receipt"); } return; }
      // F7 - Rounding
      if (e.key === "F7") {
        e.preventDefault();
        const up100 = Math.ceil(rawTotal / 100) * 100;
        const up500 = Math.ceil(rawTotal / 500) * 500;
        const up1000 = Math.ceil(rawTotal / 1000) * 1000;
        const input = window.prompt(
          `Rounding Adjustment\nRaw: UGX ${rawTotal.toLocaleString()}\n\n` +
          `Options:\n- Type '100' → UGX ${up100.toLocaleString()} (+${up100 - rawTotal})\n` +
          `- Type '500' → UGX ${up500.toLocaleString()} (+${up500 - rawTotal})\n` +
          `- Type '1000' → UGX ${up1000.toLocaleString()} (+${up1000 - rawTotal})\n` +
          `- Type '0' to reset\n- Enter any amount:`,
          String(Math.round(rawTotal + roundingAdjustment))
        );
        if (input !== null) {
          const val = input.trim();
          if (val === "100") setRoundingAdjustment(up100 - rawTotal);
          else if (val === "500") setRoundingAdjustment(up500 - rawTotal);
          else if (val === "1000") setRoundingAdjustment(up1000 - rawTotal);
          else if (val === "0") setRoundingAdjustment(0);
          else { const n = Number(val.replace(/,/g, "")); if (!isNaN(n)) setRoundingAdjustment(n - rawTotal); }
        }
        return;
      }
      // F8 - Checkout
      if (e.key === "F8" && cart.length > 0) { e.preventDefault(); setCheckoutOpen(true); return; }
      // F9 - Complete sale
      if (e.key === "F9" && checkoutOpen) { e.preventDefault(); if (!submitting) handleCheckout(); return; }
      // F10 - Shortcuts help
      if (e.key === "F10") { e.preventDefault(); setShowShortcuts(prev => !prev); return; }
      // F12 - Custom price
      if (e.key === "F12") {
        e.preventDefault();
        if (cart.length > 0) {
          const targetId = lastAddedIdRef.current || cart[cart.length - 1].product.id;
          const item = cart.find(i => i.product.id === targetId);
          if (item) {
            setEditingPriceId(targetId);
            setTempPrice(String(getEffectivePrice(item.product, item.customPrice)));
          }
        }
        return;
      }
      // Ctrl+S - Hold
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); holdCurrentReceipt(); return; }
      // Escape
      if (e.key === "Escape") {
        if (pastReceiptsOpen) { setPastReceiptsOpen(false); return; }
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (checkoutOpen) { setCheckoutOpen(false); return; }
        if (editingPriceId) { setEditingPriceId(null); return; }
        if (editingQtyId) { setEditingQtyId(null); return; }
        return;
      }
      // Alt+Space - Past receipts
      if (e.altKey && e.key === " ") { e.preventDefault(); setPastReceiptsOpen(true); setTimeout(() => pastReceiptsSearchRef.current?.focus(), 100); return; }

      if (!isInput && !checkoutOpen) {
        // S - Sales history
        if (e.key === "s" || e.key === "S") { e.preventDefault(); navigate("/business/sales"); return; }
        // H - Hold
        if (e.key === "h" || e.key === "H") { e.preventDefault(); holdCurrentReceipt(); return; }
        // R - Resume
        if (e.key === "r" || e.key === "R") { if (heldReceipts.length === 1) { e.preventDefault(); resumeHeldReceipt(heldReceipts[0].id); } return; }
        // Space - Search
        if (e.key === " ") { e.preventDefault(); searchRef.current?.focus(); return; }
        // Tab - Navigate products
        if (e.key === "Tab") {
          e.preventDefault();
          if (e.shiftKey) setSelectedProductIndex(prev => Math.max(prev - 1, 0));
          else setSelectedProductIndex(prev => prev < 0 ? 0 : Math.min(prev + 1, filtered.length - 1));
          return;
        }
        // Enter - Add product or checkout
        if (e.key === "Enter") {
          e.preventDefault();
          if (selectedProductIndex >= 0 && selectedProductIndex < filtered.length) {
            addToCartTracked(filtered[selectedProductIndex]);
            toast.success(`Added ${filtered[selectedProductIndex].name}`);
            setSelectedProductIndex(-1);
          } else if (cart.length > 0) {
            setCheckoutOpen(true);
          }
          return;
        }
        // 0-9 - Type quantity
        if (e.key >= "0" && e.key <= "9" && cart.length > 0) {
          e.preventDefault();
          const targetId = lastAddedIdRef.current || cart[cart.length - 1].product.id;
          const newBuffer = qtyBuffer + e.key;
          setQtyBuffer(newBuffer);
          const qty = parseInt(newBuffer);
          if (qty > 0) setExactQty(targetId, qty);
          if (qtyBufferTimeoutRef.current) clearTimeout(qtyBufferTimeoutRef.current);
          qtyBufferTimeoutRef.current = setTimeout(() => setQtyBuffer(""), 1500);
          return;
        }
        // Backspace - Edit qty
        if (e.key === "Backspace" && qtyBuffer) {
          e.preventDefault();
          const newBuffer = qtyBuffer.slice(0, -1);
          setQtyBuffer(newBuffer);
          if (newBuffer) {
            const targetId = lastAddedIdRef.current || cart[cart.length - 1].product.id;
            setExactQty(targetId, parseInt(newBuffer));
          }
          return;
        }
        // Delete - Remove last item
        if (e.key === "Delete" && cart.length > 0) {
          e.preventDefault();
          const lastItem = cart[cart.length - 1];
          removeFromCart(lastItem.product.id);
          toast.success(`Removed ${lastItem.product.name}`);
          return;
        }
        // Alt+1-9 - Quick add
        if (e.altKey && e.key >= "1" && e.key <= "9") {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          if (idx < filtered.length) {
            addToCartTracked(filtered[idx]);
            toast.success(`Added ${filtered[idx].name}`);
          }
          return;
        }
      }

      // Arrow keys when search focused
      if (isInput && target === searchRef.current) {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedProductIndex(prev => Math.min(prev + 1, filtered.length - 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setSelectedProductIndex(prev => Math.max(prev - 1, 0)); return; }
        if (e.key === "Enter" && selectedProductIndex >= 0 && selectedProductIndex < filtered.length) {
          e.preventDefault();
          addToCartTracked(filtered[selectedProductIndex]);
          toast.success(`Added ${filtered[selectedProductIndex].name}`);
          setSearch("");
          searchRef.current?.blur();
          return;
        }
      }

      // Arrow keys when customer search focused
      if (isInput && target === customerSearchRef.current && showSuggestions) {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCustomerIndex(prev => Math.min(prev + 1, customerSuggestions.length - 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCustomerIndex(prev => Math.max(prev - 1, 0)); return; }
        if (e.key === "Enter") {
          if (selectedCustomerIndex >= 0 && selectedCustomerIndex < customerSuggestions.length) {
            e.preventDefault();
            selectCustomer(customerSuggestions[selectedCustomerIndex]);
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cart, checkoutOpen, submitting, filtered, selectedProductIndex, showShortcuts,
    editingPriceId, editingQtyId, qtyBuffer, pastReceiptsOpen, holdCurrentReceipt,
    resumeHeldReceipt, heldReceipts, navigate, rawTotal, customerSuggestions,
    selectedCustomerIndex, activeTab,
  ]);

  // Categories for filter
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => { if (p.category_id && p.category) map.set(p.category_id, p.category); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Tab Navigation */}
      <div className="px-2 py-2 border-b shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pos" className="flex items-center gap-1.5 text-xs">
              <ShoppingCart className="h-4 w-4" /> POS
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex items-center gap-1.5 text-xs">
              <Users className="h-4 w-4" /> Queue
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-4 w-4" /> Stats
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* QUEUE TAB */}
      {activeTab === "queue" && tenantId && (
        <div className="flex-1 overflow-auto p-2 pb-20">
          <POSQueuePanel tenantId={tenantId} onServeCustomer={handleServeFromQueue} />
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && tenantId && (
        <div className="flex-1 overflow-auto p-2 pb-20">
          <LiveSalesWidget tenantId={tenantId} />
        </div>
      )}

      {/* POS TAB - Two-panel layout */}
      {activeTab === "pos" && (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0 p-2 md:p-4">
          {/* Left: Products Panel */}
          <div className={`flex-1 flex flex-col min-w-0 ${mobileView === "cart" ? "hidden md:flex" : "flex"}`}>
            {/* Shortcut hint bar */}
            <div className="hidden md:flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono flex-wrap">
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Ctrl+S</kbd> Hold</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">H</kbd> Hold</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">R</kbd> Resume</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">S</kbd> Sales</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Space</kbd> Search</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">F8</kbd> Checkout</span>
              </div>
              <button onClick={() => setShowShortcuts(true)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                <Keyboard className="h-3 w-3" /><span>F10 Shortcuts</span>
              </button>
            </div>

            {/* Barcode scanner */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={barcodeRef} placeholder="Scan barcode... (F2)" value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeScan(); }}
                  className="pl-9 font-mono text-sm" />
              </div>
              <ScanTriggerButton onScan={(code) => {
                const product = products.find(p => (p.barcode || "").toLowerCase() === code.toLowerCase() || (p.sku || "").toLowerCase() === code.toLowerCase());
                if (product) { addToCart(product); toast.success(`Added ${product.name}`); }
                else setSearch(code);
              }} className="h-10 w-10" />
            </div>

            {/* Search & category filter */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={searchRef} placeholder="Search products... (F1)" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 px-2 rounded-md border border-input bg-background text-sm max-w-[100px]">
                <option value="">All</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">No products found</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                  {filtered.map((p, idx) => (
                    <div key={p.id}
                      className={`bg-card border rounded-xl p-2.5 md:p-3 text-left hover:border-primary hover:shadow-sm transition-all group relative ${
                        idx === selectedProductIndex ? "border-primary ring-2 ring-primary/30" : "border-border"
                      }`}
                    >
                      {idx < 9 && (
                        <span className="absolute top-1 right-1 text-[9px] font-mono text-muted-foreground/50 hidden md:inline">
                          Alt+{idx + 1}
                        </span>
                      )}
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.sku && <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.stock_quantity ?? 0} {p.unit_of_measure || "units"} in stock
                      </p>
                      {p.expiry_date && (
                        <p className="text-[10px] text-muted-foreground">
                          Exp: {new Date(p.expiry_date).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary">
                          UGX {(p.unit_price / 1000).toFixed(0)}K
                        </span>
                        {p.product_type === "service" && <Badge variant="secondary" className="text-[10px]">Svc</Badge>}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button onClick={() => addToCart(p)}
                          className="flex-1 bg-primary text-primary-foreground text-xs text-center py-1.5 rounded-md hover:opacity-90 transition-opacity">
                          <Plus className="h-3 w-3 inline mr-0.5" /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart Panel */}
          <div className={`w-full md:w-80 bg-card border border-border rounded-xl flex flex-col shrink-0 ${
            mobileView === "products" ? "hidden md:flex" : "flex"
          } ${mobileView === "cart" ? "flex-1" : ""}`}>
            {/* Mobile back */}
            <div className="md:hidden p-3 border-b border-border">
              <button onClick={() => setMobileView("products")}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" /> Back to Products
              </button>
            </div>

            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Cart
              </h3>
              <div className="flex items-center gap-2">
                {qtyBuffer && (
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full animate-pulse">
                    Qty: {qtyBuffer}
                  </span>
                )}
                {cart.length > 0 && (
                  <button onClick={holdCurrentReceipt} className="text-muted-foreground hover:text-primary" title="Hold (Ctrl+S)">
                    <PauseCircle className="h-4 w-4" />
                  </button>
                )}
                <Badge variant="secondary">{cart.length}</Badge>
                {cart.length > 0 && (
                  <button onClick={() => { setCart([]); setRoundingAdjustment(0); toast.success("Cart cleared"); }}
                    className="text-muted-foreground hover:text-destructive" title="Clear (F3)">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Held receipts */}
            {heldReceipts.length > 0 && (
              <div className="px-3 py-2 border-b border-border bg-muted/30 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <PauseCircle className="h-3 w-3" /> {heldReceipts.length} held
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {heldReceipts.map((h) => (
                    <button key={h.id} onClick={() => resumeHeldReceipt(h.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20">
                      <PlayCircle className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{h.label}</span>
                      <Badge variant="secondary" className="text-[9px] px-1">{h.cart.length}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart items */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Cart is empty<br /><span className="text-[10px]">Search & click products to add</span>
                </p>
              ) : cart.map((item) => {
                const effectivePrice = getEffectivePrice(item.product, item.customPrice);
                return (
                  <div key={item.product.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <p className="text-sm font-medium">{item.product.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          setEditingPriceId(editingPriceId === item.product.id ? null : item.product.id);
                          setTempPrice(String(effectivePrice));
                        }} className="text-muted-foreground hover:text-primary" title="Custom price">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {editingPriceId === item.product.id && (
                      <div className="flex gap-1 mt-2">
                        <Input type="number" value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const p = parseFloat(tempPrice);
                              if (p > 0) { setCustomPrice(item.product.id, p); setEditingPriceId(null); toast.success("Price updated"); }
                            }
                          }}
                          className="h-7 text-xs" placeholder="Custom price" autoFocus />
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => {
                          const p = parseFloat(tempPrice);
                          if (p > 0) { setCustomPrice(item.product.id, p); setEditingPriceId(null); }
                        }}>Set</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setCustomPrice(item.product.id, null); setEditingPriceId(null); }}>Reset</Button>
                      </div>
                    )}
                    {item.customPrice !== null && editingPriceId !== item.product.id && (
                      <p className="text-[10px] text-warning mt-1">Custom: UGX {item.customPrice.toLocaleString()}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.product.id, -1)}
                          className="h-6 w-6 rounded bg-background border border-border flex items-center justify-center hover:bg-accent">
                          <Minus className="h-3 w-3" />
                        </button>
                        {editingQtyId === item.product.id ? (
                          <input type="number" value={tempQty}
                            onChange={(e) => setTempQty(e.target.value)}
                            onBlur={() => { const q = parseInt(tempQty); if (q > 0) setExactQty(item.product.id, q); setEditingQtyId(null); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { const q = parseInt(tempQty); if (q > 0) setExactQty(item.product.id, q); setEditingQtyId(null); }
                              if (e.key === "Escape") setEditingQtyId(null);
                            }}
                            className="w-14 h-6 text-center text-sm font-medium border border-primary rounded bg-background outline-none"
                            autoFocus min={1} />
                        ) : (
                          <button onClick={() => { setEditingQtyId(item.product.id); setTempQty(String(item.quantity)); }}
                            className="text-sm font-medium w-14 text-center hover:bg-accent rounded py-0.5 border border-transparent hover:border-border"
                            title="Click to type qty">
                            {item.quantity}
                          </button>
                        )}
                        <button onClick={() => updateQty(item.product.id, 1)}
                          className="h-6 w-6 rounded bg-background border border-border flex items-center justify-center hover:bg-accent">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">UGX {(effectivePrice * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals & Checkout */}
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">UGX {total.toLocaleString()}</span>
              </div>
              {roundingAdjustment !== 0 && (
                <div className="flex justify-between text-xs text-amber-600 font-bold">
                  <span>Rounding</span>
                  <span>{roundingAdjustment > 0 ? "+" : ""}{roundingAdjustment.toLocaleString()}</span>
                </div>
              )}
              {selectedCustomer && (
                <div className="text-xs text-muted-foreground">
                  {selectedCustomer.name}
                  {selectedCustomer.current_balance > 0 && (
                    <span className="ml-2 text-destructive">Owes UGX {selectedCustomer.current_balance.toLocaleString()}</span>
                  )}
                </div>
              )}
              <Button className="w-full gap-2" size="lg" disabled={cart.length === 0}
                onClick={() => { setCheckoutOpen(true); setAmountGiven(""); }}>
                <CreditCard className="h-4 w-4" /> Checkout <kbd className="ml-1 text-[10px] opacity-60 font-mono">F8</kbd>
              </Button>
            </div>
          </div>

          {/* Mobile floating cart button */}
          {mobileView === "products" && cart.length > 0 && (
            <button onClick={() => setMobileView("cart")}
              className="md:hidden fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[11px] flex items-center justify-center font-bold">
                {cart.length}
              </span>
            </button>
          )}
        </div>
      )}

      {/* CHECKOUT MODAL */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Backdated sale */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Sale Date & Time
              </label>
              <div className="flex gap-2">
                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="flex-1" />
                <Input type="time" value={saleTime} onChange={(e) => setSaleTime(e.target.value)} className="w-28" />
              </div>
              {isBackdated && <p className="text-xs text-warning font-medium">Backdated sale — will appear on {saleDate}</p>}
            </div>

            {/* Customer search */}
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">Select Customer</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={customerSearchRef} value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search by name or phone..." className="pl-9" />
              </div>
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  {customerSuggestions.map((c, idx) => (
                    <button key={c.id}
                      onMouseDown={() => selectCustomer(c)}
                      className={`w-full text-left px-3 py-2.5 transition-colors border-b border-border last:border-0 ${
                        idx === selectedCustomerIndex ? "bg-accent" : "hover:bg-accent"
                      }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                        {c.current_balance > 0 && (
                          <Badge variant="destructive" className="text-[10px]">Owes UGX {c.current_balance.toLocaleString()}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={() => setShowQuickCustomer(true)}>
                  <UserPlus className="h-3 w-3 mr-1" /> New Customer
                </Button>
                {selectedCustomer && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerInfo({ name: "", phone: "" }); }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Customer info fields */}
            <div>
              <label className="text-sm font-medium mb-1 block">Customer Name *</label>
              <Input value={customerInfo.name}
                onChange={(e) => { setCustomerInfo(prev => ({ ...prev, name: e.target.value })); setSelectedCustomer(null); }}
                placeholder="Walk-in Customer" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone *</label>
              <Input value={customerInfo.phone}
                onChange={(e) => { setCustomerInfo(prev => ({ ...prev, phone: e.target.value })); setSelectedCustomer(null); }}
                onBlur={(e) => { const n = normalizePhone(e.target.value); if (n !== customerInfo.phone) setCustomerInfo(prev => ({ ...prev, phone: n })); }}
                placeholder="+256 7XX XXX XXX" />
            </div>

            {/* Credit balance */}
            {selectedCustomer && selectedCustomer.current_balance > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Balance: UGX {selectedCustomer.current_balance.toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Apply credit to this sale</label>
                  <div className="flex gap-2">
                    <Input type="number" value={applyCreditAmount}
                      onChange={(e) => setApplyCreditAmount(e.target.value)}
                      placeholder={`Max: ${Math.min(selectedCustomer.current_balance, total).toLocaleString()}`}
                      className="text-sm" />
                    <Button variant="outline" size="sm"
                      onClick={() => setApplyCreditAmount(String(Math.min(selectedCustomer.current_balance, total)))}>
                      Max
                    </Button>
                  </div>
                  {creditToApply > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Due after credit: <span className="font-bold text-foreground">UGX {amountDue.toLocaleString()}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Payment method */}
            <div>
              <label className="text-sm font-medium mb-1 block">Payment Method</label>
              <div className="flex gap-2">
                {[
                  { value: "cash", label: "Cash" },
                  { value: "mobile_money", label: "Mobile Money" },
                  { value: "credit", label: "Credit" }
                ].map((m) => (
                  <button key={m.value} type="button"
                    onClick={() => {
                      if (m.value === "credit" && !selectedCustomer) {
                        toast.error("Select a customer for credit sales");
                        return;
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      m.value === "credit" && !selectedCustomer
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-primary/50"
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-2 justify-start h-10"
                onClick={() => { setShowSplitPayment(true); setShowCheckout(false); }}>
                <SplitSquareHorizontal className="h-4 w-4 mr-2" /> Split Payment
              </Button>
            </div>

            {/* Order summary */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-2">{cart.length} items</p>
              {cart.map((i) => {
                const price = getEffectivePrice(i.product, i.customPrice);
                return (
                  <div key={i.product.id} className="flex justify-between text-sm py-0.5">
                    <span>{i.product.name} × {i.quantity}</span>
                    <span className="font-medium">UGX {(price * i.quantity).toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border mt-2 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>UGX {rawTotal.toLocaleString()}</span>
                </div>
                {roundingAdjustment !== 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-600">
                    <span>Rounding (F7)</span><span>{roundingAdjustment > 0 ? "+" : ""}{roundingAdjustment.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-lg pt-1">
                  <span>Total</span><span className="text-primary">UGX {total.toLocaleString()}</span>
                </div>
                {creditToApply > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Credit Applied</span><span>- UGX {creditToApply.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-primary">
                      <span>Amount Due</span><span>UGX {amountDue.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Amount given */}
            <div className="bg-accent/50 border border-border rounded-lg p-3 space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Amount Given <kbd className="text-[10px] font-mono opacity-60 px-1 py-0.5 rounded bg-muted border border-border">F1</kbd>
              </label>
              <Input ref={amountGivenRef} type="number" value={amountGiven}
                onChange={(e) => setAmountGiven(e.target.value)}
                placeholder={`Due: UGX ${amountDue.toLocaleString()}`}
                className="text-lg font-bold" />
              {amountGiven && parseFloat(amountGiven) > 0 && (
                <div className={`text-sm font-bold p-2 rounded-md ${
                  parseFloat(amountGiven) >= amountDue ? "bg-green-100 dark:bg-green-900/20 text-green-700" : "bg-red-100 dark:bg-red-900/20 text-red-700"
                }`}>
                  {parseFloat(amountGiven) >= amountDue
                    ? `Balance: UGX ${(parseFloat(amountGiven) - amountDue).toLocaleString()}`
                    : `Short: UGX ${(amountDue - parseFloat(amountGiven)).toLocaleString()}`}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCheckoutOpen(false)}>
                Cancel <kbd className="ml-1 text-[10px] opacity-60 font-mono">Esc</kbd>
              </Button>
              <Button className="flex-1 gap-2" onClick={handleCheckout} disabled={submitting}>
                <Printer className="h-4 w-4" /> {submitting ? "Processing..." : "Complete"} <kbd className="ml-1 text-[10px] opacity-60 font-mono">F9</kbd>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Past receipts modal */}
      <Dialog open={pastReceiptsOpen} onOpenChange={setPastReceiptsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reuse Past Receipt</DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input ref={pastReceiptsSearchRef} value={pastReceiptsSearch}
              onChange={(e) => setPastReceiptsSearch(e.target.value)}
              placeholder="Search by customer name or receipt ID..." className="pl-9" autoFocus />
          </div>
          <div className="flex-1 overflow-auto">
            {pastReceiptsLoading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
            ) : pastReceipts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No receipts found</p>
            ) : (
              <div className="space-y-1">
                {pastReceipts.map((r: any) => (
                  <button key={r.id} onClick={() => loadPastReceipt(r.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold">{r.customer_name}</p>
                        <p className="text-xs text-muted-foreground">#{r.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">UGX {r.total_amount?.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.sale_date ? new Date(r.sale_date).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortcuts overlay */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Keyboard className="h-5 w-5" /> Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            {[
              ["Ctrl+S / H", "Hold receipt"],
              ["R", "Resume held receipt"],
              ["S", "Go to Sales"],
              ["Space", "Focus search"],
              ["Tab", "Navigate products"],
              ["Enter", "Add selected / Checkout"],
              ["0-9", "Type quantity"],
              ["F1", "Focus search"],
              ["F2", "Focus barcode"],
              ["F3", "Clear cart"],
              ["F5", "Reprint receipt"],
              ["F7", "Rounding adjustment"],
              ["F8", "Open checkout"],
              ["F9", "Complete sale"],
              ["F10", "Toggle this help"],
              ["F12", "Custom price"],
              ["Esc", "Close modal"],
              ["Alt+Space", "Past receipts"],
              ["Alt+1-9", "Quick add product"],
              ["Delete", "Remove last item"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-xs font-mono font-semibold">{key}</kbd>
                <span className="text-muted-foreground text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing dialogs */}
      <SplitPaymentDialog open={showSplitPayment} onOpenChange={setShowSplitPayment}
        totalAmount={total} onConfirm={handleSplitPayment} isProcessing={splitSubmitting} />

      {selectedCustomer && (
        <LayawayDialog open={showLayaway} onOpenChange={setShowLayaway}
          customer={selectedCustomer} cartItems={cart.map(i => ({ id: i.product.id, name: i.product.name, price: getEffectivePrice(i.product, i.customPrice), quantity: i.quantity }))}
          totalAmount={total} onConfirm={handleLayaway} isProcessing={layawaySubmitting} />
      )}

      {selectedCustomer && tenantId && (
        <CustomerHistoryDialog open={showCustomerHistory} onOpenChange={setShowCustomerHistory}
          customerId={selectedCustomer.id} customerName={selectedCustomer.name} tenantId={tenantId}
          onAddFavoriteToCart={(productId) => {
            const product = products.find(p => p.id === productId);
            if (product) { addToCart(product); toast.success(`Added ${product.name}`); }
          }} />
      )}

      {lastSaleData && (
        <div className="hidden">
          <PrintReceipt ref={receiptRef}
            businessName={tenantInfo?.name || "Business"}
            businessPhone={tenantInfo?.phone || undefined}
            businessEmail={tenantInfo?.email || undefined}
            businessAddress={tenantInfo?.address || undefined}
            customerName={lastSaleData.customerName}
            items={lastSaleData.items.map(i => ({ name: i.product.name, quantity: i.quantity, price: getEffectivePrice(i.product, i.customPrice) }))}
            total={lastSaleData.total}
            paymentMethod={lastSaleData.method}
            receiptNumber={lastSaleData.receiptNumber}
            settings={receiptSettings || undefined} />
        </div>
      )}

      {lastSaleData && (
        <DigitalReceiptDialog open={showDigitalReceipt} onOpenChange={setShowDigitalReceipt}
          customerPhone={selectedCustomer?.phone || undefined}
          customerName={lastSaleData.customerName}
          items={lastSaleData.items.map(i => ({ name: i.product.name, quantity: i.quantity, price: getEffectivePrice(i.product, i.customPrice) }))}
          total={lastSaleData.total} paymentMethod={lastSaleData.method}
          businessName={tenantInfo?.name} businessPhone={tenantInfo?.phone || undefined}
          businessEmail={tenantInfo?.email || undefined}
          businessAddress={tenantInfo?.address || undefined}
          businessLogo={tenantInfo?.logo_url || undefined}
          receiptNumber={lastSaleData.receiptNumber}
          settings={receiptSettings ? { ...receiptSettings, logo_alignment: (receiptSettings.logo_alignment as "left" | "center" | "right") || "center" } : undefined} />
      )}

      {tenantId && (
        <QuickCustomerDialog open={showQuickCustomer} onOpenChange={setShowQuickCustomer}
          tenantId={tenantId} onCustomerCreated={(c) => { setSelectedCustomer(c); setCustomerInfo({ name: c.name, phone: c.phone || "" }); }} />
      )}

      {/* Custom price dialog for services */}
      <Dialog open={showCustomPriceDialog} onOpenChange={setShowCustomPriceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Service Price</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{pendingServiceItem?.name}</p>
              <p className="text-sm text-muted-foreground">Default: {pendingServiceItem?.unit_price?.toLocaleString()} UGX</p>
            </div>
            <div>
              <Label>Custom Price (UGX)</Label>
              <Input type="number" value={customPriceValue}
                onChange={(e) => setCustomPriceValue(e.target.value)}
                placeholder="Enter price" className="mt-2 h-11 text-base" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomPriceDialog(false)}>Cancel</Button>
            <Button onClick={handleCustomPriceConfirm}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile menu drawer */}
      <Drawer open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader><DrawerTitle>Menu</DrawerTitle></DrawerHeader>
          <ScrollArea className="flex-1 px-4">
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">CUSTOMER</p>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">Balance: UGX {selectedCustomer.current_balance.toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedCustomer(null); setShowMobileMenu(false); }}>Clear</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full mb-2" onClick={() => { setShowCheckout(true); setShowMobileMenu(false); }}>
                  <User className="h-4 w-4 mr-2" /> Select Customer
                </Button>
              )}
            </div>
            {cart.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">CART ({cart.length})</p>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{item.product.name}</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(item.product.id)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedCustomer && cart.length > 0 && (
              <Button variant="outline" className="w-full mb-2" onClick={() => { setShowLayaway(true); setShowMobileMenu(false); }}>
                <CalendarIcon className="h-4 w-4 mr-2" /> Layaway
              </Button>
            )}
            {selectedCustomer && (
              <Button variant="outline" className="w-full" onClick={() => { setShowCustomerHistory(true); setShowMobileMenu(false); }}>
                <History className="h-4 w-4 mr-2" /> History & Favorites
              </Button>
            )}
          </ScrollArea>
          <DrawerFooter>
            <Button className="w-full" size="lg" disabled={cart.length === 0}
              onClick={() => { setShowCheckout(true); setShowMobileMenu(false); }}>
              <Receipt className="h-4 w-4 mr-2" /> Checkout ({total.toLocaleString()})
            </Button>
            <Button variant="outline" onClick={() => setShowMobileMenu(false)}>Continue Shopping</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <div className="hidden">
        <div ref={receiptRef} />
      </div>
    </div>
  );
}

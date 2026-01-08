import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PrintReceipt, printReceipt } from "./PrintReceipt";
import { Printer, Eye, Loader2, X } from "lucide-react";

interface SaleReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  tenantId: string;
}

export const SaleReceiptDialog = ({ open, onOpenChange, saleId, tenantId }: SaleReceiptDialogProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch sale details with items
  const { data: sale, isLoading: saleLoading } = useQuery({
    queryKey: ["sale-details", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customers(name),
          sale_items(
            quantity,
            unit_price,
            total_price,
            products(name)
          )
        `)
        .eq("id", saleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!saleId,
  });

  // Fetch tenant details
  const { data: tenant } = useQuery({
    queryKey: ["tenant-details", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("name, phone, email, address, logo_url")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!tenantId,
  });

  // Fetch receipt settings
  const { data: receiptSettings } = useQuery({
    queryKey: ["receipt-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!tenantId,
  });

  // Fetch cashier name
  const { data: cashier } = useQuery({
    queryKey: ["cashier", sale?.created_by],
    queryFn: async () => {
      if (!sale?.created_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sale.created_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: open && !!sale?.created_by,
  });

  const handlePrint = () => {
    printReceipt(receiptRef.current);
  };

  // Transform sale items for receipt
  const items = sale?.sale_items?.map((item: any) => ({
    name: item.products?.name || "Unknown Item",
    quantity: item.quantity,
    price: item.unit_price,
  })) || [];

  // Generate receipt number from sale date and order number
  const receiptNumber = sale?.order_number 
    ? `${receiptSettings?.receipt_prefix || 'RCP'}-${new Date(sale.created_at).toISOString().slice(0,10).replace(/-/g, '')}-${String(sale.order_number).padStart(6, '0')}`
    : undefined;

  if (saleLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Sale Receipt #{sale?.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4 bg-muted/30 rounded-lg">
          <PrintReceipt
            ref={receiptRef}
            businessName={tenant?.name}
            businessPhone={tenant?.phone || undefined}
            businessEmail={tenant?.email || undefined}
            businessAddress={tenant?.address || undefined}
            businessLogo={tenant?.logo_url || undefined}
            customerName={sale?.customers?.name}
            items={items}
            total={sale?.total_amount || 0}
            paymentMethod={sale?.payment_method || "cash"}
            receiptNumber={receiptNumber}
            cashierName={cashier?.full_name || undefined}
            saleDate={sale?.created_at ? new Date(sale.created_at) : undefined}
            settings={receiptSettings ? {
              ...receiptSettings,
              logo_alignment: (receiptSettings.logo_alignment as "left" | "center" | "right") || "center"
            } : undefined}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

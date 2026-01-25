import { forwardRef } from "react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptSettings {
  logo_alignment?: "left" | "center" | "right";
  show_logo?: boolean;
  show_phone?: boolean;
  show_email?: boolean;
  show_address?: boolean;
  whatsapp_number?: string | null;
  show_whatsapp_qr?: boolean;
  seasonal_remark?: string | null;
  show_seasonal_remark?: boolean;
  footer_message?: string;
  show_footer_message?: boolean;
  show_cashier?: boolean;
  show_customer?: boolean;
  show_date_time?: boolean;
  show_payment_method?: boolean;
}

interface PrintReceiptProps {
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessLogo?: string;
  customerName?: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  receiptNumber?: string;
  cashierName?: string;
  saleDate?: Date;
  settings?: ReceiptSettings;
}

export const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ 
    businessName = "TennaHub", 
    businessPhone,
    businessEmail,
    businessAddress,
    businessLogo,
    customerName, 
    items, 
    total, 
    paymentMethod, 
    receiptNumber, 
    cashierName,
    saleDate,
    settings = {}
  }, ref) => {
    const displayDate = saleDate || new Date();
    
    const {
      logo_alignment = "center",
      show_logo = true,
      show_phone = true,
      show_email = true,
      show_address = true,
      whatsapp_number,
      show_whatsapp_qr = false,
      seasonal_remark,
      show_seasonal_remark = false,
      footer_message = "Thank you for shopping with us!",
      show_footer_message = true,
      show_cashier = true,
      show_customer = true,
      show_date_time = true,
      show_payment_method = true,
    } = settings;

    const getAlignmentClass = () => {
      switch (logo_alignment) {
        case "left": return "items-start text-left";
        case "right": return "items-end text-right";
        default: return "items-center text-center";
      }
    };

    const getWhatsAppUrl = () => {
      if (!whatsapp_number) return "";
      const cleanNumber = whatsapp_number.replace(/\D/g, "");
      const message = encodeURIComponent(`Hello ${businessName}! I recently made a purchase and I would like to inquire about it.`);
      return `https://wa.me/${cleanNumber}?text=${message}`;
    };

    return (
      <div ref={ref} className="print-receipt p-5 bg-white text-neutral-900 max-w-[320px]" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
        {/* Header with Logo/Business Name */}
        <div className={`flex flex-col pb-4 mb-4 ${getAlignmentClass()}`}>
          {show_logo && businessLogo ? (
            <img 
              src={businessLogo} 
              alt={businessName} 
              className="h-14 w-auto object-contain mb-2"
            />
          ) : show_logo && (
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">{businessName}</h1>
          )}
          
          {/* Contact Info */}
          <div className="text-xs mt-1 space-y-0.5 text-neutral-600">
            {show_address && businessAddress && (
              <p>{businessAddress}</p>
            )}
            {show_phone && businessPhone && (
              <p>{businessPhone}</p>
            )}
            {show_email && businessEmail && (
              <p className="text-neutral-500">{businessEmail}</p>
            )}
          </div>
        </div>

        {/* Seasonal Remark */}
        {show_seasonal_remark && seasonal_remark && (
          <div className="text-center py-3 mb-4 bg-neutral-50 rounded-lg">
            <p className="text-sm font-medium text-neutral-800">{seasonal_remark}</p>
          </div>
        )}

        {/* Receipt Info */}
        <div className="text-xs mb-4 space-y-1.5">
          {receiptNumber && (
            <div className="flex justify-between font-semibold py-2 px-3 bg-neutral-100 rounded-md">
              <span className="text-neutral-600">Receipt</span>
              <span className="font-mono text-neutral-900">{receiptNumber}</span>
            </div>
          )}
          {show_date_time && (
            <div className="flex justify-between px-1 text-neutral-600">
              <span>Date & Time</span>
              <span className="text-neutral-900">{format(displayDate, "dd MMM yyyy, HH:mm")}</span>
            </div>
          )}
          {show_customer && customerName && (
            <div className="flex justify-between px-1 text-neutral-600">
              <span>Customer</span>
              <span className="text-neutral-900">{customerName}</span>
            </div>
          )}
          {show_cashier && cashierName && (
            <div className="flex justify-between px-1 text-neutral-600">
              <span>Served by</span>
              <span className="text-neutral-900">{cashierName}</span>
            </div>
          )}
        </div>

        {/* Items Header */}
        <div className="py-2 mb-2 border-y border-neutral-200">
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            <span className="flex-1">Item</span>
            <span className="w-10 text-center">Qty</span>
            <span className="w-20 text-right">Amount</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="flex-1 truncate pr-2 text-neutral-800">{item.name}</span>
              <span className="w-10 text-center text-neutral-600">{item.quantity}</span>
              <span className="w-20 text-right font-medium text-neutral-900">{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pt-3 mb-4 border-t border-neutral-200">
          <div className="flex justify-between text-xs text-neutral-600 mb-2">
            <span>Subtotal</span>
            <span>{total.toLocaleString()} UGX</span>
          </div>
          <div className="flex justify-between items-center font-bold text-lg py-3 px-4 bg-neutral-900 text-white rounded-lg">
            <span>Total</span>
            <span>{total.toLocaleString()} UGX</span>
          </div>
        </div>

        {/* Payment Method */}
        {show_payment_method && (
          <div className="text-xs text-center py-2 px-3 bg-neutral-50 rounded-md mb-4">
            <span className="text-neutral-500">Paid via </span>
            <span className="font-medium text-neutral-900 capitalize">{paymentMethod.replace(/_/g, " ")}</span>
          </div>
        )}

        {/* WhatsApp QR Code */}
        {show_whatsapp_qr && whatsapp_number && (
          <div className="flex flex-col items-center py-4 border-t border-neutral-200">
            <p className="text-[10px] mb-2 font-medium text-neutral-500 uppercase tracking-wide">Contact us on WhatsApp</p>
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <QRCodeSVG value={getWhatsAppUrl()} size={72} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-neutral-200">
          {show_footer_message && footer_message && (
            <p className="font-medium text-sm text-neutral-800 mb-1">{footer_message}</p>
          )}
          <p className="text-xs text-neutral-500">We appreciate your business</p>
          <p className="text-[9px] mt-3 text-neutral-400">Powered by Kabejja Systems</p>
        </div>
      </div>
    );
  }
);

PrintReceipt.displayName = "PrintReceipt";

export const printReceipt = (receiptElement: HTMLElement | null) => {
  if (!receiptElement) return;

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 12px;
            padding: 10px;
            max-width: 320px;
            margin: 0 auto;
            -webkit-font-smoothing: antialiased;
          }
          .print-receipt {
            background: white;
            color: #171717;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-mono { font-family: 'SF Mono', 'Fira Code', monospace; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 13px; }
          .text-lg { font-size: 18px; }
          .text-xl { font-size: 20px; }
          .uppercase { text-transform: uppercase; }
          .capitalize { text-transform: capitalize; }
          .tracking-tight { letter-spacing: -0.025em; }
          .tracking-wide { letter-spacing: 0.05em; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .border-t { border-top: 1px solid #e5e5e5; }
          .border-y { border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5; }
          .bg-neutral-50 { background-color: #fafafa; }
          .bg-neutral-100 { background-color: #f5f5f5; }
          .bg-neutral-900 { background-color: #171717; }
          .text-white { color: white; }
          .text-neutral-400 { color: #a3a3a3; }
          .text-neutral-500 { color: #737373; }
          .text-neutral-600 { color: #525252; }
          .text-neutral-800 { color: #262626; }
          .text-neutral-900 { color: #171717; }
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .flex-1 { flex: 1; }
          .items-center { align-items: center; }
          .items-start { align-items: flex-start; }
          .items-end { align-items: flex-end; }
          .justify-between { justify-content: space-between; }
          .space-y-0\\.5 > * + * { margin-top: 2px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-1\\.5 > * + * { margin-top: 6px; }
          .space-y-2 > * + * { margin-top: 8px; }
          .w-10 { width: 2.5rem; }
          .w-20 { width: 5rem; }
          .h-14 { height: 3.5rem; }
          .w-auto { width: auto; }
          .object-contain { object-fit: contain; }
          .p-2 { padding: 8px; }
          .p-5 { padding: 20px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .py-3 { padding-top: 12px; padding-bottom: 12px; }
          .py-4 { padding-top: 16px; padding-bottom: 16px; }
          .px-1 { padding-left: 4px; padding-right: 4px; }
          .px-3 { padding-left: 12px; padding-right: 12px; }
          .px-4 { padding-left: 16px; padding-right: 16px; }
          .pt-3 { padding-top: 12px; }
          .pt-4 { padding-top: 16px; }
          .pb-4 { padding-bottom: 16px; }
          .pr-2 { padding-right: 8px; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-1 { margin-top: 4px; }
          .mt-3 { margin-top: 12px; }
          .rounded-md { border-radius: 6px; }
          .rounded-lg { border-radius: 8px; }
          .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          @media print {
            body { margin: 0; padding: 5mm; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        ${receiptElement.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
  
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.print();
    }
  }, 500);
};

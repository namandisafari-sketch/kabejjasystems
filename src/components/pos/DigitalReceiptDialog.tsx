import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Phone, Loader2, CheckCircle, Image, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { PrintReceipt } from "./PrintReceipt";

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

interface DigitalReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerPhone?: string;
  customerName?: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessLogo?: string;
  receiptNumber?: string;
  cashierName?: string;
  saleDate?: Date;
  settings?: ReceiptSettings;
}

export function DigitalReceiptDialog({
  open,
  onOpenChange,
  customerPhone,
  customerName,
  items,
  total,
  paymentMethod,
  businessName = "Kabejja Systems",
  businessPhone,
  businessEmail,
  businessAddress,
  businessLogo,
  receiptNumber,
  cashierName,
  saleDate,
  settings,
}: DigitalReceiptDialogProps) {
  const { toast } = useToast();
  const [sendMethod, setSendMethod] = useState<"whatsapp_image" | "whatsapp_text" | "sms">("whatsapp_image");
  const [phoneNumber, setPhoneNumber] = useState(customerPhone || "");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatReceiptMessage = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let message = `🧾 *${businessName}*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `📅 ${date} ${time}\n`;
    if (customerName) message += `👤 ${customerName}\n`;
    if (receiptNumber) message += `🔢 ${receiptNumber}\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    
    items.forEach((item) => {
      message += `${item.name}\n`;
      message += `  ${item.quantity} × ${item.price.toLocaleString()} = ${(item.quantity * item.price).toLocaleString()} UGX\n`;
    });
    
    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `💰 *TOTAL: ${total.toLocaleString()} UGX*\n`;
    message += `💳 Paid via: ${paymentMethod}\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `\nThank you for your purchase! 🙏`;
    
    return message;
  };

  const formatPhoneNumber = (phone: string) => {
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "256" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("256")) {
      formattedPhone = "256" + formattedPhone;
    }
    return formattedPhone;
  };

  const generateReceiptImage = async (): Promise<string | null> => {
    if (!receiptRef.current) return null;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      return canvas.toDataURL("image/jpeg", 0.95);
    } catch (error) {
      console.error("Error generating receipt image:", error);
      return null;
    }
  };

  const downloadReceiptImage = async () => {
    const imageData = await generateReceiptImage();
    if (!imageData) {
      toast({ title: "Failed to generate receipt image", variant: "destructive" });
      return null;
    }

    // Create download link
    const link = document.createElement("a");
    const fileName = `receipt-${receiptNumber || Date.now()}.jpg`;
    link.href = imageData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return fileName;
  };

  const handleSendWhatsAppImage = async () => {
    if (!phoneNumber) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }

    setIsSending(true);
    
    try {
      // Download the image first
      const fileName = await downloadReceiptImage();
      if (!fileName) {
        setIsSending(false);
        return;
      }

      // Format phone number and open WhatsApp
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const message = encodeURIComponent(`Hi! Here's your receipt from ${businessName}. I've attached the receipt image.`);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
      
      // Small delay to ensure download starts
      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
        setIsSending(false);
        setSent(true);
        toast({ 
          title: "Receipt downloaded!", 
          description: "Attach the downloaded image in WhatsApp chat." 
        });
      }, 500);
    } catch (error) {
      console.error("Error sending WhatsApp image:", error);
      toast({ title: "Failed to send receipt", variant: "destructive" });
      setIsSending(false);
    }
  };

  const handleSendWhatsAppText = () => {
    if (!phoneNumber) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }

    setIsSending(true);
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const message = encodeURIComponent(formatReceiptMessage());
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
    
    setTimeout(() => {
      setIsSending(false);
      setSent(true);
      toast({ title: "WhatsApp opened with receipt" });
    }, 500);
  };

  const handleSendSMS = () => {
    if (!phoneNumber) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }

    const message = encodeURIComponent(formatReceiptMessage().replace(/\*/g, "").replace(/━/g, "-"));
    const smsUrl = `sms:${phoneNumber}?body=${message}`;
    
    window.open(smsUrl, "_blank");
    setSent(true);
    toast({ title: "SMS app opened with receipt" });
  };

  const handleSend = () => {
    if (sendMethod === "whatsapp_image") {
      handleSendWhatsAppImage();
    } else if (sendMethod === "whatsapp_text") {
      handleSendWhatsAppText();
    } else {
      handleSendSMS();
    }
  };

  const handleDownloadOnly = async () => {
    setIsSending(true);
    const fileName = await downloadReceiptImage();
    setIsSending(false);
    if (fileName) {
      toast({ title: "Receipt downloaded!", description: fileName });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Digital Receipt
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="font-medium">Receipt Ready!</p>
            <p className="text-sm text-muted-foreground">
              {sendMethod === "whatsapp_image" 
                ? "Attach the downloaded image in WhatsApp to send."
                : "The customer will receive their receipt shortly."}
            </p>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="tel"
                    placeholder="0700123456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uganda number (will add +256)
                </p>
              </div>

              <div>
                <Label>Send via</Label>
                <RadioGroup
                  value={sendMethod}
                  onValueChange={(v) => setSendMethod(v as "whatsapp_image" | "whatsapp_text" | "sms")}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="whatsapp_image" id="whatsapp_image" />
                    <Label htmlFor="whatsapp_image" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Image className="h-4 w-4 text-green-500" />
                      <div>
                        <span className="font-medium">WhatsApp Image</span>
                        <span className="text-xs text-muted-foreground block">Download receipt as JPG, then attach in WhatsApp</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="whatsapp_text" id="whatsapp_text" />
                    <Label htmlFor="whatsapp_text" className="flex items-center gap-2 cursor-pointer flex-1">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <div>
                        <span className="font-medium">WhatsApp Text</span>
                        <span className="text-xs text-muted-foreground block">Send formatted text receipt</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Phone className="h-4 w-4" />
                      <div>
                        <span className="font-medium">SMS</span>
                        <span className="text-xs text-muted-foreground block">Send text message</span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Hidden receipt for image generation */}
              <div className="absolute -left-[9999px]">
                <PrintReceipt
                  ref={receiptRef}
                  businessName={businessName}
                  businessPhone={businessPhone}
                  businessEmail={businessEmail}
                  businessAddress={businessAddress}
                  businessLogo={businessLogo}
                  customerName={customerName}
                  items={items}
                  total={total}
                  paymentMethod={paymentMethod}
                  receiptNumber={receiptNumber}
                  cashierName={cashierName}
                  saleDate={saleDate}
                  settings={settings ? {
                    ...settings,
                    show_whatsapp_qr: false, // Don't show QR on digital receipt
                  } : undefined}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Receipt Preview</p>
                <div className="text-xs space-y-1">
                  {receiptNumber && <p className="font-mono text-muted-foreground">{receiptNumber}</p>}
                  {items.slice(0, 3).map((item, i) => (
                    <p key={i}>{item.name} × {item.quantity}</p>
                  ))}
                  {items.length > 3 && <p>+{items.length - 3} more items...</p>}
                  <p className="font-bold mt-2">Total: {total.toLocaleString()} UGX</p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadOnly} disabled={isSending}>
                <Download className="h-4 w-4 mr-2" />
                Download Only
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Skip
                </Button>
                <Button onClick={handleSend} disabled={isSending || !phoneNumber}>
                  {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Receipt
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

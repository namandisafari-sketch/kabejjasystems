import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Printer, CreditCard, RotateCcw, Plus, Minus, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ScrollArea } from "@/components/ui/scroll-area";

type CardData = {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  tagline: string;
  showQR: boolean;
  qrType: "website" | "vcard";
};

const cardTemplates = [
  { id: "modern", name: "Modern", bgFront: "bg-gradient-to-br from-primary to-primary/80", bgBack: "bg-gradient-to-br from-muted to-background" },
  { id: "classic", name: "Classic", bgFront: "bg-card border-2 border-primary", bgBack: "bg-card border-2 border-primary" },
  { id: "bold", name: "Bold", bgFront: "bg-gradient-to-r from-violet-600 to-indigo-600", bgBack: "bg-gradient-to-r from-slate-800 to-slate-900" },
  { id: "minimal", name: "Minimal", bgFront: "bg-background border border-border", bgBack: "bg-muted/50 border border-border" },
];

export default function BusinessCards() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState("modern");
  const [cardsPerPage, setCardsPerPage] = useState(10);
  const [activePreview, setActivePreview] = useState("front");
  const [cardData, setCardData] = useState<CardData>({
    name: "", title: "", phone: "", email: "", address: "", website: "", tagline: "", showQR: true, qrType: "vcard",
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-for-cards"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("tenant_id, full_name").eq("id", user.id).single();
      if (!profile?.tenant_id) return null;
      const { data: tenantData } = await supabase.from("tenants").select("name, phone, email, address, logo_url").eq("id", profile.tenant_id).single();
      return { ...tenantData, ownerName: profile.full_name };
    },
  });

  const prefillData = () => {
    if (tenant) {
      setCardData(prev => ({
        ...prev,
        name: tenant.ownerName || "",
        title: "Owner / Manager",
        phone: tenant.phone || "",
        email: tenant.email || "",
        address: tenant.address || "",
        tagline: tenant.name || "",
      }));
    }
  };

  const generateVCard = (data: CardData): string => {
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.name}\nORG:${data.tagline}\nTITLE:${data.title}\nTEL:${data.phone}\nEMAIL:${data.email}\nADR:;;${data.address};;;\nURL:${data.website}\nEND:VCARD`;
  };

  const getQRValue = (data: CardData): string => {
    if (data.qrType === "website" && data.website) {
      return data.website.startsWith("http") ? data.website : `https://${data.website}`;
    }
    return generateVCard(data);
  };

  const selectedTemplate = cardTemplates.find(t => t.id === template) || cardTemplates[0];
  const isLightTemplate = template === "classic" || template === "minimal";

  const handlePrint = () => window.print();

  const renderCardFront = (data: CardData) => (
    <div className={`w-full aspect-[1.75] ${selectedTemplate.bgFront} rounded-lg p-4 flex flex-col justify-between ${isLightTemplate ? "text-foreground" : "text-white"}`}>
      <div>
        {tenant?.logo_url && <img src={tenant.logo_url} alt="Logo" className="h-8 w-auto mb-2 object-contain" />}
        <h2 className="text-lg font-bold leading-tight">{data.tagline || "Your Business"}</h2>
      </div>
      <div>
        <p className="text-xl font-bold">{data.name || "Your Name"}</p>
        <p className={`text-sm ${isLightTemplate ? "text-muted-foreground" : "text-white/80"}`}>{data.title || "Your Title"}</p>
      </div>
    </div>
  );

  const renderCardBack = (data: CardData) => {
    const textColor = template === "bold" ? "text-white" : "text-foreground";
    const mutedColor = template === "bold" ? "text-white/70" : "text-muted-foreground";
    const qrBg = template === "bold" ? "bg-white p-1 rounded" : "";
    return (
      <div className={`w-full aspect-[1.75] ${selectedTemplate.bgBack} rounded-lg p-4 flex ${textColor}`}>
        <div className="flex-1 flex flex-col justify-center space-y-1 text-sm">
          {data.phone && <p><span className={mutedColor}>Phone:</span> {data.phone}</p>}
          {data.email && <p><span className={mutedColor}>Email:</span> {data.email}</p>}
          {data.website && <p><span className={mutedColor}>Web:</span> {data.website}</p>}
          {data.address && <p className="pt-2 text-xs leading-tight"><span className={mutedColor}>Address:</span><br />{data.address}</p>}
        </div>
        {data.showQR && (data.website || data.phone || data.email) && (
          <div className={`flex items-center justify-center ${qrBg}`}>
            <QRCodeSVG value={getQRValue(data)} size={70} level="M" bgColor="transparent" fgColor={template === "bold" ? "#000000" : "currentColor"} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Business Cards</h1>
            <p className="text-xs text-muted-foreground">Design & print cards</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prefillData}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 pb-20">
        <div className="p-4 space-y-4">
          {/* PREVIEW */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activePreview} onValueChange={setActivePreview} className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="front">Front</TabsTrigger>
                  <TabsTrigger value="back">Back</TabsTrigger>
                </TabsList>
                <TabsContent value="front" className="mt-0">
                  {renderCardFront(cardData)}
                </TabsContent>
                <TabsContent value="back" className="mt-0">
                  {renderCardBack(cardData)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* TEMPLATE & SETTINGS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cardTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cards/Page</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCardsPerPage(Math.max(2, cardsPerPage - 2))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{cardsPerPage}</span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCardsPerPage(Math.min(10, cardsPerPage + 2))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* FORM */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Card Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Business Name</Label>
                <Input value={cardData.tagline} onChange={(e) => setCardData({ ...cardData, tagline: e.target.value })} placeholder="Your Business" className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input value={cardData.name} onChange={(e) => setCardData({ ...cardData, name: e.target.value })} placeholder="John Doe" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={cardData.title} onChange={(e) => setCardData({ ...cardData, title: e.target.value })} placeholder="Manager" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={cardData.phone} onChange={(e) => setCardData({ ...cardData, phone: e.target.value })} placeholder="+256..." className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={cardData.email} onChange={(e) => setCardData({ ...cardData, email: e.target.value })} placeholder="email@..." className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input value={cardData.website} onChange={(e) => setCardData({ ...cardData, website: e.target.value })} placeholder="www.example.com" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input value={cardData.address} onChange={(e) => setCardData({ ...cardData, address: e.target.value })} placeholder="123 Street, City" className="h-9" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <Label className="text-xs">Show QR Code</Label>
                </div>
                <Switch checked={cardData.showQR} onCheckedChange={(checked) => setCardData({ ...cardData, showQR: checked })} />
              </div>
              {cardData.showQR && (
                <div>
                  <Label className="text-xs">QR Links To</Label>
                  <Select value={cardData.qrType} onValueChange={(v: "website" | "vcard") => setCardData({ ...cardData, qrType: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vcard">Contact Card</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* PRINT LAYOUT (hidden) */}
      <div className="hidden print:block" ref={printRef}>
        <style>{`@media print { @page { size: A4; margin: 10mm; } body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 210mm; } }`}</style>
        <div className="print-area">
          <p className="text-xs text-center mb-2 text-muted-foreground">Front Side</p>
          <div className="grid grid-cols-2 gap-[3mm]">
            {Array.from({ length: cardsPerPage }).map((_, i) => (
              <div key={`front-${i}`} className="border border-dashed border-gray-300 w-[85mm] h-[55mm]">
                {renderCardFront(cardData)}
              </div>
            ))}
          </div>
          <div className="page-break-before mt-8 pt-4 border-t-2 border-dashed">
            <p className="text-xs text-center mb-2 text-muted-foreground">Back Side</p>
            <div className="grid grid-cols-2 gap-[3mm]">
              {Array.from({ length: cardsPerPage }).map((_, i) => (
                <div key={`back-${i}`} className="border border-dashed border-gray-300 w-[85mm] h-[55mm]">
                  {renderCardBack(cardData)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

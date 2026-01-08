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
  const [cardData, setCardData] = useState<CardData>({
    name: "",
    title: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    tagline: "",
    showQR: true,
    qrType: "vcard",
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-for-cards"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, full_name")
        .eq("id", user.id)
        .single();
      
      if (!profile?.tenant_id) return null;
      
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("name, phone, email, address, logo_url")
        .eq("id", profile.tenant_id)
        .single();
      
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
        website: "",
        tagline: tenant.name || "",
      }));
    }
  };

  // Generate vCard string for QR code
  const generateVCard = (data: CardData): string => {
    return `BEGIN:VCARD
VERSION:3.0
FN:${data.name}
ORG:${data.tagline}
TITLE:${data.title}
TEL:${data.phone}
EMAIL:${data.email}
ADR:;;${data.address};;;
URL:${data.website}
END:VCARD`;
  };

  // Get QR code value based on type
  const getQRValue = (data: CardData): string => {
    if (data.qrType === "website" && data.website) {
      return data.website.startsWith("http") ? data.website : `https://${data.website}`;
    }
    return generateVCard(data);
  };

  const selectedTemplate = cardTemplates.find(t => t.id === template) || cardTemplates[0];
  const isLightTemplate = template === "classic" || template === "minimal";

  const handlePrint = () => {
    window.print();
  };

  const renderCardFront = (data: CardData, size: "preview" | "print" = "preview") => {
    const sizeClass = size === "print" ? "w-[85mm] h-[55mm]" : "w-full aspect-[1.75]";
    return (
      <div className={`${sizeClass} ${selectedTemplate.bgFront} rounded-lg p-4 flex flex-col justify-between ${isLightTemplate ? "text-foreground" : "text-white"}`}>
        <div>
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt="Logo" className="h-8 w-auto mb-2 object-contain" />
          )}
          <h2 className="text-lg font-bold leading-tight">{data.tagline || "Your Business"}</h2>
        </div>
        <div>
          <p className="text-xl font-bold">{data.name || "Your Name"}</p>
          <p className={`text-sm ${isLightTemplate ? "text-muted-foreground" : "text-white/80"}`}>{data.title || "Your Title"}</p>
        </div>
      </div>
    );
  };

  const renderCardBack = (data: CardData, size: "preview" | "print" = "preview") => {
    const sizeClass = size === "print" ? "w-[85mm] h-[55mm]" : "w-full aspect-[1.75]";
    const textColor = template === "bold" ? "text-white" : "text-foreground";
    const mutedColor = template === "bold" ? "text-white/70" : "text-muted-foreground";
    const qrBg = template === "bold" ? "bg-white p-1 rounded" : "";
    
    return (
      <div className={`${sizeClass} ${selectedTemplate.bgBack} rounded-lg p-4 flex ${textColor}`}>
        <div className="flex-1 flex flex-col justify-center space-y-1 text-sm">
          {data.phone && (
            <p><span className={mutedColor}>Phone:</span> {data.phone}</p>
          )}
          {data.email && (
            <p><span className={mutedColor}>Email:</span> {data.email}</p>
          )}
          {data.website && (
            <p><span className={mutedColor}>Web:</span> {data.website}</p>
          )}
          {data.address && (
            <p className="pt-2 text-xs leading-tight"><span className={mutedColor}>Address:</span><br />{data.address}</p>
          )}
        </div>
        {data.showQR && (data.website || data.phone || data.email) && (
          <div className={`flex items-center justify-center ${qrBg}`}>
            <QRCodeSVG
              value={getQRValue(data)}
              size={size === "print" ? 80 : 70}
              level="M"
              bgColor="transparent"
              fgColor={template === "bold" ? "#000000" : "currentColor"}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Business Cards</h1>
          <p className="text-muted-foreground">Design and print professional business cards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prefillData}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Load Business Info
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print A4 Sheet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Card Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cardTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cards per Page</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCardsPerPage(Math.max(2, cardsPerPage - 2))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{cardsPerPage}</span>
                  <Button variant="outline" size="icon" onClick={() => setCardsPerPage(Math.min(10, cardsPerPage + 2))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Business / Tagline</Label>
              <Input 
                value={cardData.tagline} 
                onChange={(e) => setCardData({ ...cardData, tagline: e.target.value })}
                placeholder="Your Business Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={cardData.name} 
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Title / Position</Label>
                <Input 
                  value={cardData.title} 
                  onChange={(e) => setCardData({ ...cardData, title: e.target.value })}
                  placeholder="CEO / Manager"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={cardData.phone} 
                  onChange={(e) => setCardData({ ...cardData, phone: e.target.value })}
                  placeholder="+256 700 000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  value={cardData.email} 
                  onChange={(e) => setCardData({ ...cardData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input 
                value={cardData.website} 
                onChange={(e) => setCardData({ ...cardData, website: e.target.value })}
                placeholder="www.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={cardData.address} 
                onChange={(e) => setCardData({ ...cardData, address: e.target.value })}
                placeholder="123 Business Street, City"
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <Label>Show QR Code</Label>
                </div>
                <Switch
                  checked={cardData.showQR}
                  onCheckedChange={(checked) => setCardData({ ...cardData, showQR: checked })}
                />
              </div>
              
              {cardData.showQR && (
                <div className="space-y-2">
                  <Label>QR Code Links To</Label>
                  <Select value={cardData.qrType} onValueChange={(v: "website" | "vcard") => setCardData({ ...cardData, qrType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vcard">Contact Card (vCard)</SelectItem>
                      <SelectItem value="website">Website URL</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {cardData.qrType === "vcard" 
                      ? "Scanning saves your contact info directly to phone" 
                      : "Scanning opens your website"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="front" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">Front</TabsTrigger>
                <TabsTrigger value="back">Back</TabsTrigger>
              </TabsList>
              <TabsContent value="front" className="mt-4">
                <div className="max-w-sm mx-auto">
                  {renderCardFront(cardData)}
                </div>
              </TabsContent>
              <TabsContent value="back" className="mt-4">
                <div className="max-w-sm mx-auto">
                  {renderCardBack(cardData)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* A4 Print Layout - Hidden on screen, visible when printing */}
      <div className="hidden print:block" ref={printRef}>
        <style>
          {`
            @media print {
              @page { size: A4; margin: 10mm; }
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area { position: absolute; left: 0; top: 0; width: 210mm; }
            }
          `}
        </style>
        <div className="print-area">
          <p className="text-xs text-center mb-2 text-muted-foreground">Front Side - Cut along the lines</p>
          <div className="grid grid-cols-2 gap-[3mm]">
            {Array.from({ length: cardsPerPage }).map((_, i) => (
              <div key={`front-${i}`} className="border border-dashed border-gray-300">
                {renderCardFront(cardData, "print")}
              </div>
            ))}
          </div>
          
          <div className="page-break-before mt-8 pt-4 border-t-2 border-dashed">
            <p className="text-xs text-center mb-2 text-muted-foreground">Back Side - Align with front side cards</p>
            <div className="grid grid-cols-2 gap-[3mm]">
              {Array.from({ length: cardsPerPage }).map((_, i) => (
                <div key={`back-${i}`} className="border border-dashed border-gray-300">
                  {renderCardBack(cardData, "print")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

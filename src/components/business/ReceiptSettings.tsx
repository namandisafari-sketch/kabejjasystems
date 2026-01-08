import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, AlignLeft, AlignCenter, AlignRight, MessageSquare, Image, Eye, Save, Loader2, Upload, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ReceiptSettingsProps {
  tenantId: string | null;
  businessName?: string;
  currentLogoUrl?: string | null;
  onLogoUpdate?: (url: string | null) => void;
}

interface ReceiptSettingsData {
  id: string;
  tenant_id: string;
  receipt_prefix: string;
  next_receipt_number: number;
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

export const ReceiptSettings = ({ tenantId, businessName = "My Business", currentLogoUrl, onLogoUpdate }: ReceiptSettingsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<Partial<ReceiptSettingsData>>({
    receipt_prefix: "RCP",
    logo_alignment: "center",
    show_logo: true,
    show_phone: true,
    show_email: true,
    show_address: true,
    whatsapp_number: "",
    show_whatsapp_qr: false,
    seasonal_remark: "",
    show_seasonal_remark: false,
    footer_message: "Thank you for shopping with us!",
    show_footer_message: true,
    show_cashier: true,
    show_customer: true,
    show_date_time: true,
    show_payment_method: true,
  });

  const { data: receiptSettings, isLoading } = useQuery({
    queryKey: ["receipt-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("receipt_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ReceiptSettingsData | null;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (receiptSettings) {
      setSettings(receiptSettings);
    }
  }, [receiptSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ReceiptSettingsData>) => {
      if (!tenantId) throw new Error("No tenant ID");
      
      const { error } = await supabase
        .from("receipt_settings")
        .upsert({
          tenant_id: tenantId,
          ...data,
        }, { onConflict: "tenant_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-settings", tenantId] });
      toast({ title: "Success", description: "Receipt settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName);

      // Update tenant with logo URL
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      onLogoUpdate?.(publicUrl);
      toast({ title: "Success", description: "Logo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!tenantId) return;

    try {
      // Update tenant to remove logo URL
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenantId);

      if (error) throw error;

      onLogoUpdate?.(null);
      toast({ title: "Success", description: "Logo removed successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getWhatsAppUrl = () => {
    if (!settings.whatsapp_number) return "";
    const cleanNumber = settings.whatsapp_number.replace(/\D/g, "");
    const message = encodeURIComponent(`Hello ${businessName}! I recently made a purchase and I would like to inquire about it.`);
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Receipt Numbering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Numbering
          </CardTitle>
          <CardDescription>Configure how receipt numbers are generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Receipt Prefix</Label>
              <Input
                value={settings.receipt_prefix || ""}
                onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value.toUpperCase() })}
                placeholder="RCP"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground">Example: {settings.receipt_prefix}-20251225-000001</p>
            </div>
            <div className="space-y-2">
              <Label>Next Receipt Number</Label>
              <Input
                type="number"
                value={receiptSettings?.next_receipt_number || 1}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">This auto-increments with each sale</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload & Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Business Logo
          </CardTitle>
          <CardDescription>Upload your logo for receipts and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Upload Logo</Label>
            <div className="flex items-center gap-4">
              {currentLogoUrl ? (
                <div className="relative">
                  <img 
                    src={currentLogoUrl} 
                    alt="Business Logo" 
                    className="h-20 w-auto object-contain border rounded-lg p-2 bg-white"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                  <Image className="h-8 w-8" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {currentLogoUrl ? "Change Logo" : "Upload Logo"}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          {/* Show Logo Toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label>Show Logo on Receipts</Label>
              <p className="text-sm text-muted-foreground">Display your logo on printed receipts</p>
            </div>
            <Switch
              checked={settings.show_logo}
              onCheckedChange={(checked) => setSettings({ ...settings, show_logo: checked })}
            />
          </div>
          
          {settings.show_logo && (
            <div className="space-y-2">
              <Label>Logo Alignment</Label>
              <RadioGroup
                value={settings.logo_alignment}
                onValueChange={(value) => setSettings({ ...settings, logo_alignment: value as "left" | "center" | "right" })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="left" />
                  <Label htmlFor="left" className="flex items-center gap-1 cursor-pointer">
                    <AlignLeft className="h-4 w-4" /> Left
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="center" id="center" />
                  <Label htmlFor="center" className="flex items-center gap-1 cursor-pointer">
                    <AlignCenter className="h-4 w-4" /> Center
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="right" />
                  <Label htmlFor="right" className="flex items-center gap-1 cursor-pointer">
                    <AlignRight className="h-4 w-4" /> Right
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visible Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visible Fields
          </CardTitle>
          <CardDescription>Choose which information appears on receipts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Phone Number</Label>
              <Switch
                checked={settings.show_phone}
                onCheckedChange={(checked) => setSettings({ ...settings, show_phone: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Email Address</Label>
              <Switch
                checked={settings.show_email}
                onCheckedChange={(checked) => setSettings({ ...settings, show_email: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Business Address</Label>
              <Switch
                checked={settings.show_address}
                onCheckedChange={(checked) => setSettings({ ...settings, show_address: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Date & Time</Label>
              <Switch
                checked={settings.show_date_time}
                onCheckedChange={(checked) => setSettings({ ...settings, show_date_time: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Cashier Name</Label>
              <Switch
                checked={settings.show_cashier}
                onCheckedChange={(checked) => setSettings({ ...settings, show_cashier: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Customer Name</Label>
              <Switch
                checked={settings.show_customer}
                onCheckedChange={(checked) => setSettings({ ...settings, show_customer: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label>Payment Method</Label>
              <Switch
                checked={settings.show_payment_method}
                onCheckedChange={(checked) => setSettings({ ...settings, show_payment_method: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp QR Code
          </CardTitle>
          <CardDescription>Add a QR code for customers to contact you via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show WhatsApp QR on Receipts</Label>
              <p className="text-sm text-muted-foreground">Customers can scan to message you</p>
            </div>
            <Switch
              checked={settings.show_whatsapp_qr}
              onCheckedChange={(checked) => setSettings({ ...settings, show_whatsapp_qr: checked })}
            />
          </div>
          
          {settings.show_whatsapp_qr && (
            <>
              <div className="space-y-2">
                <Label>WhatsApp Number (with country code)</Label>
                <Input
                  value={settings.whatsapp_number || ""}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  placeholder="+256700000000"
                />
                <p className="text-xs text-muted-foreground">Include country code without spaces (e.g., +256700000000)</p>
              </div>
              
              {settings.whatsapp_number && (
                <div className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm">QR Code Preview</Label>
                  <div className="bg-white p-2 rounded">
                    <QRCodeSVG value={getWhatsAppUrl()} size={100} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Scanning this QR will open WhatsApp with a pre-filled message mentioning your business
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Remarks */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Remarks</CardTitle>
          <CardDescription>Add festive or promotional messages to your receipts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Seasonal Remark</Label>
              <p className="text-sm text-muted-foreground">Display a special message on receipts</p>
            </div>
            <Switch
              checked={settings.show_seasonal_remark}
              onCheckedChange={(checked) => setSettings({ ...settings, show_seasonal_remark: checked })}
            />
          </div>
          
          {settings.show_seasonal_remark && (
            <div className="space-y-2">
              <Label>Seasonal Message</Label>
              <Textarea
                value={settings.seasonal_remark || ""}
                onChange={(e) => setSettings({ ...settings, seasonal_remark: e.target.value })}
                placeholder="🎉 Happy New Year 2025! Thank you for your continued support!"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings({ ...settings, seasonal_remark: "🎄 Merry Christmas & Happy Holidays!" })}
                >
                  Christmas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings({ ...settings, seasonal_remark: "🎉 Happy New Year 2025!" })}
                >
                  New Year
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings({ ...settings, seasonal_remark: "🌙 Eid Mubarak!" })}
                >
                  Eid
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettings({ ...settings, seasonal_remark: "💝 Happy Valentine's Day!" })}
                >
                  Valentine
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Message */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Message</CardTitle>
          <CardDescription>Customize the thank you message at the bottom of receipts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Footer Message</Label>
              <p className="text-sm text-muted-foreground">Display a closing message</p>
            </div>
            <Switch
              checked={settings.show_footer_message}
              onCheckedChange={(checked) => setSettings({ ...settings, show_footer_message: checked })}
            />
          </div>
          
          {settings.show_footer_message && (
            <div className="space-y-2">
              <Label>Footer Message</Label>
              <Textarea
                value={settings.footer_message || ""}
                onChange={(e) => setSettings({ ...settings, footer_message: e.target.value })}
                placeholder="Thank you for shopping with us!"
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} size="lg">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Receipt Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import QRCode from "qrcode";
import {
  Plus,
  QrCode,
  Copy,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Link,
  BarChart3,
  Megaphone,
} from "lucide-react";

export default function RentalListingBanners() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ["rental-properties", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_properties")
        .select("id, name")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["rental-listing-banners", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_listing_banners")
        .select("*, rental_properties(name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateSlug = useCallback((propertyName: string) => {
    const base = propertyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  }, []);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setPropertyId("");
      setBannerImage(null);
      setBannerPreview(null);
      setEditingBanner(null);
    }
  }, [open]);

  useEffect(() => {
    if (editingBanner) {
      setTitle(editingBanner.title);
      setPropertyId(editingBanner.property_id);
      if (editingBanner.banner_image_url) {
        setBannerPreview(editingBanner.banner_image_url);
      }
    }
  }, [editingBanner]);

  useEffect(() => {
    if (!bannerImage) {
      setBannerPreview(null);
      return;
    }
    const url = URL.createObjectURL(bannerImage);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerImage]);

  const getBannerUrl = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const filePath = `banners/${tenantId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("rental-uploads")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("rental-uploads")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = generateSlug(
        properties.find((p) => p.id === propertyId)?.name || "banner"
      );
      let bannerImageUrl: string | null = null;

      if (bannerImage) {
        bannerImageUrl = await getBannerUrl(bannerImage);
      }

      const { error } = await supabase.from("rental_listing_banners").insert({
        tenant_id: tenantId,
        property_id: propertyId,
        title,
        slug,
        banner_image_url: bannerImageUrl,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-listing-banners"] });
      setOpen(false);
      toast({ title: "Banner created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingBanner) throw new Error("No banner to edit");

      let bannerImageUrl = editingBanner.banner_image_url;
      if (bannerImage) {
        bannerImageUrl = await getBannerUrl(bannerImage);
      }

      const { error } = await supabase
        .from("rental_listing_banners")
        .update({
          title,
          property_id: propertyId,
          banner_image_url: bannerImageUrl,
        })
        .eq("id", editingBanner.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-listing-banners"] });
      setOpen(false);
      toast({ title: "Banner updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("rental_listing_banners")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-listing-banners"] });
      toast({ title: "Banner status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rental_listing_banners")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-listing-banners"] });
      setDeleteOpen(null);
      toast({ title: "Banner deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDownloadQR = async (slug: string, title: string) => {
    const url = `${window.location.origin}/listing/${slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 400 });
    const link = document.createElement("a");
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_qr.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/listing/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBanner) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const activeCount = banners.filter((b) => b.is_active).length;
  const totalScans = banners.reduce(
    (sum: number, b: any) => sum + (b.click_count || 0),
    0
  );

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listing Banners</h1>
          <p className="text-muted-foreground">Manage property listing banners with QR codes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBanner(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit Banner" : "Create Banner"}</DialogTitle>
              <DialogDescription>
                Create a new listing banner with a QR code for your property.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Summer Special"
                  required
                />
              </div>
              <div>
                <Label>Property</Label>
                <Select value={propertyId} onValueChange={setPropertyId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Banner Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerImage(e.target.files?.[0] || null)}
                />
                {bannerPreview && (
                  <div className="mt-2 relative rounded-md overflow-hidden border h-32">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || uploading}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingBanner
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Banners</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{banners.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Active Banners</CardTitle>
            <ToggleRight className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total QR Scans</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScans}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Banners
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banner</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner: any) => (
                <BannerRow
                  key={banner.id}
                  banner={banner}
                  onToggle={() =>
                    toggleMutation.mutate({
                      id: banner.id,
                      is_active: banner.is_active,
                    })
                  }
                  onDelete={() => setDeleteOpen(banner.id)}
                  onEdit={() => {
                    setEditingBanner(banner);
                    setOpen(true);
                  }}
                  onDownloadQR={() => handleDownloadQR(banner.slug, banner.title)}
                  onCopyLink={() => handleCopyLink(banner.slug)}
                />
              ))}
              {banners.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No banners created yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteOpen}
        onOpenChange={(o) => !o && setDeleteOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this banner? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOpen && deleteMutation.mutate(deleteOpen)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BannerRow({
  banner,
  onToggle,
  onDelete,
  onEdit,
  onDownloadQR,
  onCopyLink,
}: {
  banner: any;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDownloadQR: () => void;
  onCopyLink: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const url = `${window.location.origin}/listing/${banner.slug}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 100 }).then(setQrDataUrl).catch(console.error);
  }, [url]);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 rounded border overflow-hidden bg-muted flex-shrink-0">
            {banner.banner_image_url ? (
              <img
                src={banner.banner_image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <span className="font-medium truncate max-w-[150px]">{banner.title}</span>
        </div>
      </TableCell>
      <TableCell>{(banner.rental_properties as any)?.name || "-"}</TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{banner.slug}</code>
      </TableCell>
      <TableCell>
        <Badge className={banner.is_active ? "bg-emerald-500" : ""} variant={banner.is_active ? "default" : "secondary"}>
          {banner.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-1">
            <img
              src={qrDataUrl}
              alt={`QR for ${banner.slug}`}
              className="w-16 h-16"
            />
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              {url}
            </span>
          </div>
        ) : (
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
            <QrCode className="h-4 w-4 text-muted-foreground animate-pulse" />
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(banner.created_at), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onToggle} title={banner.is_active ? "Deactivate" : "Activate"}>
            {banner.is_active ? (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDownloadQR} title="Download QR">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onCopyLink} title="Copy link">
            <Link className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

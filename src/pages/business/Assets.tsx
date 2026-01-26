import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { 
  Package, Plus, Search, Filter, Edit, Trash2, Wrench, 
  Users, AlertTriangle, TrendingDown, Building2, Calendar,
  FileText, BarChart3, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ASSET_CATEGORIES = [
  { value: "furniture", label: "Furniture", icon: "🪑" },
  { value: "equipment", label: "Equipment", icon: "🖥️" },
  { value: "books", label: "Books & Materials", icon: "📚" },
  { value: "sports", label: "Sports & Recreation", icon: "⚽" },
  { value: "electronics", label: "Electronics", icon: "💻" },
  { value: "musical_instruments", label: "Musical Instruments", icon: "🎸" },
  { value: "lab_equipment", label: "Lab Equipment", icon: "🔬" },
  { value: "teaching_aids", label: "Teaching Aids", icon: "📊" },
  { value: "vehicles", label: "Vehicles", icon: "🚌" },
  { value: "other", label: "Other", icon: "📦" },
];

const ASSET_CONDITIONS = [
  { value: "excellent", label: "Excellent", color: "bg-green-500" },
  { value: "good", label: "Good", color: "bg-blue-500" },
  { value: "fair", label: "Fair", color: "bg-yellow-500" },
  { value: "poor", label: "Poor", color: "bg-orange-500" },
  { value: "needs_repair", label: "Needs Repair", color: "bg-red-500" },
  { value: "damaged", label: "Damaged", color: "bg-red-700" },
  { value: "disposed", label: "Disposed", color: "bg-gray-500" },
];

interface AssetFormData {
  name: string;
  description: string;
  category: string;
  sub_category: string;
  quantity: number;
  unit_cost: number;
  location: string;
  condition: string;
  purchase_date: string;
  supplier: string;
  invoice_number: string;
  warranty_expiry: string;
  useful_life_years: number;
  salvage_value: number;
  serial_number: string;
  barcode: string;
  notes: string;
}

const defaultFormData: AssetFormData = {
  name: "",
  description: "",
  category: "other",
  sub_category: "",
  quantity: 1,
  unit_cost: 0,
  location: "",
  condition: "good",
  purchase_date: "",
  supplier: "",
  invoice_number: "",
  warranty_expiry: "",
  useful_life_years: 5,
  salvage_value: 0,
  serial_number: "",
  barcode: "",
  notes: "",
};

export default function Assets() {
  const { data: tenantData } = useTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [formData, setFormData] = useState<AssetFormData>(defaultFormData);

  // Fetch assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ["school-assets", tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];
      const { data, error } = await supabase
        .from("school_assets")
        .select(`
          *,
          assigned_class:school_classes(name),
          assigned_teacher:employees(full_name)
        `)
        .eq("tenant_id", tenantData.tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantData?.tenantId,
  });

  // Fetch classes for assignment
  const { data: classes } = useQuery({
    queryKey: ["school-classes", tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];
      const { data, error } = await supabase
        .from("school_classes")
        .select("id, name")
        .eq("tenant_id", tenantData.tenantId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantData?.tenantId,
  });

  // Create/Update asset mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AssetFormData & { id?: string }) => {
      if (data.id) {
        // Update existing asset
        const { error } = await supabase
          .from("school_assets")
          .update({
            name: data.name,
            description: data.description || null,
            category: data.category as "furniture" | "equipment" | "books" | "sports" | "electronics" | "musical_instruments" | "lab_equipment" | "teaching_aids" | "vehicles" | "other",
            sub_category: data.sub_category || null,
            quantity: data.quantity,
            unit_cost: data.unit_cost || null,
            location: data.location || null,
            condition: data.condition as "excellent" | "good" | "fair" | "poor" | "needs_repair" | "damaged" | "disposed",
            purchase_date: data.purchase_date || null,
            supplier: data.supplier || null,
            invoice_number: data.invoice_number || null,
            warranty_expiry: data.warranty_expiry || null,
            useful_life_years: data.useful_life_years || null,
            salvage_value: data.salvage_value || null,
            serial_number: data.serial_number || null,
            barcode: data.barcode || null,
            notes: data.notes || null,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        // Insert new asset - asset_code will be auto-generated by trigger
        const { error } = await supabase
          .from("school_assets")
          .insert([{
            asset_code: "", // Trigger will generate this
            name: data.name,
            description: data.description || null,
            category: data.category as "furniture" | "equipment" | "books" | "sports" | "electronics" | "musical_instruments" | "lab_equipment" | "teaching_aids" | "vehicles" | "other",
            sub_category: data.sub_category || null,
            quantity: data.quantity,
            unit_cost: data.unit_cost || null,
            location: data.location || null,
            condition: data.condition as "excellent" | "good" | "fair" | "poor" | "needs_repair" | "damaged" | "disposed",
            purchase_date: data.purchase_date || null,
            supplier: data.supplier || null,
            invoice_number: data.invoice_number || null,
            warranty_expiry: data.warranty_expiry || null,
            useful_life_years: data.useful_life_years || null,
            salvage_value: data.salvage_value || null,
            serial_number: data.serial_number || null,
            barcode: data.barcode || null,
            notes: data.notes || null,
            tenant_id: tenantData?.tenantId!,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-assets"] });
      setIsFormOpen(false);
      setEditingAsset(null);
      setFormData(defaultFormData);
      toast({
        title: editingAsset ? "Asset updated" : "Asset added",
        description: "The asset has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete asset mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("school_assets")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-assets"] });
      toast({ title: "Asset removed", description: "The asset has been archived." });
    },
  });

  // Filter assets
  const filteredAssets = assets?.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(search.toLowerCase()) ||
      asset.location?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
    const matchesCondition = conditionFilter === "all" || asset.condition === conditionFilter;
    return matchesSearch && matchesCategory && matchesCondition;
  }) || [];

  // Calculate stats
  const stats = {
    totalAssets: assets?.length || 0,
    totalValue: assets?.reduce((sum, a) => sum + (a.total_value || 0), 0) || 0,
    currentBookValue: assets?.reduce((sum, a) => sum + (a.current_book_value || 0), 0) || 0,
    needsRepair: assets?.filter((a) => a.condition === "needs_repair" || a.condition === "damaged").length || 0,
    expiringWarranty: assets?.filter((a) => {
      if (!a.warranty_expiry) return false;
      const daysUntil = Math.ceil((new Date(a.warranty_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30;
    }).length || 0,
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description || "",
      category: asset.category,
      sub_category: asset.sub_category || "",
      quantity: asset.quantity,
      unit_cost: asset.unit_cost || 0,
      location: asset.location || "",
      condition: asset.condition,
      purchase_date: asset.purchase_date || "",
      supplier: asset.supplier || "",
      invoice_number: asset.invoice_number || "",
      warranty_expiry: asset.warranty_expiry || "",
      useful_life_years: asset.useful_life_years || 5,
      salvage_value: asset.salvage_value || 0,
      serial_number: asset.serial_number || "",
      barcode: asset.barcode || "",
      notes: asset.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, id: editingAsset?.id });
  };

  const getConditionBadge = (condition: string) => {
    const cond = ASSET_CONDITIONS.find((c) => c.value === condition);
    return (
      <Badge variant="outline" className="text-xs">
        <span className={`w-2 h-2 rounded-full mr-1.5 ${cond?.color || "bg-gray-400"}`} />
        {cond?.label || condition}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    return ASSET_CATEGORIES.find((c) => c.value === category)?.icon || "📦";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">School Assets</h1>
          <p className="text-sm text-muted-foreground">Track and manage all school property</p>
        </div>
        <Sheet open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingAsset(null);
            setFormData(defaultFormData);
          }
        }}>
          <SheetTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="w-4 h-4" />
              Add Asset
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</SheetTitle>
              <SheetDescription>
                {editingAsset ? "Update asset details" : "Enter the asset information below"}
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Student Desk"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Condition *</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(v) => setFormData({ ...formData, condition: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CONDITIONS.map((cond) => (
                          <SelectItem key={cond.value} value={cond.value}>
                            {cond.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_cost">Unit Cost (UGX)</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      min={0}
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Room 101, Library"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about the asset..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="purchase_date">Purchase Date</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                    <Input
                      id="warranty_expiry"
                      type="date"
                      value={formData.warranty_expiry}
                      onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice_number">Invoice #</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="INV-001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="useful_life_years">Useful Life (Years)</Label>
                    <Input
                      id="useful_life_years"
                      type="number"
                      min={1}
                      value={formData.useful_life_years}
                      onChange={(e) => setFormData({ ...formData, useful_life_years: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salvage_value">Salvage Value</Label>
                    <Input
                      id="salvage_value"
                      type="number"
                      min={0}
                      value={formData.salvage_value}
                      onChange={(e) => setFormData({ ...formData, salvage_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="serial_number">Serial Number</Label>
                    <Input
                      id="serial_number"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingAsset ? "Update" : "Add Asset"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xs text-muted-foreground">Total Assets</p>
                <p className="text-lg font-bold">{stats.totalAssets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold">{(stats.totalValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xs text-muted-foreground">Book Value</p>
                <p className="text-lg font-bold">{(stats.currentBookValue / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xs text-muted-foreground">Needs Repair</p>
                <p className="text-lg font-bold">{stats.needsRepair}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {ASSET_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {ASSET_CONDITIONS.map((cond) => (
                <SelectItem key={cond.value} value={cond.value}>
                  {cond.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assets List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">No assets found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || categoryFilter !== "all" || conditionFilter !== "all"
                ? "Try adjusting your filters"
                : "Start by adding your first asset"}
            </p>
            {!search && categoryFilter === "all" && conditionFilter === "all" && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Asset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getCategoryIcon(asset.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">{asset.name}</h3>
                        <p className="text-xs text-muted-foreground">{asset.asset_code}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(asset)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(asset.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getConditionBadge(asset.condition)}
                      <Badge variant="secondary" className="text-xs">
                        Qty: {asset.quantity}
                      </Badge>
                      {asset.location && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          {asset.location}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>
                        Value: <span className="font-medium text-foreground">
                          UGX {(asset.current_book_value || 0).toLocaleString()}
                        </span>
                      </span>
                      {asset.purchase_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(asset.purchase_date), "MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

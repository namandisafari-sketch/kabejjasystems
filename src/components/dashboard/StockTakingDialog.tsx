import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertTriangle, CheckCircle2, Download, Save, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { StockTakingItem, ProductForStockTaking, StockVarianceReport } from "@/types/stock-taking";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0 }).format(amount);

interface StockTakingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onStockTakingComplete?: (stockTakingId: string) => void;
}

export const StockTakingDialog = ({ isOpen, onClose, tenantId, onStockTakingComplete }: StockTakingDialogProps) => {
  const [step, setStep] = useState<"products" | "variance" | "complete">("products");
  const [products, setProducts] = useState<ProductForStockTaking[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductForStockTaking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockTakingItems, setStockTakingItems] = useState<Map<string, StockTakingItem>>(new Map());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [varianceReport, setVarianceReport] = useState<StockVarianceReport | null>(null);
  const [stockTakingId, setStockTakingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchProducts();
    }
  }, [isOpen, tenantId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, category, unit_price, cost_price, stock_quantity, min_stock_level, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products");
    }
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase()) ||
        p.category?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const handleCountedQuantityChange = (productId: string, countedQuantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const item: StockTakingItem = {
      id: `temp-${productId}`,
      stock_taking_id: "",
      product_id: productId,
      system_quantity: product.stock_quantity,
      counted_quantity: countedQuantity,
      variance: countedQuantity - product.stock_quantity,
      variance_percentage:
        product.stock_quantity === 0
          ? 0
          : Math.round(((countedQuantity - product.stock_quantity) / product.stock_quantity) * 100 * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: product.unit_price,
        cost_price: product.cost_price,
        category: product.category,
      },
    };

    setStockTakingItems((prev) => new Map(prev).set(productId, item));
  };

  const handleRemoveItem = (productId: string) => {
    setStockTakingItems((prev) => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  const generateVarianceReport = (): StockVarianceReport => {
    const items = Array.from(stockTakingItems.values());
    const itemsWithVariance = items.filter((item) => item.variance !== 0);
    const totalVarianceValue = items.reduce((sum, item) => {
      const valueLoss = (item.product?.cost_price || item.product?.unit_price || 0) * item.variance;
      return sum + valueLoss;
    }, 0);
    const highVarianceCount = items.filter((item) => Math.abs(item.variance_percentage) >= 10).length;
    const lowVarianceCount = items.filter((item) => Math.abs(item.variance_percentage) < 10 && item.variance !== 0).length;

    return {
      total_items: items.length,
      items_with_variance: itemsWithVariance.length,
      total_variance_value: totalVarianceValue,
      high_variance_count: highVarianceCount,
      low_variance_count: lowVarianceCount,
      items: items.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
      generated_at: new Date().toISOString(),
      stock_taking_date: new Date().toISOString(),
    };
  };

  const handleGenerateVariance = () => {
    if (stockTakingItems.size === 0) {
      toast.error("Please count at least one product");
      return;
    }
    const report = generateVarianceReport();
    setVarianceReport(report);
    setStep("variance");
  };

  const generatePDF = async () => {
    if (!varianceReport) return;
    try {
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;

    // Title
    pdf.setFontSize(16);
    pdf.text("Stock Taking Variance Report", margin, yPosition);
    yPosition += 10;

    // Report Date
    pdf.setFontSize(10);
    pdf.text(`Report Generated: ${format(new Date(varianceReport.generated_at), "PPP p")}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Stock Taking Date: ${format(new Date(varianceReport.stock_taking_date), "PPP")}`, margin, yPosition);
    yPosition += 10;

    // Summary Box
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(margin, yPosition, maxWidth, 40);
    yPosition += 5;
    pdf.setFontSize(9);
    pdf.text(`Total Items Counted: ${varianceReport.total_items}`, margin + 5, yPosition);
    yPosition += 5;
    pdf.text(`Items with Variance: ${varianceReport.items_with_variance}`, margin + 5, yPosition);
    yPosition += 5;
    pdf.text(`Total Variance Value: ${formatCurrency(varianceReport.total_variance_value)}`, margin + 5, yPosition);
    yPosition += 5;
    pdf.text(`High Variance (≥10%): ${varianceReport.high_variance_count} | Low Variance (<10%): ${varianceReport.low_variance_count}`, margin + 5, yPosition);
    yPosition += 15;

    // Table Headers
    pdf.setFontSize(9);
    pdf.setFont(undefined, "bold");
    const tableColumns = ["Product", "SKU", "System Qty", "Counted Qty", "Variance", "Variance %"];
    const columnWidths = [70, 20, 15, 18, 15, 15];
    let xPosition = margin;

    for (let i = 0; i < tableColumns.length; i++) {
      pdf.text(tableColumns[i], xPosition, yPosition);
      xPosition += columnWidths[i];
    }
    yPosition += 8;

    // Table Data
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(8);
    varianceReport.items.slice(0, 20).forEach((item) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
        xPosition = margin;
        pdf.setFont(undefined, "bold");
        for (let i = 0; i < tableColumns.length; i++) {
          pdf.text(tableColumns[i], xPosition, yPosition);
          xPosition += columnWidths[i];
        }
        yPosition += 8;
        pdf.setFont(undefined, "normal");
      }

      xPosition = margin;
      const productName = item.product?.name || "Unknown";
      pdf.text(productName.substring(0, 20), xPosition, yPosition);
      xPosition += columnWidths[0];
      pdf.text(item.product?.sku || "-", xPosition, yPosition);
      xPosition += columnWidths[1];
      pdf.text(item.system_quantity.toString(), xPosition, yPosition);
      xPosition += columnWidths[2];
      pdf.text(item.counted_quantity.toString(), xPosition, yPosition);
      xPosition += columnWidths[3];
      pdf.text(item.variance.toString(), xPosition, yPosition);
      xPosition += columnWidths[4];
      pdf.text(`${item.variance_percentage}%`, xPosition, yPosition);

      yPosition += 6;
    });

    // Footer
    yPosition += 10;
    pdf.setFontSize(8);
    pdf.text("Generated by StockTaking System", margin, yPosition);

    pdf.save(`Stock-Taking-Report-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`);
    toast.success("PDF report generated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate PDF");
    }
  };

  const handleSaveStockTaking = async () => {
    if (stockTakingItems.size === 0) {
      toast.error("Please count at least one product");
      return;
    }

    setLoading(true);
    try {
      // Create stock taking record
      const { data: stockTakingData, error: stockTakingError } = await supabase
        .from("stock_takings")
        .insert({
          tenant_id: tenantId,
          stock_taking_date: new Date().toISOString(),
          notes: notes || undefined,
          status: "completed",
        })
        .select()
        .single();

      if (stockTakingError) throw stockTakingError;
      const newStockTakingId = stockTakingData.id;
      setStockTakingId(newStockTakingId);

      // Insert stock taking items
      const itemsToInsert = Array.from(stockTakingItems.values()).map((item) => ({
        stock_taking_id: newStockTakingId,
        product_id: item.product_id,
        system_quantity: item.system_quantity,
        counted_quantity: item.counted_quantity,
        notes: item.notes || undefined,
      }));

      const { error: itemsError } = await supabase
        .from("stock_taking_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Stock taking saved successfully");
      setStep("complete");
      onStockTakingComplete?.(newStockTakingId);
    } catch (err) {
      console.error("Error saving stock taking:", err);
      toast.error("Failed to save stock taking");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("products");
    setSearchTerm("");
    setStockTakingItems(new Map());
    setNotes("");
    setVarianceReport(null);
    setStockTakingId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Stock Taking</DialogTitle>
        </DialogHeader>

        {step === "products" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, SKU, or category..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[30%]">Product</TableHead>
                      <TableHead className="w-[15%]">SKU</TableHead>
                      <TableHead className="w-[15%]">System Qty</TableHead>
                      <TableHead className="w-[20%]">Counted Qty</TableHead>
                      <TableHead className="w-[10%] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const item = stockTakingItems.get(product.id);
                        const isSelected = !!item;
                        return (
                          <TableRow
                            key={product.id}
                            className={cn("cursor-pointer", isSelected && "bg-blue-50 dark:bg-blue-950")}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.category}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{product.sku || "-"}</TableCell>
                            <TableCell className="text-sm">{product.stock_quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item?.counted_quantity ?? ""}
                                onChange={(e) =>
                                  handleCountedQuantityChange(product.id, parseInt(e.target.value) || 0)
                                }
                                placeholder="Enter count"
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {isSelected && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this stock taking..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Summary */}
            {stockTakingItems.size > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Products Counted</p>
                      <p className="text-2xl font-bold">{stockTakingItems.size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items with Variance</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Array.from(stockTakingItems.values()).filter((item) => item.variance !== 0).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Variance</p>
                      <p className="text-2xl font-bold">
                        {Array.from(stockTakingItems.values())
                          .reduce((sum, item) => sum + item.variance, 0)
                          .toString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === "variance" && varianceReport && (
          <div className="space-y-4">
            {/* Variance Summary */}
            <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Variance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{varianceReport.total_items}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">With Variance</p>
                    <p className="text-2xl font-bold text-red-600">{varianceReport.items_with_variance}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">High Variance (≥10%)</p>
                    <p className="text-2xl font-bold text-red-600">{varianceReport.high_variance_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Variance Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(varianceReport.total_variance_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variance Items Table */}
            {varianceReport.items_with_variance > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Items with Discrepancies</h3>
                <div className="border rounded-lg">
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-[30%]">Product</TableHead>
                          <TableHead className="w-[12%]">System</TableHead>
                          <TableHead className="w-[12%]">Counted</TableHead>
                          <TableHead className="w-[12%]">Variance</TableHead>
                          <TableHead className="w-[12%]">%</TableHead>
                          <TableHead className="w-[22%]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {varianceReport.items
                          .filter((item) => item.variance !== 0)
                          .map((item) => (
                            <TableRow key={item.product_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{item.product?.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{item.system_quantity}</TableCell>
                              <TableCell className="text-sm font-semibold">{item.counted_quantity}</TableCell>
                              <TableCell className={cn("text-sm font-semibold", item.variance > 0 ? "text-green-600" : "text-red-600")}>
                                {item.variance > 0 ? "+" : ""}{item.variance}
                              </TableCell>
                              <TableCell className={cn("text-sm font-semibold", item.variance_percentage > 0 ? "text-green-600" : "text-red-600")}>
                                {item.variance_percentage > 0 ? "+" : ""}{item.variance_percentage}%
                              </TableCell>
                              <TableCell>
                                {Math.abs(item.variance_percentage) >= 10 ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" /> High
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Minor
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* All Items Table */}
            <div>
              <h3 className="font-semibold mb-3">All Counted Items</h3>
              <div className="border rounded-lg">
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-[35%]">Product</TableHead>
                        <TableHead className="w-[15%]">System Qty</TableHead>
                        <TableHead className="w-[15%]">Counted Qty</TableHead>
                        <TableHead className="w-[15%]">Variance</TableHead>
                        <TableHead className="w-[20%]">Unit Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceReport.items.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <p className="font-medium text-sm">{item.product?.name}</p>
                          </TableCell>
                          <TableCell className="text-sm">{item.system_quantity}</TableCell>
                          <TableCell className="text-sm">{item.counted_quantity}</TableCell>
                          <TableCell className={cn("text-sm font-semibold", item.variance > 0 ? "text-green-600" : "text-red-600")}>
                            {item.variance > 0 ? "+" : ""}{item.variance}
                          </TableCell>
                          <TableCell className="text-sm">{formatCurrency(item.product?.unit_price || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 text-center">
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Stock taking completed successfully!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Stock Taking ID: {stockTakingId}</p>
              {varianceReport && (
                <>
                  <p className="text-sm">
                    <span className="font-semibold">{varianceReport.total_items}</span> products counted
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-red-600">{varianceReport.items_with_variance}</span> items with variance
                  </p>
                  <p className="text-sm">
                    Total Variance Value: <span className="font-semibold">{formatCurrency(varianceReport.total_variance_value)}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 justify-between">
          {step === "products" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateVariance}
                disabled={stockTakingItems.size === 0 || loading}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Variance
              </Button>
            </>
          )}

          {step === "variance" && (
            <>
              <Button variant="outline" onClick={() => setStep("products")}>
                Back
              </Button>
              <Button
                variant="outline"
                onClick={generatePDF}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={handleSaveStockTaking}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Stock Taking"}
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

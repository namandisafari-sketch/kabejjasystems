import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Download, Upload, Database, Clock, CheckCircle2, 
  AlertTriangle, Loader2, FileArchive, RefreshCw, 
  HardDrive, Calendar, Shield
} from "lucide-react";
import { toast } from "sonner";
import { format as formatDate } from "date-fns";
import JSZip from "jszip";
import * as XLSX from "xlsx";

// Tables to backup - organized by category
const BACKUP_CATEGORIES = {
  core: {
    label: "Core Data",
    tables: ["tenants", "profiles", "packages", "school_packages", "rental_packages", "business_packages"],
  },
  business: {
    label: "Business Data", 
    tables: ["branches", "employees", "products", "categories", "customers", "suppliers", "sales", "sale_items", "expenses", "customer_payments"],
  },
  school: {
    label: "School Data",
    tables: ["students", "school_classes", "subjects", "academic_terms", "student_fees", "fee_payments", "parents", "parent_students", "report_cards", "report_card_marks"],
  },
  rental: {
    label: "Rental Data",
    tables: ["properties", "rental_units", "rental_tenants", "leases", "rental_payments", "maintenance_requests"],
  },
  system: {
    label: "System Data",
    tables: ["announcements", "audit_logs", "business_modules", "tenant_modules", "staff_permissions", "user_roles"],
  },
};

interface SystemBackup {
  id: string;
  backup_type: string;
  categories: string[] | null;
  tables_included: string[] | null;
  row_counts: Record<string, number> | null;
  format: string | null;
  file_name: string | null;
  created_by: string | null;
  created_at: string;
}

const AdminBackups = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(BACKUP_CATEGORIES));
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Fetch backup history
  const { data: backupHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['admin-backup-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as SystemBackup[];
    },
  });

  // Get table row counts for display
  const { data: tableCounts } = useQuery({
    queryKey: ['admin-table-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      
      // Get counts for key tables
      const tablesToCount = ['tenants', 'profiles', 'students', 'sales', 'products'];
      for (const table of tablesToCount) {
        try {
          const { count } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true });
          counts[table] = count || 0;
        } catch {
          counts[table] = 0;
        }
      }
      return counts;
    },
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleExport = async (exportFormat: 'xlsx' | 'zip') => {
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category to backup");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const allTables = selectedCategories.flatMap(
        cat => BACKUP_CATEGORIES[cat as keyof typeof BACKUP_CATEGORIES]?.tables || []
      );

      const totalTables = allTables.length;
      const allData: Record<string, any[]> = {};

      for (let i = 0; i < allTables.length; i++) {
        const table = allTables[i];
        setExportProgress(Math.round(((i + 1) / totalTables) * 100));

        try {
          const { data, error } = await supabase
            .from(table as any)
            .select('*')
            .limit(50000); // Large limit for full backup

          if (!error && data && data.length > 0) {
            allData[table] = data;
          }
        } catch (err) {
          console.warn(`Could not fetch ${table}:`, err);
        }
      }

      const timestamp = formatDate(new Date(), 'yyyy-MM-dd_HH-mm');
      const fileName = `system_backup_${timestamp}.${exportFormat}`;

      if (exportFormat === 'xlsx') {
        // Create multi-sheet Excel file
        const wb = XLSX.utils.book_new();
        
        Object.entries(allData).forEach(([tableName, rows]) => {
          if (rows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(rows);
            const sheetName = tableName.substring(0, 31); // Excel limit
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        });

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      } else {
        // Create ZIP with CSV files
        const zip = new JSZip();
        
        Object.entries(allData).forEach(([tableName, rows]) => {
          if (rows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(ws);
            zip.file(`${tableName}.csv`, csv);
          }
        });

        // Add metadata file
        zip.file('_backup_metadata.json', JSON.stringify({
          created_at: new Date().toISOString(),
          categories: selectedCategories,
          tables: Object.keys(allData),
          row_counts: Object.fromEntries(
            Object.entries(allData).map(([k, v]) => [k, v.length])
          ),
        }, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = fileName;
        link.click();
      }

      // Log the backup
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('system_backups').insert({
        backup_type: 'full',
        categories: selectedCategories,
        tables_included: Object.keys(allData),
        row_counts: Object.fromEntries(
          Object.entries(allData).map(([k, v]) => [k, v.length])
        ),
        format: exportFormat,
        file_name: fileName,
        created_by: user?.id,
      });

      refetchHistory();
      toast.success(`System backup exported successfully (${Object.keys(allData).length} tables)`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error("Failed to export backup: " + error.message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const fileExtension = importFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'xlsx') {
        // Parse Excel file
        const buffer = await importFile.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        
        const totalSheets = wb.SheetNames.length;
        let importedCount = 0;

        for (let i = 0; i < wb.SheetNames.length; i++) {
          const sheetName = wb.SheetNames[i];
          setImportProgress(Math.round(((i + 1) / totalSheets) * 100));

          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws);

          if (data.length > 0) {
            try {
              // Attempt to upsert data (this is a simplified approach)
              const { error } = await supabase
                .from(sheetName as any)
                .upsert(data as any, { onConflict: 'id', ignoreDuplicates: true });

              if (!error) {
                importedCount++;
              } else {
                console.warn(`Import warning for ${sheetName}:`, error);
              }
            } catch (err) {
              console.warn(`Could not import ${sheetName}:`, err);
            }
          }
        }

        toast.success(`Import completed: ${importedCount}/${totalSheets} tables processed`);
      } else if (fileExtension === 'zip') {
        // Parse ZIP file
        const zip = await JSZip.loadAsync(importFile);
        const csvFiles = Object.keys(zip.files).filter(name => name.endsWith('.csv'));
        
        let importedCount = 0;
        
        for (let i = 0; i < csvFiles.length; i++) {
          const fileName = csvFiles[i];
          setImportProgress(Math.round(((i + 1) / csvFiles.length) * 100));

          const tableName = fileName.replace('.csv', '');
          const content = await zip.files[fileName].async('string');
          
          // Parse CSV
          const wb = XLSX.read(content, { type: 'string' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws);

          if (data.length > 0) {
            try {
              const { error } = await supabase
                .from(tableName as any)
                .upsert(data as any, { onConflict: 'id', ignoreDuplicates: true });

              if (!error) {
                importedCount++;
              }
            } catch (err) {
              console.warn(`Could not import ${tableName}:`, err);
            }
          }
        }

        toast.success(`Import completed: ${importedCount}/${csvFiles.length} files processed`);
      } else {
        toast.error("Unsupported file format. Please use .xlsx or .zip files.");
      }

      setIsImportDialogOpen(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error("Failed to import: " + error.message);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Backups</h1>
          <p className="text-muted-foreground">Export and import system-wide data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchHistory()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{tableCounts?.tenants || 0}</p>
                <p className="text-xs text-muted-foreground">Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-sky-500" />
              <div>
                <p className="text-2xl font-bold">{tableCounts?.profiles || 0}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{tableCounts?.students || 0}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{tableCounts?.sales || 0}</p>
                <p className="text-xs text-muted-foreground">Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">{tableCounts?.products || 0}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export Backup
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Backup History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileArchive className="h-5 w-5" />
                  Select Data Categories
                </CardTitle>
                <CardDescription>
                  Choose which data categories to include in the backup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(BACKUP_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={key}
                      checked={selectedCategories.includes(key)}
                      onCheckedChange={() => toggleCategory(key)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={key} className="font-medium cursor-pointer">
                        {category.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {category.tables.length} tables: {category.tables.slice(0, 3).join(', ')}
                        {category.tables.length > 3 && ` +${category.tables.length - 3} more`}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategories(Object.keys(BACKUP_CATEGORIES))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategories([])}
                  >
                    Deselect All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Options
                </CardTitle>
                <CardDescription>
                  Choose your preferred export format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isExporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Exporting...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <Progress value={exportProgress} />
                  </div>
                )}

                <div className="grid gap-4">
                  <Button
                    onClick={() => handleExport('xlsx')}
                    disabled={isExporting || selectedCategories.length === 0}
                    className="h-auto py-4"
                  >
                    {isExporting ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <FileArchive className="h-5 w-5 mr-2" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Export as Excel (.xlsx)</p>
                      <p className="text-xs opacity-80">Multi-sheet workbook, best for viewing</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleExport('zip')}
                    disabled={isExporting || selectedCategories.length === 0}
                    className="h-auto py-4"
                  >
                    {isExporting ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <FileArchive className="h-5 w-5 mr-2" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Export as ZIP (CSV files)</p>
                      <p className="text-xs opacity-80">Separate CSV per table, best for import</p>
                    </div>
                  </Button>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Backups contain sensitive data. Store securely and delete old backups regularly.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Restore data from a previous backup file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Importing data may overwrite existing records. 
                  Always create a backup before importing. This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Drop backup file here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports .xlsx (Excel) or .zip (CSV archive) files
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.zip"
                  onChange={handleImportFile}
                  className="max-w-xs mx-auto"
                />
              </div>

              {importFile && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileArchive className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(importFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setIsImportDialogOpen(true)}>
                    Start Import
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Backups
              </CardTitle>
              <CardDescription>
                History of system backups performed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !backupHistory || backupHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No backup history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backupHistory.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="font-medium">
                            {backup.backup_type === 'full' ? 'Full System Backup' : 'Partial Backup'}
                            {backup.format && <span className="text-muted-foreground ml-2">(.{backup.format})</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(new Date(backup.created_at), 'PPpp')}
                            {backup.tables_included && ` • ${backup.tables_included.length} tables`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(new Date(backup.created_at), 'MMM d')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Confirmation Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              You are about to import data from <strong>{importFile?.name}</strong>. 
              This may overwrite existing records. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Confirm Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBackups;
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileSpreadsheet, FileText, Database, Loader2, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataBackupExportProps {
  tenantId: string | null;
  businessType: string | null;
}

interface ExportTable {
  id: string;
  name: string;
  tableName: string;
  description: string;
  applicableTo: string[];
}

const ALL_TABLES: ExportTable[] = [
  { id: 'products', name: 'Products', tableName: 'products', description: 'Product inventory and details', applicableTo: ['all'] },
  { id: 'sales', name: 'Sales', tableName: 'sales', description: 'Sales transactions', applicableTo: ['all'] },
  { id: 'sale_items', name: 'Sale Items', tableName: 'sale_items', description: 'Individual sale line items', applicableTo: ['all'] },
  { id: 'customers', name: 'Customers', tableName: 'customers', description: 'Customer information', applicableTo: ['all'] },
  { id: 'employees', name: 'Employees', tableName: 'employees', description: 'Employee records', applicableTo: ['all'] },
  { id: 'expenses', name: 'Expenses', tableName: 'expenses', description: 'Business expenses', applicableTo: ['all'] },
  { id: 'suppliers', name: 'Suppliers', tableName: 'suppliers', description: 'Supplier information', applicableTo: ['all'] },
  { id: 'categories', name: 'Categories', tableName: 'categories', description: 'Product categories', applicableTo: ['all'] },
  { id: 'purchase_orders', name: 'Purchase Orders', tableName: 'purchase_orders', description: 'Purchase order records', applicableTo: ['all'] },
  { id: 'students', name: 'Students', tableName: 'students', description: 'Student records', applicableTo: ['kindergarten', 'primary_school', 'secondary_school', 'school'] },
  { id: 'parents', name: 'Parents', tableName: 'parents', description: 'Parent/guardian records', applicableTo: ['kindergarten', 'primary_school', 'secondary_school', 'school'] },
  { id: 'student_fees', name: 'Student Fees', tableName: 'student_fees', description: 'Fee records and balances', applicableTo: ['kindergarten', 'primary_school', 'secondary_school', 'school'] },
  { id: 'fee_payments', name: 'Fee Payments', tableName: 'fee_payments', description: 'Fee payment transactions', applicableTo: ['kindergarten', 'primary_school', 'secondary_school', 'school'] },
  { id: 'school_classes', name: 'Classes', tableName: 'school_classes', description: 'Class/grade information', applicableTo: ['kindergarten', 'primary_school', 'secondary_school', 'school'] },
  { id: 'subjects', name: 'Subjects', tableName: 'subjects', description: 'Subject information', applicableTo: ['kindergarten', 'primary_school', 'secondary_school', 'school'] },
  { id: 'rental_properties', name: 'Properties', tableName: 'rental_properties', description: 'Property records', applicableTo: ['rental_management'] },
  { id: 'rental_units', name: 'Units', tableName: 'rental_units', description: 'Unit/room records', applicableTo: ['rental_management'] },
  { id: 'rental_tenants', name: 'Tenants', tableName: 'rental_tenants', description: 'Tenant records', applicableTo: ['rental_management'] },
  { id: 'leases', name: 'Leases', tableName: 'leases', description: 'Lease agreements', applicableTo: ['rental_management'] },
  { id: 'rental_payments', name: 'Rental Payments', tableName: 'rental_payments', description: 'Rent payment records', applicableTo: ['rental_management'] },
  { id: 'repair_jobs', name: 'Repair Jobs', tableName: 'repair_jobs', description: 'Repair/service jobs', applicableTo: ['repair_shop', 'garage'] },
  { id: 'spare_parts', name: 'Spare Parts', tableName: 'spare_parts', description: 'Spare parts inventory', applicableTo: ['repair_shop', 'garage'] },
  { id: 'menu_items', name: 'Menu Items', tableName: 'menu_items', description: 'Menu items', applicableTo: ['restaurant', 'cafe', 'bar'] },
  { id: 'restaurant_orders', name: 'Orders', tableName: 'restaurant_orders', description: 'Restaurant orders', applicableTo: ['restaurant', 'cafe', 'bar'] },
];

export function DataBackupExport({ tenantId, businessType }: DataBackupExportProps) {
  const { toast } = useToast();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');

  // Filter tables based on business type
  const availableTables = ALL_TABLES.filter(table => 
    table.applicableTo.includes('all') || 
    table.applicableTo.includes(businessType || '')
  );

  const handleSelectAll = () => {
    if (selectedTables.length === availableTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(availableTables.map(t => t.id));
    }
  };

  const handleTableToggle = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const fetchTableData = async (tableName: string) => {
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(10000);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }
    return data || [];
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const handleExport = async () => {
    if (!tenantId || selectedTables.length === 0) {
      toast({
        title: 'No tables selected',
        description: 'Please select at least one table to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const tablesToExport = availableTables.filter(t => selectedTables.includes(t.id));
      const allData: { [key: string]: any[] } = {};

      for (let i = 0; i < tablesToExport.length; i++) {
        const table = tablesToExport[i];
        const data = await fetchTableData(table.tableName);
        allData[table.name] = data;
        setExportProgress(Math.round(((i + 1) / tablesToExport.length) * 100));
      }

      if (exportFormat === 'xlsx') {
        // Create Excel workbook with multiple sheets
        const workbook = XLSX.utils.book_new();
        
        for (const [sheetName, data] of Object.entries(allData)) {
          if (data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            // Limit sheet name to 31 characters (Excel limit)
            const safeName = sheetName.substring(0, 31);
            XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
          }
        }

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `business_backup_${date}.xlsx`);
      } else {
        // Create ZIP with CSV files (using JSZip which is already installed)
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const [fileName, data] of Object.entries(allData)) {
          if (data.length > 0) {
            const csvContent = exportToCSV(data, fileName);
            zip.file(`${fileName}.csv`, csvContent);
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const date = new Date().toISOString().split('T')[0];
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `business_backup_${date}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Backup Complete',
        description: `Successfully exported ${selectedTables.length} tables`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Backup & Export
        </CardTitle>
        <CardDescription>
          Download your business data in CSV or Excel format for backup or analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Format Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Format</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={exportFormat === 'xlsx' ? 'default' : 'outline'}
              className="flex items-center gap-2"
              onClick={() => setExportFormat('xlsx')}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel (.xlsx)
            </Button>
            <Button
              type="button"
              variant={exportFormat === 'csv' ? 'default' : 'outline'}
              className="flex items-center gap-2"
              onClick={() => setExportFormat('csv')}
            >
              <FileText className="h-4 w-4" />
              CSV (.zip)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {exportFormat === 'xlsx' 
              ? 'All tables will be exported as separate sheets in a single Excel file'
              : 'Each table will be exported as a separate CSV file, bundled in a ZIP archive'
            }
          </p>
        </div>

        {/* Table Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Tables to Export</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedTables.length === availableTables.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
            {availableTables.map(table => (
              <div
                key={table.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedTables.includes(table.id) 
                    ? 'bg-primary/5 border-primary' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleTableToggle(table.id)}
              >
                <Checkbox
                  checked={selectedTables.includes(table.id)}
                  onCheckedChange={() => handleTableToggle(table.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{table.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {table.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedTables.length > 0 && (
            <Badge variant="secondary" className="mt-2">
              {selectedTables.length} table{selectedTables.length !== 1 ? 's' : ''} selected
            </Badge>
          )}
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting data... {exportProgress}%
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || selectedTables.length === 0 || !tenantId}
          className="w-full sm:w-auto"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Backup
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Up to 10,000 records per table will be exported
          </p>
          <p className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Data is filtered to your business only
          </p>
          <p className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Recommended to backup regularly for data safety
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

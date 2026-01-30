import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Download,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExcelImportHelper,
  ColumnMappingUI,
  ValidationResultsUI,
  DataPreviewUI,
  type ColumnMapping,
  type ParsedRow,
} from "./ExcelImportHelper";
import { getImportConfig, type ImportConfig } from "@/config/importConfigurations";

interface GeneralImportPageProps {
  module: string;
  title?: string;
  description?: string;
}

/**
 * Generic Excel Import Page Component
 * Works with any module by using configurations from importConfigurations.ts
 */
export const GeneralImportPage = ({
  module,
  title,
  description,
}: GeneralImportPageProps) => {
  const { toast } = useToast();
  const config = getImportConfig(module);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  const [importTab, setImportTab] = useState<"excel" | "manual">("excel");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isTenant, setIsTenant] = useState(false);

  // Check authorization
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, tenant_id")
          .eq("id", session.user.id)
          .single();

        const hasAccess = profile?.role === "tenant_owner";
        setIsTenant(hasAccess);

        if (!hasAccess) {
          toast({
            title: "Access Denied",
            description: "You must be a tenant owner to import data",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAccess();
  }, []);

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Import configuration not found for module: {module}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isTenant) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to import data
        </AlertDescription>
      </Alert>
    );
  }

  const handleExcelUpload = async (file: File) => {
    try {
      setExcelFile(file);
      const { headers, rows } = await ExcelImportHelper.readExcelFile(file);
      setExcelHeaders(headers);
      setExcelRows(rows);
      setStep(2);

      toast({
        title: "Success",
        description: `Loaded ${rows.length} rows from Excel file`,
      });
    } catch (error) {
      toast({
        title: "Error Reading File",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleValidate = () => {
    if (Object.keys(columnMapping).length === 0) {
      toast({
        title: "Missing Mapping",
        description: "Please map at least one column",
        variant: "destructive",
      });
      return;
    }

    const { parsed, errors, validCount } = ExcelImportHelper.parseRows(
      excelRows,
      columnMapping,
      config.requiredFields
    );

    setParsedRows(parsed);

    if (validCount === 0) {
      toast({
        title: "No Valid Rows",
        description: "All rows have errors. Please check the data.",
        variant: "destructive",
      });
      return;
    }

    setStep(3);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const validRows = parsedRows.filter((r) => r._isValid);

      if (validRows.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No valid rows to import",
          variant: "destructive",
        });
        return;
      }

      // Transform data using configuration function
      const data = validRows.map((row) =>
        config.transformFn ? config.transformFn(row) : row
      );

      // Insert to database
      const { error } = await (supabase
        .from(config.databaseTable as any)
        .insert(data as any) as any);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Imported ${validRows.length} ${config.module} records`,
      });

      // Reset
      setStep(1);
      setExcelFile(null);
      setExcelHeaders([]);
      setExcelRows([]);
      setColumnMapping({});
      setParsedRows([]);
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const template = ExcelImportHelper.generateTemplate(config.systemFields);
      const blob = new Blob([new Uint8Array(template).buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${module}-import-template.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title || `Import ${config.label}`}</h1>
        <p className="text-gray-600">
          {description || config.description}
        </p>
      </div>

      <Tabs value={importTab} onValueChange={(v) => setImportTab(v as any)}>
        <TabsList>
          <TabsTrigger value="excel">📊 Excel Import</TabsTrigger>
          <TabsTrigger value="manual">✏️ Manual Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="excel" className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
                <CardDescription>
                  Import {config.module} from an Excel spreadsheet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <label className="mt-4 block cursor-pointer">
                    <span className="text-sm font-medium">
                      Click to select file or drag and drop
                    </span>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleExcelUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Required fields: {config.requiredFields.join(", ")}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {step === 2 && excelHeaders.length > 0 && (
            <div className="space-y-4">
              <ColumnMappingUI
                excelHeaders={excelHeaders}
                systemFields={config.systemFields}
                onMappingChange={setColumnMapping}
                onAutoDetect={() =>
                  toast({
                    title: "Auto-Detected",
                    description: "Columns detected automatically",
                  })
                }
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleValidate}
                  className="flex-1"
                  disabled={Object.keys(columnMapping).length === 0}
                >
                  Validate Data <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && parsedRows.length > 0 && (
            <div className="space-y-4">
              <ValidationResultsUI
                errors={parsedRows
                  .map((r, i) => ({
                    rowIndex: r._rowIndex,
                    rowData: [],
                    errors: r._errors,
                    severity: "error" as const,
                  }))
                  .filter((e) => e.errors.length > 0)}
                validCount={parsedRows.filter((r) => r._isValid).length}
                totalCount={parsedRows.length}
                onRetry={() => setStep(2)}
              />

              <DataPreviewUI
                parsedRows={parsedRows}
                systemFields={config.systemFields}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={importing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1"
                  disabled={importing}
                >
                  {importing
                    ? "Importing..."
                    : `Import Valid Rows (${parsedRows.filter((r) => r._isValid).length})`}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Data Entry</CardTitle>
              <CardDescription>
                Enter {config.module} data row by row
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Manual entry feature - use Excel import for better efficiency with large
                  datasets
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneralImportPage;

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, X, Download } from "lucide-react";
import * as XLSX from "xlsx";

export interface ColumnMapping {
  [systemField: string]: number; // Maps system field name to Excel column index
}

export interface ValidationError {
  rowIndex: number;
  rowData: string[];
  errors: string[];
  severity: "error" | "warning";
}

export interface ParsedRow {
  [key: string]: string;
  _rowIndex: number;
  _isValid: boolean;
  _errors: string[];
}

interface ColumnMappingStep {
  excelHeaders: string[];
  mapping: ColumnMapping;
  requiredFields: string[];
}

/**
 * Handles Excel file parsing with flexible column mapping
 * Supports different data organizations across schools
 */
export class ExcelImportHelper {
  /**
   * Read Excel file and extract data
   */
  static async readExcelFile(file: File): Promise<{
    headers: string[];
    rows: string[][];
    sheetName: string;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Get all data including empty cells to preserve column positions
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: "" 
          }) as string[][];

          if (jsonData.length === 0) {
            reject(new Error("Excel file is empty"));
            return;
          }

          // First row is headers
          const headers = (jsonData[0] || []).map((h) =>
            String(h || "").trim()
          );

          // Rest are data rows (skip empty rows at start)
          let dataRows = jsonData.slice(1);

          // Remove completely empty rows
          dataRows = dataRows.filter(
            (row) => row && row.some((cell) => String(cell).trim() !== "")
          );

          // Trim all cells
          dataRows = dataRows.map((row) =>
            row.map((cell) => String(cell || "").trim())
          );

          resolve({
            headers,
            rows: dataRows,
            sheetName,
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Auto-detect column mapping based on header names
   * Uses fuzzy matching to find likely columns
   */
  static autoDetectMapping(
    excelHeaders: string[],
    systemFields: string[]
  ): ColumnMapping {
    const mapping: ColumnMapping = {};

    const headerLower = excelHeaders.map((h) => h.toLowerCase());

    for (const systemField of systemFields) {
      const fieldLower = systemField.toLowerCase();

      // Exact match
      let matchIndex = headerLower.findIndex((h) => h === fieldLower);

      // Partial match (contains)
      if (matchIndex === -1) {
        matchIndex = headerLower.findIndex((h) =>
          h.includes(fieldLower) || fieldLower.includes(h)
        );
      }

      // Abbreviation match
      if (matchIndex === -1) {
        const abbreviations: { [key: string]: string[] } = {
          indexNumber: ["index", "idx", "no"],
          studentName: ["name", "student", "student_name"],
          englishLanguage: ["english", "eng"],
          mathematics: ["math", "mathematics"],
          physics: ["phy", "physics"],
          chemistry: ["chem", "chemistry"],
          biology: ["bio", "biology"],
          aggregateGrade: ["grade", "aggregate", "agg"],
        };

        const abbrev = abbreviations[systemField] || [];
        matchIndex = headerLower.findIndex((h) =>
          abbrev.some((a) => h.includes(a))
        );
      }

      if (matchIndex !== -1) {
        mapping[systemField] = matchIndex;
      }
    }

    return mapping;
  }

  /**
   * Validate a single row based on mapping
   */
  static validateRow(
    row: string[],
    mapping: ColumnMapping,
    requiredFields: string[],
    rowIndex: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      const colIndex = mapping[field];
      if (colIndex === undefined) {
        errors.push(`Column mapping missing for ${field}`);
        continue;
      }

      const value = row[colIndex]?.trim() || "";
      if (!value) {
        errors.push(`${field} is required but empty`);
      }
    }

    // Validate format
    const indexColIndex = mapping.indexNumber;
    if (indexColIndex !== undefined) {
      const indexValue = row[indexColIndex]?.trim() || "";
      if (indexValue && !/^[U]\d{4}\/\d{3}$/.test(indexValue)) {
        errors.push(
          `Invalid index number format: ${indexValue} (expected: U0000/001)`
        );
      }
    }

    // Validate grades
    const gradeFields = ["englishLanguage", "mathematics", "physics", "chemistry", "biology"];
    const validGrades = ["A", "B", "C", "D", "E", "O"];

    for (const field of gradeFields) {
      const colIndex = mapping[field];
      if (colIndex !== undefined) {
        const value = row[colIndex]?.trim() || "";
        if (value && !validGrades.includes(value.toUpperCase())) {
          errors.push(`${field}: "${value}" is not a valid grade (A-E or O)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Parse rows based on column mapping
   */
  static parseRows(
    rows: string[][],
    mapping: ColumnMapping,
    requiredFields: string[]
  ): {
    parsed: ParsedRow[];
    errors: ValidationError[];
    validCount: number;
  } {
    const parsed: ParsedRow[] = [];
    const errors: ValidationError[] = [];
    let validCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = this.validateRow(
        row,
        mapping,
        requiredFields,
        i + 1
      );

      // Extract data into system fields
      const parsedRow: ParsedRow = {
        _rowIndex: i + 1,
        _isValid: validation.isValid,
        _errors: validation.errors,
      };

      // Map each field
      for (const [field, colIndex] of Object.entries(mapping)) {
        const numColIndex = parseInt(colIndex as any);
        if (!isNaN(numColIndex)) {
          parsedRow[field] = row[numColIndex]?.trim() || "";
        }
      }

      parsed.push(parsedRow);

      if (validation.isValid) {
        validCount++;
      } else {
        errors.push({
          rowIndex: i + 1,
          rowData: row,
          errors: validation.errors,
          severity: "error",
        });
      }
    }

    return { parsed, errors, validCount };
  }

  /**
   * Generate sample template for download
   */
  static generateTemplate(systemFields: string[]): Uint8Array {
    const data = [systemFields];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    return XLSX.write(wb, { bookType: "xlsx", type: "array" });
  }
}

/**
 * Component: Column Mapping UI
 * Allows users to map their Excel columns to system fields
 */
export const ColumnMappingUI = ({
  excelHeaders,
  systemFields,
  onMappingChange,
  onAutoDetect,
}: {
  excelHeaders: string[];
  systemFields: string[];
  onMappingChange: (mapping: ColumnMapping) => void;
  onAutoDetect: () => void;
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    return ExcelImportHelper.autoDetectMapping(excelHeaders, systemFields);
  });

  const handleMappingChange = (field: string, colIndex: string) => {
    const newMapping = { ...mapping };
    if (colIndex === "") {
      delete newMapping[field];
    } else {
      newMapping[field] = parseInt(colIndex);
    }
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const handleAutoDetect = () => {
    const autoMapping = ExcelImportHelper.autoDetectMapping(
      excelHeaders,
      systemFields
    );
    setMapping(autoMapping);
    onMappingChange(autoMapping);
    onAutoDetect();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Your Columns</CardTitle>
        <CardDescription>
          Tell us which Excel columns contain which data. You can auto-detect
          or manually select.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAutoDetect} variant="outline" className="w-full">
          🔍 Auto-Detect Columns
        </Button>

        <div className="grid gap-4 md:grid-cols-2">
          {systemFields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{field}</Label>
              <Select
                value={
                  mapping[field] !== undefined ? String(mapping[field]) : ""
                }
                onValueChange={(value) => handleMappingChange(field, value)}
              >
                <SelectTrigger id={field}>
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not Provided</SelectItem>
                  {excelHeaders.map((header, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {header || `Column ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Component: Validation Results
 * Shows import validation errors with option to fix them
 */
export const ValidationResultsUI = ({
  errors,
  validCount,
  totalCount,
  onRetry,
}: {
  errors: ValidationError[];
  validCount: number;
  totalCount: number;
  onRetry: () => void;
}) => {
  const errorCount = totalCount - validCount;
  const successRate = Math.round((validCount / totalCount) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Validation Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4">
            <div className="text-2xl font-bold text-green-700">{validCount}</div>
            <div className="text-sm text-green-600">Valid Rows</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <div className="text-2xl font-bold text-red-700">{errorCount}</div>
            <div className="text-sm text-red-600">Errors Found</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="text-2xl font-bold text-blue-700">{successRate}%</div>
            <div className="text-sm text-blue-600">Success Rate</div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Issues Found:</h4>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {errors.map((error, idx) => (
                <Alert key={idx} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Row {error.rowIndex}:</strong> {error.errors.join("; ")}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {errorCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only the {validCount} valid rows will be imported. Fix the errors
              above and try again.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={onRetry} className="w-full">
          Import Valid Data ({validCount} rows)
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Component: Data Preview
 * Shows sample of how data will be imported
 */
export const DataPreviewUI = ({
  parsedRows,
  systemFields,
}: {
  parsedRows: ParsedRow[];
  systemFields: string[];
}) => {
  const sampleRows = parsedRows.slice(0, 5);
  const validRows = parsedRows.filter((r) => r._isValid);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview ({validRows.length} valid rows)</CardTitle>
        <CardDescription>
          This is how your data will appear in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {systemFields.map((field) => (
                  <TableHead key={field}>{field}</TableHead>
                ))}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={row._isValid ? "bg-green-50" : "bg-red-50"}
                >
                  {systemFields.map((field) => (
                    <TableCell key={field}>{row[field] || "-"}</TableCell>
                  ))}
                  <TableCell>
                    {row._isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-red-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sampleRows.length < parsedRows.length && (
          <p className="mt-2 text-sm text-gray-500">
            Showing first {sampleRows.length} of {parsedRows.length} rows...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

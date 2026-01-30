# Integration Guide: Adding Excel Import to Other Pages

## Overview

The Excel Import Helper system can be used for any data import, not just exam results. This guide shows how to integrate it into other pages.

## Step 1: Import Components

```typescript
import {
  ExcelImportHelper,
  ColumnMappingUI,
  ValidationResultsUI,
  DataPreviewUI,
  type ColumnMapping,
  type ParsedRow,
} from '@/pages/business/ExcelImportHelper';
```

## Step 2: Define Your Data Structure

```typescript
// Example: Student Records Import

const SYSTEM_FIELDS = [
  'studentName',
  'dateOfBirth',
  'parentName',
  'parentPhone',
  'parentEmail',
  'admissionNumber',
];

const REQUIRED_FIELDS = [
  'studentName',
  'admissionNumber',
  'parentName',
];
```

## Step 3: Create State Variables

```typescript
const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
const [excelRows, setExcelRows] = useState<string[][]>([]);
const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
```

## Step 4: Handle File Upload

```typescript
const handleExcelUpload = async (file: File) => {
  try {
    const { headers, rows } = await ExcelImportHelper.readExcelFile(file);
    setExcelHeaders(headers);
    setExcelRows(rows);
    setCurrentStep(2);
  } catch (error) {
    toast({
      title: "Error",
      description: String(error),
      variant: "destructive",
    });
  }
};
```

## Step 5: Validate Data

```typescript
const handleValidate = () => {
  const { parsed, errors, validCount } = ExcelImportHelper.parseRows(
    excelRows,
    columnMapping,
    REQUIRED_FIELDS
  );

  setParsedRows(parsed);
  
  if (validCount === 0) {
    toast({
      title: "No Valid Rows",
      description: "All rows have errors",
      variant: "destructive",
    });
    return;
  }

  setCurrentStep(3);
};
```

## Step 6: Import Valid Data

```typescript
const handleImport = async () => {
  const validRows = parsedRows.filter(r => r._isValid);

  try {
    // Transform to your data format
    const data = validRows.map(row => ({
      student_name: row.studentName,
      date_of_birth: row.dateOfBirth,
      parent_name: row.parentName,
      parent_phone: row.parentPhone,
      parent_email: row.parentEmail,
      admission_number: row.admissionNumber,
    }));

    // Insert to database
    const { error } = await supabase
      .from('students')
      .insert(data);

    if (error) throw error;

    toast({
      title: "Success",
      description: `Imported ${validRows.length} records`,
    });

    // Reset
    setCurrentStep(1);
    setExcelHeaders([]);
    setExcelRows([]);
    setColumnMapping({});
    setParsedRows([]);
  } catch (error) {
    toast({
      title: "Error",
      description: String(error),
      variant: "destructive",
    });
  }
};
```

## Step 7: Build UI

```typescript
// Step 1: Upload
{currentStep === 1 && (
  <Card>
    <CardHeader>
      <CardTitle>Upload Excel File</CardTitle>
    </CardHeader>
    <CardContent>
      <label className="block cursor-pointer">
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleExcelUpload(e.target.files[0]);
            }
          }}
        />
      </label>
    </CardContent>
  </Card>
)}

// Step 2: Map Columns
{currentStep === 2 && (
  <ColumnMappingUI
    excelHeaders={excelHeaders}
    systemFields={SYSTEM_FIELDS}
    onMappingChange={setColumnMapping}
    onAutoDetect={() => {
      const auto = ExcelImportHelper.autoDetectMapping(
        excelHeaders,
        SYSTEM_FIELDS
      );
      setColumnMapping(auto);
    }}
  />
)}

// Step 3: Validate & Import
{currentStep === 3 && (
  <ValidationResultsUI
    errors={...}
    validCount={...}
    totalCount={...}
    onRetry={() => setCurrentStep(2)}
  />
)}
```

## Complete Example: Fee Records Import

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ExcelImportHelper,
  ColumnMappingUI,
  ValidationResultsUI,
} from './ExcelImportHelper';

const SYSTEM_FIELDS = [
  'studentName',
  'admissionNumber',
  'feeType',
  'amount',
  'dueDate',
  'term',
];

const REQUIRED_FIELDS = [
  'studentName',
  'admissionNumber',
  'feeType',
  'amount',
];

export const FeesImport = () => {
  const { toast } = useToast();
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [parsedRows, setParsedRows] = useState([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      const { headers, rows } = await ExcelImportHelper.readExcelFile(file);
      setExcelHeaders(headers);
      setExcelRows(rows);
      setStep(2);
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleValidate = () => {
    const { parsed, errors, validCount } = ExcelImportHelper.parseRows(
      excelRows,
      columnMapping,
      REQUIRED_FIELDS
    );

    setParsedRows(parsed);

    if (validCount === 0) {
      toast({
        title: "No Valid Rows",
        description: "All rows have errors",
        variant: "destructive",
      });
      return;
    }

    setStep(3);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const validRows = parsedRows.filter(r => r._isValid);

      const fees = validRows.map(row => ({
        student_name: row.studentName,
        admission_number: row.admissionNumber,
        fee_type: row.feeType,
        amount: parseFloat(row.amount),
        due_date: row.dueDate,
        term: row.term,
        status: 'pending',
      }));

      const { error } = await supabase
        .from('fees')
        .insert(fees);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${validRows.length} fee records`,
      });

      // Reset
      setStep(1);
      setExcelHeaders([]);
      setExcelRows([]);
      setColumnMapping({});
      setParsedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Import Fee Records</h1>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="block cursor-pointer">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <ColumnMappingUI
            excelHeaders={excelHeaders}
            systemFields={SYSTEM_FIELDS}
            onMappingChange={setColumnMapping}
            onAutoDetect={() => {
              const auto = ExcelImportHelper.autoDetectMapping(
                excelHeaders,
                SYSTEM_FIELDS
              );
              setColumnMapping(auto);
            }}
          />
          <div className="flex gap-2">
            <Button onClick={() => setStep(1)} variant="outline">
              Back
            </Button>
            <Button onClick={handleValidate}>
              Validate Data
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <ValidationResultsUI
            errors={[]}
            validCount={parsedRows.filter(r => r._isValid).length}
            totalCount={parsedRows.length}
            onRetry={() => setStep(2)}
          />
          <div className="flex gap-2">
            <Button onClick={() => setStep(2)} variant="outline">
              Back
            </Button>
            <Button
              onClick={handleImport}
              loading={loading}
            >
              Import {parsedRows.filter(r => r._isValid).length} Records
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesImport;
```

## For Other Data Types

Just change these three things:

1. **SYSTEM_FIELDS** - Your data fields
```typescript
const SYSTEM_FIELDS = [
  'fieldName1',
  'fieldName2',
  'fieldName3',
];
```

2. **REQUIRED_FIELDS** - Which are mandatory
```typescript
const REQUIRED_FIELDS = ['fieldName1', 'fieldName2'];
```

3. **Database insert** - Your table and mapping
```typescript
const { error } = await supabase
  .from('your_table')
  .insert(transformedData);
```

## Use Cases

### Student Records Import
```typescript
SYSTEM_FIELDS = [
  'admissionNumber',
  'studentName',
  'dateOfBirth',
  'gender',
  'parentName',
  'parentPhone',
  'class',
  'stream',
];
```

### Staff Import
```typescript
SYSTEM_FIELDS = [
  'staffName',
  'staffId',
  'email',
  'phone',
  'position',
  'department',
  'dateJoined',
  'salary',
];
```

### Inventory Import
```typescript
SYSTEM_FIELDS = [
  'itemName',
  'itemCode',
  'category',
  'quantity',
  'unitPrice',
  'supplier',
  'reorderLevel',
  'location',
];
```

### Attendance Import
```typescript
SYSTEM_FIELDS = [
  'studentName',
  'admissionNumber',
  'date',
  'status',
  'class',
  'notes',
];
```

## Performance Tips

1. **Batch large imports**
```typescript
const batchSize = 1000;
for (let i = 0; i < validRows.length; i += batchSize) {
  const batch = validRows.slice(i, i + batchSize);
  await supabase.from('table').insert(batch);
}
```

2. **Show progress**
```typescript
const [progress, setProgress] = useState(0);
// Update during batch import
setProgress(Math.round((i / validRows.length) * 100));
```

3. **Handle large files**
```typescript
// Stream processing for very large files
const chunkSize = 100;
for (let i = 0; i < excelRows.length; i += chunkSize) {
  const chunk = excelRows.slice(i, i + chunkSize);
  const { parsed } = ExcelImportHelper.parseRows(chunk, mapping, required);
  // Process chunk
}
```

## Error Handling

```typescript
try {
  // File read
  const { headers, rows } = await ExcelImportHelper.readExcelFile(file);
} catch (error) {
  // Show file format error
}

try {
  // Validation
  const { parsed, errors } = ExcelImportHelper.parseRows(rows, mapping, required);
  
  if (errors.length > 0) {
    // Show validation errors to user
  }
} catch (error) {
  // Show validation error
}

try {
  // Database insert
  const { error } = await supabase.from('table').insert(data);
  
  if (error) {
    // Show database error
  }
} catch (error) {
  // Show unexpected error
}
```

## Testing Your Integration

```typescript
// Mock file
const mockFile = new File(
  ['Index,Name,Grade\nU0001/001,John,A'],
  'test.csv',
  { type: 'text/csv' }
);

// Test upload
await handleExcelUpload(mockFile);

// Verify state
expect(excelHeaders).toContain('Index');
expect(excelHeaders).toContain('Name');
expect(excelRows.length).toBe(1);
```

## Support & Troubleshooting

See:
- [EXCEL_IMPORT_DEVELOPER_GUIDE.md](./EXCEL_IMPORT_DEVELOPER_GUIDE.md)
- [EXCEL_IMPORT_GUIDE.md](./EXCEL_IMPORT_GUIDE.md)
- [EXCEL_IMPORT_EXAMPLES.md](./EXCEL_IMPORT_EXAMPLES.md)

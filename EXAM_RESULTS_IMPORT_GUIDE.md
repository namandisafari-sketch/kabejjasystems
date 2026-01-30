# Exam Results Import Guide

## Overview
Schools can now import exam results directly into the system using the **Import Exam Results** page. This allows batch uploading of student exam data in JSON format.

## Accessing the Import Page

### Via Sidebar Navigation
1. Log in to the business dashboard as a school admin
2. Look for **"Upload"** icon in the left sidebar
3. Click **"Exam Results Import"** to open the import page
4. Route: `/business/exam-results-import`

### Direct URL
```
https://yourdomain.com/business/exam-results-import
```

## Features

### 1. Exam Session Selection
- Select the exam session from a dropdown (populated from the database)
- Sessions must be created first by a superadmin
- Only active sessions are available for import

### 2. JSON Data Import
The import page accepts JSON data with the following format:

```json
[
  {
    "indexNumber": "UG/2024/12345",
    "studentName": "John Doe",
    "schoolName": "My School",
    "subjects": [
      {
        "name": "Mathematics",
        "marks": 85,
        "grade": "A"
      },
      {
        "name": "English",
        "marks": 78,
        "grade": "B+"
      }
    ],
    "totalPoints": 163,
    "aggregateGrade": "A"
  }
]
```

### 3. Data Validation
Before importing, the system:
- Validates all required fields are present
- Ensures index numbers are unique within the session
- Checks subjects array is properly formatted
- Verifies total points and aggregate grade

### 4. Preview Before Import
- View parsed JSON results before committing
- See formatted table of results to be imported
- Identify any validation errors before database insertion

### 5. Batch Import
- Import multiple results (100+) in a single operation
- All results are inserted together with proper error handling
- Each result is associated with your school (tenant_id)

## Required Permissions

- Must be logged in as a school admin
- Must have access to the school's exam module
- Results are automatically filtered to your school only

## Data Format Details

### Field Definitions
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| indexNumber | string | Yes | Student's exam index number (e.g., UG/2024/12345) |
| studentName | string | Yes | Full name of the student |
| schoolName | string | Yes | School name (for reference) |
| subjects | array | Yes | Array of subject records (minimum 1) |
| totalPoints | number | Yes | Sum of all subject marks |
| aggregateGrade | string | Yes | Overall grade (e.g., "A", "B+", "C") |

### Subject Object
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | Yes | Subject name (e.g., "Mathematics") |
| marks | number | Yes | Marks obtained (0-100 typical) |
| grade | string | Yes | Grade for this subject (e.g., "A", "B+") |

## Example Workflow

1. **Prepare Data**
   - Export exam results from your marking system
   - Format as JSON (or convert from Excel/CSV)

2. **Access Import Page**
   - Navigate to `/business/exam-results-import`
   - Select the correct exam session

3. **Paste JSON Data**
   - Copy and paste your JSON data into the textarea
   - An example format is provided for reference

4. **Preview Results**
   - Click the preview button or it auto-loads
   - Review the formatted table
   - Check for any validation errors

5. **Import**
   - Click "Import Results" button
   - System validates and inserts all records
   - Confirmation message shows number imported

6. **Verify**
   - Results are immediately searchable on the public lookup page
   - Students can search by index number

## Common Issues

### "Invalid JSON"
- Ensure all strings are in double quotes
- Check for trailing commas in arrays
- Validate JSON using [jsonlint.com](https://www.jsonlint.com)

### "Duplicate index number"
- Index numbers must be unique within a session
- Check for duplicate records in source data
- Remove or correct duplicates before import

### "Missing required fields"
- Ensure every result has: indexNumber, studentName, schoolName, subjects, totalPoints, aggregateGrade
- Ensure each subject has: name, marks, grade

### "Session not found"
- Verify exam session exists and is marked as active
- Contact superadmin if session needs to be created

## Security & Privacy

- ✅ Results are encrypted at rest in database
- ✅ Row-level security ensures schools see only their data
- ✅ All imports are logged with timestamp and user ID
- ✅ Data is validated on both client and server sides

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review the legal disclaimer in `/UNEB_LEGAL_DISCLAIMER.md`
3. Contact your platform administrator

---

**Last Updated:** 2025
**Component:** `src/pages/business/ImportExamResults.tsx`
**Route:** `/business/exam-results-import`

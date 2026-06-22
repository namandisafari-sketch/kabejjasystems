# Fix for Duplicate Students in Eden High School

## Problem Analysis

Students in the Eden High School account have duplicates where each student exists **twice**:
1. **First record**: With an admission number (e.g., `ADM/26/0001`) + UUID format
2. **Second record**: With a different admission number (6-digit format, e.g., `123456`)

### Root Cause

The `import-students.mjs` script has a **deduplication flaw**:

- The CSV file has NO `student_number` field (all 127 students have empty values)
- The script generates a NEW admission number for EVERY student using `getAdmissionNumber(r.student_number)`
- The deduplication only checked if the **generated admission_number** already exists, not the **student identity**
- Running the import script multiple times would create duplicate students with different generated admission numbers
- Without a unique identifier in the CSV, the script has no way to know these are the same students

### Why This Happened

The import script was designed with the assumption that either:
- The CSV would have a `student_number` field, OR
- The script would only be run once per import

Since the CSV has empty `student_number` fields, the script generated new admission numbers each time, treating every student as "new".

## Solution

### 1. Improved Import Script (`import-students.mjs`)

**Changes Made:**
- Added `createStudentIdentityKey()` function that creates a unique identifier based on:
  - First name + Last name + Date of birth (case-insensitive)
- Enhanced deduplication to check both:
  - Existing student **identity** in the database (prevents re-importing same students)
  - Existing **admission numbers** for safety
  - Duplicate identities **within the import file** itself
- Script now logs which students are skipped and why

**Benefits:**
- Script is now **idempotent** - safe to run multiple times without creating duplicates
- Existing students are detected by their identity, not by generated admission numbers
- Future imports will automatically skip students that were already imported

### 2. Manual Cleanup Script (`remove-duplicate-students.mjs`)

**How to use:**
```bash
# First, analyze the duplicates (dry run, no changes)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node remove-duplicate-students.mjs

# After reviewing, run with confirmation to actually delete duplicates
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node remove-duplicate-students.mjs --confirm
```

**What it does:**
- Groups students by identity (first name + last name + DOB)
- Identifies all duplicate groups
- **Keeps the oldest record** of each duplicate group
- **Deletes newer duplicate records**
- Provides detailed before/after statistics

### 3. Database Migration File

File: `supabase/migrations/20260622_fix_duplicate_eden_students.sql`
- Available for reference/documentation
- Contains SQL query to identify duplicates
- Safe to deploy as it's read-only (no destructive operations)

## Implementation Steps

### To Fix Existing Duplicates:

1. **Get your Supabase Service Role Key:**
   - Go to Supabase dashboard → Project Settings → API → Service Role key
   - Copy the full key (not the abbreviated version)

2. **Run the cleanup script:**
   ```bash
   cd C:\Users\user\kabejjasystems
   SUPABASE_SERVICE_ROLE_KEY="<paste-your-key>" node remove-duplicate-students.mjs
   ```

3. **Review the output** - it will show you:
   - How many duplicate groups were found
   - Which records will be deleted
   - How many records will remain

4. **Confirm and delete:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="<paste-your-key>" node remove-duplicate-students.mjs --confirm
   ```

### To Prevent Future Duplicates:

1. **Use the improved import script** - it now has better deduplication logic
2. **Do NOT run the import script multiple times** with the same CSV file (the new version prevents this anyway)
3. **Ensure CSV has student identifiers** - ideally first name, last name, and date of birth should be populated

## Testing the Fix

After running the cleanup:

```bash
# Verify no duplicates remain
SUPABASE_SERVICE_ROLE_KEY="<paste-your-key>" node remove-duplicate-students.mjs
# Should show: "✓ No duplicates found!"

# Count total students
SUPABASE_SERVICE_ROLE_KEY="<paste-your-key>" node import-students.mjs
# If there are truly new students, they'll be imported
# Existing students will be skipped
```

## Files Modified/Created

1. **Modified:** `import-students.mjs`
   - Added student identity key generation
   - Enhanced deduplication logic
   - Better logging

2. **Created:** `remove-duplicate-students.mjs`
   - Identifies and removes duplicate student records
   - Keeps oldest, deletes newer duplicates

3. **Created:** `supabase/migrations/20260622_fix_duplicate_eden_students.sql`
   - SQL reference for understanding the issue
   - Contains diagnostic queries

## Notes

- The fix prioritizes **data integrity** by keeping the oldest record (first import)
- Future imports using the improved script will be safe from duplicates
- The identity-based deduplication works even if admission numbers change
- All changes are reversible if needed (deleted records can be recovered from Supabase backups)

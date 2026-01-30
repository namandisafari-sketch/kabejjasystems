# Exam Import Permissions - Owner Management

## Overview

The **Exam Import Permissions** system allows school owners to:
1. **Personally import exam results** (always allowed)
2. **Grant import permission to staff members** without requiring 'admin' role
3. **Revoke permission at any time**

## Access Control

### Who Can Use This Feature

**School Owners (tenant_owner role):**
- ✅ Always can import exam results
- ✅ Can access `/business/exam-import-permissions` page
- ✅ Can grant/revoke access to staff

**Staff Members with Permission:**
- ✅ Can import exam results if granted by owner
- ✅ Can access `/business/exam-results-import` page

**Staff Members without Permission:**
- ❌ See "Unauthorized" message
- ❌ Cannot access import page

**Superadmins:**
- ✅ Always can import (platform level)
- ✅ Can manage any school's permissions if needed

---

## Using the Permissions Manager

### For School Owners

**Location:** `/business/exam-import-permissions`

**Steps:**
1. Log in as school owner
2. Click **"Exam Import Permissions"** in sidebar (shield icon)
3. View list of all staff members
4. Click **"Grant"** to allow someone to import
5. Click **"Revoke"** to remove access

### For Staff Members

**Before Permission Granted:**
```
❌ Unauthorized
Only the school owner or authorized staff can import results. 
Ask your school owner to grant you access.
```

**After Permission Granted:**
```
✅ Access Granted
Can now use /business/exam-results-import page
```

---

## How It Works (Technical)

### Authorization Check
```typescript
// ImportExamResults.tsx

const canImport = 
  profile.role === 'tenant_owner' ||                    // School owner
  profile.role === 'superadmin' ||                      // Platform admin
  (profile.permissions?.exam_import_access === true);   // Granted by owner
```

### Permission Storage
Permissions are stored in the `profiles.permissions` JSONB field:

```json
{
  "exam_import_access": true
}
```

### Granting Permission
```typescript
// ExamImportPermissions.tsx

const updatedPermissions = {
  ...currentPermissions,
  exam_import_access: true  // Toggle between true/false
};

await supabase
  .from('profiles')
  .update({ permissions: updatedPermissions })
  .eq('id', staffId);
```

---

## Features

### 1. Staff Member List
- Shows all non-owner staff in your school
- Displays their role (staff, teacher, etc.)
- Shows current permission status (Granted/Not Granted)

### 2. Grant/Revoke Buttons
- **Grant** - Enable exam import for this staff member
- **Revoke** - Disable exam import for this staff member
- Changes apply immediately

### 3. Real-time Updates
- Staff member can immediately access import page after grant
- Permission lost immediately upon revocation
- No session restart needed

### 4. Informational Panel
- "How It Works" section explains the system
- Clear instructions for granting/revoking
- Who can always import

---

## Differences from Admin Role System

| Feature | Admin Role | Permission System |
|---------|-----------|------------------|
| **Setup** | Requires role change | Single permission toggle |
| **Scope** | Gives access to many features | Only exam import access |
| **Flexibility** | All-or-nothing | Fine-grained control |
| **Who Manages** | Superadmin or owner | Owner only |
| **Risk Level** | Higher (access to sensitive areas) | Lower (import only) |

---

## Example Workflow

```
Day 1: School owner signs up
  ↓
Owner creates account as 'tenant_owner'
  ↓
Owner can immediately import exam results ✓

Day 2: Owner invites staff member
  ↓
Staff creates account with role='staff'
  ↓
Staff tries to import → "Unauthorized" error

Day 3: Owner grants permission
  ↓
Owner goes to /business/exam-import-permissions
  ↓
Finds staff member in list
  ↓
Clicks "Grant" button
  ↓
Permission updated: exam_import_access = true

Day 3 (later): Staff member can now import
  ↓
Staff goes to /business/exam-results-import
  ↓
Authorization check passes ✓
  ↓
Can upload exam results successfully ✓

Day 10: Staff member leaves
  ↓
Owner revokes permission
  ↓
Permission updated: exam_import_access = false
  ↓
If staff tries to access import page
  ↓
Gets "Unauthorized" error again ✓
```

---

## Pages Overview

### ExamImportPermissions.tsx (`/business/exam-import-permissions`)

**Purpose:** Management interface for school owners

**Features:**
- Owner verification (must be tenant_owner)
- Load all staff members
- Grant/revoke individual permissions
- Real-time UI updates
- Success/error toasts

**Key Functions:**
```typescript
checkOwnerStatus()      // Verify user is owner
fetchStaff()            // Load all staff from database
toggleExamImportAccess() // Grant or revoke permission
```

### ImportExamResults.tsx (`/business/exam-results-import`)

**Purpose:** Import page for exam data entry

**Changes Made:**
- Updated authorization logic
- Now checks: `tenant_owner` OR `superadmin` OR `exam_import_access` permission
- Same import functionality as before

---

## Database Schema

### profiles Table (Relevant Fields)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  role TEXT,              -- 'tenant_owner', 'staff', etc.
  tenant_id UUID,         -- Links to their school
  permissions JSONB,      -- { "exam_import_access": true/false }
  ...
);
```

### Granting Permission (SQL)
```sql
UPDATE profiles
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{exam_import_access}',
  'true'::jsonb
)
WHERE id = 'staff-user-id'
AND tenant_id = 'school-id';
```

---

## Sidebar Navigation

Both pages are now accessible from the school dashboard sidebar:

- **Upload** icon → `/business/exam-results-import` (ImportExamResults)
- **Shield** icon → `/business/exam-import-permissions` (ExamImportPermissions)

Only accessible to logged-in school users.

---

## Error Handling

### Unauthorized Cases

```
1. Not logged in
   → "You must be logged in"

2. Not a school owner (trying to manage permissions)
   → "Only school owners can manage exam import permissions"

3. Not granted access (trying to import)
   → "Only the school owner or authorized staff can import results"
```

### Success Cases

```
1. Permission granted
   → "Exam import access granted"

2. Permission revoked
   → "Exam import access revoked"

3. Results imported successfully
   → "[N] results imported successfully"
```

---

## Security Considerations

✅ **Row-Level Security (RLS):** Database ensures users only see their school's data

✅ **Owner-Only Management:** Only school owners can grant permissions

✅ **Tenant Isolation:** Each school's staff are separate from other schools

✅ **No Privilege Escalation:** Permission only grants import access, nothing else

✅ **Audit Trail:** Changes are logged in `updated_at` timestamp

---

## Related Routes

| Route | Purpose | Role Required |
|-------|---------|---------------|
| `/business/exam-results-import` | Import exam data | tenant_owner / superadmin / has_permission |
| `/business/exam-import-permissions` | Manage permissions | tenant_owner only |
| `/exam-results` | Public lookup | Any user (public) |
| `/exam-results/:id` | View result details | Public with index number |

---

## Troubleshooting

### "I'm the owner but can't see the permissions page"
- Verify your role is `tenant_owner`
- Check database: `SELECT role FROM profiles WHERE id = current_user`
- Refresh browser

### "I granted permission but staff still see error"
- Have staff member refresh browser
- Check if permission was saved: `SELECT permissions FROM profiles WHERE id = staff_id`
- May take a few seconds to propagate

### "Can't revoke permission"
- Ensure you're logged in as school owner
- Check if any errors in browser console
- Try again - may have been a network issue

---

## Future Enhancements

Possible improvements:
- Bulk grant/revoke permissions
- Permission expiry dates
- Audit log of permission changes
- Restrict import to specific exam sessions
- Limit import volume per staff member
- Email notifications when permissions change

---

**Last Updated:** January 2026
**Files Created/Modified:**
- [src/pages/business/ExamImportPermissions.tsx](src/pages/business/ExamImportPermissions.tsx) - NEW
- [src/pages/business/ImportExamResults.tsx](src/pages/business/ImportExamResults.tsx) - MODIFIED
- [src/App.tsx](src/App.tsx) - MODIFIED (added route)
- [src/hooks/use-tenant-modules.ts](src/hooks/use-tenant-modules.ts) - MODIFIED (added sidebar link)

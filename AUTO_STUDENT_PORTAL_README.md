# Auto-Generated Student Portal Accounts

## Overview
Students now receive automatic portal accounts when enrolled, with auto-generated email addresses and instant access to the student portal.

## What Changed

### 1. Auto-Generated Portal Emails
When enrolling a student, the system automatically generates a portal email if none is provided:
- **Format**: `firstname.lastname.admissionnumber@tennahubapps.com`
- **Example**: `john.doe.670000@tennahubapps.com`
- **Optional**: You can provide a custom email during enrollment

### 2. Automatic Auth Account Creation
During student enrollment:
- A Supabase Auth account is created automatically
- Portal email and User ID are linked to the student record
- Status shows "Enabled" instead of "Not configured"

### 3. Welcome Email
After enrollment:
- A welcome email is sent to the student
- Includes portal login instructions
- Provides password reset link for first login
- Lists available portal features

## How It Works

### Student Enrollment Flow
```
1. Admin enrolls student via "Enroll Student" form
   ↓
2. System generates portal email (if not provided)
   ↓
3. Auth account created in Supabase
   ↓
4. Student record updated with user_id and email
   ↓
5. Welcome email sent automatically
   ↓
6. Portal Status shows "Enabled"
```

### What Student Sees

**Before (Manual Process)**:
- Portal Email: `-`
- Portal Status: `Not configured`
- Portal User ID: `-`
- Password: `Reset via email link`
- ✗ Required manual setup in Admin > Student Accounts

**After (Automatic)**:
- Portal Email: `firstname.lastname.admissionnumber@tennahubapps.com`
- Portal Status: `Enabled`
- Portal User ID: `[UUID]` (auto-assigned)
- Password: `Set via welcome email`
- ✓ Instant access, no manual setup needed

## Files Modified

### Client-Side Components
- **`src/components/students/StudentEnrollmentForm.tsx`**
  - Added `email` field to form data
  - New input: "Portal Email (Student Login)"
  - Auto-generates if left empty

- **`src/pages/business/Students.tsx`**
  - Updated `createMutation` to auto-create portal accounts
  - Updated `updateMutation` to handle portal emails
  - Added import: `generatePortalEmail, createStudentPortalAccount`
  - Shows portal email in success toast

### New Utilities
- **`src/lib/student-portal-utils.ts`** (NEW)
  - `generatePortalEmail()` - Creates email from name & admission number
  - `generateTemporaryPassword()` - Generates random secure password
  - `createStudentPortalAccount()` - Creates Supabase Auth account
  - `sendStudentWelcomeEmail()` - Sends welcome email via edge function
  - `createStudentPortalAccountWithEmail()` - Combined operation

### Backend Functions
- **`supabase/functions/send-student-welcome-email/index.ts`** (NEW)
  - Edge function for sending welcome emails
  - Generates HTML email template
  - Uses Resend API for email delivery
  - Non-critical failure (won't break enrollment if email fails)

## Portal Email Auto-Generation

### Algorithm
```typescript
// Takes: first name, last name, admission number
// Returns: email address

email = firstname.lastname.admissionnumber@tennahubapps.com

// All characters normalized:
- Lowercase
- No spaces
- Only alphanumeric characters
- Special characters removed

// Examples:
"John" + "Doe" + "670000" → john.doe.670000@tennahubapps.com
"Mary Jane" + "Smith" + "670001" → mary.smith.670001@tennahubapps.com
"Jean-Paul" + "O'Brien" + "670002" → jeanpaul.obrien.670002@tennahubapps.com
```

## Welcome Email Template

Students receive an HTML email with:
- School name and welcome message
- Portal login email
- Portal URL link
- Password reset instructions
- List of portal features
- Support contact information

## Error Handling

### Portal Account Creation Fails
- **Behavior**: Student is still enrolled, but without portal access
- **Toast**: "Warning" message explaining the failure
- **Fallback**: Admin can manually create account later via Admin > Student Accounts

### Email Sending Fails
- **Behavior**: Non-critical - enrollment proceeds normally
- **Note**: Welcome email can be resent manually later
- **Student Still Gains Access**: Portal account is created even if email fails

## Usage

### During Student Enrollment
1. Go to **Business > Students**
2. Click **"Enroll Student"**
3. Fill in student details
4. Leave **Portal Email** empty for auto-generation
   - OR provide custom email address
5. Click **"Enroll Student"**
6. Portal email appears in success message

### Viewing Student Portal Details
1. Go to **Business > Students**
2. Click **"View"** on a student
3. See **Student Portal** section with:
   - Portal Email (auto-generated)
   - Portal Status (Enabled/Not configured)
   - Portal User ID (UUID)
   - Password reset button

### Resetting Student Password
1. View student details
2. If Portal Status is "Enabled", click **"Reset portal password"**
3. Password reset link sent to student email

## API Reference

### generatePortalEmail(firstName, lastName, admissionNumber)
```typescript
const email = generatePortalEmail("John", "Doe", "670000");
// Returns: "john.doe.670000@tennahubapps.com"
```

### createStudentPortalAccount(...)
```typescript
const result = await createStudentPortalAccount(
  "John",
  "Doe",
  "670000",
  "tenant-id",
  "Eden High School"
);
// Returns: { success: true, email: "...", userId: "..." }
```

### sendStudentWelcomeEmail(...)
```typescript
const result = await sendStudentWelcomeEmail(
  "john.doe.670000@tennahubapps.com",
  "John Doe",
  "Eden High School"
);
// Returns: { success: true }
```

## Migration Notes

### Existing Students Without Portal Access
- Students enrolled before this feature have no portal account
- They will NOT get auto-created accounts
- Admin can manually create accounts via **Admin > Student Accounts**
- Or update student record and re-save to trigger account creation

### Future Updates to StudentEnrollmentForm
If updating the form in the future:
1. Preserve the `email` field in form data
2. Keep auto-generation logic if email is empty
3. Don't remove the portal email input field

## Benefits

✓ **Automated**: No manual account creation needed  
✓ **Instant Access**: Students can log in immediately  
✓ **Unique Emails**: Each student has unique portal email  
✓ **School-Aware**: Email includes admission number for identification  
✓ **Welcome Communication**: Students receive login instructions  
✓ **Fallback**: Graceful handling if email or auth creation fails  
✓ **Flexible**: Admins can override with custom email if needed  

## Troubleshooting

### Student Shows "Portal Status: Not configured"
- Portal account creation likely failed
- Check error message in enrollment success toast
- Manually create account via Admin > Student Accounts
- Or contact support

### Welcome Email Not Received
- Check spam/junk folder
- Email addresses use `@tennahubapps.com` domain
- Resend API may need configuration
- Manual email can be sent via password reset link

### Duplicate Email Errors
- Email must be unique in Supabase Auth
- Auto-generation uses admission number to ensure uniqueness
- If custom email was provided, verify it's not already in use

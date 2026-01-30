# Role & Profile Flow - Complete User Journey

## Overview
Your system has a **multi-tier role and profile system** with different pathways for different user types. Here's the complete flow:

---

## 1. User Types & Roles

### **Platform Level Roles:**
```
┌─────────────────────────────────────────────────┐
│           PLATFORM ADMIN (SUPERADMIN)           │
├─────────────────────────────────────────────────┤
│ • Invites admin accounts via invitation tokens  │
│ • Manages all tenants (schools/businesses)      │
│ • Creates exam sessions                         │
│ • Can access any school's data                  │
│ • No tenant_id (works across all tenants)       │
└─────────────────────────────────────────────────┘
```

### **Tenant Level Roles (School/Business Specific):**
```
┌──────────────────────────────────────┐
│  TENANT_OWNER (Business Owner)       │
├──────────────────────────────────────┤
│ • Created when owner signs up        │
│ • Owns the tenant (school/business)  │
│ • Has admin access to their tenant   │
│ • Can manage staff and permissions   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  ADMIN (School Admin)                │
├──────────────────────────────────────┤
│ • Invited by tenant owner            │
│ • Manages school operations          │
│ • Can import exam results ✓          │
│ • Access to exam features            │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  STAFF/TEACHER/STUDENT               │
├──────────────────────────────────────┤
│ • Regular users with limited access  │
│ • Cannot import exam results ✗       │
│ • Can view assigned data             │
└──────────────────────────────────────┘
```

---

## 2. Signup & Profile Creation Flows

### **Flow A: Regular Business/School Signup**
```
User visits /signup
    ↓
Step 1: Enter Business Details
    • Business name
    • Business type (restaurant, school, etc.)
    • Email & phone
    ↓
Step 2: Select Package
    • Choose pricing tier
    ↓
Step 3: Create Owner Account
    • Full name
    • Password (min 6 chars)
    ↓
Authentication Created (Supabase Auth)
    ↓
Tenant Created (via RPC: create_tenant_for_signup)
    • status = 'trial' (14-day free trial)
    • business_type set
    • trial_ends_at = now + 14 days
    ↓
Profile Created (via RPC: create_profile_for_signup)
    • role = 'tenant_owner'
    • tenant_id = newly created tenant
    ↓
Success! Redirects to /business
    ↓
User is now TENANT_OWNER with full access ✓
```

**Key Table Entries:**
```sql
auth.users (Supabase)
├─ id (UUID)
├─ email
└─ created_at

profiles
├─ id (references auth.users)
├─ tenant_id ← LINKED TO THEIR SCHOOL
├─ role = 'tenant_owner'
├─ full_name
└─ phone

tenants
├─ id
├─ name
├─ business_type
├─ status = 'trial'
├─ created_by (user id)
└─ trial_ends_at
```

---

### **Flow B: Platform Admin (Superadmin) Creation**

```
Platform superadmin generates invitation token
    ↓
Token stored in admin_invitations table:
    • token (unique)
    • email (target admin email)
    • expires_at (24 hours)
    • used = false
    ↓
Invitation link sent to new admin:
    https://yourdomain.com/admin-signup?token=xxxxx
    ↓
New admin clicks link → /admin-signup page
    ↓
Page validates token:
    • Must exist in admin_invitations table
    • Must NOT be expired (expires_at > now)
    • Must NOT already used (used = false)
    ↓
If valid, show signup form
If invalid, show "Access Denied" message
    ↓
New admin fills form:
    • Full name
    • Password (min 8 chars)
    • Confirm password
    ↓
Authentication Created (Supabase Auth)
    ↓
Profile Created
    • role = 'superadmin'
    • tenant_id = NULL (works across all tenants)
    ↓
Token marked as used:
    • used = true
    • used_by = new admin's id
    • used_at = now
    ↓
Success! Redirects to /login
    ↓
User is now SUPERADMIN ✓ (can invite other admins, create exam sessions)
```

**Key Table Entries:**
```sql
admin_invitations (one-time setup)
├─ id
├─ token
├─ email
├─ expires_at
├─ used
├─ used_by
└─ used_at

profiles (for superadmin)
├─ id (references auth.users)
├─ tenant_id = NULL (no tenant restriction)
├─ role = 'superadmin'
└─ full_name
```

---

### **Flow C: School Admin Invitation (After Signup)**

```
Tenant owner (Business Owner) in /business dashboard
    ↓
Goes to Staff/Employees section
    ↓
Clicks "Invite Staff Member"
    ↓
Fills form:
    • Email
    • Role (admin, staff, teacher)
    ↓
System creates invitation record
    ↓
Invitation link sent via email:
    https://yourdomain.com/accept-invitation?code=xxxxx
    ↓
New staff member clicks link
    ↓
Page validates invitation
    ↓
Staff member creates account
    ↓
Profile Created
    • role = chosen role (e.g., 'admin')
    • tenant_id = SAME TENANT as inviter
    ↓
Success!
    ↓
User is now ADMIN of that specific school ✓
```

**Key Concept:** tenant_id links users to their school
```sql
profiles
├─ id (user id)
├─ tenant_id = same as tenant owner
├─ role = 'admin' (if invited as admin)
└─ full_name
```

---

## 3. Current Issue: Why You're "Unauthorized"

### **Your Current Profile:**
```
profiles table entry:
├─ id = your-user-id
├─ role = 'staff' or other non-admin role  ← PROBLEM HERE
├─ tenant_id = your-school-id
└─ full_name
```

### **What ImportExamResults Requires:**
```typescript
// From ImportExamResults.tsx
if (!['admin', 'superadmin'].includes(profile.role)) {
  ❌ Show "Unauthorized" error
}
```

### **Solutions:**

**Solution 1: Tenant Owner Promotes You**
```
If you're the tenant owner:
  1. Go to Staff/Employees
  2. Find your record
  3. Change role to 'admin' ← Updates your profile.role
  4. Refresh page
  5. Try import again ✓
```

**Solution 2: Direct Database Update (If you have access)**
```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'your-user-id'
AND tenant_id = 'your-school-id';

-- Verify:
SELECT id, role, tenant_id FROM profiles WHERE id = 'your-user-id';
```

**Solution 3: SQL Query in Supabase**
```
1. Go to Supabase dashboard
2. SQL Editor
3. Run the UPDATE query above
4. Refresh your browser
5. Try import again ✓
```

---

## 4. Role Hierarchy & Permissions

```
SUPERADMIN (Platform Level)
├─ Can create exam sessions
├─ Can manage all tenants
├─ Can invite new superadmins
├─ Can access all schools' data
└─ tenant_id = NULL

TENANT_OWNER (Business Owner)
├─ Full access to their tenant
├─ Can invite staff
├─ Can change staff roles
├─ Can import exam results ✓
└─ tenant_id = their school id

ADMIN (School Admin)
├─ Can import exam results ✓ ← YOU NEED THIS
├─ Can manage most features
├─ Permissions limited to their tenant_id
└─ Limited staff invitation rights

STAFF/TEACHER
├─ Can view assigned data
├─ Cannot import exam results ✗
└─ Limited permissions

STUDENT
├─ Read-only access
└─ Cannot import anything ✗
```

---

## 5. Database Schema - Key Tables

### **profiles Table**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,              -- User ID from auth.users
  tenant_id UUID,                   -- Links to their school/business
  role TEXT DEFAULT 'staff',        -- 'tenant_owner', 'admin', 'staff', etc.
  full_name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_role ON profiles(role);
```

### **tenants Table**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT,                        -- School/Business name
  business_type TEXT,               -- 'school', 'restaurant', etc.
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'trial',      -- 'trial', 'active', 'suspended'
  trial_ends_at TIMESTAMPTZ,
  created_by UUID,                  -- Owner's user ID
  created_at TIMESTAMPTZ
);
```

### **admin_invitations Table** (One-time use)
```sql
CREATE TABLE admin_invitations (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE,                -- Random token
  email TEXT,
  expires_at TIMESTAMPTZ,           -- 24 hours from creation
  used BOOLEAN DEFAULT false,
  used_by UUID,
  used_at TIMESTAMPTZ
);
```

---

## 6. Permission Checks Throughout App

### **Exam Results Import Check:**
```typescript
// src/pages/business/ImportExamResults.tsx

const { data: profile } = await supabase
  .from('profiles')
  .select('role, tenant_id')
  .eq('id', session.user.id)
  .single();

// This checks:
if (!['admin', 'superadmin'].includes(profile.role)) {
  // ❌ You don't have permission
}

// AND implicitly filters data by tenant_id in RLS
```

### **Similar Checks on Other Pages:**
- BlockedExamAccess.tsx - requires 'admin' role
- Staff pages - requires 'admin' or 'tenant_owner'
- Payment pages - checks tenant_id for data isolation

---

## 7. Quick Reference: Your Journey to Admin

### **If you signed up as business owner:**
```
1. You were created as 'tenant_owner' automatically ✓
2. You CAN import exam results (tenant_owner ≈ admin)
3. If blocked, check your role:
   SELECT role FROM profiles WHERE id = current_user_id;
```

### **If you were invited by the owner:**
```
1. You were created with role = 'staff' (default)
2. Owner must promote you to 'admin'
3. Owner goes to Staff section and changes your role
4. Then you can import ✓
```

### **If you're a new school:**
```
1. Sign up at /signup
2. You become tenant_owner automatically
3. You can immediately import exam results ✓
```

---

## 8. RLS (Row Level Security) - Data Isolation

```sql
-- Example RLS Policy on exam_results table:
CREATE POLICY "Schools see only their results"
  ON exam_results FOR SELECT
  USING (school_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- This means:
-- Even if you hack the SQL, you can only see YOUR school's data
-- Profile.tenant_id determines what data you access
```

---

## Summary Table

| Signup Method | Initial Role | Can Import? | tenant_id | Notes |
|---|---|---|---|---|
| Regular Signup | tenant_owner | ✓ Yes | Their school | Full access |
| Invited as Admin | admin | ✓ Yes | Their school | Admin access |
| Invited as Staff | staff | ✗ No | Their school | Limited access |
| SuperAdmin signup | superadmin | ✓ Yes | NULL | Platform access |

---

## Next Step to Fix Your Issue

1. **Verify your current role:**
   ```sql
   SELECT role, tenant_id FROM profiles 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email');
   ```

2. **If role is NOT 'admin' or 'tenant_owner':**
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE id = 'your-user-id';
   ```

3. **Refresh your browser** and try importing again!

---

**Last Updated:** January 2026
**Key Files:**
- [src/pages/Signup.tsx](src/pages/Signup.tsx) - Regular user signup
- [src/pages/AdminSignup.tsx](src/pages/AdminSignup.tsx) - Platform admin signup
- [src/pages/business/ImportExamResults.tsx](src/pages/business/ImportExamResults.tsx) - Authorization check

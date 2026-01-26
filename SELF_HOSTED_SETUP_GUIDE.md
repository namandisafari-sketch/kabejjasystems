# Kabejja BizTrack - Self-Hosted Supabase Setup Guide

## Overview

This guide explains how to set up your own Supabase instance for Kabejja BizTrack **without Row Level Security (RLS)**. This approach is simpler but requires you to handle authorization at the application level.

## Prerequisites

1. A self-hosted Supabase instance OR a Supabase project
2. Access to the SQL Editor in Supabase Dashboard
3. PostgreSQL client (optional, for direct connections)

---

## Step 1: Access Your Supabase SQL Editor

### Option A: Supabase Dashboard
1. Log in to your Supabase Dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Option B: Direct PostgreSQL Connection
```bash
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres
```

---

## Step 2: Run the Migration Script

1. Open the file `MIGRATION_NO_RLS.sql` from this repository
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`

The script is designed to run **without errors** by:
- Using `IF NOT EXISTS` for all table creations
- Using `DO $$ ... EXCEPTION ... END $$` blocks for type creations to handle duplicates
- Using `DROP TRIGGER IF EXISTS` before creating triggers
- Using `ON CONFLICT DO NOTHING/UPDATE` for seed data
- Creating dependencies in the correct order:
  1. Extensions (uuid-ossp, pgcrypto)
  2. Custom enum types (app_role, asset_category, asset_condition)
  3. Basic helper functions (update_updated_at_column)
  4. **Core tables** (packages → tenants → profiles → branches, etc.)
  5. **Table-dependent functions** (is_admin, has_role, generate_codes - AFTER tables)
  6. Triggers (AFTER both tables and functions exist)
  7. Indexes for performance
  8. Seed data for modules and packages

**No RLS Issues**: The migration does NOT include Row Level Security policies, eliminating RLS-related errors.

The script will create:
- All 85+ tables needed for the application (including school_assets, asset_maintenance, asset_assignments)
- All helper functions and triggers
- Custom enum types (app_role, asset_category, asset_condition)
- Indexes for better performance
- Seed initial package and module data

---

## Step 3: Post-Migration Verification Checklist

After running the migration, verify success with these checks:

### ✅ Quick Verification (Run in SQL Editor)

```sql
-- 1. Check tables exist (should return 85+ rows)
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Verify key tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'profiles', 'user_roles', 'packages', 
                   'products', 'sales', 'students', 'school_assets');

-- 3. Verify custom types exist
SELECT typname FROM pg_type 
WHERE typname IN ('app_role', 'asset_category', 'asset_condition');

-- 4. Verify functions (should return 7+ rows)
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN ('is_admin', 'has_role', 'get_user_tenant_info', 
                'generate_asset_code', 'generate_referral_code');

-- 5. Verify seed data
SELECT COUNT(*) as module_count FROM business_modules; -- Should be 40+
SELECT COUNT(*) as package_count FROM packages; -- Should be 3+

-- 6. Verify NO RLS policies (should return 0 rows)
SELECT COUNT(*) as rls_count FROM pg_policies WHERE schemaname = 'public';
```

### ✅ Expected Results

| Check | Expected Result |
|-------|-----------------|
| Table count | 85+ tables |
| Key tables | 8 rows returned |
| Custom types | 3 types (app_role, asset_category, asset_condition) |
| Functions | 7+ functions |
| Modules | 40+ rows |
| Packages | 3+ rows |
| RLS policies | 0 rows |

### ❌ If Any Check Fails

- **Missing tables**: Re-run the migration, check for errors in output
- **Missing functions**: Ensure you ran the COMPLETE script
- **Missing types**: Check for "duplicate_object" warnings (safe to ignore)
- **RLS policies found**: This script shouldn't create any - check if you ran wrong file

---

## Step 3: Create Storage Buckets

After running the migration, create the storage bucket for logos:

1. Go to **Storage** in the Supabase Dashboard
2. Click **New bucket**
3. Create a bucket named `business-logos`
4. Check **Public bucket** (so logos can be accessed publicly)

---

## Step 4: Configure Authentication

### Enable Email/Password Auth
1. Go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled
3. Configure email templates if needed

### Disable Email Confirmation (for development)
1. Go to **Authentication** > **Settings**
2. Under **Email Auth**, turn OFF **Confirm email**
3. This allows instant signup without email verification

---

## Step 5: Get Your Connection Details

From **Project Settings** > **API**, note down:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (keep secret!)
```

---

## Step 6: Configure the Application

### Update Environment Variables

Create or update your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### For Self-Hosted Supabase

If using a self-hosted instance (e.g., on your own server):

```env
VITE_SUPABASE_URL=https://your-domain.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# For Edge Functions (server-side)
SELF_HOSTED_SUPABASE_URL=http://your-server-ip:8000
SELF_HOSTED_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Step 7: Create Your First Admin User

### Option A: Via Application
1. Open the app and click "Sign Up"
2. Register with your admin email
3. Then run this SQL to make yourself an admin:

```sql
UPDATE profiles 
SET role = 'superadmin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

### Option B: Direct SQL
```sql
-- After the user signs up, update their role
UPDATE profiles SET role = 'superadmin' WHERE id = 'USER_UUID_HERE';

-- Or insert directly (if profile doesn't exist)
INSERT INTO profiles (id, role, full_name)
VALUES ('USER_UUID_HERE', 'superadmin', 'Admin Name');
```

---

## Database Schema Overview

### Core Tables
| Table | Purpose |
|-------|---------|
| `tenants` | Multi-tenant business organizations |
| `profiles` | User profiles linked to auth.users |
| `packages` | Subscription packages |
| `branches` | Business branch locations |
| `business_modules` | Available feature modules |

### Business Modules
| Table | Purpose |
|-------|---------|
| `products` | Inventory items |
| `customers` | Customer records |
| `sales` | Sales transactions |
| `expenses` | Expense tracking |
| `employees` | Staff records |

### School Management
| Table | Purpose |
|-------|---------|
| `students` | Student enrollment |
| `school_classes` | Class/Grade definitions |
| `subjects` | Academic subjects |
| `fee_payments` | Fee collection |
| `report_cards` | Academic reports |
| `school_assets` | Furniture, equipment, books inventory |
| `asset_maintenance` | Maintenance history for assets |
| `asset_assignments` | Asset allocation tracking |

### Rental Management
| Table | Purpose |
|-------|---------|
| `rental_properties` | Property listings |
| `rental_units` | Individual units |
| `rental_tenants` | Renter information |
| `leases` | Lease agreements |
| `rental_payments` | Rent collection |

---

## Security Considerations

⚠️ **IMPORTANT**: Without RLS, security must be handled at the application level:

1. **Never expose the Service Role Key** to the client
2. **Use the Anon Key** for client-side operations
3. **Validate tenant_id** in all queries at the application level
4. **Implement authorization checks** in your backend/edge functions

### Recommended Approach

```typescript
// Always filter by tenant_id in your queries
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('tenant_id', currentUserTenantId); // Always include this!
```

---

## Backup & Restore

### Create Backup
```bash
pg_dump -h YOUR_HOST -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

### Restore Backup
```bash
psql -h YOUR_HOST -U postgres -d postgres < backup_20250125.sql
```

---

## Troubleshooting

### Issue: "relation does not exist"
- Ensure migration script ran completely
- Check for errors in the SQL output

### Issue: Foreign key constraint violation
- Tables must be created in order (migration handles this)
- If inserting manually, ensure referenced records exist

### Issue: Permission denied
- Check you're using the correct database role
- Ensure the anon/service role has proper grants

### Issue: Storage upload fails
- Verify the bucket exists and is public
- Check CORS settings if uploading from browser

---

## Maintenance

### Update Database Schema
When new features are added, run any new migration files in order.

### Monitor Database Size
```sql
SELECT pg_size_pretty(pg_database_size('postgres'));
```

### Clean Old Data
```sql
-- Example: Delete audit logs older than 90 days
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Support

For issues or questions:
- Check the GitHub repository issues
- Contact: support@kabejjasystems.store

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release with 80+ tables |

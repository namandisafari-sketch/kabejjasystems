# Fix Student Portal RLS Issue - 406 Error

The student authentication is working, but the RLS (Row Level Security) is blocking authenticated users from reading their own student record.

## Quick Fix (2 minutes):

1. **Go to:** https://app.supabase.com/project/ljgbjiixeoxxqpejnmjx/sql/new

2. **Copy and paste this SQL:**

```sql
-- Drop old policies
DROP POLICY IF EXISTS "students_select" ON public.students CASCADE;
DROP POLICY IF EXISTS "students_insert" ON public.students CASCADE;
DROP POLICY IF EXISTS "students_update" ON public.students CASCADE;
DROP POLICY IF EXISTS "students_delete" ON public.students CASCADE;
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view own student record" ON public.students CASCADE;

-- Allow authenticated users to read their own record
CREATE POLICY "students_authenticated_select_own" ON public.students
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow anonymous for login flow
CREATE POLICY "students_anon_select" ON public.students
FOR SELECT
TO anon
USING (true);

-- Allow authenticated to update their own record
CREATE POLICY "students_authenticated_update_own" ON public.students
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS and grant permissions
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.students TO authenticated, anon, public;
GRANT UPDATE ON public.students TO authenticated;
```

3. **Click "Run"** (or Ctrl+Enter)

4. **After it runs, test the login again:**
   - Go to https://system.tennahubapps.com/student/login
   - School Code: `ED7890`
   - Admission Number: `670033`
   - Check email and click the link

---

## What this fixes:

- ✅ Authenticated users can SELECT their own student record (matched by `user_id`)
- ✅ Anonymous users can SELECT (needed for login OTP flow)
- ✅ Authenticated users can UPDATE their own record
- ✅ Removes the 406 "Not Acceptable" error

After you run this, the auth callback should find the student and log you in successfully!

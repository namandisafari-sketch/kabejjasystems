# Fix OTP Expired Error

The "Email link is invalid or has expired" error means the redirect URL in the Supabase Auth config doesn't match what we're sending in the magic link.

## Quick Fix:

1. **Go to:** https://app.supabase.com/project/ljgbjiixeoxxqpejnmjx/auth/url-configuration

2. **Set these exact values:**

### Site URL:
```
https://system.tennahubapps.com
```

### Redirect URLs:
Add ALL of these (one per line, copy-paste each):
```
https://system.tennahubapps.com/student/auth-callback
https://system.tennahubapps.com/student/auth-callback?tenant=*
https://system.tennahubapps.com/student/auth-callback?tenant=*&school=*
http://localhost:3000/student/auth-callback
http://localhost:3000/student/auth-callback?tenant=*
```

3. **Click Save**

4. **Immediately test the login:**
   - Go to https://system.tennahubapps.com/student/login
   - School Code: `ED7890`
   - Admission Number: `670033`
   - Click "Send Login Link"
   - **Immediately check your email** (within 1-2 minutes)
   - **Click the link right away**

---

## Why This Happens:

- Supabase generates the magic link with redirect URL: `https://system.tennahubapps.com/student/auth-callback?tenant=ef7a3391-...&school=EDEN...`
- It checks if this URL is in the **Redirect URLs** whitelist
- If not found (and wildcards like `?tenant=*` aren't set), it rejects the link as invalid
- The error shows `access_denied` because the redirect isn't whitelisted

After you add these redirect URLs and save, the magic links will work!

# Platform Admin Signup Security Guide

## Overview
The Platform Admin signup page is now **protected with multiple security layers** to ensure that only authorized individuals can create platform administrator accounts.

## Security Layers Implemented

### 1. **Invitation Token System** (Primary Protection)
- Admin accounts can **ONLY** be created using valid invitation tokens
- Tokens are time-limited (default: 7 days)
- Tokens become invalid after use (one-time use only)
- Each token is tied to a specific email address

**Database Table**: `admin_invitations`
```sql
- id: UUID (primary key)
- email: Text (who the invite is for)
- token: Text (unique, secure token)
- created_at: Timestamp
- expires_at: Timestamp (validates token lifetime)
- used: Boolean (prevents reuse)
- used_by: UUID (links to user who used it)
- used_at: Timestamp
- created_by: UUID (who created the invitation)
```

### 2. **Environment Variable Control**
Set in `.env`:
```env
# Set to 'false' to require invitation tokens (RECOMMENDED)
VITE_ADMIN_SIGNUP_ENABLED="false"

# Set to 'true' ONLY during initial setup to allow first admin creation
VITE_ADMIN_SIGNUP_ENABLED="true"  # Use carefully!
```

### 3. **Role-Based Access Control**
- Only **superadmins** can generate new invitation tokens
- Authorization is verified server-side
- Users attempting unauthorized access see access denied page

---

## How It Works

### Creating a New Admin (Superadmin Only)

```typescript
import { generateAdminInvitation } from "@/lib/admin-invitations";

// Generate invitation
const result = await generateAdminInvitation(
  "newadmin@example.com",
  7  // expires in 7 days
);

if (result) {
  console.log("Invite URL:", result.inviteUrl);
  // Share this URL with the person: 
  // https://yourdomain.com/admin-signup?token=abc123...
}
```

### Accepting an Invitation

1. User receives invitation link: `https://yourdomain.com/admin-signup?token=xyz789`
2. User visits the link
3. Page validates the token:
   - Token exists in database
   - Token hasn't been used
   - Token hasn't expired
4. If valid:
   - Form pre-fills with email from invitation
   - User can set password and complete signup
5. After signup:
   - Token is marked as `used`
   - User ID recorded as `used_by`
   - User becomes superadmin

---

## API Reference

### `generateAdminInvitation(email, expiresInDays)`
Generate a new invitation token for admin signup.

**Parameters:**
- `email` (string): Email address of invitee
- `expiresInDays` (number, optional): Days until expiration (default: 7)

**Returns:** 
```typescript
{
  token: string;        // The unique token
  inviteUrl: string;    // Full URL to share
}
```

**Example:**
```typescript
const { token, inviteUrl } = await generateAdminInvitation("admin@company.com", 14);
// Share inviteUrl via email/message
```

---

### `validateAdminInvitation(token)`
Verify if a token is valid and unused.

**Parameters:**
- `token` (string): The invitation token to validate

**Returns:** 
- `boolean`: true if valid and usable, false otherwise

---

### `getPendingInvitations()`
List all active (unused, non-expired) invitations.

**Returns:** 
```typescript
Array<{
  id: UUID;
  email: string;
  created_at: timestamp;
  expires_at: timestamp;
  created_by: UUID;
  // ...
}>
```

**Example:**
```typescript
const pending = await getPendingInvitations();
// Display in admin dashboard for tracking
```

---

### `revokeAdminInvitation(invitationId)`
Cancel an invitation before it's used.

**Parameters:**
- `invitationId` (UUID): ID of invitation to revoke

**Returns:** 
- `boolean`: true if revoked successfully

---

## Security Best Practices

### ✅ DO:
- [ ] Keep `VITE_ADMIN_SIGNUP_ENABLED="false"` in production
- [ ] Review pending invitations regularly
- [ ] Revoke unused invitations after 7 days
- [ ] Only share invitation links via secure channels (email, not chat)
- [ ] Log all admin account creations
- [ ] Monitor for suspicious signup patterns

### ❌ DON'T:
- [ ] Leave `VITE_ADMIN_SIGNUP_ENABLED="true"` in production
- [ ] Share invitation tokens publicly
- [ ] Allow reuse of tokens
- [ ] Create invitations for unverified email addresses
- [ ] Bypass the invitation system

---

## Initial Setup: Creating the First Admin

If you need to create the very first admin account:

1. **Temporarily enable signup**:
   ```env
   VITE_ADMIN_SIGNUP_ENABLED="true"
   ```

2. **Visit** `http://localhost:3000/admin-signup` (without token)

3. **Complete signup** to become superadmin

4. **Immediately disable** signup again:
   ```env
   VITE_ADMIN_SIGNUP_ENABLED="false"
   ```

5. **Use `generateAdminInvitation()`** for all future admins

---

## Implementation Details

### AdminSignup Component Flow

1. Page loads with optional `token` URL parameter
2. Component validates token:
   - Checks if `VITE_ADMIN_SIGNUP_ENABLED` is true
   - If false, requires token
   - Validates token against database
3. If unauthorized: Shows "Access Denied" message
4. If authorized: Shows signup form
5. On submit:
   - Creates auth user
   - Creates superadmin profile
   - Marks token as used
   - Redirects to login

---

## Monitoring & Auditing

### Check Invitation Status
```typescript
const invitations = await getPendingInvitations();
invitations.forEach(inv => {
  console.log(`${inv.email} - Expires: ${inv.expires_at}`);
});
```

### View Used Invitations
```sql
SELECT * FROM admin_invitations 
WHERE used = true
ORDER BY used_at DESC;
```

### Find Admin Accounts
```sql
SELECT id, full_name, email, created_at 
FROM profiles 
WHERE role = 'superadmin'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### "Invalid, expired, or already-used invitation token"
- ✓ Check token is correct
- ✓ Verify token hasn't been used already
- ✓ Check expiration date: `SELECT expires_at FROM admin_invitations WHERE token = '...'`

### "Admin signup is currently disabled"
- ✓ Check `.env` file: `VITE_ADMIN_SIGNUP_ENABLED`
- ✓ For new admin: Generate invitation instead

### "You are not authorized to create invitations"
- ✓ User must be superadmin
- ✓ Check: `SELECT role FROM profiles WHERE id = user_id`

---

## Database Setup

Run this migration to enable admin invitations:

```bash
# Automatic (recommended)
supabase migration up

# Or manually upload the SQL file:
# supabase/migrations/add_admin_invitations.sql
```

---

## Related Components

- **AdminSignup.tsx**: Signup form with token validation
- **ProtectedAdminRoute.tsx**: Route protection wrapper (for future use)
- **admin-invitations.ts**: Utility functions for managing invitations

---

## Questions?

For security concerns or feature requests, contact the platform development team.

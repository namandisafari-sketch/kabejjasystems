# Supabase + Pesapal Payment Setup Guide

## Quick Start with Supabase Free Tier

### 1. Your Existing Supabase Project
I can see you already have a Supabase project set up! Let's configure it for payments.

### 2. Run Database Migration

In your Supabase Dashboard:
1. Go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/20260107_add_payments_tables.sql`
4. Click "Run" to execute

This creates:
- `subscription_packages` table (with 3 default packages)
- `payments` table (for tracking Pesapal transactions)
- Proper indexes and RLS policies

### 3. Verify Your `.env` File

Make sure your `.env` has the Supabase credentials (keep the existing ones):

```bash
VITE_SUPABASE_PROJECT_ID=rrvdswuciofjkydofpie
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://rrvdswuciofjkydofpie.supabase.co

# Add Pesapal credentials
VITE_PESAPAL_CONSUMER_KEY=your_pesapal_key
VITE_PESAPAL_CONSUMER_SECRET=your_pesapal_secret
VITE_PESAPAL_API_URL=https://cybqa.pesapal.com/pesapalv3
VITE_PESAPAL_IPN_URL=https://yourdomain.com/api/pesapal/ipn
VITE_PESAPAL_CALLBACK_URL=https://yourdomain.com/payment/callback
```

### 4. Get Pesapal Credentials

1. Sign up at [https://www.pesapal.com](https://www.pesapal.com)
2. Go to Dashboard → Settings → API Keys
3. Copy your Consumer Key and Consumer Secret
4. Add them to `.env`

### 5. Test Payment Flow

```bash
npm run dev
```

Visit: http://localhost:8080/payment

### 6. Deploy to Vercel

Vercel will automatically use your Supabase free tier:

```bash
# Push to GitHub if not already
git add .
git commit -m "Added Pesapal payment integration"
git push

# Deploy to Vercel
# Go to vercel.com → Import your repo
# Add environment variables from .env
```

### 7. Troubleshooting

**"Cannot read properties of null"** error (like in your screenshot):
- This usually happens when trying to access DOM elements before they're loaded
- Make sure SQL migrations are run in Supabase
- Check browser console for specific errors

**Packages not showing:**
- Run the SQL migration to create `subscription_packages` table
- Verify data exists: Go to Supabase → Table Editor → subscription_packages

**Payment not initiating:**
- Check Pesapal credentials are correct
- Verify Supabase RLS policies allow inserts to `payments` table

---

## Database Schema (Already Created)

The migration creates:

### `subscription_packages`
- Starter: UGX 50,000/month
- Professional: UGX 100,000/month  
- Enterprise: UGX 200,000/month

### `payments`
- Tracks all Pesapal transactions
- Links to tenants
- Stores tracking IDs and status

---

## Supabase Free Tier Limits

- **Database**: 500 MB
- **File Storage**: 1 GB
- **Bandwidth**: 2 GB/month
- **Realtime**: Great for testing!

Perfect for initial development. Later migrate to self-hosted when needed.

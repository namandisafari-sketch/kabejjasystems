# Firebase Setup Guide for Pesapal Payment Integration

## Quick Start

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name: "Kabejja Biz Track" (or your choice)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Get Firebase Configuration
1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register app name: "Kabejja Web App"
5. Copy the `firebaseConfig` object

### 3. Update `.env` File
Create/update `.env` in your project root:

```bash
# Firebase Configuration (from step 2)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456:web:abc123

# Pesapal Configuration
VITE_PESAPAL_CONSUMER_KEY=your_pesapal_consumer_key
VITE_PESAPAL_CONSUMER_SECRET=your_pesapal_consumer_secret
VITE_PESAPAL_API_URL=https://cybqa.pesapal.com/pesapalv3
VITE_PESAPAL_IPN_URL=https://yourdomain.com/api/pesapal/ipn
VITE_PESAPAL_CALLBACK_URL=https://yourdomain.com/payment/callback
```

### 4. Enable Firebase Services

#### Enable Authentication
1. Firebase Console → Build → Authentication
2. Click "Get started"
3. Enable "Email/Password" provider
4. Click "Save"

#### Enable Firestore Database
1. Firebase Console → Build → Firestore Database
2. Click "Create database"
3. Start in **Test mode** (for development)
4. Choose location (closest to Uganda: `europe-west`)
5. Click "Enable"

### 5. Create Firestore Collections

Run these commands in Firestore Console → Data tab:

#### Collection: `subscriptionPackages`
Create 3 documents with auto-generated IDs:

**Document 1** (Starter):
```json
{
  "name": "Starter",
  "description": "Perfect for small businesses getting started",
  "priceMonthly": 50000,
  "priceYearly": 540000,
  "billingCycleMonths": 1,
  "features": ["Up to 5 users", "Basic POS", "Inventory management", "Sales reports", "Email support"],
  "isActive": true,
  "createdAt": [Timestamp - use current time],
  "updatedAt": [Timestamp - use current time]
}
```

**Document 2** (Professional):
```json
{
  "name": "Professional",
  "description": "Ideal for growing businesses",
  "priceMonthly": 100000,
  "priceYearly": 1080000,
  "billingCycleMonths": 1,
  "features": ["Up to 20 users", "Advanced POS", "Full inventory control", "Advanced analytics", "Restaurant & Salon modules", "Priority support", "Custom branding"],
  "isActive": true,
  "createdAt": [Timestamp],
  "updatedAt": [Timestamp]
}
```

**Document 3** (Enterprise):
```json
{
  "name": "Enterprise",
  "description": "Complete solution for large organizations",
  "priceMonthly": 200000,
  "priceYearly": 2160000,
  "billingCycleMonths": 1,
  "features": ["Unlimited users", "All modules included", "School management", "Rental & repair tracking", "Multi-branch support", "API access", "Dedicated account manager", "24/7 support"],
  "isActive": true,
  "createdAt": [Timestamp],
  "updatedAt": [Timestamp]
}
```

#### Collection: `tenants`
(Create as needed when users sign up)

#### Collection: `profiles`  
(Create when users register)

#### Collection: `payments`
(Auto-created when first payment is initiated)

### 6. Set Up Firestore Security Rules (Later)

For now, use test mode. Before production, update rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Subscription packages - readable by all authenticated users
    match /subscriptionPackages/{packageId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can modify (implement admin check)
    }
    
    // Payments - users can read their own tenant's payments
    match /payments/{paymentId} {
      allow read: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.tenantId;
      allow create: if request.auth != null;
      allow update: if false; // Only backend functions should update
    }
    
    // Tenants - users can read their own tenant
    match /tenants/{tenantId} {
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.tenantId == tenantId;
    }
    
    // Profiles - users can read their own profile
    match /profiles/{profileId} {
      allow read: if request.auth != null && profileId == request.auth.uid;
    }
  }
}
```

### 7. Test the Integration

```bash
npm run dev
```

Visit: `http://localhost:8080/payment`

**Test Flow**:
1. Select a package (Starter/Professional/Enterprise)
2. Fill in billing info
3. Complete payment via Pesapal sandbox

### 8. Monitor in Firebase Console

- **Authentication** → Users tab (see registered users)
- **Firestore** → Data tab (see payments collection populate)
- **Usage** → Dashboard (monitor read/write operations)

---

## Differences from Supabase Version

| Feature | Supabase | Firebase |
|---------|----------|----------|
| Database | PostgreSQL | Firestore (NoSQL) |
| Import | `import { supabase } from '@/integrations/supabase/client'` | `import { db } from '@/config/firebase'` |
| Query | `.from('payments').select('*')` | `getDocs(collection(db, 'payments'))` |
| Insert | `.insert({ ... })` | `addDoc(collection(db, 'payments'), { ... })` |
| Update | `.update({ ... })` | `updateDoc(doc(db, 'payments', id), { ... })` |
| Auth | `supabase.auth.getUser()` | `auth.currentUser` |
| Hook File | `use-pesapal-payment.ts` | `use-pesapal-payment-firebase.ts` |

---

## Troubleshooting

### "Firebase not initialized"
- Check `.env` file has all Firebase config variables
- Restart dev server (`npm run dev`)

### "Permission denied" in Firestore
- Ensure Firestore is in Test mode
- Check security rules allow reads/writes

### Packages not showing
- Verify `subscriptionPackages` collection exists
- Check documents have `isActive: true`

### Payment not creating
- Check browser console for errors
- Verify Firebase config is correct
- Check Pesapal credentials

---

## Next Steps

1. ✅ Configure Firebase (follow steps 1-4 above)
2. ✅ Create Firestore collections (step 5)
3. ✅ Test payment flow (step 7)
4. Build native apps (same process as before)

---

For production deployment, remember to:
- Switch Firestore to Production mode with proper security rules
- Use Pesapal live API (not sandbox)
- Set up Firebase Hosting or your preferred hosting


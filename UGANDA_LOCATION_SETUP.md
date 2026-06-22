# Uganda Location Data Integration - Implementation Guide

## Overview
Complete integration of Uganda's administrative geographic data (districts, constituencies, subcounties) using the [Uganda-Open-Data/kalulu](https://github.com/Uganda-Open-Data/kalulu) repository (2020 edition).

## What Was Implemented

### 1. Database Schema
**New Tables Created:**
- `uganda_districts` - 146 districts with region classification
- `uganda_constituencies` - Constituencies/counties linked to districts  
- `uganda_subcounties` - Subcounties/divisions linked to constituencies

**Student Table Updates:**
- Added foreign key columns:
  - `district_id` → references `uganda_districts`
  - `constituency_id` → references `uganda_constituencies`
  - `subcounty_id` → references `uganda_subcounties`
- Added biographical columns:
  - `place_of_birth` (TEXT)
  - `nationality` (TEXT, default: 'Ugandan')
  - `religion` (TEXT)
  - `special_talent` (TEXT)
  - `home_address` (TEXT)
- Added email columns:
  - `email` (TEXT) - portal login email
  - `notification_email` (TEXT) - for notifications/announcements
- Added text columns for display:
  - `district_name`, `constituency_name`, `subcounty_name`

### 2. Backend Code
**Migration File:** `supabase/migrations/20260622_create_uganda_location_tables.sql`
- Creates all location tables with proper constraints
- Adds indexes for fast queries
- Implements RLS policies (public read, admin-only write)
- Updates students table with foreign keys

**Location Importer:** `src/lib/uganda-location-importer.ts`
- Fetches data from Uganda-Open-Data/kalulu repository
- Imports districts, constituencies, and subcounties
- Maintains hierarchical relationships with foreign keys
- Batch import for performance (100 records/batch)
- Helper functions: `getDistrictByName()`, `getConstituenciesByDistrict()`, `getSubcountiesByConstituency()`

**Admin Page:** `src/pages/admin/AdminDataImport.tsx`
- Manual trigger to import Uganda location data
- Shows import status and statistics
- Error handling and user feedback

### 3. Frontend Integration
**Existing Component:** `src/components/location/UgandaAddressSelect.tsx`
- Cascading select dropdowns: District → Constituency → Subcounty
- Already integrated into StudentEnrollmentForm
- Uses React Query hooks for caching

**Location Hooks:** `src/hooks/use-uganda-locations.ts`
- `useUgandaDistricts()` - Fetches all districts
- `useUgandaConstituencies(districtCode)` - Fetches constituencies for a district
- `useUgandaSubcounties(constituencyCode)` - Fetches subcounties for a constituency

## Implementation Steps

### Step 1: Apply Database Migration
Execute in Supabase SQL Editor:

```sql
-- Copy the entire contents of:
-- supabase/migrations/20260622_create_uganda_location_tables.sql
```

**What this does:**
- Creates 3 new location tables with indexes
- Adds location columns to students table
- Enables RLS with appropriate policies

### Step 2: Deploy Code
```bash
git push origin main  # Push to GitHub (already committed as commit 7d7cef6)
vercel deploy --prod  # Deploy to Vercel
```

### Step 3: Import Uganda Location Data
Once deployed, go to the admin page:
- URL: `/admin/data-import` (or add route to your admin menu)
- Click "Import Uganda Location Data" button
- Wait for import to complete (takes ~10-30 seconds)
- See confirmation with statistics

**Or manually in your app:**
```typescript
import { importUgandaLocationData } from '@/lib/uganda-location-importer';
const result = await importUgandaLocationData(supabase);
```

### Step 4: Verify Setup
1. Navigate to student enrollment page
2. Try editing a student
3. Verify location dropdowns work:
   - Select a district → constituencies should populate
   - Select a constituency → subcounties should populate
4. Location values should save without errors

## Data Structure

### Districts (146 entries)
```json
{
  "id": "uuid",
  "district_code": 70,
  "district_name": "ABIM",
  "region_code": 3,
  "region_name": "NORTHERN",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Constituencies (~200+ entries)
```json
{
  "id": "uuid",
  "constituency_code": 95,
  "constituency_name": "LABWOR COUNTY",
  "district_id": "uuid",
  "district_code": 70,
  "district_name": "ABIM"
}
```

### Subcounties (~1000+ entries)
```json
{
  "id": "uuid",
  "subcounty_code": 1,
  "subcounty_name": "ABIM",
  "constituency_id": "uuid",
  "constituency_code": 95,
  "constituency_name": "LABWOR COUNTY",
  "district_id": "uuid",
  "district_code": 70,
  "district_name": "ABIM"
}
```

## RLS Policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| uganda_districts | Public (anyone) | Admin only | Admin only | Admin only |
| uganda_constituencies | Public (anyone) | Admin only | Admin only | Admin only |
| uganda_subcounties | Public (anyone) | Admin only | Admin only | Admin only |

This allows public read access for dropdowns while preventing unauthorized modifications.

## Error Resolution

### Error: "Could not find the 'constituency' column of 'students'"
**Cause:** Migration not applied to Supabase
**Fix:** Run the SQL migration in Supabase dashboard

### Error: "Failed to load resource: the server responded with a status of 404"  
**Cause:** Location tables don't exist yet
**Fix:** Complete Steps 1-3 above

### Cascading dropdowns not working
**Cause:** Data not imported yet
**Fix:** Run AdminDataImport page to populate tables

## Features Added

✅ Student location selection (district → constituency → subcounty)  
✅ Biographical information capture (place of birth, nationality, religion, talent)  
✅ Portal email auto-generation (admissionnumber@ttl.student)  
✅ Notification email for separate communication channel  
✅ RLS protection for location data  
✅ Cascading dropdown UI  
✅ React Query caching for performance  
✅ Admin import utility for data management  

## Related Systems

- **Student Portal Accounts:** Auto-generated with `admissionnumber@ttl.student` format
- **Student Enrollment Form:** Already integrated with location selectors
- **LSC Report Cards:** Separate system, uses student data

## Data Source
- **Repository:** https://github.com/Uganda-Open-Data/kalulu
- **Edition:** 2020 (most recent)
- **License:** Check repository for license details
- **Files Used:**
  - `district_lookup/uganda_districts_2020.json`
  - `constituency_lookup/uganda_constituencies_2020.json`
  - `subcounty_lookup/uganda_subcounties_2020.json`

## Next Steps
1. Run migration in Supabase SQL Editor
2. Deploy to Vercel
3. Access `/admin/data-import` page
4. Click import button
5. Test student enrollment with location dropdowns

## Troubleshooting

**Q: Admin page doesn't exist**  
A: Route not added to your router. Add this to your routing config:
```typescript
{
  path: '/admin/data-import',
  element: <AdminDataImport />
}
```

**Q: Import fails with network error**  
A: Check internet connection, kalulu repository is accessible from your server

**Q: Dropdowns show but no data loads**  
A: Check browser console for errors, verify RLS policies allow public SELECT

**Q: Location data disappears after import**  
A: Check if Supabase database backup/restore occurred, re-run import

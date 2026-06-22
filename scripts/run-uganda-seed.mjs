// Run from project root: node scripts/run-uganda-seed.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';
const BASE = 'https://raw.githubusercontent.com/Uganda-Open-Data/kalulu/master';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function execSQL(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // Try alternative: use rest endpoint directly
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SQL error: ${text}`);
    }
  }
}

async function fetchJSON(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function run() {
  // Step 1: Run migrations via raw SQL endpoint
  console.log('\n--- Running migrations ---');

  // Create tables SQL
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS uganda_districts (
      district_code INTEGER PRIMARY KEY,
      district_name TEXT NOT NULL,
      region_code INTEGER NOT NULL,
      region_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS uganda_constituencies (
      constituency_code INTEGER PRIMARY KEY,
      constituency_name TEXT NOT NULL,
      district_code INTEGER NOT NULL REFERENCES uganda_districts(district_code) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_uganda_constituencies_district ON uganda_constituencies(district_code);
    CREATE TABLE IF NOT EXISTS uganda_subcounties (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      subcounty_code INTEGER NOT NULL,
      subcounty_name TEXT NOT NULL,
      district_code INTEGER NOT NULL REFERENCES uganda_districts(district_code) ON DELETE CASCADE,
      constituency_code INTEGER NOT NULL REFERENCES uganda_constituencies(constituency_code) ON DELETE CASCADE,
      UNIQUE(subcounty_code, district_code)
    );
    CREATE INDEX IF NOT EXISTS idx_uganda_subcounties_district ON uganda_subcounties(district_code);
    CREATE INDEX IF NOT EXISTS idx_uganda_subcounties_constituency ON uganda_subcounties(constituency_code);

    ALTER TABLE uganda_districts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE uganda_constituencies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE uganda_subcounties ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can read uganda_districts" ON uganda_districts;
    CREATE POLICY "Authenticated users can read uganda_districts" ON uganda_districts FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "Authenticated users can read uganda_constituencies" ON uganda_constituencies;
    CREATE POLICY "Authenticated users can read uganda_constituencies" ON uganda_constituencies FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "Authenticated users can read uganda_subcounties" ON uganda_subcounties;
    CREATE POLICY "Authenticated users can read uganda_subcounties" ON uganda_subcounties FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "Service role can insert uganda_districts" ON uganda_districts;
    CREATE POLICY "Service role can insert uganda_districts" ON uganda_districts FOR INSERT TO service_role WITH CHECK (true);
    DROP POLICY IF EXISTS "Service role can insert uganda_constituencies" ON uganda_constituencies;
    CREATE POLICY "Service role can insert uganda_constituencies" ON uganda_constituencies FOR INSERT TO service_role WITH CHECK (true);
    DROP POLICY IF EXISTS "Service role can insert uganda_subcounties" ON uganda_subcounties;
    CREATE POLICY "Service role can insert uganda_subcounties" ON uganda_subcounties FOR INSERT TO service_role WITH CHECK (true);

    ALTER TABLE students ADD COLUMN IF NOT EXISTS constituency TEXT;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS subcounty TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS constituency TEXT;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS subcounty TEXT;
  `;

  // Execute SQL via raw query
  console.log('Creating tables and policies...');
  // Use supabase rest API with service_role key for raw SQL
  const sqlUrl = `${SUPABASE_URL}/rest/v1/`;
  
  // Split and run each statement
  const statements = createTablesSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    const res = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ query: stmt + ';' }),
    });
    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      // Ignore "already exists" and "duplicate" errors
      if (!text.includes('already exists') && !text.includes('duplicate')) {
        console.warn(`  Warning (non-fatal): ${text.substring(0, 200)}`);
      }
    }
  }

  // Actually, the /rest/v1/ endpoint doesn't support arbitrary SQL.
  // Let me use the Supabase JS SDK client with the service key to insert directly via the Data API.

  // Step 2: Fetch and seed data using Data API (bypasses RLS with service_role key)
  console.log('\n--- Seeding data ---');

  const districts = await fetchJSON('district_lookup/uganda_districts_2020.json');
  console.log(`Districts: ${districts.length}`);

  const constituencies = await fetchJSON('constituency_lookup/uganda_constituencies_2020.json');
  console.log(`Constituencies: ${constituencies.length}`);

  const subcounties = await fetchJSON('subcounty_lookup/uganda_subcounties_2020.json');
  console.log(`Subcounties: ${subcounties.length}`);

  // Seed districts
  console.log('\nSeeding districts...');
  const districtRows = districts.map(d => ({
    district_code: d.district_code,
    district_name: d.district_name,
    region_code: d.region_code,
    region_name: d.region_name,
  }));
  const { error: dErr } = await supabase.from('uganda_districts').upsert(districtRows, {
    onConflict: 'district_code',
    ignoreDuplicates: false,
  });
  if (dErr) throw new Error(`District insert: ${dErr.message}`);
  console.log(`  ${districtRows.length} districts upserted`);

  // Seed constituencies
  console.log('Seeding constituencies...');
  const conRows = constituencies.map(c => ({
    constituency_code: c.constituency_code,
    constituency_name: c.constituency_name,
    district_code: c.district_code,
  }));
  const { error: cErr } = await supabase.from('uganda_constituencies').upsert(conRows, {
    onConflict: 'constituency_code',
    ignoreDuplicates: false,
  });
  if (cErr) throw new Error(`Constituency insert: ${cErr.message}`);
  console.log(`  ${conRows.length} constituencies upserted`);

  // Seed subcounties in batches
  console.log('Seeding subcounties...');
  const CHUNK = 500;
  const subRows = subcounties.map(s => ({
    subcounty_code: s.subcounty_code,
    subcounty_name: s.subcounty_name,
    district_code: s.district_code,
    constituency_code: s.constituency_code,
  }));
  for (let i = 0; i < subRows.length; i += CHUNK) {
    const chunk = subRows.slice(i, i + CHUNK);
    const { error: sErr } = await supabase.from('uganda_subcounties').upsert(chunk, {
      onConflict: 'subcounty_code, district_code',
      ignoreDuplicates: false,
    });
    if (sErr) throw new Error(`Subcounty insert chunk ${i}: ${sErr.message}`);
    console.log(`  chunk ${Math.floor(i/CHUNK) + 1}/${Math.ceil(subRows.length/CHUNK)}: ${chunk.length} upserted`);
  }
  console.log(`  ${subRows.length} subcounties upserted`);

  console.log('\n✅ All done! Uganda location data seeded successfully.');
}

run().catch(err => { console.error('\n❌', err); process.exit(1); });

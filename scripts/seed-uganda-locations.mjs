// seed-uganda-locations.mjs
// Populates uganda_districts, uganda_constituencies and uganda_subcounties
// from the kalulu GitHub repository (2020 electoral boundaries).
//
// Usage:
//   node scripts/seed-uganda-locations.mjs
//
// Requires env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
// or SUPABASE_URL, SUPABASE_SERVICE_KEY for admin access.

const BASE = 'https://raw.githubusercontent.com/Uganda-Open-Data/kalulu/master';

async function fetchJSON(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function seed() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY env vars');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching district data...');
  const districts = await fetchJSON('district_lookup/uganda_districts_2020.json');
  console.log(`  ${districts.length} districts`);

  console.log('Fetching constituency data...');
  const constituencies = await fetchJSON('constituency_lookup/uganda_constituencies_2020.json');
  console.log(`  ${constituencies.length} constituencies`);

  console.log('Fetching subcounty data...');
  const subcounties = await fetchJSON('subcounty_lookup/uganda_subcounties_2020.json');
  console.log(`  ${subcounties.length} subcounties`);

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
  if (dErr) { console.error('  Error seeding districts:', dErr.message); process.exit(1); }
  console.log(`  ✓ ${districtRows.length} districts upserted`);

  // Seed constituencies
  console.log('Seeding constituencies...');
  const constituencyRows = constituencies.map(c => ({
    constituency_code: c.constituency_code,
    constituency_name: c.constituency_name,
    district_code: c.district_code,
  }));

  const { error: cErr } = await supabase.from('uganda_constituencies').upsert(constituencyRows, {
    onConflict: 'constituency_code',
    ignoreDuplicates: false,
  });
  if (cErr) { console.error('  Error seeding constituencies:', cErr.message); process.exit(1); }
  console.log(`  ✓ ${constituencyRows.length} constituencies upserted`);

  // Seed subcounties
  console.log('Seeding subcounties...');
  const subcountyRows = subcounties.map(s => ({
    subcounty_code: s.subcounty_code,
    subcounty_name: s.subcounty_name,
    district_code: s.district_code,
    constituency_code: s.constituency_code,
  }));

  // Batch upsert in chunks of 500 to avoid payload limits
  const CHUNK = 500;
  for (let i = 0; i < subcountyRows.length; i += CHUNK) {
    const chunk = subcountyRows.slice(i, i + CHUNK);
    const { error: sErr } = await supabase.from('uganda_subcounties').upsert(chunk, {
      onConflict: 'subcounty_code, district_code',
      ignoreDuplicates: false,
    });
    if (sErr) { console.error(`  Error seeding subcounties (chunk ${i}):`, sErr.message); process.exit(1); }
    console.log(`  chunk ${i / CHUNK + 1}: ${chunk.length} upserted`);
  }
  console.log(`  ✓ ${subcountyRows.length} subcounties upserted`);

  console.log('\n✅ Uganda locations seeded successfully!');
}

seed().catch(err => { console.error(err); process.exit(1); });

/**
 * Uganda Location Data Importer
 * Fetches location data from Uganda-Open-Data/kalulu repository and imports it into Supabase
 * 
 * Usage:
 * import { importUgandaLocationData } from '@/lib/uganda-location-importer';
 * await importUgandaLocationData(supabaseClient);
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface District {
  district_code: number;
  district_name: string;
  region_code: number;
  region_name: string;
}

interface Constituency {
  constituency_code: number;
  constituency_name: string;
  district_code: number;
  district_name: string;
}

interface Subcounty {
  subcounty_code: number;
  subcounty_name: string;
  district_code: number;
  district_name: string;
  constituency_code: number;
  constituency_name: string;
}

const KALULU_REPO_BASE =
  'https://raw.githubusercontent.com/Uganda-Open-Data/kalulu/master';

const DATA_URLS = {
  districts: `${KALULU_REPO_BASE}/district_lookup/uganda_districts_2020.json`,
  constituencies: `${KALULU_REPO_BASE}/constituency_lookup/uganda_constituencies_2020.json`,
  subcounties: `${KALULU_REPO_BASE}/subcounty_lookup/uganda_subcounties_2020.json`,
};

/**
 * Fetch JSON data from URL with error handling
 */
async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Import districts into the database
 */
async function importDistricts(
  supabase: SupabaseClient,
  districts: District[]
): Promise<Record<number, string>> {
  console.log(`Importing ${districts.length} districts...`);

  const districtMap: Record<number, string> = {};

  // Clear existing data
  await supabase.from('uganda_districts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Insert districts and collect IDs
  for (const district of districts) {
    const { data, error } = await supabase
      .from('uganda_districts')
      .insert([
        {
          district_code: district.district_code,
          district_name: district.district_name,
          region_code: district.region_code,
          region_name: district.region_name,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error(`Error inserting district ${district.district_name}:`, error);
      continue;
    }

    districtMap[district.district_code] = data.id;
  }

  console.log(`Successfully imported ${Object.keys(districtMap).length} districts`);
  return districtMap;
}

/**
 * Import constituencies into the database
 */
async function importConstituencies(
  supabase: SupabaseClient,
  constituencies: Constituency[],
  districtMap: Record<number, string>
): Promise<Record<number, string>> {
  console.log(`Importing ${constituencies.length} constituencies...`);

  const constituencyMap: Record<number, string> = {};
  let successCount = 0;

  // Clear existing data
  await supabase
    .from('uganda_constituencies')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // Import in batches to avoid API overwhelming
  const batchSize = 100;
  for (let i = 0; i < constituencies.length; i += batchSize) {
    const batch = constituencies.slice(i, i + batchSize);
    const records = batch
      .map((constituency) => {
        const districtId = districtMap[constituency.district_code];

        if (!districtId) {
          console.warn(
            `District not found for constituency ${constituency.constituency_name}`
          );
          return null;
        }

        return {
          constituency_code: constituency.constituency_code,
          constituency_name: constituency.constituency_name,
          district_id: districtId,
          district_code: constituency.district_code,
          district_name: constituency.district_name,
        };
      })
      .filter(Boolean);

    if (records.length === 0) continue;

    const { error, data } = await supabase
      .from('uganda_constituencies')
      .insert(records as Parameters<typeof supabase.from>[0][])
      .select('id, constituency_code');

    if (error) {
      console.error(`Error inserting constituency batch ${i / batchSize + 1}:`, error);
      continue;
    }

    if (data) {
      data.forEach((row: any) => {
        constituencyMap[row.constituency_code] = row.id;
        successCount++;
      });
    }
  }

  console.log(`Successfully imported ${successCount} constituencies`);
  return constituencyMap;
}

/**
 * Import subcounties into the database
 */
async function importSubcounties(
  supabase: SupabaseClient,
  subcounties: Subcounty[],
  districtMap: Record<number, string>,
  constituencyMap: Record<number, string>
): Promise<void> {
  console.log(`Importing ${subcounties.length} subcounties...`);

  let successCount = 0;

  // Clear existing data
  await supabase
    .from('uganda_subcounties')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // Insert subcounties in batches to avoid overwhelming the API
  const batchSize = 100;
  for (let i = 0; i < subcounties.length; i += batchSize) {
    const batch = subcounties.slice(i, i + batchSize);
    const records = batch
      .map((subcounty) => {
        const districtId = districtMap[subcounty.district_code];
        const constituencyId = constituencyMap[subcounty.constituency_code];

        if (!districtId || !constituencyId) {
          console.warn(
            `Missing district or constituency for subcounty ${subcounty.subcounty_name}`
          );
          return null;
        }

        return {
          subcounty_code: subcounty.subcounty_code,
          subcounty_name: subcounty.subcounty_name,
          constituency_id: constituencyId,
          constituency_code: subcounty.constituency_code,
          constituency_name: subcounty.constituency_name,
          district_id: districtId,
          district_code: subcounty.district_code,
          district_name: subcounty.district_name,
        };
      })
      .filter(Boolean);

    if (records.length === 0) continue;

    const { error, data } = await supabase
      .from('uganda_subcounties')
      .insert(records as Parameters<typeof supabase.from>[0][]);

    if (error) {
      console.error(`Error inserting subcounty batch ${i / batchSize + 1}:`, error);
      continue;
    }

    successCount += records.length;
  }

  console.log(`Successfully imported ${successCount} subcounties`);
}

/**
 * Import villages/parishes into the database
 * Since kalulu doesn't have separate parish/village data, we use subcounties as villages
 */
async function importVillages(
  supabase: SupabaseClient,
  subcounties: Subcounty[],
  districtMap: Record<number, string>,
  constituencyMap: Record<number, string>,
  subcountyMap: Record<number, string>
): Promise<void> {
  console.log(`Converting ${subcounties.length} subcounties to villages...`);

  let successCount = 0;
  let skippedCount = 0;

  // Clear existing data
  await supabase
    .from('uganda_villages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // Convert subcounties to villages with unique village codes
  const records = subcounties
    .map((subcounty, index) => {
      const districtId = districtMap[subcounty.district_code];
      const constituencyId = constituencyMap[subcounty.constituency_code];
      const subcountyId = subcountyMap[subcounty.subcounty_code];

      if (!districtId || !constituencyId || !subcountyId) {
        skippedCount++;
        return null;
      }

      return {
        village_code: index + 1, // Generate unique village codes
        village_name: `${subcounty.subcounty_name} Village`, // Append "Village" to make it distinct
        subcounty_id: subcountyId,
        subcounty_code: subcounty.subcounty_code,
        subcounty_name: subcounty.subcounty_name,
        constituency_id: constituencyId,
        constituency_code: subcounty.constituency_code,
        constituency_name: subcounty.constituency_name,
        district_id: districtId,
        district_code: subcounty.district_code,
        district_name: subcounty.district_name,
      };
    })
    .filter(Boolean);

  console.log(`Prepared ${records.length} village records for import`);

  // Import villages in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase
      .from('uganda_villages')
      .insert(batch as Parameters<typeof supabase.from>[0][]);

    if (error) {
      console.error(`Error inserting village batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }

    successCount += batch.length;
    console.log(`Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}: ${batch.length} villages`);
  }

  console.log(`Successfully imported ${successCount} villages (${skippedCount} skipped due to missing parent locations)`);
}
export async function importUgandaLocationData(
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> {
  try {
    console.log('Starting Uganda location data import...');

    // Fetch all data from kalulu repository
    const [districts, constituencies, subcounties] = await Promise.all([
      fetchJSON<District[]>(DATA_URLS.districts),
      fetchJSON<Constituency[]>(DATA_URLS.constituencies),
      fetchJSON<Subcounty[]>(DATA_URLS.subcounties),
    ]);

    console.log(
      `Fetched: ${districts.length} districts, ${constituencies.length} constituencies, ${subcounties.length} subcounties`
    );

    // Import in order (districts → constituencies → subcounties → villages)
    const districtMap = await importDistricts(supabase, districts);
    const constituencyMap = await importConstituencies(
      supabase,
      constituencies,
      districtMap
    );
    await importSubcounties(supabase, subcounties, districtMap, constituencyMap);
    
    // Build subcounty ID map by fetching from database
    const { data: subcountiesData, error: subcountiesError } = await supabase
      .from('uganda_subcounties')
      .select('id, subcounty_code');
    
    if (subcountiesError) {
      throw new Error(`Failed to fetch subcounty IDs: ${subcountiesError.message}`);
    }

    const subcountyMap: Record<number, string> = {};
    if (subcountiesData) {
      subcountiesData.forEach((row: any) => {
        subcountyMap[row.subcounty_code] = row.id;
      });
    }
    
    console.log(`Built subcounty map with ${Object.keys(subcountyMap).length} entries`);
    
    // Import villages (using subcounties as village data source)
    await importVillages(supabase, subcounties, districtMap, constituencyMap, subcountyMap);

    const message = `Successfully imported Uganda location data: ${districts.length} districts, ${constituencies.length} constituencies, ${subcounties.length} subcounties, ${subcounties.length} villages`;
    console.log(message);

    return {
      success: true,
      message,
      stats: {
        districts: districts.length,
        constituencies: constituencies.length,
        subcounties: subcounties.length,
        villages: subcounties.length,
      },
    };
  } catch (error) {
    const message = `Failed to import Uganda location data: ${error instanceof Error ? error.message : String(error)}`;
    console.error(message);

    return {
      success: false,
      message,
    };
  }
}

/**
 * Helper function to get district by name
 */
export async function getDistrictByName(
  supabase: SupabaseClient,
  districtName: string
) {
  const { data, error } = await supabase
    .from('uganda_districts')
    .select('*')
    .ilike('district_name', districtName)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Helper function to get constituencies by district ID
 */
export async function getConstituenciesByDistrict(
  supabase: SupabaseClient,
  districtId: string
) {
  const { data, error } = await supabase
    .from('uganda_constituencies')
    .select('*')
    .eq('district_id', districtId)
    .order('constituency_name');

  if (error) throw error;
  return data;
}

/**
 * Helper function to get subcounties by constituency ID
 */
export async function getSubcountiesByConstituency(
  supabase: SupabaseClient,
  constituencyId: string
) {
  const { data, error } = await supabase
    .from('uganda_subcounties')
    .select('*')
    .eq('constituency_id', constituencyId)
    .order('subcounty_name');

  if (error) throw error;
  return data;
}

/**
 * Helper function to get villages by subcounty ID
 */
export async function getVillagesBySubcounty(
  supabase: SupabaseClient,
  subcountyId: string
) {
  const { data, error } = await supabase
    .from('uganda_villages')
    .select('*')
    .eq('subcounty_id', subcountyId)
    .order('village_name');

  if (error) throw error;
  return data;
}

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
const KEY_TYPE = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : process.env.SUPABASE_KEY ? 'anon' : 'none';

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase key type:', KEY_TYPE);
console.log('SUPABASE_KEY set:', !!process.env.SUPABASE_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Supabase key length:', SUPABASE_KEY?.length ?? 0);

if (!SUPABASE_KEY) {
    console.error('Missing Supabase key. Set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
}

if (SUPABASE_KEY.includes('...') || SUPABASE_KEY.length < 60) {
    console.error('Invalid Supabase key detected. Make sure you are using the full, unshortened service_role key.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';
const csvPath = 'C:/Users/user/Downloads/students-export-2026-06-22_10-55-18.csv';

// Generate a school-specific range based on tenant ID hash
// This ensures different schools get different number ranges
const getSchoolRange = (tenantId) => {
    let hash = 0;
    for (let i = 0; i < tenantId.length; i++) {
        const char = tenantId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Map hash to range 10-99 (for 10xxxx to 99xxxx)
    const rangePrefix = Math.abs(hash % 90) + 10;
    const rangeStart = rangePrefix * 10000; // 100000 to 999999 range
    return rangeStart;
};

const createAdmissionNumberGenerator = async (tenantId) => {
    const rangeStart = getSchoolRange(tenantId);
    
    const { data, error } = await supabase
        .from('students')
        .select('admission_number')
        .eq('tenant_id', tenantId)
        .not('admission_number', 'is', null);

    if (error) throw error;

    // Extract numeric parts from all existing admission numbers (6-digit format)
    const highest = (data || []).reduce((max, row) => {
        const admNum = String(row.admission_number || '');
        const numValue = Number(admNum);
        return isNaN(numValue) ? max : Math.max(max, numValue);
    }, rangeStart - 1); // Start from rangeStart - 1 if no students exist

    let nextSeq = highest + 1;

    return (studentNumber) => {
        const normalized = String(studentNumber || '').trim();
        // If student already has a 6-digit number, use it
        if (/^\d{6}$/.test(normalized)) return normalized;
        // Generate new 6-digit admission number in school's range
        return String(nextSeq++).padStart(6, '0');
    };
};

const createStudentIdentityKey = (row) => {
    // Create a unique key based on student identity to detect duplicates
    const firstName = String(row.first_name || '').trim().toLowerCase();
    const lastName = String(row.last_name || '').trim().toLowerCase();
    const dob = row.date_of_birth || 'unknown';
    return `${firstName}|${lastName}|${dob}`;
};

const run = async () => {
    console.log('Reading CSV...');
    const csv = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csv, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        trim: true
    });

    console.log(`Found ${records.length} records`);

    const getAdmissionNumber = await createAdmissionNumberGenerator(tenantId);

    const data = records
        .filter(r => r.first_name && r.last_name)
        .map(r => ({
            tenant_id: tenantId,
            admission_number: getAdmissionNumber(r.student_number),
            full_name: `${r.first_name.trim()} ${r.last_name.trim()}`,
            first_name: r.first_name?.trim(),
            last_name: r.last_name?.trim(),
            date_of_birth: r.date_of_birth || null,
            gender: r.gender?.toLowerCase(),
            parent_name: r.guardian_name || null,
            parent_phone: r.guardian_phone || null,
            parent_email: r.guardian_email || null,
            class_id: null,
            address: r.address || null,
            admission_date: r.enrollment_date || null,
            enrollment_date: r.enrollment_date || null,
            photo_url: r.photo_url || null,
            is_active: r.status?.toLowerCase() === 'active',
            status: r.status || null,
            nationality: r.nationality || null,
            place_of_birth: r.place_of_birth || null,
            home_district: r.home_district || null,
            religion: r.religion || null,
            special_talent: r.special_talent || null,
            guardian_relationship: r.guardian_relationship || null,
            guardian_occupation: r.guardian_occupation || null,
            guardian_address: r.guardian_address || null,
            blood_group: r.blood_group || null,
            medical_conditions: r.medical_conditions || null,
            allergies: r.allergies || null,
            emergency_contact_name: r.emergency_contact_name || null,
            emergency_contact_phone: r.emergency_contact_phone || null,
            previous_school: r.previous_school || null,
            previous_class: r.previous_class || null,
            reason_for_leaving: r.reason_for_leaving || null,
            birth_certificate_no: r.birth_certificate_no || null,
            stream_id: r.stream_id || null
        }));

    console.log(`Importing ${data.length} valid records...`);

    // Fetch all existing students to check for duplicates by identity (name + DOB)
    const { data: existingStudents, error: existingError } = await supabase
        .from('students')
        .select('full_name, first_name, last_name, date_of_birth, admission_number')
        .eq('tenant_id', tenantId);

    if (existingError) {
        console.error('Failed to load existing students:', existingError.message);
        process.exitCode = 1;
        return;
    }

    // Create identity keys for existing students
    const existingIdentitySet = new Set(
        (existingStudents || []).map((row) => createStudentIdentityKey(row))
    );
    
    const existingAdmissionSet = new Set((existingStudents || []).map((row) => row.admission_number));

    const uniqueData = [];
    const seenIdentities = new Set();
    let skippedExisting = 0;
    let skippedDuplicates = 0;

    for (const row of data) {
        const studentIdentity = createStudentIdentityKey(row);
        const admissionNumber = row.admission_number;

        // Skip if this student identity already exists in the database
        if (existingIdentitySet.has(studentIdentity)) {
            skippedExisting += 1;
            console.log(`  Skipping existing: ${row.first_name} ${row.last_name} (${row.date_of_birth})`);
            continue;
        }

        // Skip if this student identity appears multiple times in the import file
        if (seenIdentities.has(studentIdentity)) {
            skippedDuplicates += 1;
            console.log(`  Skipping duplicate in import: ${row.first_name} ${row.last_name} (${row.date_of_birth})`);
            continue;
        }

        // Also check by admission number for safety
        if (existingAdmissionSet.has(admissionNumber)) {
            skippedExisting += 1;
            console.log(`  Skipping existing admission #: ${admissionNumber}`);
            continue;
        }

        seenIdentities.add(studentIdentity);
        uniqueData.push(row);
    }

    console.log(`Preparing ${uniqueData.length} new rows after skipping ${skippedExisting} existing and ${skippedDuplicates} duplicate records.`);
    console.log(`Note: Deduplication is based on student identity (first name + last name + date of birth) to prevent duplicates when running import multiple times.`);

    if (uniqueData.length === 0) {
        console.log('No new students to import. Verifying current tenant count...');

        const { count, error: verifyError } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        if (verifyError) {
            console.error('Verification query failed:', verifyError.message);
            process.exitCode = 1;
            return;
        }

        console.log(`Total students for tenant: ${count ?? 0}`);
        return;
    }

    const { error: insertError, data: inserted } = await supabase
        .from('students')
        .insert(uniqueData);

    if (insertError) {
        console.error('Import failed:', insertError.message);
        process.exitCode = 1;
        return;
    }

    console.log(`✓ Successfully imported ${inserted?.length ?? uniqueData.length} students`);

    const { count, error: selectError } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

    if (selectError) {
        console.error('Verification query failed:', selectError.message);
        process.exitCode = 1;
        return;
    }

    console.log(`Total students for tenant: ${count ?? 0}`);
};

await run();

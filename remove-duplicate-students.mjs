import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';

const createStudentIdentityKey = (row) => {
    const firstName = String(row.first_name || '').trim().toLowerCase();
    const lastName = String(row.last_name || '').trim().toLowerCase();
    const dob = row.date_of_birth || 'unknown';
    return `${firstName}|${lastName}|${dob}`;
};

const findAndRemoveDuplicates = async () => {
    console.log('Analyzing Eden High School student records for duplicates...\n');
    
    const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, first_name, last_name, date_of_birth, admission_number, created_at')
        .eq('tenant_id', tenantId)
        .order('full_name, created_at');
    
    if (error) {
        console.error('Failed to fetch students:', error.message);
        process.exit(1);
    }
    
    console.log(`Total students: ${students?.length || 0}\n`);
    
    if (!students || students.length === 0) {
        console.log('No students found');
        return;
    }
    
    // Group by identity key
    const byIdentity = {};
    students.forEach(s => {
        const key = createStudentIdentityKey(s);
        if (!byIdentity[key]) byIdentity[key] = [];
        byIdentity[key].push(s);
    });
    
    // Find duplicate groups (more than 1 record)
    const duplicateGroups = Object.entries(byIdentity).filter(([, group]) => group.length > 1);
    
    if (duplicateGroups.length === 0) {
        console.log('✓ No duplicates found!');
        return;
    }
    
    console.log(`Found ${duplicateGroups.length} groups of duplicate students:\n`);
    
    const toDelete = [];
    
    duplicateGroups.forEach(([identity, group], idx) => {
        const [firstName, lastName, dob] = identity.split('|');
        console.log(`${idx + 1}. "${firstName} ${lastName}" (DOB: ${dob}) - ${group.length} records:`);
        
        // Sort by created_at to keep the oldest one
        group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        group.forEach((s, i) => {
            const admNum = s.admission_number || '[NO ADMISSION #]';
            const created = new Date(s.created_at).toLocaleString();
            const marker = i === 0 ? '✓ KEEP' : '✗ DELETE';
            console.log(`   ${marker}  ID: ${s.id}`);
            console.log(`       Admission #: ${admNum}`);
            console.log(`       Created: ${created}`);
        });
        
        // Mark newer records for deletion (keep the oldest)
        for (let i = 1; i < group.length; i++) {
            toDelete.push({
                id: group[i].id,
                name: `${firstName} ${lastName}`,
                admission_number: group[i].admission_number,
                created_at: group[i].created_at
            });
        }
        console.log();
    });
    
    console.log('='.repeat(90));
    console.log(`\nSummary:`);
    console.log(`- Total students: ${students.length}`);
    console.log(`- Duplicate groups: ${duplicateGroups.length}`);
    console.log(`- Records to delete: ${toDelete.length}`);
    console.log(`- Records to keep: ${students.length - toDelete.length}`);
    
    if (toDelete.length === 0) {
        console.log('\nNo duplicates to remove.');
        return;
    }
    
    console.log('\n⚠️  WARNING: This will DELETE duplicate records permanently.');
    console.log('Run this script with --confirm flag to proceed with deletion.\n');
    console.log('Command: SUPABASE_SERVICE_ROLE_KEY="your-key" node remove-duplicate-students.mjs --confirm\n');
    
    if (process.argv.includes('--confirm')) {
        console.log('Proceeding with deletion...\n');
        let deleted = 0;
        let failed = 0;
        
        for (const dup of toDelete) {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', dup.id);
            
            if (error) {
                console.error(`✗ Failed to delete "${dup.name}" (${dup.admission_number}):`, error.message);
                failed++;
            } else {
                console.log(`✓ Deleted: "${dup.name}" (Admission: ${dup.admission_number || 'none'})`);
                deleted++;
            }
        }
        
        console.log(`\n${deleted} records deleted successfully`);
        if (failed > 0) console.log(`${failed} deletions failed`);
        
        // Verify final count
        const { count, error: countError } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        
        if (!countError) {
            console.log(`\nFinal count: ${count} students remaining in Eden High School`);
        }
    }
};

await findAndRemoveDuplicates();

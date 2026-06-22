import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('Missing Supabase key. Set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Eden High School tenant ID
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';

const findDuplicates = async () => {
    console.log('Fetching all students from Eden High School...');
    
    const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, admission_number, first_name, last_name, created_at')
        .eq('tenant_id', tenantId)
        .order('full_name');
    
    if (error) {
        console.error('Failed to fetch students:', error.message);
        process.exit(1);
    }
    
    console.log(`Found ${students?.length || 0} students`);
    
    if (!students || students.length === 0) {
        console.log('No students found');
        return [];
    }
    
    // Group students by name to find duplicates
    const nameGroups = {};
    students.forEach(student => {
        const fullName = (student.full_name || '').toLowerCase().trim();
        if (!nameGroups[fullName]) {
            nameGroups[fullName] = [];
        }
        nameGroups[fullName].push(student);
    });
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(nameGroups).filter(([name, group]) => group.length > 1);
    
    console.log(`\nFound ${duplicateGroups.length} students with duplicate names`);
    console.log('='.repeat(80));
    
    const toDelete = [];
    
    duplicateGroups.forEach(([name, group]) => {
        console.log(`\n"${name}" - ${group.length} records:`);
        
        group.forEach((student, idx) => {
            const admNum = student.admission_number || 'NO ADMISSION NUMBER';
            const created = new Date(student.created_at).toLocaleString();
            console.log(`  [${idx + 1}] ID: ${student.id}`);
            console.log(`      Admission #: ${admNum}`);
            console.log(`      Created: ${created}`);
        });
        
        // Keep the first one (oldest), mark the rest for deletion
        for (let i = 1; i < group.length; i++) {
            toDelete.push({
                id: group[i].id,
                name: name,
                admission_number: group[i].admission_number,
                reason: `Duplicate of oldest record (${group[0].admission_number || 'unknown'})`
            });
        }
    });
    
    return toDelete;
};

const main = async () => {
    const duplicatesToDelete = await findDuplicates();
    
    if (duplicatesToDelete.length === 0) {
        console.log('\nNo duplicates found!');
        return;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\nReady to delete ${duplicatesToDelete.length} duplicate records:`);
    duplicatesToDelete.forEach((dup, idx) => {
        console.log(`${idx + 1}. "${dup.name}" (${dup.admission_number || 'no admission #'}) - ${dup.reason}`);
    });
    
    console.log('\n⚠️  WARNING: This will DELETE the duplicate records permanently.');
    console.log('Run this script with --confirm flag to proceed with deletion.\n');
    
    if (process.argv.includes('--confirm')) {
        console.log('Proceeding with deletion...');
        
        for (const dup of duplicatesToDelete) {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', dup.id);
            
            if (error) {
                console.error(`❌ Failed to delete ${dup.id}:`, error.message);
            } else {
                console.log(`✓ Deleted: "${dup.name}" (ID: ${dup.id})`);
            }
        }
        
        console.log(`\n✓ Successfully deleted ${duplicatesToDelete.length} duplicate records`);
        
        // Verify final count
        const { count, error: countError } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        
        if (!countError) {
            console.log(`Total remaining students: ${count}`);
        }
    }
};

await main();

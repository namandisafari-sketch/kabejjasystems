import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('Missing Supabase key. Set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY in your environment.');
    console.error('You can run this via: SUPABASE_SERVICE_ROLE_KEY="your-key" node diagnose-duplicates.mjs');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';

const diagnose = async () => {
    console.log('Analyzing student records in Eden High School...\n');
    
    // Get all students
    const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, first_name, last_name, admission_number, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('full_name');
    
    if (error) {
        console.error('Failed to fetch students:', error.message);
        process.exit(1);
    }
    
    console.log(`Total students: ${students?.length || 0}\n`);
    
    if (!students || students.length === 0) {
        console.log('No students found');
        return;
    }
    
    // Group by full name
    const byName = {};
    students.forEach(s => {
        const key = (s.full_name || '').toLowerCase().trim();
        if (!byName[key]) byName[key] = [];
        byName[key].push(s);
    });
    
    const duplicates = Object.entries(byName).filter(([, group]) => group.length > 1);
    
    console.log(`Duplicate name groups: ${duplicates.length}\n`);
    
    let duplicateRecords = 0;
    
    console.log('Duplicates found:');
    console.log('='.repeat(100));
    
    duplicates.forEach(([name, group], idx) => {
        console.log(`\n${idx + 1}. "${name}" (${group.length} records):`);
        
        group.forEach((s, i) => {
            const admNum = s.admission_number || '[NO ADMISSION #]';
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admNum);
            const is6Digit = /^\d{6}$/.test(admNum);
            const admType = isUUID ? '[UUID]' : is6Digit ? '[6-DIGIT]' : '[OTHER]';
            
            console.log(`   ${i + 1}. ID: ${s.id}`);
            console.log(`      Admission #: ${admNum} ${admType}`);
            console.log(`      Created: ${new Date(s.created_at).toLocaleString()}`);
        });
        
        duplicateRecords += group.length - 1;
    });
    
    console.log('\n' + '='.repeat(100));
    console.log(`\nSummary:`);
    console.log(`- Total students: ${students.length}`);
    console.log(`- Groups with duplicates: ${duplicates.length}`);
    console.log(`- Duplicate records that could be removed: ${duplicateRecords}`);
    console.log(`- Unique students: ${students.length - duplicateRecords}`);
    
    // Check admission number patterns
    console.log(`\nAdmission Number Patterns:`);
    const patterns = {
        'UUID format': 0,
        '6-digit format': 0,
        'Other format': 0,
        'No admission number': 0
    };
    
    students.forEach(s => {
        const admNum = s.admission_number || '';
        if (!admNum) patterns['No admission number']++;
        else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(admNum)) patterns['UUID format']++;
        else if (/^\d{6}$/.test(admNum)) patterns['6-digit format']++;
        else patterns['Other format']++;
    });
    
    Object.entries(patterns).forEach(([pattern, count]) => {
        console.log(`- ${pattern}: ${count}`);
    });
};

await diagnose();

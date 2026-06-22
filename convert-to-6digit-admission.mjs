import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate a school-specific range based on tenant ID hash
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
    return { rangeStart, rangePrefix };
};

const convertAdmissionNumbers = async () => {
    console.log('Converting admission numbers to school-specific 6-digit format...\n');
    
    // Get all unique tenant IDs
    const { data: students, error } = await supabase
        .from('students')
        .select('id, tenant_id, full_name, admission_number, created_at')
        .order('tenant_id, created_at');
    
    if (error) {
        console.error('Failed to fetch students:', error.message);
        process.exit(1);
    }
    
    if (!students || students.length === 0) {
        console.log('No students found');
        return;
    }
    
    // Group by tenant
    const tenantMap = {};
    students.forEach(s => {
        if (!tenantMap[s.tenant_id]) {
            tenantMap[s.tenant_id] = [];
        }
        tenantMap[s.tenant_id].push(s);
    });
    
    console.log(`Found ${Object.keys(tenantMap).length} tenant(s)\n`);
    
    const conversions = [];
    
    for (const [tenantId, tenantStudents] of Object.entries(tenantMap)) {
        const { rangeStart, rangePrefix } = getSchoolRange(tenantId);
        console.log(`Tenant: ${tenantId}`);
        console.log(`  Range: ${rangeStart.toString().padStart(6, '0')} - ${(rangeStart + 9999).toString().padStart(6, '0')}`);
        console.log(`  Students: ${tenantStudents.length}`);
        
        // Create sequential numbering for this tenant
        tenantStudents.forEach((student, idx) => {
            const newAdmission = String(rangeStart + idx).padStart(6, '0');
            conversions.push({
                id: student.id,
                tenantId: student.tenant_id,
                oldAdmission: student.admission_number || 'NONE',
                newAdmission,
                fullName: student.full_name
            });
        });
        console.log('');
    }
    
    console.log('Conversion Plan:');
    console.log('='.repeat(120));
    
    const groupedByTenant = {};
    conversions.forEach(c => {
        if (!groupedByTenant[c.tenantId]) {
            groupedByTenant[c.tenantId] = [];
        }
        groupedByTenant[c.tenantId].push(c);
    });
    
    for (const [tenantId, items] of Object.entries(groupedByTenant)) {
        console.log(`\n${tenantId}:`);
        console.log(`  Total: ${items.length} students`);
        console.log(`  Sample conversions:`);
        items.slice(0, 3).forEach((conv, idx) => {
            console.log(`    ${idx + 1}. "${conv.fullName}"`);
            console.log(`       OLD: ${conv.oldAdmission}`);
            console.log(`       NEW: ${conv.newAdmission}`);
        });
        if (items.length > 3) {
            console.log(`    ... and ${items.length - 3} more`);
        }
    }
    
    console.log('\n' + '='.repeat(120));
    console.log(`\n⚠️  WARNING: This will UPDATE ${conversions.length} student admission numbers.`);
    console.log('Run this script with --confirm flag to proceed with conversion.\n');
    console.log('Command: SUPABASE_SERVICE_ROLE_KEY="your-key" node convert-to-6digit-admission.mjs --confirm\n');
    
    if (process.argv.includes('--confirm')) {
        console.log('Proceeding with conversion...\n');
        let updated = 0;
        let failed = 0;
        
        for (const conv of conversions) {
            const { error: updateError } = await supabase
                .from('students')
                .update({ admission_number: conv.newAdmission })
                .eq('id', conv.id);
            
            if (updateError) {
                console.error(`✗ Failed to update "${conv.fullName}":`, updateError.message);
                failed++;
            } else {
                updated++;
                if (updated % 20 === 0) {
                    console.log(`✓ Updated ${updated}/${conversions.length} students...`);
                }
            }
        }
        
        console.log(`\n✓ Successfully updated ${updated} admission numbers`);
        if (failed > 0) console.log(`✗ ${failed} updates failed`);
        
        // Verify results per tenant
        console.log('\nVerification:');
        for (const tenantId of Object.keys(groupedByTenant)) {
            const { data: verifyData, error: verifyError } = await supabase
                .from('students')
                .select('admission_number')
                .eq('tenant_id', tenantId)
                .order('admission_number');
            
            if (!verifyError && verifyData) {
                const { rangeStart } = getSchoolRange(tenantId);
                const allValid = verifyData.every(s => /^\d{6}$/.test(s.admission_number || ''));
                const firstRange = verifyData.length > 0 ? String(rangeStart).padStart(6, '0') : 'N/A';
                
                console.log(`\n  ${tenantId}:`);
                console.log(`    Total: ${verifyData.length}`);
                console.log(`    First: ${verifyData[0]?.admission_number || 'N/A'}`);
                console.log(`    Last: ${verifyData[verifyData.length - 1]?.admission_number || 'N/A'}`);
                console.log(`    Format valid: ${allValid ? '✓' : '✗'}`);
            }
        }
        
        console.log('\n✓ Conversion complete!');
    }
};

await convertAdmissionNumbers();

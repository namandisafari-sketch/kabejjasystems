import { offlineDB as dexieDB, offlineStorage as dexieStorage } from './offline-db';
import { pgliteDB, pgliteStorage } from './pglite-db';

/**
 * Data migration utility to transfer data from Dexie to PGlite
 * This runs once on first load after upgrading to PGlite
 */

const MIGRATION_KEY = 'kabejja_dexie_to_pglite_migration_complete';

export async function isMigrationComplete(): Promise<boolean> {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
}

export async function markMigrationComplete(): Promise<void> {
    localStorage.setItem(MIGRATION_KEY, 'true');
}

export async function migrateDexieToPGlite(): Promise<{
    success: boolean;
    error?: string;
    stats?: {
        products: number;
        customers: number;
        sales: number;
        saleItems: number;
        students: number;
        classes: number;
        syncQueue: number;
    };
}> {
    try {
        console.log('🔄 Starting migration from Dexie to PGlite...');

        // Check if migration already completed
        if (await isMigrationComplete()) {
            console.log('✅ Migration already completed, skipping...');
            return { success: true };
        }

        const stats = {
            products: 0,
            customers: 0,
            sales: 0,
            saleItems: 0,
            students: 0,
            classes: 0,
            syncQueue: 0,
        };

        // Get all tenants from Dexie (we'll migrate all data)
        // Since we don't have a tenants table in Dexie, we'll get unique tenant IDs
        const uniqueTenantIds = new Set<string>();

        // Migrate Products
        try {
            const allProducts = await dexieDB.products.toArray();
            if (allProducts.length > 0) {
                await pgliteStorage.saveProducts(allProducts);
                stats.products = allProducts.length;
                allProducts.forEach(p => uniqueTenantIds.add(p.tenant_id));
                console.log(`✅ Migrated ${allProducts.length} products`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating products:', error);
        }

        // Migrate Customers
        try {
            const allCustomers = await dexieDB.customers.toArray();
            if (allCustomers.length > 0) {
                await pgliteStorage.saveCustomers(allCustomers);
                stats.customers = allCustomers.length;
                allCustomers.forEach(c => uniqueTenantIds.add(c.tenant_id));
                console.log(`✅ Migrated ${allCustomers.length} customers`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating customers:', error);
        }

        // Migrate Sales
        try {
            const allSales = await dexieDB.sales.toArray();
            if (allSales.length > 0) {
                for (const sale of allSales) {
                    await pgliteStorage.saveSale(sale);
                }
                stats.sales = allSales.length;
                allSales.forEach(s => uniqueTenantIds.add(s.tenant_id));
                console.log(`✅ Migrated ${allSales.length} sales`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating sales:', error);
        }

        // Migrate Sale Items
        try {
            const allSaleItems = await dexieDB.saleItems.toArray();
            if (allSaleItems.length > 0) {
                for (const item of allSaleItems) {
                    await pgliteDB.query(`
            INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price, synced)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              sale_id = EXCLUDED.sale_id,
              product_id = EXCLUDED.product_id,
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              total_price = EXCLUDED.total_price,
              synced = EXCLUDED.synced
          `, [
                        item.id,
                        item.sale_id,
                        item.product_id,
                        item.quantity,
                        item.unit_price,
                        item.total_price,
                        item.synced
                    ]);
                }
                stats.saleItems = allSaleItems.length;
                console.log(`✅ Migrated ${allSaleItems.length} sale items`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating sale items:', error);
        }

        // Migrate Students
        try {
            const allStudents = await dexieDB.students.toArray();
            if (allStudents.length > 0) {
                await pgliteStorage.saveStudents(allStudents);
                stats.students = allStudents.length;
                allStudents.forEach(s => uniqueTenantIds.add(s.tenant_id));
                console.log(`✅ Migrated ${allStudents.length} students`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating students:', error);
        }

        // Migrate Classes
        try {
            const allClasses = await dexieDB.classes.toArray();
            if (allClasses.length > 0) {
                await pgliteStorage.saveClasses(allClasses);
                stats.classes = allClasses.length;
                allClasses.forEach(c => uniqueTenantIds.add(c.tenant_id));
                console.log(`✅ Migrated ${allClasses.length} classes`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating classes:', error);
        }

        // Migrate Sync Queue
        try {
            const allSyncItems = await dexieDB.syncQueue.toArray();
            if (allSyncItems.length > 0) {
                for (const item of allSyncItems) {
                    await pgliteDB.addToSyncQueue({
                        operation: item.operation,
                        table: item.table,
                        data: item.data,
                        tenant_id: item.tenant_id,
                    });
                }
                stats.syncQueue = allSyncItems.length;
                console.log(`✅ Migrated ${allSyncItems.length} sync queue items`);
            }
        } catch (error) {
            console.warn('⚠️ Error migrating sync queue:', error);
        }

        // Mark migration as complete
        await markMigrationComplete();

        console.log('✅ Migration completed successfully!');
        console.log('📊 Migration stats:', stats);
        console.log(`📦 Found ${uniqueTenantIds.size} unique tenant(s)`);

        return { success: true, stats };
    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        return {
            success: false,
            error: error.message || 'Unknown error during migration',
        };
    }
}

/**
 * Clean up Dexie database after successful migration
 * This should only be called after confirming PGlite is working correctly
 */
export async function cleanupDexieDatabase(): Promise<void> {
    try {
        console.log('🧹 Cleaning up old Dexie database...');
        await dexieDB.delete();
        console.log('✅ Dexie database cleaned up');
    } catch (error) {
        console.warn('⚠️ Error cleaning up Dexie database:', error);
    }
}

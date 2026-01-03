import { PGlite } from '@electric-sql/pglite';

// Type definitions matching current Dexie types
export interface OfflineProduct {
    id: string;
    tenant_id: string;
    name: string;
    category?: string;
    unit_price: number;
    stock_quantity: number;
    product_type?: string;
    is_active: boolean;
    allow_custom_price?: boolean;
    synced_at: number;
}

export interface OfflineCustomer {
    id: string;
    tenant_id: string;
    name: string;
    phone: string | null;
    email: string | null;
    credit_limit: number;
    current_balance: number;
    synced_at: number;
}

export interface OfflineSale {
    id: string;
    tenant_id: string;
    customer_id: string | null;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    order_type: string;
    order_status: string;
    created_at: string;
    synced: boolean;
    sync_error?: string;
}

export interface OfflineSaleItem {
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    synced: boolean;
}

export interface OfflineStudent {
    id: string;
    tenant_id: string;
    student_number: string;
    first_name: string;
    last_name: string;
    class_id: string | null;
    date_of_birth: string | null;
    gender: string | null;
    synced_at: number;
}

export interface OfflineClass {
    id: string;
    tenant_id: string;
    name: string;
    level: string | null;
    synced_at: number;
}

export interface SyncQueueItem {
    id?: number;
    operation: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    tenant_id: string;
    created_at: number;
    retry_count: number;
    last_error?: string;
    status: 'pending' | 'processing' | 'failed';
}

// PGlite database class
class PGliteDatabase {
    private db: PGlite | null = null;
    private initPromise: Promise<void> | null = null;

    async initialize(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initialize();
        return this.initPromise;
    }

    private async _initialize(): Promise<void> {
        try {
            // Initialize PGlite with IndexedDB persistence
            this.db = new PGlite('idb://kabejja-offline-db');

            // Create schema matching Supabase structure
            await this.db.exec(`
        -- Products table
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          product_type TEXT,
          is_active BOOLEAN DEFAULT true,
          allow_custom_price BOOLEAN DEFAULT false,
          synced_at BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_products_synced ON products(synced_at);

        -- Customers table
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          credit_limit NUMERIC(10,2) DEFAULT 0,
          current_balance NUMERIC(10,2) DEFAULT 0,
          synced_at BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

        -- Sales table
        CREATE TABLE IF NOT EXISTS sales (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          customer_id UUID,
          total_amount NUMERIC(10,2) NOT NULL,
          payment_method TEXT,
          payment_status TEXT,
          order_type TEXT,
          order_status TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          synced BOOLEAN DEFAULT false,
          sync_error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced);

        -- Sale items table
        CREATE TABLE IF NOT EXISTS sale_items (
          id UUID PRIMARY KEY,
          sale_id UUID NOT NULL,
          product_id UUID,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC(10,2) NOT NULL,
          total_price NUMERIC(10,2) NOT NULL,
          synced BOOLEAN DEFAULT false
        );

        CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

        -- Students table
        CREATE TABLE IF NOT EXISTS students (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          student_number TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          class_id UUID,
          date_of_birth TEXT,
          gender TEXT,
          synced_at BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);

        -- Classes table
        CREATE TABLE IF NOT EXISTS classes (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL,
          name TEXT NOT NULL,
          level TEXT,
          synced_at BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_classes_tenant ON classes(tenant_id);

        -- Sync queue table
        CREATE TABLE IF NOT EXISTS sync_queue (
          id SERIAL PRIMARY KEY,
          operation TEXT NOT NULL,
          "table" TEXT NOT NULL,
          data JSONB NOT NULL,
          tenant_id UUID NOT NULL,
          created_at BIGINT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          last_error TEXT,
          status TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant ON sync_queue(tenant_id);
      `);

            console.log('✅ PGlite database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize PGlite database:', error);
            throw error;
        }
    }

    private async ensureInitialized(): Promise<PGlite> {
        if (!this.db) {
            await this.initialize();
        }
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }

    // Helper method to clear all data for a specific tenant
    async clearTenantData(tenantId: string): Promise<void> {
        const db = await this.ensureInitialized();
        await db.exec(`
      DELETE FROM products WHERE tenant_id = '${tenantId}';
      DELETE FROM customers WHERE tenant_id = '${tenantId}';
      DELETE FROM sales WHERE tenant_id = '${tenantId}';
      DELETE FROM students WHERE tenant_id = '${tenantId}';
      DELETE FROM classes WHERE tenant_id = '${tenantId}';
      DELETE FROM sync_queue WHERE tenant_id = '${tenantId}';
    `);
    }

    // Get sync queue items for a tenant
    async getSyncQueue(tenantId: string): Promise<SyncQueueItem[]> {
        const db = await this.ensureInitialized();
        const result = await db.query<SyncQueueItem>(`
      SELECT * FROM sync_queue
      WHERE tenant_id = $1
      AND (status = 'pending' OR status = 'failed')
      ORDER BY created_at ASC
    `, [tenantId]);
        return result.rows;
    }

    // Add item to sync queue
    async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'>): Promise<number> {
        const db = await this.ensureInitialized();
        const result = await db.query<{ id: number }>(`
      INSERT INTO sync_queue (operation, "table", data, tenant_id, created_at, retry_count, status)
      VALUES ($1, $2, $3, $4, $5, 0, 'pending')
      RETURNING id
    `, [item.operation, item.table, JSON.stringify(item.data), item.tenant_id, Date.now()]);
        return result.rows[0].id;
    }

    // Update sync queue item status
    async updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
        const db = await this.ensureInitialized();
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        if (updates.retry_count !== undefined) {
            setClauses.push(`retry_count = $${paramIndex++}`);
            values.push(updates.retry_count);
        }
        if (updates.last_error !== undefined) {
            setClauses.push(`last_error = $${paramIndex++}`);
            values.push(updates.last_error);
        }

        if (setClauses.length > 0) {
            values.push(id);
            await db.query(`
        UPDATE sync_queue
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
      `, values);
        }
    }

    // Delete sync queue item
    async deleteSyncQueueItem(id: number): Promise<void> {
        const db = await this.ensureInitialized();
        await db.query('DELETE FROM sync_queue WHERE id = $1', [id]);
    }

    // Get sync queue count
    async getSyncQueueCount(): Promise<number> {
        const db = await this.ensureInitialized();
        const result = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM sync_queue');
        return parseInt(result.rows[0].count, 10);
    }

    // Direct database access for advanced queries
    async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
        const db = await this.ensureInitialized();
        return db.query<T>(sql, params);
    }

    async exec(sql: string): Promise<void> {
        const db = await this.ensureInitialized();
        await db.exec(sql);
    }
}

// Create singleton instance
export const pgliteDB = new PGliteDatabase();

// Initialize database
export async function initPGliteDB(): Promise<boolean> {
    try {
        await pgliteDB.initialize();
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize PGlite database:', error);
        return false;
    }
}

// Export helper functions for common operations (matching Dexie API)
export const pgliteStorage = {
    // Products
    async getProducts(tenantId: string): Promise<OfflineProduct[]> {
        const result = await pgliteDB.query<OfflineProduct>(
            'SELECT * FROM products WHERE tenant_id = $1',
            [tenantId]
        );
        return result.rows;
    },

    async saveProducts(products: OfflineProduct[]): Promise<void> {
        for (const product of products) {
            await pgliteDB.query(`
        INSERT INTO products (id, tenant_id, name, category, unit_price, stock_quantity, product_type, is_active, allow_custom_price, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          unit_price = EXCLUDED.unit_price,
          stock_quantity = EXCLUDED.stock_quantity,
          product_type = EXCLUDED.product_type,
          is_active = EXCLUDED.is_active,
          allow_custom_price = EXCLUDED.allow_custom_price,
          synced_at = EXCLUDED.synced_at
      `, [
                product.id,
                product.tenant_id,
                product.name,
                product.category || null,
                product.unit_price,
                product.stock_quantity,
                product.product_type || null,
                product.is_active,
                product.allow_custom_price || false,
                product.synced_at
            ]);
        }
    },

    async getProduct(id: string): Promise<OfflineProduct | null> {
        const result = await pgliteDB.query<OfflineProduct>(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    // Customers
    async getCustomers(tenantId: string): Promise<OfflineCustomer[]> {
        const result = await pgliteDB.query<OfflineCustomer>(
            'SELECT * FROM customers WHERE tenant_id = $1',
            [tenantId]
        );
        return result.rows;
    },

    async saveCustomers(customers: OfflineCustomer[]): Promise<void> {
        for (const customer of customers) {
            await pgliteDB.query(`
        INSERT INTO customers (id, tenant_id, name, phone, email, credit_limit, current_balance, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          credit_limit = EXCLUDED.credit_limit,
          current_balance = EXCLUDED.current_balance,
          synced_at = EXCLUDED.synced_at
      `, [
                customer.id,
                customer.tenant_id,
                customer.name,
                customer.phone,
                customer.email,
                customer.credit_limit,
                customer.current_balance,
                customer.synced_at
            ]);
        }
    },

    async getCustomer(id: string): Promise<OfflineCustomer | null> {
        const result = await pgliteDB.query<OfflineCustomer>(
            'SELECT * FROM customers WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    // Sales
    async getSales(tenantId: string): Promise<OfflineSale[]> {
        const result = await pgliteDB.query<OfflineSale>(
            'SELECT * FROM sales WHERE tenant_id = $1',
            [tenantId]
        );
        return result.rows;
    },

    async saveSale(sale: OfflineSale): Promise<void> {
        await pgliteDB.query(`
      INSERT INTO sales (id, tenant_id, customer_id, total_amount, payment_method, payment_status, order_type, order_status, created_at, synced, sync_error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        total_amount = EXCLUDED.total_amount,
        payment_method = EXCLUDED.payment_method,
        payment_status = EXCLUDED.payment_status,
        order_type = EXCLUDED.order_type,
        order_status = EXCLUDED.order_status,
        synced = EXCLUDED.synced,
        sync_error = EXCLUDED.sync_error
    `, [
            sale.id,
            sale.tenant_id,
            sale.customer_id,
            sale.total_amount,
            sale.payment_method,
            sale.payment_status,
            sale.order_type,
            sale.order_status,
            sale.created_at,
            sale.synced,
            sale.sync_error || null
        ]);
    },

    async getSale(id: string): Promise<OfflineSale | null> {
        const result = await pgliteDB.query<OfflineSale>(
            'SELECT * FROM sales WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    async getUnsyncedSales(tenantId: string): Promise<OfflineSale[]> {
        const result = await pgliteDB.query<OfflineSale>(
            'SELECT * FROM sales WHERE tenant_id = $1 AND synced = false',
            [tenantId]
        );
        return result.rows;
    },

    // Students
    async getStudents(tenantId: string): Promise<OfflineStudent[]> {
        const result = await pgliteDB.query<OfflineStudent>(
            'SELECT * FROM students WHERE tenant_id = $1',
            [tenantId]
        );
        return result.rows;
    },

    async saveStudents(students: OfflineStudent[]): Promise<void> {
        for (const student of students) {
            await pgliteDB.query(`
        INSERT INTO students (id, tenant_id, student_number, first_name, last_name, class_id, date_of_birth, gender, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          student_number = EXCLUDED.student_number,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          class_id = EXCLUDED.class_id,
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          synced_at = EXCLUDED.synced_at
      `, [
                student.id,
                student.tenant_id,
                student.student_number,
                student.first_name,
                student.last_name,
                student.class_id,
                student.date_of_birth,
                student.gender,
                student.synced_at
            ]);
        }
    },

    // Classes
    async getClasses(tenantId: string): Promise<OfflineClass[]> {
        const result = await pgliteDB.query<OfflineClass>(
            'SELECT * FROM classes WHERE tenant_id = $1',
            [tenantId]
        );
        return result.rows;
    },

    async saveClasses(classes: OfflineClass[]): Promise<void> {
        for (const cls of classes) {
            await pgliteDB.query(`
        INSERT INTO classes (id, tenant_id, name, level, synced_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          level = EXCLUDED.level,
          synced_at = EXCLUDED.synced_at
      `, [
                cls.id,
                cls.tenant_id,
                cls.name,
                cls.level,
                cls.synced_at
            ]);
        }
    },
};

import Dexie, { Table } from 'dexie';
import { pgliteDB, pgliteStorage, initPGliteDB } from './pglite-db';

// Feature flag to enable PGlite (set via environment variable)
const USE_PGLITE = import.meta.env.VITE_USE_PGLITE === 'true';

// Type definitions for offline data
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

// Dexie database class
export class OfflineDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  customers!: Table<OfflineCustomer, string>;
  sales!: Table<OfflineSale, string>;
  saleItems!: Table<OfflineSaleItem, string>;
  students!: Table<OfflineStudent, string>;
  classes!: Table<OfflineClass, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('KabejjaOfflineDB');

    this.version(1).stores({
      products: 'id, tenant_id, name, category, synced_at',
      customers: 'id, tenant_id, name, phone, synced_at',
      sales: 'id, tenant_id, customer_id, created_at, synced',
      saleItems: 'id, sale_id, product_id, synced',
      students: 'id, tenant_id, student_number, class_id, synced_at',
      classes: 'id, tenant_id, name, synced_at',
      syncQueue: '++id, tenant_id, table, status, created_at',
    });
  }

  // Helper method to clear all data for a specific tenant
  async clearTenantData(tenantId: string) {
    await Promise.all([
      this.products.where('tenant_id').equals(tenantId).delete(),
      this.customers.where('tenant_id').equals(tenantId).delete(),
      this.sales.where('tenant_id').equals(tenantId).delete(),
      this.students.where('tenant_id').equals(tenantId).delete(),
      this.classes.where('tenant_id').equals(tenantId).delete(),
      this.syncQueue.where('tenant_id').equals(tenantId).delete(),
    ]);
  }

  // Get sync queue items for a tenant
  async getSyncQueue(tenantId: string) {
    return this.syncQueue
      .where('tenant_id')
      .equals(tenantId)
      .and(item => item.status === 'pending' || item.status === 'failed')
      .sortBy('created_at');
  }

  // Add item to sync queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count' | 'status'>) {
    return this.syncQueue.add({
      ...item,
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    });
  }

  // Update sync queue item status
  async updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>) {
    return this.syncQueue.update(id, updates);
  }

  // Delete sync queue item
  async deleteSyncQueueItem(id: number) {
    return this.syncQueue.delete(id);
  }
}

// Create singleton instance
export const offlineDB = new OfflineDatabase();

// Initialize database (with adapter pattern)
export async function initOfflineDB() {
  try {
    if (USE_PGLITE) {
      console.log('🚀 Using PGlite for offline storage');
      const success = await initPGliteDB();
      if (success) {
        console.log('✅ PGlite database initialized');
      }
      return success;
    } else {
      console.log('📦 Using Dexie for offline storage');
      await offlineDB.open();
      console.log('✅ Dexie database initialized');
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to initialize offline database:', error);
    return false;
  }
}

// Export helper functions for common operations (with adapter pattern)
export const offlineStorage = USE_PGLITE ? pgliteStorage : {
  // Products
  async getProducts(tenantId: string) {
    return offlineDB.products.where('tenant_id').equals(tenantId).toArray();
  },

  async saveProducts(products: OfflineProduct[]) {
    return offlineDB.products.bulkPut(products);
  },

  async getProduct(id: string) {
    return offlineDB.products.get(id);
  },

  // Customers
  async getCustomers(tenantId: string) {
    return offlineDB.customers.where('tenant_id').equals(tenantId).toArray();
  },

  async saveCustomers(customers: OfflineCustomer[]) {
    return offlineDB.customers.bulkPut(customers);
  },

  async getCustomer(id: string) {
    return offlineDB.customers.get(id);
  },

  // Sales
  async getSales(tenantId: string) {
    return offlineDB.sales.where('tenant_id').equals(tenantId).toArray();
  },

  async saveSale(sale: OfflineSale) {
    return offlineDB.sales.put(sale);
  },

  async getSale(id: string) {
    return offlineDB.sales.get(id);
  },

  async getUnsyncedSales(tenantId: string) {
    return offlineDB.sales
      .where('tenant_id')
      .equals(tenantId)
      .and(sale => !sale.synced)
      .toArray();
  },

  // Students
  async getStudents(tenantId: string) {
    return offlineDB.students.where('tenant_id').equals(tenantId).toArray();
  },

  async saveStudents(students: OfflineStudent[]) {
    return offlineDB.students.bulkPut(students);
  },

  // Classes
  async getClasses(tenantId: string) {
    return offlineDB.classes.where('tenant_id').equals(tenantId).toArray();
  },

  async saveClasses(classes: OfflineClass[]) {
    return offlineDB.classes.bulkPut(classes);
  },
};

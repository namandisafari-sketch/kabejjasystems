/**
 * Import Configurations for different school modules
 * Each configuration defines the fields and validation rules for importing data
 */

export interface ImportConfig {
  module: string;
  label: string;
  description: string;
  systemFields: string[];
  requiredFields: string[];
  databaseTable: string;
  transformFn?: (row: any) => any;
  validationRules?: { [field: string]: (value: string) => boolean };
}

// Students Import Configuration
export const StudentImportConfig: ImportConfig = {
  module: 'students',
  label: 'Students',
  description: 'Import student records including admission numbers and contact details',
  systemFields: [
    'admissionNumber',
    'studentName',
    'dateOfBirth',
    'gender',
    'parentName',
    'parentPhone',
    'parentEmail',
    'class',
    'stream',
  ],
  requiredFields: [
    'admissionNumber',
    'studentName',
    'class',
  ],
  databaseTable: 'students',
  transformFn: (row) => ({
    admission_number: row.admissionNumber,
    student_name: row.studentName,
    date_of_birth: row.dateOfBirth || null,
    gender: row.gender || null,
    parent_name: row.parentName || null,
    parent_phone: row.parentPhone || null,
    parent_email: row.parentEmail || null,
    class_id: row.class || null,
    stream: row.stream || null,
  }),
  validationRules: {
    admissionNumber: (val) => val && val.length > 0,
    studentName: (val) => val && val.length > 0,
  },
};

// Staff Import Configuration
export const StaffImportConfig: ImportConfig = {
  module: 'staff',
  label: 'Staff Members',
  description: 'Import staff records including positions and contact details',
  systemFields: [
    'staffId',
    'staffName',
    'email',
    'phone',
    'position',
    'department',
    'dateJoined',
    'salary',
  ],
  requiredFields: [
    'staffId',
    'staffName',
    'position',
  ],
  databaseTable: 'employees',
  transformFn: (row) => ({
    staff_id: row.staffId,
    staff_name: row.staffName,
    email: row.email || null,
    phone: row.phone || null,
    position: row.position,
    department: row.department || null,
    date_joined: row.dateJoined || null,
    salary: row.salary ? parseFloat(row.salary) : null,
  }),
  validationRules: {
    staffId: (val) => val && val.length > 0,
    staffName: (val) => val && val.length > 0,
  },
};

// Fees Import Configuration
export const FeesImportConfig: ImportConfig = {
  module: 'fees',
  label: 'Fee Records',
  description: 'Import student fee information and amounts',
  systemFields: [
    'admissionNumber',
    'studentName',
    'feeType',
    'amount',
    'dueDate',
    'term',
    'class',
  ],
  requiredFields: [
    'admissionNumber',
    'studentName',
    'feeType',
    'amount',
  ],
  databaseTable: 'fees',
  transformFn: (row) => ({
    admission_number: row.admissionNumber,
    student_name: row.studentName,
    fee_type: row.feeType,
    amount: parseFloat(row.amount),
    due_date: row.dueDate || null,
    term: row.term || null,
    class: row.class || null,
    status: 'pending',
  }),
  validationRules: {
    amount: (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    admissionNumber: (val) => val && val.length > 0,
  },
};

// Attendance Import Configuration
export const AttendanceImportConfig: ImportConfig = {
  module: 'attendance',
  label: 'Attendance Records',
  description: 'Import student attendance for a specific date or period',
  systemFields: [
    'admissionNumber',
    'studentName',
    'date',
    'status',
    'class',
    'notes',
  ],
  requiredFields: [
    'admissionNumber',
    'studentName',
    'date',
    'status',
  ],
  databaseTable: 'attendance',
  transformFn: (row) => ({
    admission_number: row.admissionNumber,
    student_name: row.studentName,
    date: row.date,
    status: row.status.toUpperCase(), // Present, Absent, Late, etc.
    class: row.class || null,
    notes: row.notes || null,
  }),
  validationRules: {
    status: (val) =>
      ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(val.toUpperCase()),
    date: (val) => !isNaN(Date.parse(val)),
  },
};

// Inventory/Stock Import Configuration
export const InventoryImportConfig: ImportConfig = {
  module: 'inventory',
  label: 'Inventory Items',
  description: 'Import inventory items with quantities and prices',
  systemFields: [
    'itemCode',
    'itemName',
    'category',
    'quantity',
    'unitPrice',
    'supplier',
    'reorderLevel',
    'location',
  ],
  requiredFields: [
    'itemCode',
    'itemName',
    'category',
    'quantity',
    'unitPrice',
  ],
  databaseTable: 'inventory',
  transformFn: (row) => ({
    item_code: row.itemCode,
    item_name: row.itemName,
    category: row.category,
    quantity: parseInt(row.quantity),
    unit_price: parseFloat(row.unitPrice),
    supplier: row.supplier || null,
    reorder_level: parseInt(row.reorderLevel) || 10,
    location: row.location || null,
  }),
  validationRules: {
    quantity: (val) => !isNaN(parseInt(val)) && parseInt(val) >= 0,
    unitPrice: (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    itemCode: (val) => val && val.length > 0,
  },
};

// Parents Import Configuration
export const ParentsImportConfig: ImportConfig = {
  module: 'parents',
  label: 'Parent/Guardian Information',
  description: 'Import parent and guardian contact information',
  systemFields: [
    'parentName',
    'relationship',
    'email',
    'phone',
    'occupation',
    'address',
    'studentAdmissionNumber',
  ],
  requiredFields: [
    'parentName',
    'phone',
    'studentAdmissionNumber',
  ],
  databaseTable: 'parents',
  transformFn: (row) => ({
    parent_name: row.parentName,
    relationship: row.relationship || null,
    email: row.email || null,
    phone: row.phone,
    occupation: row.occupation || null,
    address: row.address || null,
    student_admission_number: row.studentAdmissionNumber,
  }),
  validationRules: {
    phone: (val) => val && val.length >= 10,
    parentName: (val) => val && val.length > 0,
  },
};

// Classes Import Configuration
export const ClassesImportConfig: ImportConfig = {
  module: 'classes',
  label: 'Classes/Forms',
  description: 'Import class/form information',
  systemFields: [
    'className',
    'form',
    'classTeacher',
    'level',
    'capacity',
    'year',
  ],
  requiredFields: [
    'className',
    'classTeacher',
  ],
  databaseTable: 'classes',
  transformFn: (row) => ({
    class_name: row.className,
    form: row.form || null,
    class_teacher: row.classTeacher,
    level: row.level || null,
    capacity: row.capacity ? parseInt(row.capacity) : null,
    year: row.year ? parseInt(row.year) : new Date().getFullYear(),
  }),
  validationRules: {
    className: (val) => val && val.length > 0,
    classTeacher: (val) => val && val.length > 0,
  },
};

// Subjects Import Configuration
export const SubjectsImportConfig: ImportConfig = {
  module: 'subjects',
  label: 'Subjects',
  description: 'Import subject information',
  systemFields: [
    'subjectCode',
    'subjectName',
    'category',
    'creditHours',
    'teacher',
    'class',
  ],
  requiredFields: [
    'subjectCode',
    'subjectName',
    'category',
  ],
  databaseTable: 'subjects',
  transformFn: (row) => ({
    subject_code: row.subjectCode,
    subject_name: row.subjectName,
    category: row.category,
    credit_hours: row.creditHours ? parseInt(row.creditHours) : 3,
    teacher: row.teacher || null,
    class: row.class || null,
  }),
  validationRules: {
    subjectCode: (val) => val && val.length > 0,
    subjectName: (val) => val && val.length > 0,
  },
};

// All configurations mapped by module name
export const IMPORT_CONFIGURATIONS: Record<string, ImportConfig> = {
  students: StudentImportConfig,
  staff: StaffImportConfig,
  fees: FeesImportConfig,
  attendance: AttendanceImportConfig,
  inventory: InventoryImportConfig,
  parents: ParentsImportConfig,
  classes: ClassesImportConfig,
  subjects: SubjectsImportConfig,
};

/**
 * Get import configuration for a module
 */
export function getImportConfig(module: string): ImportConfig | null {
  return IMPORT_CONFIGURATIONS[module] || null;
}

/**
 * Get all available import configurations
 */
export function getAllImportConfigs(): ImportConfig[] {
  return Object.values(IMPORT_CONFIGURATIONS);
}

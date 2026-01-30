/**
 * Smart Column Matcher
 * Intelligently maps Excel columns to system fields regardless of column order or naming variations
 */

// Comprehensive aliases for each system field
// Each field can be matched by multiple variations schools might use
const FIELD_ALIASES: Record<string, string[]> = {
  // Student fields
  admissionNumber: [
    'admission number', 'admission no', 'adm no', 'adm number', 'adm_no', 'admission_number',
    'admission', 'student id', 'student_id', 'studentid', 'reg no', 'reg number', 'registration number',
    'registration no', 'registration_number', 'learner id', 'learner_id', 'id number', 'id no',
    'student no', 'student number', 'pupil id', 'pupil no', 'pupil number', 'index', 'index no',
    'index number', 'roll no', 'roll number', 's/n', 'serial no', 'serial number'
  ],
  studentName: [
    'student name', 'student_name', 'studentname', 'name', 'full name', 'fullname', 'full_name',
    'learner name', 'learner_name', 'pupil name', 'pupil_name', 'child name', 'child_name',
    'student', 'learner', 'pupil', 'child', 'names', 'student names', 'pupil names'
  ],
  firstName: [
    'first name', 'firstname', 'first_name', 'given name', 'given_name', 'forename', 'name 1'
  ],
  lastName: [
    'last name', 'lastname', 'last_name', 'surname', 'family name', 'family_name', 'name 2'
  ],
  middleName: [
    'middle name', 'middlename', 'middle_name', 'other names', 'other_names', 'othernames'
  ],
  dateOfBirth: [
    'date of birth', 'dob', 'birth date', 'birthdate', 'date_of_birth', 'birth_date',
    'd.o.b', 'd.o.b.', 'born', 'born on', 'birthday', 'birth day'
  ],
  gender: [
    'gender', 'sex', 'm/f', 'male/female', 'boy/girl'
  ],
  class: [
    'class', 'form', 'grade', 'level', 'year', 'class name', 'class_name', 'classname',
    'current class', 'current_class', 'stream', 'section', 'group'
  ],
  stream: [
    'stream', 'section', 'arm', 'class stream', 'class arm', 'division'
  ],

  // Parent/Guardian fields
  parentName: [
    'parent name', 'parent_name', 'parentname', 'guardian name', 'guardian_name', 'guardianname',
    'parent/guardian', 'parent', 'guardian', 'father name', 'mother name', 'father/mother',
    'parent\'s name', 'guardian\'s name', 'next of kin', 'next_of_kin', 'nok name', 'caretaker'
  ],
  parentPhone: [
    'parent phone', 'parent_phone', 'parentphone', 'guardian phone', 'guardian_phone', 'guardianphone',
    'parent tel', 'parent telephone', 'guardian tel', 'phone', 'tel', 'telephone', 'contact',
    'contact number', 'contact phone', 'mobile', 'mobile no', 'mobile number', 'cell', 'cell phone',
    'parent mobile', 'guardian mobile', 'parent contact', 'guardian contact', 'phone number',
    'phone no', 'tel no', 'telephone number', 'nok phone', 'nok contact', 'emergency contact'
  ],
  parentEmail: [
    'parent email', 'parent_email', 'parentemail', 'guardian email', 'guardian_email', 'guardianemail',
    'email', 'e-mail', 'email address', 'parent\'s email', 'guardian\'s email', 'contact email'
  ],
  relationship: [
    'relationship', 'relation', 'parent type', 'guardian type', 'parent/guardian type',
    'relation type', 'relationship to child', 'relationship to student'
  ],
  occupation: [
    'occupation', 'job', 'profession', 'work', 'employment', 'parent occupation', 'guardian occupation'
  ],
  address: [
    'address', 'home address', 'residential address', 'residence', 'location', 'home',
    'village', 'area', 'district', 'region', 'physical address', 'postal address'
  ],
  studentAdmissionNumber: [
    'student admission number', 'student admission no', 'child admission', 'child adm no',
    'linked student', 'student id', 'student_id', 'child id', 'pupil id'
  ],

  // Staff fields
  staffId: [
    'staff id', 'staff_id', 'staffid', 'employee id', 'employee_id', 'employeeid',
    'emp id', 'emp_id', 'empid', 'teacher id', 'teacher_id', 'teacherid',
    'staff no', 'staff number', 'employee no', 'employee number', 'id', 'id no'
  ],
  staffName: [
    'staff name', 'staff_name', 'staffname', 'employee name', 'employee_name', 'employeename',
    'teacher name', 'teacher_name', 'teachername', 'name', 'full name', 'fullname'
  ],
  position: [
    'position', 'role', 'job title', 'job_title', 'jobtitle', 'designation', 'title',
    'post', 'staff position', 'staff role', 'employee role', 'job role'
  ],
  department: [
    'department', 'dept', 'section', 'unit', 'staff department', 'employee department'
  ],
  dateJoined: [
    'date joined', 'date_joined', 'datejoined', 'join date', 'joining date', 'start date',
    'hire date', 'hired date', 'employment date', 'started', 'joined'
  ],
  salary: [
    'salary', 'pay', 'wage', 'wages', 'monthly salary', 'gross salary', 'net salary',
    'remuneration', 'compensation', 'earnings'
  ],
  email: [
    'email', 'e-mail', 'email address', 'email_address', 'emailaddress', 'mail',
    'staff email', 'employee email', 'work email', 'official email'
  ],
  phone: [
    'phone', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'phone number', 'phone no',
    'tel no', 'telephone number', 'mobile no', 'mobile number', 'cell phone', 'contact number'
  ],

  // Fee fields
  feeType: [
    'fee type', 'fee_type', 'feetype', 'type of fee', 'fee category', 'fee name',
    'description', 'fee description', 'item', 'fee item', 'charge', 'charge type'
  ],
  amount: [
    'amount', 'fee amount', 'fee_amount', 'feeamount', 'total', 'total amount', 'sum',
    'value', 'charge', 'cost', 'price', 'ugx', 'shs', 'shillings', 'fee', 'fees'
  ],
  dueDate: [
    'due date', 'due_date', 'duedate', 'deadline', 'payment deadline', 'pay by',
    'payment due', 'expected date', 'target date'
  ],
  term: [
    'term', 'academic term', 'school term', 'semester', 'quarter', 'period',
    'term name', 'term number', 'term no'
  ],

  // Attendance fields
  date: [
    'date', 'attendance date', 'day', 'record date', 'date recorded', 'for date'
  ],
  status: [
    'status', 'attendance status', 'attendance', 'present/absent', 'present', 'absent',
    'attended', 'attendance record', 'attendance type', 'p/a', 'p or a'
  ],
  notes: [
    'notes', 'remarks', 'comment', 'comments', 'observation', 'observations', 'reason', 'note'
  ],

  // Inventory fields
  itemCode: [
    'item code', 'item_code', 'itemcode', 'product code', 'product_code', 'productcode',
    'sku', 'code', 'barcode', 'bar code', 'item id', 'product id', 'stock code'
  ],
  itemName: [
    'item name', 'item_name', 'itemname', 'product name', 'product_name', 'productname',
    'name', 'item', 'product', 'description', 'item description', 'stock name'
  ],
  category: [
    'category', 'item category', 'product category', 'type', 'item type', 'product type',
    'classification', 'group', 'item group'
  ],
  quantity: [
    'quantity', 'qty', 'stock', 'stock quantity', 'stock level', 'available', 'in stock',
    'current stock', 'balance', 'stock balance', 'units', 'count', 'no of items', 'number'
  ],
  unitPrice: [
    'unit price', 'unit_price', 'unitprice', 'price', 'cost', 'rate', 'selling price',
    'sale price', 'buy price', 'purchase price', 'unit cost', 'price per unit'
  ],
  supplier: [
    'supplier', 'vendor', 'seller', 'manufacturer', 'source', 'supplier name', 'vendor name'
  ],
  reorderLevel: [
    'reorder level', 'reorder_level', 'reorderlevel', 'min stock', 'minimum stock',
    'min quantity', 'minimum quantity', 'reorder point', 'alert level', 'low stock level'
  ],
  location: [
    'location', 'store', 'warehouse', 'storage', 'shelf', 'bin', 'storage location',
    'store location', 'stock location', 'position'
  ],

  // Class fields
  className: [
    'class name', 'class_name', 'classname', 'name', 'class', 'form', 'grade', 'level'
  ],
  form: [
    'form', 'form number', 'form no', 'year', 'year group', 'level'
  ],
  classTeacher: [
    'class teacher', 'class_teacher', 'classteacher', 'teacher', 'form teacher',
    'form master', 'form mistress', 'head teacher', 'class head'
  ],
  capacity: [
    'capacity', 'max students', 'maximum students', 'max size', 'class size',
    'size', 'seats', 'total seats', 'limit'
  ],
  year: [
    'year', 'academic year', 'school year', 'calendar year'
  ],

  // Subject fields
  subjectCode: [
    'subject code', 'subject_code', 'subjectcode', 'code', 'subject id', 'subject_id',
    'course code', 'course_code', 'paper code', 'subject no'
  ],
  subjectName: [
    'subject name', 'subject_name', 'subjectname', 'name', 'subject', 'course',
    'course name', 'paper', 'paper name', 'title'
  ],
  creditHours: [
    'credit hours', 'credit_hours', 'credithours', 'credits', 'hours', 'periods',
    'lessons per week', 'periods per week', 'contact hours'
  ],
  teacher: [
    'teacher', 'subject teacher', 'instructor', 'tutor', 'lecturer', 'facilitator',
    'assigned teacher', 'teacher name', 'taught by'
  ],

  // Exam result fields
  indexNumber: [
    'index number', 'index_number', 'indexnumber', 'index no', 'index', 'candidate no',
    'candidate number', 'exam no', 'exam number', 'examination number'
  ],
  aggregateGrade: [
    'aggregate', 'aggregate grade', 'agg', 'total aggregate', 'overall grade',
    'final grade', 'aggregate score'
  ],
  
  // Common subject grades
  englishLanguage: ['english', 'english language', 'eng', 'english lang', 'engl'],
  mathematics: ['mathematics', 'maths', 'math', 'mtc', 'mathamatics'],
  physics: ['physics', 'phy', 'phys'],
  chemistry: ['chemistry', 'chem', 'chm'],
  biology: ['biology', 'bio', 'biol'],
  geography: ['geography', 'geo', 'geog'],
  history: ['history', 'hist', 'hst'],
  commerce: ['commerce', 'comm', 'com'],
  economics: ['economics', 'econ', 'eco'],
  agriculture: ['agriculture', 'agric', 'agri', 'ag'],
  computerStudies: ['computer', 'computer studies', 'computers', 'ict', 'it', 'computer science'],
  religiousEducation: ['religion', 'religious education', 're', 'cre', 'ire', 'divinity'],
  kiswahili: ['kiswahili', 'swahili', 'kisw'],
  french: ['french', 'fre', 'frn'],
  arabic: ['arabic', 'arb'],
  luganda: ['luganda', 'lug'],
  literature: ['literature', 'lit', 'literature in english'],
  fineMathematics: ['fine mathematics', 'add maths', 'additional mathematics', 'further maths'],
  technicalDrawing: ['technical drawing', 'td', 'tech drawing'],
  entrepreneurship: ['entrepreneurship', 'ent', 'business', 'business studies'],
  physicalEducation: ['pe', 'physical education', 'sports', 'games'],
  music: ['music', 'mus'],
  art: ['art', 'fine art', 'art and design', 'visual arts']
};

/**
 * Normalize a string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars except spaces
    .replace(/\s+/g, ' '); // Normalize multiple spaces
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function similarityScore(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  
  // Exact match
  if (normA === normB) return 1;
  
  // One contains the other
  if (normA.includes(normB) || normB.includes(normA)) {
    const longer = Math.max(normA.length, normB.length);
    const shorter = Math.min(normA.length, normB.length);
    return shorter / longer;
  }
  
  // Word overlap
  const wordsA = new Set(normA.split(' ').filter(w => w.length > 1));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 1));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let matches = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) matches++;
  });
  
  return matches / Math.max(wordsA.size, wordsB.size);
}

/**
 * Find the best matching system field for an Excel column header
 */
export function findBestMatch(
  excelHeader: string,
  systemFields: string[]
): { field: string | null; score: number } {
  let bestMatch: string | null = null;
  let bestScore = 0;
  const threshold = 0.5; // Minimum similarity to consider a match
  
  const normalizedHeader = normalize(excelHeader);
  
  for (const field of systemFields) {
    // Check against field name itself
    let score = similarityScore(excelHeader, field);
    
    // Check against known aliases
    const aliases = FIELD_ALIASES[field] || [];
    for (const alias of aliases) {
      const aliasScore = similarityScore(excelHeader, alias);
      score = Math.max(score, aliasScore);
      
      // Perfect match with alias
      if (normalize(alias) === normalizedHeader) {
        score = 1;
        break;
      }
    }
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = field;
    }
  }
  
  return { field: bestMatch, score: bestScore };
}

/**
 * Smart auto-detect column mapping
 * Returns mapping and confidence scores
 */
export function smartAutoDetectMapping(
  excelHeaders: string[],
  systemFields: string[]
): {
  mapping: Record<string, number>;
  confidence: Record<string, number>;
  unmappedHeaders: string[];
  unmappedFields: string[];
} {
  const mapping: Record<string, number> = {};
  const confidence: Record<string, number> = {};
  const usedColumns = new Set<number>();
  
  // First pass: Find high-confidence matches
  const matches: Array<{ field: string; colIndex: number; score: number }> = [];
  
  for (const field of systemFields) {
    for (let colIndex = 0; colIndex < excelHeaders.length; colIndex++) {
      const header = excelHeaders[colIndex];
      const { field: matchedField, score } = findBestMatch(header, [field]);
      
      if (matchedField && score >= 0.5) {
        matches.push({ field, colIndex, score });
      }
    }
  }
  
  // Sort by score descending to assign best matches first
  matches.sort((a, b) => b.score - a.score);
  
  // Assign matches, avoiding conflicts
  for (const match of matches) {
    if (!mapping[match.field] && !usedColumns.has(match.colIndex)) {
      mapping[match.field] = match.colIndex;
      confidence[match.field] = match.score;
      usedColumns.add(match.colIndex);
    }
  }
  
  // Find unmapped items
  const unmappedHeaders = excelHeaders
    .filter((_, idx) => !usedColumns.has(idx))
    .filter(h => h.trim() !== '');
  
  const unmappedFields = systemFields.filter(f => !(f in mapping));
  
  return { mapping, confidence, unmappedHeaders, unmappedFields };
}

/**
 * Get suggested mappings for unmapped fields
 */
export function getSuggestionsForField(
  field: string,
  excelHeaders: string[],
  excludeIndices: number[] = []
): Array<{ index: number; header: string; score: number }> {
  const suggestions: Array<{ index: number; header: string; score: number }> = [];
  
  for (let i = 0; i < excelHeaders.length; i++) {
    if (excludeIndices.includes(i)) continue;
    
    const header = excelHeaders[i];
    if (!header.trim()) continue;
    
    const { score } = findBestMatch(header, [field]);
    
    if (score > 0.2) {
      suggestions.push({ index: i, header, score });
    }
  }
  
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Format field name for display
 */
export function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.9) return { label: 'Excellent', color: 'text-primary' };
  if (score >= 0.7) return { label: 'Good', color: 'text-primary/80' };
  if (score >= 0.5) return { label: 'Fair', color: 'text-muted-foreground' };
  return { label: 'Low', color: 'text-destructive' };
}

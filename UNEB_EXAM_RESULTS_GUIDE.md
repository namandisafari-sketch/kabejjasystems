# UNEB Exam Results System - Uganda National Exam Portal

## ⚖️ IMPORTANT LEGAL NOTICE

**THIS SYSTEM IS NOT AFFILIATED WITH UNEB (UGANDA NATIONAL EXAMINATIONS BOARD)**

- ❌ This is **NOT** an official UNEB service or product
- ❌ UNEB does **NOT** endorse or operate this system
- ✅ This is a **legitimate school management tool** used by authorized schools
- ✅ Schools use it to help students check results already released by UNEB
- ✅ **It is NOT a scam** - it's educational technology infrastructure

### Intellectual Property Rights
- **UNEB owns:** All exam questions, grading systems, and examination methodologies
- **Schools own:** Student result data once it's been released by UNEB
- **This system:** Provides infrastructure for schools to display results to their students

### Data Responsibility
- **Schools are responsible** for:
  - Data accuracy and completeness
  - Student privacy and data protection
  - Compliance with educational laws and UNEB regulations
  - Authorization to release results to students

- **UNEB is responsible** for:
  - Examination integrity and grading accuracy
  - Official result verification
  - Dispute resolution and appeals

---

## Overview

This is a **nationwide exam results checking system** for Uganda's UNEB (Uganda National Examinations Board) exams. It allows students to check their exam performance while giving schools complete control over access.

### Key Features
- ✅ **Public Student Portal**: Students search results by index number and year
- ✅ **School Blocking System**: Schools can block access for specific reasons
- ✅ **Automatic Expiry**: Blocks can expire automatically or be permanent
- ✅ **Audit Logging**: Track all exam result access attempts
- ✅ **Print & Share**: Students can print or share their results

---

## Legal Compliance & Responsibilities

### For Schools Using This System

1. **Verify All Data**: Ensure exam results are 100% accurate before uploading
2. **UNEB Authorization**: Only display results officially released by UNEB
3. **Student Privacy**: Protect student personal data according to Uganda's laws
4. **Access Control**: Use the blocking feature to enforce school policies
5. **Clear Communication**: Inform students this is NOT UNEB's system
6. **UNEB Disputes**: Direct result disputes/appeals to official UNEB channels

### For Students Using This System

1. **Verify Information**: If you have doubts, contact your school and/or UNEB
2. **Not Official**: This is a school tool, not UNEB's official system
3. **UNEB Disputes**: Appeal result errors directly to UNEB, not through this system
4. **Data Privacy**: Your data is managed by your school, not UNEB

### What This System IS NOT
- ❌ UNEB's official results portal
- ❌ A scam or unauthorized access to results
- ❌ UNEB-endorsed or UNEB-operated
- ❌ A shortcut for result verification

### What This System IS
- ✅ A school management tool for result distribution
- ✅ A convenience for students who already have their results
- ✅ Developed with schools' best interests in mind
- ✅ Compliant with educational technology standards

---

### Database Structure

```
exam_sessions (years, levels, terms)
    ↓
exam_results (student results with subjects)
    ↓
exam_result_blocks (school-managed restrictions)
    ↓
exam_access_logs (audit trail)
```

### User Access Levels

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Student** | View own results if not blocked | Block results, manage sessions |
| **School Admin** | Block/unblock student results | View other schools' data |
| **Superadmin** | Everything + view all access logs | - |

---

## Student-Facing Features

### 1. Exam Results Lookup (`/exam-results`)

Students visit the public page and:
1. **Enter Index Number** (from their UNEB admission letter)
2. **Select Exam Year & Level** (dropdown of available sessions)
3. **Search** to find their results

#### Example URL Flow:
```
/exam-results          → Search page
/exam-results/abc123   → Results display (if found and not blocked)
```

### 2. Results Display Page (`/exam-results/:resultId`)

Shows:
- ✅ Student name & index number
- ✅ School name
- ✅ Aggregate grade (A-E)
- ✅ Total points
- ✅ Subject-by-subject breakdown
- ✅ Print & Share options

**If Blocked:**
```
"Access Restricted - Fee not paid"
"Please contact your school for more information"
```

---

## School Admin Features

### Exam Result Access Control (`/business/exam-access`)

Schools can:

#### 1. **Block Results**
- Click "Block Result Access"
- Enter student index number
- Select reason:
  - Fee not paid
  - Disciplinary action
  - Document pending
  - Investigation in progress
  - Other
- Set expiry (optional):
  - Leave blank = permanent until manually unblocked
  - Enter days = auto-expires after that period
- Add internal notes

#### 2. **View All Blocks**
- Sortable table of blocked students
- Shows reason, block date, expiry
- Can delete/unblock anytime

#### 3. **Why Block Results?**
- Student hasn't paid school fees
- Disciplinary case pending
- Missing documents (transcript, transfer letter)
- Investigation into exam irregularities
- Grade release pending payment

---

## Technical Implementation

### Routes

```tsx
// Public
GET /exam-results              → Lookup page
GET /exam-results/:resultId    → Results display

// School Admin (requires auth + school role)
GET /business/exam-access      → Block management page
```

### Database Tables

#### `exam_sessions`
```sql
- id (UUID)
- year (integer)           -- 2024, 2025, etc.
- level (text)            -- O-Level, A-Level, PLE
- session_name (text)     -- "November 2024"
- results_released_date   -- When results were released
- is_active (boolean)     -- Show in dropdown?
- created_at
```

#### `exam_results`
```sql
- id (UUID)
- index_number (text)     -- Student's UNEB index
- exam_session_id (UUID)  -- Links to session
- student_name (text)
- school_name (text)
- school_id (UUID)        -- Links to school/tenant
- subjects (JSONB)        -- Array: [{subject, grade, points}, ...]
- total_points (integer)
- aggregate_grade (text)  -- A, B, C, D, E
- status (text)           -- published, pending, cancelled
- created_at, updated_at
```

#### `exam_result_blocks`
```sql
- id (UUID)
- exam_result_id (UUID)   -- Which result is blocked
- school_id (UUID)        -- Which school blocked it
- index_number (text)     -- For quick lookup
- reason (text)           -- Fee, discipline, etc.
- blocked_by (UUID)       -- Who created block
- blocked_at (timestamp)
- expires_at (timestamp)  -- NULL = permanent
- notes (text)            -- Internal notes
```

#### `exam_access_logs`
```sql
- id (UUID)
- index_number (text)
- exam_session_id (UUID)
- access_status (text)    -- success, blocked, not_found
- ip_address, user_agent
- accessed_at (timestamp)
```

---

## Setup & Configuration

### 1. Create Exam Sessions

**For Superadmin Only**

```typescript
import { createExamSession } from "@/lib/exam-results";

const session = await createExamSession(
  2024,              // year
  "O-Level",         // level
  "November 2024",   // session name
  "2024-12-20"      // results released date (optional)
);
```

### 2. Import Student Results

**For Superadmin via Admin Dashboard**

Prepare CSV file:
```csv
indexNumber,studentName,schoolName,subjects,totalPoints,aggregateGrade
S001234,John Doe,St. Mary's School,"[{subject:English,grade:A,points:1}]",8,A
S001235,Jane Smith,St. Joseph's,"[...]",12,B
```

Then use API:
```typescript
import { importExamResults } from "@/lib/exam-results";

await importExamResults(parsedResults, sessionId);
```

### 3. Schools Block Results

**In School Dashboard → Exam Result Access Control**

1. Click "Block Result Access"
2. Enter index number
3. Select reason
4. Optional: Set expiry days
5. Submit

---

## API Reference

### Student Functions

#### `searchExamResults(indexNumber, sessionId)`
Returns exam result if exists and not blocked.

```typescript
const result = await searchExamResults("S001234", "session-uuid");
// Returns: { id, index_number, student_name, subjects, aggregate_grade, ... }
```

#### `getExamResult(resultId)`
Fetch full result by ID.

```typescript
const result = await getExamResult("result-uuid");
```

#### `isResultBlocked(resultId)`
Check if result is currently blocked.

```typescript
const blocked = await isResultBlocked("result-uuid");
```

### School Admin Functions

#### `blockExamResult(indexNumber, reason, notes?, expiresInDays?)`
Block a student's result access.

```typescript
await blockExamResult(
  "S001234",
  "Fee not paid",
  "Follow up on 15th January",
  30  // Unblock automatically in 30 days
);
```

#### `unblockExamResult(blockId)`
Remove a block.

```typescript
await unblockExamResult("block-uuid");
```

#### `getSchoolBlocks()`
Get all active blocks for the school.

```typescript
const blocks = await getSchoolBlocks();
// Returns: [{ id, index_number, reason, expires_at, ... }, ...]
```

### Superadmin Functions

#### `createExamSession(year, level, sessionName, releasedDate?)`
Create new exam session.

```typescript
const session = await createExamSession(2025, "A-Level", "May 2025");
```

#### `getExamSessions()`
List all active exam sessions.

```typescript
const sessions = await getExamSessions();
```

#### `getAccessLogs(indexNumber?, sessionId?)`
View all access attempts.

```typescript
const logs = await getAccessLogs("S001234");  // Specific student
const logs = await getAccessLogs(undefined, "session-uuid");  // Specific session
```

---

## Security & Privacy

### Data Protection
- ✅ Results only visible if NOT blocked
- ✅ School-specific blocks (isolated by tenant_id)
- ✅ RLS policies enforce tenant isolation
- ✅ Access logs track who searched
- ✅ Sensitive data protected

### RLS Policies
```sql
-- Students can only view published results
-- Schools can only manage their own blocks
-- Superadmins can view everything
-- Access logs visible only to superadmin
```

### Audit Trail
Every result access is logged:
- Student searched (index + session)
- Found or not found
- Blocked or accessible
- IP address & user agent
- Timestamp

---

## Common Scenarios

### Scenario 1: Student Checks Results
```
Student visits /exam-results
↓
Enters "S001234" + selects "2024 O-Level"
↓
System searches exam_results table
↓
Checks exam_result_blocks (not blocked)
↓
Logs access as "success"
↓
Shows results with grades
```

### Scenario 2: Student Blocked for Fees
```
School clicks "Block Result Access"
↓
Enters index number + "Fee not paid"
↓
Block created in database
↓
Student tries to view results
↓
System finds block
↓
Shows: "Access Restricted - Fee not paid"
↓
Logs access as "blocked"
```

### Scenario 3: Block Expires Automatically
```
School creates block with "30 days" expiry
↓
Database sets expires_at = now() + 30 days
↓
After 30 days, student searches again
↓
Block check: expires_at < now() → EXPIRED
↓
Block is ignored, results shown
↓
Access logged as "success"
```

---

## Admin Tasks

### For Superadmin

**Initial Setup:**
1. Create exam sessions for each year/level
2. Import results from UNEB (CSV upload)
3. Monitor access logs for suspicious activity

**Ongoing:**
- [ ] Review access logs weekly
- [ ] Verify result accuracy
- [ ] Handle appeals if results questioned
- [ ] Archive old sessions

### For School Admin

**Per Result Release:**
1. Review student list
2. Identify fee defaults, disciplinary cases
3. Block those students
4. Communicate deadline (if temporary block)

**Ongoing:**
- [ ] Unblock when issues resolved
- [ ] Review blocked student reasons
- [ ] Track which students check results

---

## Troubleshooting

### Student: "Results not found"
**Causes:**
- Wrong index number (typo?)
- Selected wrong exam year/level
- Results not released yet
- Results haven't been uploaded

**Solution:**
- Double-check admission letter
- Try different year/level
- Contact school or UNEB

### Student: "Access Restricted"
**Causes:**
- School blocked them
- Student has unpaid fees
- Pending documents
- Disciplinary case

**Solution:**
- Contact school principal/admin
- Pay outstanding fees if applicable
- Submit required documents

### School: "Can't find student to block"
**Causes:**
- Index number doesn't exist in database
- Wrong exam session
- Student not from this school

**Solution:**
- Verify index number
- Check if exam session was imported
- Ensure student is registered at school

---

## Examples

### CSV Import Format
```csv
indexNumber,studentName,schoolName,subjects,totalPoints,aggregateGrade
S24001001,Alice Mwesiga,King's College Budo,"[{""subject"":""English"",""grade"":""A"",""points"":1},{""subject"":""Mathematics"",""grade"":""A"",""points"":1}]",2,A
S24001002,Bob Mukisa,St. Mary's Kitende,"[{""subject"":""English"",""grade"":""B"",""points"":2}]",10,B
```

### Subject JSON Format
```json
[
  {
    "subject": "English Language",
    "grade": "A",
    "points": 1
  },
  {
    "subject": "Mathematics",
    "grade": "A",
    "points": 1
  },
  {
    "subject": "Chemistry",
    "grade": "C",
    "points": 5
  }
]
```

---

## Future Enhancements

- [ ] SMS notifications for blocked students
- [ ] Email reminders to schools about expiring blocks
- [ ] Result appeal system
- [ ] Bulk import via Excel
- [ ] Result statistics dashboard
- [ ] UNEB API integration for live results
- [ ] Grade slip generation (PDF)
- [ ] Multi-language support

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review audit logs for clues
3. Contact platform support
4. Escalate to UNEB for result accuracy issues

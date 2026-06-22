# Student Discipline & Appeals System - Setup Instructions

## Quick Setup Guide (3 Steps)

### Step 1: Create Database Tables
1. Go to: https://supabase.com/dashboard/project/ljgbjiixeoxxqpejnmjx/sql/new
2. Copy ALL content from the SQL file shown above (starting with "CREATE TYPE discipline_severity...")
3. Paste and run the entire SQL migration
4. Should complete with no errors

**Expected output:** 
- 3 tables created
- 5 indexes created
- 8 RLS policies created

---

### Step 2: Create Discipline Rules
1. In the same SQL editor, run the second SQL block (creating 5 rules)
2. These rules define which discipline cases block portal access

**Rules created:**
- ✅ Violence (Critical) → **BLOCKS LOGIN**
- ✅ Bullying (High) → **BLOCKS LOGIN**
- ✅ Sexual Assault (Critical) → **BLOCKS LOGIN**
- ✅ Drugs (High) → **BLOCKS LOGIN**
- ❌ Academic Dishonesty (Medium) → **Does NOT block**

---

### Step 3: Create Test Discipline Case
1. In the same SQL editor, run the third SQL block
2. Creates a test case for student 670033 with CRITICAL violence charge
3. Student will NOT be able to login

**Test case:**
- Case Number: `EDEN-670033-2026-06-22`
- Student: 670033 (KATENDE KEVIN)
- Offense: Violence
- Severity: **CRITICAL**
- Status: **ACTIVE** (blocks login)

---

## Testing the System

### Test 1: Try to Login as Blocked Student
1. Go to: https://system.tennahubapps.com/student/login
2. Enter School Code: `eden-high-school-mqnereze`
3. Enter Email: `670033@ttl.student`
4. Click "Send Login Link"
5. Check email (or browser console) for magic link
6. Click the link

**Expected Result:** 
- ❌ Instead of dashboard, see "Access Restricted" page
- Shows case details:
  - Case #: `EDEN-670033-2026-06-22`
  - Offense: `Violence`
  - Severity: `CRITICAL`
  - Incident Date: `June 22, 2026`
- Button: "Submit an Appeal"

---

### Test 2: Submit an Appeal
1. On the DisciplineBlocked page, click "Submit an Appeal"
2. Enter appeal reason (minimum 50 characters):
   ```
   I believe this incident was a misunderstanding. I was defending myself 
   from another student's aggression. Please review the witness statements.
   ```
3. Enter supporting evidence (optional):
   ```
   Witness statement from John Doe in class 3A
   School security footage from 2:15 PM
   Medical report showing I was the injured party
   ```
4. Enter contact email: `katende.kevin@gmail.com`
5. Click "Submit Appeal"

**Expected Result:**
- ✅ Success page: "Appeal Submitted Successfully"
- Message: "Your appeal will be reviewed within 5-7 business days"
- Button: "Back to Login"

---

### Test 3: View Case in Admin Dashboard
1. Login as staff/admin account
2. Go to: `/admin/discipline` (or find in navigation)
3. See "Active Cases" table
4. Should see case: `EDEN-670033-2026-06-22`
   - Student: KATENDE KEVIN (670033)
   - Offense: Violence
   - Severity: CRITICAL (red badge)
   - Status: open
   - Portal Block: ❌ Blocked

---

## How It Works: Behind the Scenes

### Login Flow with Discipline Check
```
Student clicks magic link
  ↓
StudentAuthCallback runs
  ↓
Check: Does student have active discipline cases?
  ├─ NO → Login successful → Dashboard
  ├─ YES → Check: Is severity HIGH or CRITICAL?
      ├─ NO → Login successful → Dashboard
      ├─ YES → Check: Is there a blocking RULE for this case?
          ├─ NO → Login successful → Dashboard
          ├─ YES → BLOCK LOGIN → Show DisciplineBlocked page
```

### Database Tables

**school_discipline_rules**
- Defines which offense/severity combinations block portal
- Per-school configuration
- Example: Violence + Critical = blocks login

**student_discipline_cases**
- Individual discipline records for students
- Linked to student & tenant
- Case number format: `{schoolcode}-{admissionnumber}-{date}`
- Status: open, under_review, resolved, appealed
- is_active: true = currently blocks portal

**student_discipline_appeals**
- Appeal submissions for cases
- Status: submitted, under_review, approved, rejected, closed
- Prevents duplicate submissions (only 1 pending appeal per case)

---

## Admin Operations

### Creating a Discipline Case via UI
1. Go to: `/admin/discipline`
2. Click "New Case"
3. Enter:
   - Student Admission Number: `670033`
   - Offense Type: Select from dropdown
   - Severity: Low/Medium/High/Critical
   - Incident Date: Date picker
   - Description: Detailed explanation
4. Click "Create Case"

### Creating Discipline Rules via UI
1. Go to: `/admin/discipline`
2. Click "New Rule" (in Portal Access Rules section)
3. Enter:
   - Rule Name: e.g., "Violence Policy"
   - Offense Type: Select from dropdown
   - Severity: Low/Medium/High/Critical
   - ☑️ Check "Blocks Student Portal Login" if needed
4. Click "Create Rule"

### Reviewing Appeals
1. Go to: `/admin/discipline`
2. Scroll to "Appeals" section (not shown yet in first deploy)
3. See submitted appeals
4. Review student's reason & evidence
5. Click to approve/reject

---

## Important Notes

### Security Features
- ✅ RLS policies enforce access control
- ✅ Students can only see their own cases/appeals
- ✅ Only admins/disciplinarians can create cases
- ✅ Appeal submissions are logged & auditable
- ✅ Prevents duplicate appeals (only 1 pending per case)

### Case Number Format
- Format: `{SCHOOLCODE}-{ADMISSIONNUMBER}-{DATE}`
- Example: `EDEN-670033-2026-06-22`
- Automatically generated by system

### Appeal Workflow
1. Student submits appeal → Status: `submitted`
2. Admin reviews → Status: `under_review` (optional)
3. Admin decides → Status: `approved` or `rejected`
4. When approved → is_active = false → Student can login again

### Testing Different Scenarios

**Test Case 1: Non-blocking discipline**
- Create case: Bullying (Medium)
- Rule: Academic Dishonesty (Medium) - does NOT block
- Result: ✅ Student can login

**Test Case 2: High severity non-blocking**
- Create case: Insubordination (High)
- No rule for insubordination
- Result: ✅ Student can login (no rule = no block)

**Test Case 3: Expired/Resolved case**
- Create case: Violence (Critical), is_active = false
- Result: ✅ Student can login (case not active)

---

## URLs for Testing

- Student Login: https://system.tennahubapps.com/student/login
- Admin Discipline Dashboard: https://system.tennahubapps.com/admin/discipline
- Appeal Page (auto-navigates from blocked page): /appeal-discipline/{caseId}

---

## Support & Troubleshooting

### "Student not found" error when creating case
- Check admission number is exact (case-sensitive)
- Verify student exists in school/tenant

### Appeal submission fails
- Check if appeal already exists for this case
- Verify email format
- Check browser console for detailed error

### Can't see rules/cases in admin dashboard
- Ensure you're logged in as staff/admin
- Check tenant_id is correct
- Try refreshing page

---

## Next Steps After Testing

1. ✅ Verify login blocking works
2. ✅ Verify appeal submission works
3. ✅ Train admin staff on creating cases/rules
4. ✅ Set up school-specific discipline rules
5. ✅ Create actual discipline cases as needed
6. ✅ Monitor and review appeals

---

## Questions?

Check the implementation in these files:
- `/src/pages/student/StudentAuthCallback.tsx` - Login discipline check
- `/src/pages/student/DisciplineBlocked.tsx` - Blocked page UI
- `/src/pages/student/AppealDisciplineCase.tsx` - Appeal form
- `/src/pages/admin/AdminDiscipline.tsx` - Admin dashboard

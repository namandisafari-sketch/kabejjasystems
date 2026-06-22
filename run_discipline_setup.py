import requests
import json

# Configuration
SUPABASE_URL = "https://ljgbjiixeoxxqpejnmjx.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxODEwNDQ4NCwiZXhwIjoxODc1ODcwNDg0fQ.4u9EpPjZWaF6MdKdG10D_WNgkbPPM2DWmI3X1z0VbV8"
EDEN_TENANT_ID = "ef7a3391-cddd-434f-9422-e58ffda74953"

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
}

print("Starting discipline system setup via Supabase API...\n")

try:
    # Step 1: Create discipline rules
    print("Step 1: Creating discipline rules...")
    
    rules = [
        {
            "tenant_id": EDEN_TENANT_ID,
            "rule_name": "Violence - Critical",
            "description": "Physical violence or threat of violence",
            "offense_type": "violence",
            "severity": "critical",
            "blocks_portal_login": True
        },
        {
            "tenant_id": EDEN_TENANT_ID,
            "rule_name": "Bullying - High",
            "description": "Repeated bullying or harassment",
            "offense_type": "bullying",
            "severity": "high",
            "blocks_portal_login": True
        },
        {
            "tenant_id": EDEN_TENANT_ID,
            "rule_name": "Sexual Assault - Critical",
            "description": "Any form of sexual assault or harassment",
            "offense_type": "sexual_assault",
            "severity": "critical",
            "blocks_portal_login": True
        },
        {
            "tenant_id": EDEN_TENANT_ID,
            "rule_name": "Drugs - High",
            "description": "Possession, use, or distribution of illegal drugs",
            "offense_type": "drugs",
            "severity": "high",
            "blocks_portal_login": True
        },
        {
            "tenant_id": EDEN_TENANT_ID,
            "rule_name": "Academic Dishonesty - Medium",
            "description": "Cheating, plagiarism, or unauthorized collaboration",
            "offense_type": "academic_dishonesty",
            "severity": "medium",
            "blocks_portal_login": False
        }
    ]
    
    for rule in rules:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/school_discipline_rules",
            headers=headers,
            json=rule
        )
        
        if response.status_code not in [200, 201]:
            if "duplicate key value" in response.text or "conflicting key value" in response.text:
                print(f"  - {rule['rule_name']}: Already exists")
            else:
                print(f"  - {rule['rule_name']}: Error {response.status_code} - {response.text}")
        else:
            print(f"  ✓ Created: {rule['rule_name']}")
    
    print()
    
    # Step 2: Get student 670033
    print("Step 2: Finding student 670033...")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/students?admission_number=eq.670033&tenant_id=eq.{EDEN_TENANT_ID}",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"  ✗ Error finding student: {response.status_code}")
        students = []
    else:
        students = response.json()
    
    if not students:
        print("  ✗ Student 670033 not found")
    else:
        student = students[0]
        student_id = student["id"]
        print(f"  ✓ Found: {student['first_name']} {student['last_name']} ({student['admission_number']})")
        
        # Step 3: Create test discipline case
        print("\nStep 3: Creating test discipline case...")
        
        case_data = {
            "tenant_id": EDEN_TENANT_ID,
            "student_id": student_id,
            "case_number": "EDEN-670033-2026-06-22",
            "offense_type": "violence",
            "severity": "critical",
            "description": "Student involved in altercation with another student on school grounds. Incident reported by witnesses.",
            "incident_date": "2026-06-22",
            "status": "open",
            "is_active": True,
            "can_appeal": True
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/student_discipline_cases",
            headers=headers,
            json=case_data
        )
        
        if response.status_code not in [200, 201]:
            if "duplicate key value" in response.text:
                print(f"  - Case already exists")
            else:
                print(f"  ✗ Error: {response.status_code} - {response.text}")
        else:
            print(f"  ✓ Created case: EDEN-670033-2026-06-22")
    
    # Step 4: Verify setup
    print("\n════════════════════════════════════════════════════════════")
    print("VERIFICATION")
    print("════════════════════════════════════════════════════════════\n")
    
    # Count rules
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/school_discipline_rules?tenant_id=eq.{EDEN_TENANT_ID}&select=count",
        headers={**headers, "Prefer": "count=exact"}
    )
    if response.status_code == 200:
        count = response.headers.get("Content-Range", "0").split("/")[-1] if "Content-Range" in response.headers else "?"
        print(f"✓ Discipline Rules: {count}")
    
    # Count cases
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/student_discipline_cases?tenant_id=eq.{EDEN_TENANT_ID}",
        headers={**headers, "Prefer": "count=exact"}
    )
    if response.status_code == 200:
        count = response.headers.get("Content-Range", "0").split("/")[-1] if "Content-Range" in response.headers else len(response.json())
        print(f"✓ Discipline Cases: {count}")
    
    print("\n════════════════════════════════════════════════════════════")
    print("SETUP COMPLETE ✓")
    print("════════════════════════════════════════════════════════════\n")
    
    print("NEXT STEPS:")
    print("  1. Go to: https://system.tennahubapps.com/student/login")
    print("  2. School Code: eden-high-school-mqnereze")
    print("  3. Email: 670033@ttl.student")
    print("  4. Should see 'Access Restricted' page (blocked due to discipline case)")
    print("  5. Click 'Submit an Appeal' to test the appeal workflow\n")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

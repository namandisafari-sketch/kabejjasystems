export interface SubjectDefinition {
  name: string;
  code: string;
  level: string;
  is_core: boolean;
}

export const UGANDA_SUBJECTS: Record<string, SubjectDefinition[]> = {
  ecd: [
    { name: "Health & Physical Development", code: "ECD-HPD", level: "kindergarten", is_core: true },
    { name: "Communication & Language", code: "ECD-CL", level: "kindergarten", is_core: true },
    { name: "Cognitive Development", code: "ECD-CD", level: "kindergarten", is_core: true },
    { name: "Social & Emotional Development", code: "ECD-SED", level: "kindergarten", is_core: true },
    { name: "Values & Attitudes", code: "ECD-VA", level: "kindergarten", is_core: true },
    { name: "Creative Arts", code: "ECD-CA", level: "kindergarten", is_core: false },
    { name: "Outdoor Play & Physical Activity", code: "ECD-OP", level: "kindergarten", is_core: false },
  ],
  primary: [
    { name: "English", code: "P-ENG", level: "primary", is_core: true },
    { name: "Mathematics", code: "P-MTC", level: "primary", is_core: true },
    { name: "Science", code: "P-SCI", level: "primary", is_core: true },
    { name: "Social Studies", code: "P-SST", level: "primary", is_core: true },
    { name: "Literacy I (Local Language)", code: "P-LIT1", level: "primary", is_core: false },
    { name: "Literacy II (English)", code: "P-LIT2", level: "primary", is_core: false },
    { name: "Religious Education (CRE/IRE)", code: "P-RE", level: "primary", is_core: false },
    { name: "Reading", code: "P-RDG", level: "primary", is_core: false },
    { name: "Writing", code: "P-WRT", level: "primary", is_core: false },
    { name: "Physical Education", code: "P-PE", level: "primary", is_core: false },
    { name: "Art & Craft", code: "P-ART", level: "primary", is_core: false },
    { name: "Music", code: "P-MUS", level: "primary", is_core: false },
    { name: "Kiswahili", code: "P-KSW", level: "primary", is_core: false },
    { name: "Agriculture", code: "P-AGR", level: "primary", is_core: false },
  ],
  lower_secondary: [
    { name: "English", code: "S-ENG", level: "secondary", is_core: true },
    { name: "Mathematics", code: "S-MTC", level: "secondary", is_core: true },
    { name: "Biology", code: "S-BIO", level: "secondary", is_core: false },
    { name: "Chemistry", code: "S-CHEM", level: "secondary", is_core: false },
    { name: "Physics", code: "S-PHY", level: "secondary", is_core: false },
    { name: "Geography", code: "S-GEO", level: "secondary", is_core: false },
    { name: "History", code: "S-HIS", level: "secondary", is_core: false },
    { name: "Christian Religious Education", code: "S-CRE", level: "secondary", is_core: false },
    { name: "Islamic Religious Education", code: "S-IRE", level: "secondary", is_core: false },
    { name: "Commerce", code: "S-COM", level: "secondary", is_core: false },
    { name: "Entrepreneurship", code: "S-ENT", level: "secondary", is_core: false },
    { name: "Computer Science", code: "S-CS", level: "secondary", is_core: false },
    { name: "Art & Design", code: "S-ART", level: "secondary", is_core: false },
    { name: "Music", code: "S-MUS", level: "secondary", is_core: false },
    { name: "Physical Education", code: "S-PE", level: "secondary", is_core: false },
    { name: "Kiswahili", code: "S-KSW", level: "secondary", is_core: false },
    { name: "French", code: "S-FRN", level: "secondary", is_core: false },
    { name: "German", code: "S-GER", level: "secondary", is_core: false },
    { name: "Arabic", code: "S-ARB", level: "secondary", is_core: false },
    { name: "Literature in English", code: "S-LIT", level: "secondary", is_core: false },
    { name: "Agriculture", code: "S-AGR", level: "secondary", is_core: false },
    { name: "Additional Mathematics", code: "S-ADM", level: "secondary", is_core: false },
  ],
  a_level: [
    { name: "Mathematics", code: "A-MTC", level: "secondary", is_core: false },
    { name: "Physics", code: "A-PHY", level: "secondary", is_core: false },
    { name: "Chemistry", code: "A-CHEM", level: "secondary", is_core: false },
    { name: "Biology", code: "A-BIO", level: "secondary", is_core: false },
    { name: "Geography", code: "A-GEO", level: "secondary", is_core: false },
    { name: "History", code: "A-HIS", level: "secondary", is_core: false },
    { name: "Economics", code: "A-ECO", level: "secondary", is_core: false },
    { name: "Divinity", code: "A-DIV", level: "secondary", is_core: false },
    { name: "Islamic Religious Education", code: "A-IRE", level: "secondary", is_core: false },
    { name: "Literature in English", code: "A-LIT", level: "secondary", is_core: false },
    { name: "Computer Science / ICT", code: "A-ICT", level: "secondary", is_core: false },
    { name: "Entrepreneurship", code: "A-ENT", level: "secondary", is_core: false },
    { name: "Art & Design", code: "A-ART", level: "secondary", is_core: false },
    { name: "Music", code: "A-MUS", level: "secondary", is_core: false },
    { name: "Physical Education", code: "A-PE", level: "secondary", is_core: false },
    { name: "French", code: "A-FRN", level: "secondary", is_core: false },
    { name: "German", code: "A-GER", level: "secondary", is_core: false },
    { name: "Arabic", code: "A-ARB", level: "secondary", is_core: false },
    { name: "Kiswahili", code: "A-KSW", level: "secondary", is_core: false },
    { name: "Agriculture", code: "A-AGR", level: "secondary", is_core: false },
    { name: "General Paper", code: "A-GP", level: "secondary", is_core: true },
    { name: "Subsidiary ICT", code: "A-SICT", level: "secondary", is_core: false },
    { name: "Subsidiary Mathematics", code: "A-SMTC", level: "secondary", is_core: false },
  ],
};

export function getSubjectsForLevel(level: string): SubjectDefinition[] {
  const normalized = level.toLowerCase();
  if (normalized.includes("ecd")) return UGANDA_SUBJECTS.ecd;
  if (normalized.includes("primary") || normalized.match(/^p\d+$/)) return UGANDA_SUBJECTS.primary;
  if (normalized.includes("o-level") || normalized.includes("secondary") && !normalized.includes("a-level")) return UGANDA_SUBJECTS.lower_secondary;
  if (normalized.includes("a-level") || normalized.includes("s5") || normalized.includes("s6")) return UGANDA_SUBJECTS.a_level;
  return UGANDA_SUBJECTS.primary;
}

export function detectSchoolLevels(classes: any[]): string[] {
  const levels = new Set<string>();
  classes.forEach(c => {
    const lv = c.level?.toLowerCase() || "";
    if (lv.includes("ecd")) levels.add("ecd");
    else if (lv.includes("primary") || lv.match(/^p\d+$/)) levels.add("primary");
    else if (lv === "s1" || lv === "s2" || lv === "s3" || lv === "s4") levels.add("lower_secondary");
    else if (lv === "s5" || lv === "s6") levels.add("a_level");
    else levels.add("primary");
  });
  return Array.from(levels);
}

export async function seedDefaultSubjects(supabase: any, tenantId: string): Promise<void> {
  const { data: existing } = await supabase.from("subjects").select("code").eq("tenant_id", tenantId);
  const existingCodes = new Set((existing || []).map((s: any) => s.code));

  const allSubjects = [
    ...UGANDA_SUBJECTS.ecd, ...UGANDA_SUBJECTS.primary,
    ...UGANDA_SUBJECTS.lower_secondary, ...UGANDA_SUBJECTS.a_level,
  ];

  const toInsert = allSubjects.filter(s => !existingCodes.has(s.code)).map(s => ({
    ...s, tenant_id: tenantId, is_active: true,
  }));

  if (toInsert.length > 0) {
    await supabase.from("subjects").insert(toInsert);
  }
}

export async function seedDefaultClasses(supabase: any, tenantId: string): Promise<void> {
  const { data: t } = await supabase.from("tenants").select("business_type").eq("id", tenantId).single();
  const type = t?.business_type || "";

  let expectedNames: string[] = [];
  let allClasses: { name: string; level: string; grade: string }[] = [];

  if (type === "kindergarten") {
    expectedNames = ["Baby Class", "Middle Class", "Top Class"];
    allClasses = [
      { name: "Baby Class", level: "kindergarten", grade: "Early Childhood" },
      { name: "Middle Class", level: "kindergarten", grade: "Early Childhood" },
      { name: "Top Class", level: "kindergarten", grade: "Early Childhood" },
    ];
  } else if (type === "primary_school") {
    expectedNames = Array.from({ length: 7 }, (_, i) => `P${i + 1}`);
    for (let i = 1; i <= 7; i++) {
      allClasses.push({ name: `P${i}`, level: "primary", grade: "Primary" });
    }
  } else if (type === "secondary_school") {
    expectedNames = Array.from({ length: 6 }, (_, i) => `S${i + 1}`);
    for (let i = 1; i <= 4; i++) {
      allClasses.push({ name: `S${i}`, level: "o-level", grade: "O-Level" });
    }
    for (let i = 5; i <= 6; i++) {
      allClasses.push({ name: `S${i}`, level: "a-level", grade: "A-Level" });
    }
  } else {
    expectedNames = ["Baby Class", "Middle Class", "Top Class",
      ...Array.from({ length: 7 }, (_, i) => `P${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `S${i + 1}`),
    ];
    allClasses.push(
      { name: "Baby Class", level: "kindergarten", grade: "Early Childhood" },
      { name: "Middle Class", level: "kindergarten", grade: "Early Childhood" },
      { name: "Top Class", level: "kindergarten", grade: "Early Childhood" },
    );
    for (let i = 1; i <= 7; i++) {
      allClasses.push({ name: `P${i}`, level: "primary", grade: "Primary" });
    }
    for (let i = 1; i <= 4; i++) {
      allClasses.push({ name: `S${i}`, level: "o-level", grade: "O-Level" });
    }
    for (let i = 5; i <= 6; i++) {
      allClasses.push({ name: `S${i}`, level: "a-level", grade: "A-Level" });
    }
  }

  const { data: existing } = await supabase
    .from("school_classes")
    .select("name")
    .eq("tenant_id", tenantId)
    .in("name", expectedNames);

  const existingNames = new Set((existing || []).map((r: any) => r.name));
  const toInsert = allClasses.filter(c => !existingNames.has(c.name));

  if (toInsert.length > 0) {
    const rows = toInsert.map(c => ({ ...c, tenant_id: tenantId, capacity: 40, is_active: true }));
    await supabase.from("school_classes").insert(rows);
  }
}
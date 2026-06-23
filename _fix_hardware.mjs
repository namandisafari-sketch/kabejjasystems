import { createClient } from "@supabase/supabase-js";
const sb = createClient("https://ljgbjiixeoxxqpejnmjx.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo");

const tenantId = "32b6a1af-cdb9-4aea-864a-523c2406ae92";
const userId = "2cc3ecce-6c22-4113-b112-deee96b9a5e5";

// 1. Fix business_type to 'hardware'
const { error: btErr } = await sb.from("tenants").update({ business_type: "hardware" }).eq("id", tenantId);
console.log("Business type:", btErr ? "ERR " + btErr.message : "OK -> hardware");

// 2. Add 'hardware' to school-only module types
const schoolOnly = ["suppliers", "purchase_orders", "inventory", "assets", "payroll"];
for (const code of schoolOnly) {
  const { data: mod } = await sb.from("business_modules").select("applicable_business_types").eq("code", code).single();
  if (mod && !mod.applicable_business_types.includes("hardware")) {
    await sb.from("business_modules").update({ applicable_business_types: [...mod.applicable_business_types, "hardware"] }).eq("code", code);
    console.log("  + " + code + " now supports hardware");
  }
}

// 3. Re-enable all hardware modules
const modules = ["products","sales","pos","suppliers","purchase_orders","expenses","customers","services","inventory","assets","payroll","reports"];
for (const code of modules) {
  const { error: mErr } = await sb.from("tenant_modules").upsert({
    tenant_id: tenantId, module_code: code, is_enabled: true, enabled_by: userId,
  }, { onConflict: "tenant_id,module_code" });
  if (mErr) console.log("  " + code + ": " + mErr.message);
}
console.log("Done.");

import { createClient } from "@supabase/supabase-js";
const sb = createClient("https://ljgbjiixeoxxqpejnmjx.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo");
const tables = ["rental_applications", "rental_application_links"];
for (const t of tables) {
  const { data, error } = await sb.from(t).select("id").limit(1);
  console.log(t + ":", error ? "ERROR " + error.message : "OK");
}
// also check rental_units columns
const { data: u, error: eu } = await sb.from("rental_units").select("*").limit(1);
if (eu) console.log("rental_units error:", eu.message);
else if (u.length > 0) console.log("rental_units columns:", Object.keys(u[0]).join(", "));
else console.log("rental_units: table exists, empty");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user's tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;

    // Get SchoolPay settings
    const { data: settings } = await supabase
      .from("schoolpay_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "SchoolPay not configured. Please set up your school code and API password first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { date, fromDate, toDate } = body;

    const SCHOOLPAY_BASE = "https://schoolpay.co.ug/paymentapi/AndroidRS";

    // Build MD5 hash
    const identifyingDate = fromDate || date;
    const hashInput = settings.school_code + identifyingDate + settings.api_password;
    const encoder = new TextEncoder();
    const hashData = encoder.encode(hashInput);
    const hashBuffer = await crypto.subtle.digest("MD5", hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const requestHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    let url: string;
    if (fromDate && toDate) {
      url = `${SCHOOLPAY_BASE}/SchoolRangeTransactions/${settings.school_code}/${fromDate}/${toDate}/${requestHash}`;
    } else if (date) {
      url = `${SCHOOLPAY_BASE}/SyncSchoolTransactions/${settings.school_code}/${date}/${requestHash}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Provide 'date' or 'fromDate'+'toDate'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching SchoolPay transactions:", url);
    const spResponse = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    const spData = await spResponse.json();
    console.log("SchoolPay response:", JSON.stringify(spData));

    if (spData.returnCode !== 0) {
      return new Response(
        JSON.stringify({
          error: spData.returnMessage || "SchoolPay API error",
          returnCode: spData.returnCode,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process regular transactions
    const allTransactions = [
      ...(spData.transactions || []).map((t: Record<string, unknown>) => ({
        ...t,
        _type: "SCHOOL_FEES",
      })),
      ...(spData.supplementaryFeePayments || []).map(
        (t: Record<string, unknown>) => ({ ...t, _type: "OTHER_FEES" })
      ),
    ];

    let inserted = 0;
    let skipped = 0;
    let autoReconciled = 0;

    for (const txn of allTransactions) {
      const receiptNumber = txn.schoolpayReceiptNumber;

      // Check if already exists
      const { data: existing } = await supabase
        .from("schoolpay_transactions")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("schoolpay_receipt_number", receiptNumber)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Try to match student
      let matchedStudentId: string | null = null;

      if (txn.studentPaymentCode) {
        const { data: match } = await supabase
          .from("students")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("schoolpay_payment_code", txn.studentPaymentCode)
          .eq("is_active", true)
          .maybeSingle();
        if (match) matchedStudentId = match.id;
      }

      if (!matchedStudentId && txn.studentRegistrationNumber) {
        const { data: match } = await supabase
          .from("students")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("admission_number", txn.studentRegistrationNumber)
          .eq("is_active", true)
          .maybeSingle();
        if (match) matchedStudentId = match.id;
      }

      const amount = parseFloat(txn.amount) || 0;

      const { data: newTxn } = await supabase
        .from("schoolpay_transactions")
        .insert({
          tenant_id: tenantId,
          schoolpay_receipt_number: receiptNumber,
          amount,
          student_name: txn.studentName,
          student_payment_code: txn.studentPaymentCode,
          student_registration_number: txn.studentRegistrationNumber || null,
          student_class: txn.studentClass || null,
          payment_channel: txn.sourcePaymentChannel,
          settlement_bank: txn.settlementBankCode,
          transaction_id: txn.sourceChannelTransactionId,
          payment_date: txn.paymentDateAndTime
            ? new Date(txn.paymentDateAndTime).toISOString()
            : null,
          transaction_type: txn._type,
          supplementary_fee_description: txn.supplementaryFeeDescription || null,
          raw_payload: txn,
          matched_student_id: matchedStudentId,
          reconciliation_status: matchedStudentId ? "matched" : "unmatched",
        })
        .select("id")
        .single();

      inserted++;

      // Auto-reconcile if enabled
      if (matchedStudentId && settings.auto_reconcile && newTxn) {
        const { data: studentFee } = await supabase
          .from("student_fees")
          .select("id, total_amount, amount_paid, balance")
          .eq("tenant_id", tenantId)
          .eq("student_id", matchedStudentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (studentFee) {
          const spReceiptNum = `SP-${receiptNumber}`;
          const { data: fp } = await supabase
            .from("fee_payments")
            .insert({
              tenant_id: tenantId,
              student_id: matchedStudentId,
              student_fee_id: studentFee.id,
              amount,
              payment_method: "schoolpay",
              reference_number: txn.sourceChannelTransactionId || receiptNumber,
              receipt_number: spReceiptNum,
              notes: `SchoolPay sync - ${txn.sourcePaymentChannel || ""} - ${txn.studentName}`,
            })
            .select("id")
            .single();

          if (fp) {
            const newPaid = (studentFee.amount_paid || 0) + amount;
            const newBalance = (studentFee.total_amount || 0) - newPaid;
            await supabase
              .from("student_fees")
              .update({
                amount_paid: newPaid,
                balance: Math.max(0, newBalance),
                status: newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "pending",
              })
              .eq("id", studentFee.id);

            await supabase
              .from("schoolpay_transactions")
              .update({
                fee_payment_id: fp.id,
                reconciliation_status: "reconciled",
                reconciled_at: new Date().toISOString(),
                reconciliation_notes: `Synced & reconciled. Balance: ${newBalance}`,
              })
              .eq("id", newTxn.id);

            autoReconciled++;
          }
        }
      }
    }

    // Update last sync
    await supabase
      .from("schoolpay_settings")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);

    return new Response(
      JSON.stringify({
        success: true,
        total: allTransactions.length,
        inserted,
        skipped,
        autoReconciled,
        message: spData.returnMessage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SchoolPay sync error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

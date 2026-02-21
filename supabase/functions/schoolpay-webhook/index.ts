import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    console.log("SchoolPay webhook received:", JSON.stringify(payload));

    const { signature, type, payment } = payload;

    if (!payment || !payment.schoolpayReceiptNumber) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find tenant by matching studentPaymentCode to a student
    let tenantId: string | null = null;
    let matchedStudentId: string | null = null;

    // Try matching by schoolpay_payment_code first
    if (payment.studentPaymentCode) {
      const { data: studentMatch } = await supabase
        .from("students")
        .select("id, tenant_id")
        .eq("schoolpay_payment_code", payment.studentPaymentCode)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (studentMatch) {
        tenantId = studentMatch.tenant_id;
        matchedStudentId = studentMatch.id;
      }
    }

    // Fallback: try matching by admission_number (studentRegistrationNumber)
    if (!matchedStudentId && payment.studentRegistrationNumber) {
      const { data: studentMatch } = await supabase
        .from("students")
        .select("id, tenant_id")
        .eq("admission_number", payment.studentRegistrationNumber)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (studentMatch) {
        tenantId = studentMatch.tenant_id;
        matchedStudentId = studentMatch.id;
      }
    }

    // If still no tenant, try to find by school settings matching
    if (!tenantId) {
      // We can't process without a tenant, but still log it
      console.log("Could not match student to tenant, logging as unmatched");
    }

    // Verify signature if we have a tenant
    let signatureValid = false;
    if (tenantId && signature) {
      const { data: settings } = await supabase
        .from("schoolpay_settings")
        .select("api_password")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (settings?.api_password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(
          settings.api_password + payment.schoolpayReceiptNumber
        );
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const expectedSig = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        signatureValid = expectedSig === signature;
        if (!signatureValid) {
          console.warn("SchoolPay signature mismatch! Expected:", expectedSig, "Got:", signature);
        }
      }
    }

    // Insert transaction record
    const amount = parseFloat(payment.amount) || 0;
    const transactionData: Record<string, unknown> = {
      tenant_id: tenantId,
      schoolpay_receipt_number: payment.schoolpayReceiptNumber,
      amount,
      student_name: payment.studentName,
      student_payment_code: payment.studentPaymentCode,
      student_registration_number: payment.studentRegistrationNumber || null,
      student_class: payment.studentClass || null,
      payment_channel: payment.sourcePaymentChannel,
      settlement_bank: payment.settlementBankCode,
      transaction_id: payment.sourceChannelTransactionId,
      payment_date: payment.paymentDateAndTime
        ? new Date(payment.paymentDateAndTime).toISOString()
        : new Date().toISOString(),
      transaction_type: type || "SCHOOL_FEES",
      supplementary_fee_description:
        type === "OTHER_FEES" ? payment.supplementaryFeeDescription : null,
      raw_payload: payload,
      matched_student_id: matchedStudentId,
      reconciliation_status: matchedStudentId ? "matched" : "unmatched",
    };

    // Only insert if we have a tenant
    if (!tenantId) {
      console.error("No tenant found for SchoolPay payment:", payment.studentPaymentCode);
      return new Response(JSON.stringify({ error: "No matching school found" }), {
        status: 200, // Return 200 so SchoolPay doesn't retry
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: txn, error: txnError } = await supabase
      .from("schoolpay_transactions")
      .upsert(transactionData, {
        onConflict: "tenant_id,schoolpay_receipt_number",
      })
      .select()
      .single();

    if (txnError) {
      console.error("Error inserting transaction:", txnError);
      return new Response(JSON.stringify({ error: txnError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-reconcile: create fee_payment and update student_fees
    if (matchedStudentId && amount > 0) {
      const { data: spSettings } = await supabase
        .from("schoolpay_settings")
        .select("auto_reconcile")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (spSettings?.auto_reconcile !== false) {
        // Find the student's current fee record
        const { data: studentFee } = await supabase
          .from("student_fees")
          .select("id, total_amount, amount_paid, balance, status")
          .eq("tenant_id", tenantId)
          .eq("student_id", matchedStudentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (studentFee) {
          // Create fee payment record
          const receiptNumber = `SP-${payment.schoolpayReceiptNumber}`;
          const { data: feePayment, error: fpError } = await supabase
            .from("fee_payments")
            .insert({
              tenant_id: tenantId,
              student_id: matchedStudentId,
              student_fee_id: studentFee.id,
              amount,
              payment_method: "schoolpay",
              reference_number: payment.sourceChannelTransactionId || payment.schoolpayReceiptNumber,
              receipt_number: receiptNumber,
              notes: `SchoolPay ${payment.sourcePaymentChannel || ""} - ${payment.studentName}`,
            })
            .select("id")
            .single();

          if (!fpError && feePayment) {
            // Update student fee balance
            const newAmountPaid = (studentFee.amount_paid || 0) + amount;
            const newBalance = (studentFee.total_amount || 0) - newAmountPaid;
            const newStatus =
              newBalance <= 0 ? "paid" : newAmountPaid > 0 ? "partial" : "pending";

            await supabase
              .from("student_fees")
              .update({
                amount_paid: newAmountPaid,
                balance: Math.max(0, newBalance),
                status: newStatus,
              })
              .eq("id", studentFee.id);

            // Update transaction with reconciliation info
            await supabase
              .from("schoolpay_transactions")
              .update({
                fee_payment_id: feePayment.id,
                reconciliation_status: "reconciled",
                reconciled_at: new Date().toISOString(),
                reconciliation_notes: `Auto-reconciled. Balance: ${newBalance}`,
              })
              .eq("id", txn.id);

            console.log(
              `Auto-reconciled: Student ${payment.studentName}, Amount: ${amount}, New Balance: ${newBalance}`
            );
          }
        } else {
          // No fee record found - mark as needs_attention
          await supabase
            .from("schoolpay_transactions")
            .update({
              reconciliation_status: "needs_attention",
              reconciliation_notes: "Student matched but no fee record found",
            })
            .eq("id", txn.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SchoolPay webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

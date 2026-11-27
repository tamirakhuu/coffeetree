import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const QPAY_BASE_URL = Deno.env.get("QPAY_BASE_URL") || "https://merchant-sandbox.qpay.mn";
const QPAY_CLIENT_ID = Deno.env.get("QPAY_CLIENT_ID") || "";
const QPAY_CLIENT_SECRET = Deno.env.get("QPAY_CLIENT_SECRET") || "";
const DEMO_MODE = !QPAY_CLIENT_ID || !QPAY_CLIENT_SECRET;
const CONFIG_ERROR = !DEMO_MODE && !Deno.env.get("QPAY_BASE_URL")
  ? "QPAY_CLIENT_ID/SECRET тохируулсан ч QPAY_BASE_URL тохируулаагүй байна. Sandbox руу чимээгүй унахаас сэргийлж энд зогсоов — жинхэнэ мерчант хаягаа (QPAY_BASE_URL) тодорхой тохируулна уу."
  : "";
const DEMO_AUTO_PAY_MS = 15000;
const TRAINING_FEE = 50000; // qpay-create-invoice доторх утгатай ижил байх ёстой

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getQpayToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const basic = btoa(`${QPAY_CLIENT_ID}:${QPAY_CLIENT_SECRET}`);
  const res = await fetch(`${QPAY_BASE_URL}/v2/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`QPay auth амжилтгүй (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const expiresInSec = Number(json.expires_in) || 3600;
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (expiresInSec - 60) * 1000 };
  return cachedToken.token;
}

async function markPaid(admin: ReturnType<typeof createClient>, isTraining: boolean, orderNumber: string, registrationId: number) {
  if (isTraining) {
    await admin.from("training_registrations").update({ payment_status: "paid" }).eq("id", registrationId);
  } else {
    await admin.from("orders").update({ payment_status: "paid" }).eq("order_number", orderNumber);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (CONFIG_ERROR) {
    return new Response(JSON.stringify({ error: CONFIG_ERROR }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const { invoiceId, orderNumber, registrationId, kind } = await req.json();
    const isTraining = kind === "training";
    if (!invoiceId || (isTraining ? !registrationId : !orderNumber)) {
      return new Response(JSON.stringify({ error: "invoiceId болон orderNumber/registrationId заавал шаардлагатай." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // АЮУЛГҮЙ БАЙДАЛ: Хөтчөөс ирсэн invoiceId-д итгэхгүй. Тухайн захиалга/бүртгэлд
    // өгөгдлийн санд хадгалагдсан invoice-ийг л шалгана. Эс бөгөөс өөр (хямд)
    // төлөгдсөн invoice-ийн дугаараар үнэтэй захиалгыг "төлөгдсөн" болгож болно.
    const { data: record, error: recErr } = isTraining
      ? await admin.from("training_registrations").select("qpay_invoice_id").eq("id", registrationId).single()
      : await admin.from("orders").select("qpay_invoice_id, subtotal, delivery_fee").eq("order_number", orderNumber).single();
    if (recErr || !record || !record.qpay_invoice_id || record.qpay_invoice_id !== String(invoiceId)) {
      return new Response(JSON.stringify({ error: "Нэхэмжлэл энэ захиалгад хамаарахгүй байна." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const expectedAmount = isTraining
      ? TRAINING_FEE
      : Number(record.subtotal || 0) + Number(record.delivery_fee || 0);

    if (String(invoiceId).startsWith("DEMO-")) {
      const createdAt = Number(String(invoiceId).split("-")[1] || 0);
      const paid = DEMO_MODE && createdAt > 0 && Date.now() - createdAt >= DEMO_AUTO_PAY_MS;
      if (paid) await markPaid(admin, isTraining, orderNumber, registrationId);
      return new Response(JSON.stringify({ paid, paidAmount: paid ? undefined : 0, demo: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getQpayToken();
    const checkRes = await fetch(`${QPAY_BASE_URL}/v2/payment/check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
    });
    if (!checkRes.ok) throw new Error(`QPay payment/check амжилтгүй (${checkRes.status}): ${await checkRes.text()}`);
    const check = await checkRes.json();
    const rows = check.rows || [];
    // Төлсөн дүн захиалгын дүнгээс бага бол төлөгдсөнд тооцохгүй.
    const paid = Number(check.paid_amount || 0) >= expectedAmount &&
      rows.some((r: { payment_status?: string }) => r.payment_status === "PAID");
    if (paid) await markPaid(admin, isTraining, orderNumber, registrationId);

    return new Response(JSON.stringify({ paid, paidAmount: check.paid_amount || 0, demo: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Захиалгад зориулж QPay нэхэмжлэл (invoice) үүсгэдэг Edge Function.
// QPAY_CLIENT_ID / QPAY_CLIENT_SECRET / QPAY_INVOICE_CODE нууц (secret)
// тохируулаагүй үед (жишээ нь QPay-ийн жинхэнэ merchant эрх авахаас өмнө)
// ФРОНТ ТАЛЫГ бүтнээр нь турших боломжтой байлгахын тулд "demo" горимоор
// хуурамч QR буцаана — invoiceId "DEMO-" -ээр эхэлж, qpay-check-payment
// үүнийг таньж 15 секундийн дараа автоматаар "төлөгдсөн" гэж үзнэ.
//
// Deploy: npx supabase functions deploy qpay-create-invoice --project-ref vbgqgwfcklkfecvocsyt
// Secrets (жинхэнэ горимд шилжихэд):
//   npx supabase secrets set QPAY_CLIENT_ID=... QPAY_CLIENT_SECRET=... QPAY_INVOICE_CODE=...
//   QPAY_BASE_URL нь заавал биш, өгөөгүй бол sandbox хаяг ашиглана.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const QPAY_BASE_URL = Deno.env.get("QPAY_BASE_URL") || "https://merchant-sandbox.qpay.mn";
const QPAY_CLIENT_ID = Deno.env.get("QPAY_CLIENT_ID") || "";
const QPAY_CLIENT_SECRET = Deno.env.get("QPAY_CLIENT_SECRET") || "";
const QPAY_INVOICE_CODE = Deno.env.get("QPAY_INVOICE_CODE") || "";
const DEMO_MODE = !QPAY_CLIENT_ID || !QPAY_CLIENT_SECRET || !QPAY_INVOICE_CODE;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 1x1 цагаан PNG — demo горимд бодит банкны QR байхгүй тул placeholder зураг
const DEMO_QR_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function getQpayToken(): Promise<string> {
  const basic = btoa(`${QPAY_CLIENT_ID}:${QPAY_CLIENT_SECRET}`);
  const res = await fetch(`${QPAY_BASE_URL}/v2/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`QPay auth амжилтгүй (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { orderNumber, description } = await req.json();
    if (!orderNumber) {
      return new Response(JSON.stringify({ error: "orderNumber заавал шаардлагатай." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Төлбөрийн дүнг клиентээс биш, захиалгын бодит бичлэгээс сервер өөрөө
    // уншина — эс тэгвэл client талын amount утгыг өөрчилж жинхэнэ үнээс
    // бага дүнгээр нэхэмжлэл үүсгэх боломжтой болно
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("subtotal, delivery_fee")
      .eq("order_number", orderNumber)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Захиалга олдсонгүй." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amount = Number(order.subtotal || 0) + Number(order.delivery_fee || 0);

    let result: { invoiceId: string; qrText: string; qrImage: string; urls: unknown[]; demo: boolean };

    if (DEMO_MODE) {
      result = {
        invoiceId: `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        qrText: `DEMO-QPAY-${orderNumber}`,
        qrImage: DEMO_QR_PNG_BASE64,
        urls: [],
        demo: true,
      };
    } else {
      const token = await getQpayToken();
      const invRes = await fetch(`${QPAY_BASE_URL}/v2/invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_code: QPAY_INVOICE_CODE,
          sender_invoice_no: orderNumber,
          invoice_receiver_code: "terminal",
          invoice_description: description || `CUPPA захиалга ${orderNumber}`,
          amount,
          callback_url: `${SUPABASE_URL}/functions/v1/qpay-check-payment`,
        }),
      });
      if (!invRes.ok) throw new Error(`QPay invoice амжилтгүй (${invRes.status}): ${await invRes.text()}`);
      const inv = await invRes.json();
      result = {
        invoiceId: inv.invoice_id,
        qrText: inv.qr_text,
        qrImage: inv.qr_image,
        urls: inv.urls || [],
        demo: false,
      };
    }

    // Захиалгын мөрөнд invoice_id-г хадгалж, дараа нь payment_status шалгах/
    // холбоход ашиглана (client талд qpay_invoice_id-г шууд бичих эрхгүй тул
    // энд service_role-оор бичнэ)
    await admin.from("orders").update({ qpay_invoice_id: result.invoiceId }).eq("order_number", orderNumber);

    return new Response(JSON.stringify(result), {
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

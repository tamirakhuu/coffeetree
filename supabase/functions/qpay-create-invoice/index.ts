import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const QPAY_BASE_URL = Deno.env.get("QPAY_BASE_URL") || "https://merchant-sandbox.qpay.mn";
const QPAY_CLIENT_ID = Deno.env.get("QPAY_CLIENT_ID") || "";
const QPAY_CLIENT_SECRET = Deno.env.get("QPAY_CLIENT_SECRET") || "";
const QPAY_INVOICE_CODE = Deno.env.get("QPAY_INVOICE_CODE") || "";
const DEMO_MODE = !QPAY_CLIENT_ID || !QPAY_CLIENT_SECRET || !QPAY_INVOICE_CODE;
const CONFIG_ERROR = !DEMO_MODE && !Deno.env.get("QPAY_BASE_URL")
  ? "QPAY_CLIENT_ID/SECRET/INVOICE_CODE тохируулсан ч QPAY_BASE_URL тохируулаагүй байна. Sandbox руу чимээгүй унахаас сэргийлж энд зогсоов — жинхэнэ мерчант хаягаа (QPAY_BASE_URL) тодорхой тохируулна уу."
  : "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_QR_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

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

const TRAINING_FEE = 50000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (CONFIG_ERROR) {
    return new Response(JSON.stringify({ error: CONFIG_ERROR }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const { orderNumber, registrationId, description, kind } = await req.json();
    const isTraining = kind === "training";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let amount: number;
    let senderInvoiceNo: string;

    if (isTraining) {
      if (!registrationId) {
        return new Response(JSON.stringify({ error: "registrationId заавал шаардлагатай." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: reg, error: regErr } = await admin
        .from("training_registrations")
        .select("id")
        .eq("id", registrationId)
        .single();
      if (regErr || !reg) {
        return new Response(JSON.stringify({ error: "Бүртгэл олдсонгүй." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amount = TRAINING_FEE;
      senderInvoiceNo = `training-${registrationId}`;
    } else {
      if (!orderNumber) {
        return new Response(JSON.stringify({ error: "orderNumber заавал шаардлагатай." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      amount = Number(order.subtotal || 0) + Number(order.delivery_fee || 0);
      senderInvoiceNo = orderNumber;
    }

    let result: { invoiceId: string; qrText: string; qrImage: string; urls: unknown[]; demo: boolean };

    if (DEMO_MODE) {
      result = {
        invoiceId: `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        qrText: `DEMO-QPAY-${senderInvoiceNo}`,
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
          sender_invoice_no: senderInvoiceNo,
          invoice_receiver_code: "terminal",
          invoice_description: description || (isTraining ? `CUPPA сургалт ${senderInvoiceNo}` : `CUPPA захиалга ${senderInvoiceNo}`),
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

    if (isTraining) {
      await admin.from("training_registrations").update({ qpay_invoice_id: result.invoiceId }).eq("id", registrationId);
    } else {
      await admin.from("orders").update({ qpay_invoice_id: result.invoiceId }).eq("order_number", orderNumber);
    }

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

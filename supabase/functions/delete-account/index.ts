// Хэрэглэгч өөрийн бүртгэлээ устгах Edge Function.
// Дуудагч (Authorization header дэх JWT) хэн болохыг шалгаад, ЗӨВХӨН тэр
// хэрэглэгчийн бүртгэлийг л service_role эрхээр устгана.
//
// Deploy: npx supabase functions deploy delete-account --project-ref vbgqgwfcklkfecvocsyt
// (--no-verify-jwt ХЭРЭГГҮЙ — JWT-г заавал шалгуулна, эс тэгвэл хэн ч хэн нэгний
// бүртгэлийг устгах боломжтой болно.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Browser-ээс дуудахад CORS preflight (OPTIONS) хүсэлт эхлээд ирдэг.
// Эдгээр header-үүд байхгүй бол browser хүсэлтийг блоклоод "Failed to send
// a request to the Edge Function" гэсэн алдаа client талд гардаг.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Нэвтрээгүй байна." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Дуудагчийн session-оор нь хэн болохыг шалгана (anon key + caller-ийн JWT)
    const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Хэрэглэгч баталгаажсангүй." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Зөвхөн service_role эрхтэй client-ээр л хэрэглэгч устгах боломжтой
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: delErr } = await adminClient.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

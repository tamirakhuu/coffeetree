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

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Нэвтрээгүй байна." }), { status: 401 });
    }

    // Дуудагчийн session-оор нь хэн болохыг шалгана (anon key + caller-ийн JWT)
    const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Хэрэглэгч баталгаажсангүй." }), { status: 401 });
    }

    // Зөвхөн service_role эрхтэй client-ээр л хэрэглэгч устгах боломжтой
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: delErr } = await adminClient.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

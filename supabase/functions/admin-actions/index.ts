// Supabase Edge Function: admin-actions
// 이 함수 안에서만 service_role 키를 사용합니다 (프론트엔드에는 절대 노출되지 않음).
// 호출할 때마다 "요청을 보낸 사람이 실제로 관리자인지"를 먼저 검증합니다.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const RESET_PASSWORD = "123456"; // 관리자가 초기화하면 항상 이 값으로 설정됩니다

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[admin-actions] 요청 수신");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[admin-actions] Authorization 헤더 없음");
      return json({ error: "인증 토큰이 없습니다." }, 401);
    }
    const jwt = authHeader.replace("Bearer ", "");

    console.log("[admin-actions] SUPABASE_URL 존재:", !!SUPABASE_URL);
    console.log("[admin-actions] ANON_KEY 존재:", !!ANON_KEY);
    console.log("[admin-actions] SERVICE_ROLE_KEY 존재:", !!SERVICE_ROLE_KEY);

    // 1) 호출자 신원 확인 (anon key + 호출자 JWT)
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      console.log("[admin-actions] 호출자 인증 실패:", userError?.message);
      return json({ error: "인증에 실패했습니다." }, 401);
    }
    const callerId = userData.user.id;
    console.log("[admin-actions] 호출자 확인됨:", callerId);

    // 2) service_role 클라이언트 (RLS 우회 - 여기서만 사용)
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 3) 호출자가 실제로 관리자인지 재검증
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", callerId)
      .maybeSingle();

    console.log("[admin-actions] 관리자 프로필 조회:", JSON.stringify(callerProfile), profileError?.message);

    if (profileError || !callerProfile || !callerProfile.is_admin) {
      console.log("[admin-actions] 관리자 아님 - 거부");
      return json({ error: "관리자만 사용할 수 있는 기능이에요." }, 403);
    }

    const body = await req.json();
    const { action, targetUserId } = body || {};
    console.log("[admin-actions] 요청 내용:", action, targetUserId);

    if (!action || !targetUserId) {
      return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
    }

    if (action === "reset-password") {
      const { data: resetData, error } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        { password: RESET_PASSWORD }
      );
      console.log("[admin-actions] 비밀번호 초기화 결과:", JSON.stringify(resetData?.user?.id), error?.message);
      if (error) return json({ error: error.message }, 400);

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", targetUserId);
      console.log("[admin-actions] must_change_password 업데이트 에러:", profileUpdateError?.message);

      return json({ tempPassword: RESET_PASSWORD });
    }

    if (action === "delete-user") {
      const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
      console.log("[admin-actions] 사용자 삭제 결과 에러:", error?.message);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "알 수 없는 작업입니다." }, 400);
  } catch (e) {
    console.log("[admin-actions] 예외 발생:", String(e));
    return json({ error: String(e) }, 500);
  }
});

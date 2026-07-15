import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// .env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없으면
// supabase는 null이 되고, 앱은 "설정이 필요합니다" 화면을 보여줍니다.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

-- profiles 테이블의 자기참조 RLS 정책을 재귀 없는 방식으로 교체합니다.
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.

drop policy if exists "profiles_select_own_or_admin" on profiles;

-- 재귀 없이 관리자 여부만 확인하는 함수 (security definer로 RLS를 우회해서 조회)
create or replace function is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create policy "profiles_select_own_or_admin"
  on profiles for select
  using (
    auth.uid() = id
    or is_admin_user()
  );

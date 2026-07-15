-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.
-- (아직 한 번도 실행한 적이 없다면 이 파일 그대로 실행하면 됩니다)

-- 1) 프로필 테이블 (로그인 유저 1명당 1개 행)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  phone text,
  email text,
  is_admin boolean default false,
  birth date,
  sijin text,
  gender text,
  mbti text,
  blood text,
  custom_foods jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

-- 본인 프로필은 항상 조회 가능 + 관리자(is_admin=true)는 전체 프로필 조회 가능
create policy "profiles_select_own_or_admin"
  on profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- 2) 하루 결과 테이블 (로또/메뉴/운세 - 유저별 x 날짜별로 1행)
create table if not exists daily_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  lotto_result jsonb,
  food_results jsonb,
  fortune_result jsonb,
  updated_at timestamptz default now(),
  unique (user_id, date)
);

alter table daily_results enable row level security;

create policy "daily_results_select_own"
  on daily_results for select
  using (auth.uid() = user_id);

create policy "daily_results_insert_own"
  on daily_results for insert
  with check (auth.uid() = user_id);

create policy "daily_results_update_own"
  on daily_results for update
  using (auth.uid() = user_id);

-- 3) 관리자 지정 방법 (SQL 실행 후, 회원가입을 한 번 한 다음 아래처럼 본인 계정을 관리자로 지정하세요)
-- update profiles set is_admin = true where email = '본인이메일@example.com';

-- 이미 배포한 적이 있다면 이 파일을 SQL Editor에서 한 번만 실행하세요.
alter table profiles add column if not exists must_change_password boolean default false;

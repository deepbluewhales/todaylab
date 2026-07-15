# TodayLab

로또생성기 · 오늘 뭐 먹지 · 오늘의 운세 · 결정의 순간

Supabase 이메일/비밀번호 로그인이 붙어있어서, 로그인하면 어떤 기기에서 접속해도 같은 프로필/오늘의 결과가 이어져 보입니다. 관리자 계정으로 로그인하면 고객 목록 조회 + 비밀번호 재설정 메일 발송이 가능한 간단한 관리자 페이지도 있습니다.

## 1. Supabase 프로젝트 준비
1. https://supabase.com 에서 무료로 프로젝트 생성
2. 프로젝트 대시보드 → **SQL Editor** → 이 저장소의 `supabase-schema.sql` 내용 전체를 붙여넣고 실행

## 2. 이메일 인증 끄기 (필수)
가입 즉시 로그인되게 하려면 이메일 인증을 꺼야 합니다.
- Supabase 대시보드 → **Authentication → Providers → Email**
- **"Confirm email"** 옵션을 **꺼주세요 (OFF)**

이 설정을 안 하면, 회원가입 후 이메일 인증 전까지는 로그인이 안 되고 프로필도 생성되지 않습니다.

## 3. 환경 변수 설정
프로젝트 대시보드 → **Settings → API** 에서 `Project URL`과 `anon public` 키를 복사한 뒤:

```
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxx
```

## 4. 로컬 실행 / 빌드
```
npm install
npm run dev      # 로컬 확인
npm run build    # 배포용 빌드 (dist 폴더 생성)
```

Vercel에 배포할 때는 **Vercel 프로젝트 Settings → Environment Variables**에도 위 두 값을 반드시 등록해야 합니다.

## 5. 내 계정을 관리자로 지정하기
1. 앱에서 이메일/비밀번호로 **회원가입을 1번 진행**
2. Supabase 대시보드 → **Table Editor → profiles** 테이블에서 방금 가입한 행을 찾기
3. `is_admin` 컬럼 값을 `true`로 변경 (체크박스 클릭 또는 SQL Editor에서 아래 실행)
   ```sql
   update profiles set is_admin = true where email = '본인이메일@example.com';
   ```
4. 앱을 새로고침하면 헤더에 **"관리자"** 버튼이 나타납니다

## 관리자 페이지 기능
- 가입한 고객 목록 (이름/연락처/이메일/MBTI·혈액형/온보딩 완료 여부)
- 이름/이메일로 검색
- 고객별 **"비밀번호 재설정 메일 보내기"** 버튼 → 해당 고객 이메일로 재설정 링크 발송

### 보안 관련 참고
관리자 페이지는 Supabase의 **service_role(관리자) 키를 절대 사용하지 않고** 구현했습니다. service_role 키는 프론트엔드 코드에 절대 넣으면 안 되는 키라서(브라우저에 노출되면 DB 전체가 뚫립니다), 대신:
- 고객 목록 조회는 `profiles` 테이블의 RLS 정책으로 "관리자만 전체 조회 가능"하게 안전하게 제한
- 비밀번호 재설정은 Supabase의 표준 "재설정 메일 보내기" 기능을 사용 (관리자 권한 불필요, 안전)

## 비밀번호를 잊은 사용자 본인이 직접 재설정하려면
로그인 화면 하단의 **"비밀번호를 잊으셨나요?"** 링크로 본인이 직접 재설정 메일을 요청할 수도 있습니다.

## 관리자 기능 (임시 비밀번호 발급 / 사용자 삭제) 배포하기

이 두 기능은 보안상 Supabase **Edge Function**을 통해서만 동작해요 (service_role 키를 브라우저에 노출시키지 않기 위함). 처음 한 번만 아래 절차로 배포하면 됩니다.

### 1. DB 마이그레이션
이미 배포한 적이 있다면, `add-must-change-password.sql` 파일 내용을 Supabase SQL Editor에서 한 번 실행하세요.

### 2. Supabase CLI 설치
```
npm install -g supabase
```

### 3. 로그인 & 프로젝트 연결
```
supabase login
supabase link --project-ref 프로젝트참조ID
```
(프로젝트참조ID는 Supabase 대시보드 URL이나 Settings → General에서 확인 가능해요, 예: `abcdefghijk`)

### 4. Edge Function 배포
프로젝트 루트(이 README가 있는 폴더)에서:
```
supabase functions deploy admin-actions
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase가 Edge Function 실행 환경에 **자동으로 제공**하므로 따로 설정할 필요 없어요.

### 5. 완료
배포가 끝나면 관리자 페이지의 "임시 비밀번호 발급" / "사용자 삭제" 버튼이 정상 동작해요.

## 변경된 로그인 플로우
- 관리자가 "임시 비밀번호 발급"을 누르면 화면에 임시 비밀번호가 표시돼요 (다시 볼 수 없으니 그 자리에서 사용자에게 전달해주세요 - 카카오톡/문자 등으로)
- 해당 사용자가 그 임시 비밀번호로 로그인하면, 앱을 쓰기 전에 **"비밀번호 변경이 필요해요"** 화면이 먼저 뜨고, 새 비밀번호로 바꿔야 넘어갈 수 있어요

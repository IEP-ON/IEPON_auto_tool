# 나이스 월별계획 자동입력 Chrome 확장 프로그램

## 🔒 개인정보 처리 안내

이 확장 프로그램은 교사의 개별화교육계획(IEP) 업무를 돕는 **입력 보조 도구**입니다.

- 학생 정보, 평가 내용 등은 **사용자의 브라우저(로컬)** 안에서만 처리됩니다.
- 확장 프로그램은 입력 편의를 위해 나이스(NEIS) 페이지의 텍스트 필드에 내용을 채워 넣을 뿐,
  **어떠한 학생 개인정보도 외부 서버로 전송하거나 수집하지 않습니다.**
- 설정값(웹사이트 URL, 속도, 모드 등)은 브라우저의 `storage` 영역에만 저장되며, 개발자나 제3자가 볼 수 없습니다.

나이스 시스템 및 관련 규정을 준수하는 범위에서, 반복적인 입력 업무를 줄여 교사가 교육 활동에 더 집중할 수 있도록 돕는 것을 목표로 합니다.

## 📚 개요

개별화교육계획 월별 데이터를 나이스 시스템에 자동으로 입력하는 Chrome 확장 프로그램입니다.

## 🎯 주요 기능

- ✅ **웹사이트 연동**: Next.js + Supabase 웹사이트에서 데이터 자동 가져오기
- ✅ **수동 입력**: 직접 데이터 입력
- ✅ **JSON 지원**: JSON 형식 데이터 붙여넣기
- ✅ **일괄 처리**: 여러 월 데이터 한번에 입력
- ✅ **진행 상황**: 실시간 진행률 표시
- ✅ **에러 처리**: 안전한 오류 처리 및 로깅

## 🚀 설치 방법

### 1. 확장 프로그램 로드

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 우측 상단 **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. `nice-auto-filler` 폴더 선택

### 2. 아이콘 생성 (필수)

확장 프로그램이 작동하려면 아이콘 파일이 필요합니다:

```bash
cd nice-auto-filler
mkdir -p icons
```

아이콘 파일을 `icons/` 폴더에 추가:
- `icon-16.png` (16x16)
- `icon-32.png` (32x32)
- `icon-48.png` (48x48)
- `icon-128.png` (128x128)

**임시 아이콘 생성** (테스트용):
- 온라인 아이콘 생성기 사용: https://favicon.io/
- 또는 기존 이미지를 리사이즈

## 📖 사용 방법

### 기본 사용

1. **나이스 시스템 접속**
   - https://dge.neis.go.kr 로그인
   - 개별화교육계획 > 월별 관리 페이지 이동

2. **확장 프로그램 실행**
   - Chrome 우측 상단 확장 아이콘 클릭
   - 또는 단축키: `Ctrl+Shift+E` (설정 가능)

3. **웹사이트 연동 설정**
   ```
   웹사이트 URL: https://your-site.vercel.app
   API 키: (선택사항) Supabase API Key
   ```
   - **설정 저장** 클릭

4. **데이터 입력**
   - **방법 1**: 웹사이트에서 가져오기
     - 학생 선택
     - 학년도/학기 선택
     - **데이터 가져오기** 클릭
   
   - **방법 2**: 수동 입력
     - 월, 교육목표, 교육내용, 교육방법, 평가계획 입력
     - **데이터 추가** 클릭
   
   - **방법 3**: JSON 붙여넣기
     - JSON 데이터 입력
     - **JSON 파싱** 클릭

5. **자동 입력 실행**
   - 미리보기에서 데이터 확인
   - **🚀 자동 입력 시작** 클릭
   - 진행 상황 확인

## 🔧 웹사이트 API 연동

### Next.js API 라우트 예시

#### 1. 학생 목록 API

```typescript
// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get('year');
  const semester = searchParams.get('semester');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('year', year)
    .eq('semester', semester);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

#### 2. 월별 계획 API

```typescript
// app/api/monthly-plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { studentId, year, semester } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('monthly_plans')
    .select('*')
    .eq('student_id', studentId)
    .eq('year', year)
    .eq('semester', semester)
    .order('month', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 나이스 형식으로 변환
  const plans = data.map(plan => ({
    month: plan.month.toString(),
    goal: plan.education_goal,
    content: plan.education_content,
    method: plan.education_method,
    evaluation: plan.evaluation_plan
  }));

  return NextResponse.json(plans);
}
```

#### 3. Health Check API

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}
```

### Supabase 테이블 스키마

```sql
-- 학생 테이블
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 월별 계획 테이블
CREATE TABLE monthly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  month INTEGER NOT NULL,
  education_goal TEXT,
  education_content TEXT,
  education_method TEXT,
  evaluation_plan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_students_year_semester ON students(year, semester);
CREATE INDEX idx_monthly_plans_student ON monthly_plans(student_id);
```

## 📋 JSON 데이터 형식

```json
[
  {
    "month": "3",
    "goal": "학생의 의사소통 능력을 향상시킨다.",
    "content": "그림카드를 활용한 의사표현 연습\n일상생활 상황에서의 대화 연습",
    "method": "1:1 개별지도\n반복 학습\n긍정적 피드백 제공",
    "evaluation": "의사표현 성공률 80% 이상\n자발적 의사표현 횟수 증가"
  },
  {
    "month": "4",
    "goal": "사회성 기술을 습득한다.",
    "content": "또래와의 상호작용 연습\n차례 지키기 활동",
    "method": "소그룹 활동\n역할극\n사회적 이야기 활용",
    "evaluation": "또래와의 긍정적 상호작용 빈도 측정\n차례 지키기 성공률"
  }
]
```

## 🔒 보안 고려사항

### API 키 보호

```javascript
// ❌ 나쁜 예: API 키 노출
const apiKey = "your-secret-key-here";

// ✅ 좋은 예: 환경 변수 사용
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

### CORS 설정

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'chrome-extension://*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

## 🐛 문제 해결

### 확장 프로그램이 작동하지 않음

1. **개발자 도구 확인**
   - `F12` 키 → Console 탭
   - 오류 메시지 확인

2. **Content Script 로드 확인**
   - Console에 `[나이스 자동입력]` 메시지 확인
   - 없으면 페이지 새로고침

3. **권한 확인**
   - `chrome://extensions/` → 확장 프로그램 상세정보
   - 사이트 액세스 권한 확인

### 데이터가 입력되지 않음

1. **나이스 페이지 확인**
   - 월별 개별화교육계획 페이지인지 확인
   - 학생이 선택되어 있는지 확인

2. **CPR 프레임워크 로드 확인**
   - Console에서 `typeof cpr` 입력
   - `undefined`가 아니어야 함

3. **로그 확인**
   - 확장 프로그램 팝업 → 실행 로그 확인

### 웹사이트 연결 실패

1. **URL 확인**
   - `https://` 포함 여부
   - 슬래시(`/`) 없이 입력

2. **API 엔드포인트 확인**
   - `/api/health` 경로 존재 여부
   - CORS 설정 확인

3. **네트워크 탭 확인**
   - F12 → Network 탭
   - API 요청 상태 코드 확인

## 💻 다른 컴퓨터에서 개발 이어가기

### 방법 1: Git/GitHub (권장)

```bash
# 현재 컴퓨터에서 Git 저장소 초기화
cd c:\Users\user\Downloads\nice-auto-filler\nice-auto-filler
git init
git add .
git commit -m "Initial commit"

# GitHub에 푸시
git remote add origin https://github.com/your-username/nice-auto-filler.git
git push -u origin main

# 다른 컴퓨터에서 클론
git clone https://github.com/your-username/nice-auto-filler.git
cd nice-auto-filler

# Chrome에서 로드
# 1. chrome://extensions/ 접속
# 2. 개발자 모드 활성화
# 3. "압축해제된 확장 프로그램을 로드합니다" 클릭
# 4. 클론한 폴더 선택

# 수정 후 커밋
git add .
git commit -m "Update features"
git push
```

### 방법 2: 클라우드 동기화 (Dropbox, Google Drive 등)

```bash
# 확장 프로그램 폴더를 클라우드 폴더로 이동
# 예: c:\Users\user\Dropbox\nice-auto-filler

# 맥북이나 다른 컴퓨터에서
# 1. 클라우드 폴더 동기화 완료 대기
# 2. Chrome에서 해당 폴더 로드
```

### 방법 3: ZIP 파일로 이동

```bash
# 현재 컴퓨터에서 압축
cd c:\Users\user\Downloads\nice-auto-filler
tar -czf nice-auto-filler.zip nice-auto-filler/

# USB나 이메일로 전송
# 다른 컴퓨터에서 압축 해제 후 Chrome에 로드
```

### 개발 환경 설정

```bash
# 필요한 도구
- Chrome 브라우저
- 텍스트 에디터 (VS Code 권장)
- Git (버전 관리용)

# VS Code 확장 프로그램 (권장)
- ESLint
- Prettier
- Chrome Extension Kit
```

### .gitignore 파일 (Git 사용 시)

```gitignore
# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/

# Temp
*.log
*.tmp
node_modules/

# Chrome Extension
*.crx
*.pem
```

## 📝 개발 가이드

### 디버깅

```javascript
// Content Script 디버깅
console.log('[DEBUG]', autoFiller.getCurrentStudent());
console.log('[DEBUG]', autoFiller.getCurrentPlans());

// Popup 디버깅
// 확장 프로그램 팝업에서 우클릭 → 검사
```

### 빌드 및 배포

```bash
# 프로덕션 빌드 (압축)
cd nice-auto-filler
zip -r nice-auto-filler.zip . -x "*.git*" "*.DS_Store" "README.md"

# Chrome Web Store 업로드
# https://chrome.google.com/webstore/devconsole
```

## 🔄 업데이트 로그

### v1.0.0 (2024-01-23)
- ✨ 초기 릴리스
- ✅ 웹사이트 연동 기능
- ✅ 수동 입력 기능
- ✅ JSON 파싱 기능
- ✅ 일괄 입력 기능

## 📄 라이선스

MIT License

## 👨‍💻 개발자

- 개발: [Your Name]
- 문의: [your-email@example.com]

## 🙏 기여

버그 리포트 및 기능 제안은 Issues에 등록해주세요.

---

**주의사항**: 이 확장 프로그램은 교육 목적으로 개발되었습니다. 나이스 시스템의 이용 약관을 준수하여 사용하시기 바랍니다.

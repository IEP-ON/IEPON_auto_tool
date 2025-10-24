# 🔗 API 연동 가이드

## ✅ Chrome 확장 프로그램 수정 완료

```
✅ 기본 URL 설정: https://www.iepon.site
✅ API 연동 기능 활성화
```

---

## 📋 웹사이트에 필요한 API Routes

### 1. Health Check (연결 테스트)

**엔드포인트**: `GET /api/health`

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'iepon-education-plan',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  });
}
```

**응답 예시**:
```json
{
  "status": "ok",
  "service": "iepon-education-plan",
  "version": "1.0.0",
  "timestamp": "2024-10-24T00:00:00.000Z"
}
```

---

### 2. 학생 목록 조회 (선택사항)

**엔드포인트**: `GET /api/students?year=2024&semester=1`

```typescript
// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    // 여기서 Supabase에서 학생 목록 조회
    // 또는 하드코딩된 데이터 반환 (테스트용)
    
    const students = [
      {
        id: 'student-1',
        name: '홍길동',
        grade: 2,
        class: '1',
        number: 5,
        year: parseInt(year || '2024'),
        semester: parseInt(semester || '1')
      },
      {
        id: 'student-2',
        name: '김철수',
        grade: 2,
        class: '1',
        number: 10,
        year: parseInt(year || '2024'),
        semester: parseInt(semester || '1')
      }
    ];

    return NextResponse.json(students);
  } catch (error: any) {
    console.error('학생 목록 조회 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**응답 예시**:
```json
[
  {
    "id": "student-1",
    "name": "홍길동",
    "grade": 2,
    "class": "1",
    "number": 5,
    "year": 2024,
    "semester": 1
  }
]
```

---

### 3. 월별 계획 조회 ⭐ 핵심

**엔드포인트**: `POST /api/monthly-plans`

```typescript
// app/api/monthly-plans/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, year, semester } = body;

    if (!studentId || !year || !semester) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      );
    }

    // 여기서 실제 데이터를 가져옵니다
    // 1) Supabase에서 조회
    // 2) 파일에서 읽기
    // 3) 하드코딩 (테스트용)
    
    // 예시 데이터 (실제로는 DB에서 가져와야 함)
    const plans = [
      {
        month: "3",
        goal: "[읽기] 받침이 있는 글자를 보고 그 짜임을 이해하고 읽는다",
        content: "1. 받침이 있는 글자 알기\n2. 받침이 있는 글자를 소리 내어 읽기\n3. 글자를 정확하게 읽기",
        method: "1. 반복 읽기법\n2. 음운 인식 글자 소리 지도법\n3. 짝읽기 짝코치법",
        evaluation: "[평가 기준] 단원 평가계획 (교육목표 기반)\n\n[상] 받침이 있는 글자를 보고 그 짜임을 완벽히 이해하고 정확히 소리 내어 읽을 수 있다.\n[중] 교사의 도움을 받아 받침이 있는 글자를 보고 그 짜임을 이해하고 소리 내어 읽을 수 있다.\n[하] 교사와 함께 받침이 있는 글자를 보고 그 짜임을 이해하며 소리 내어 읽을 수 있다."
      },
      {
        month: "4",
        goal: "[읽기] 문장 부호의 쓰임을 알고 바르게 사용한다",
        content: "1. 온점과 물음표 알기\n2. 느낌표와 쉼표 알기\n3. 문장 부호를 사용하여 읽기",
        method: "1. 문장 부호 인식 훈련\n2. 읽기 유창성 지도",
        evaluation: "[평가 기준]\n\n[상] 문장 부호의 쓰임을 정확히 알고 독립적으로 바르게 사용할 수 있다.\n[중] 교사의 도움을 받아 문장 부호의 쓰임을 알고 사용할 수 있다.\n[하] 교사와 함께 문장 부호의 쓰임을 알아가며 사용할 수 있다."
      },
      {
        month: "5",
        goal: "[쓰기] 받침이 있는 글자를 짜임과 필순에 맞게 바르게 쓴다",
        content: "1. 글자의 짜임을 생각하며 받침이 있는 글자 쓰기\n2. 받침이 있는 글자 바르게 쓰기\n3. 여러 가지 자음자 알기",
        method: "1. 형태 인식 어휘 확장법\n2. 쓰기 반복 연습",
        evaluation: "[평가 기준]\n\n[상] 받침이 있는 글자를 짜임과 필순에 맞게 독립적으로 바르게 쓸 수 있다.\n[중] 교사의 부분 도움을 받아 받침이 있는 글자를 짜임과 필순에 맞게 쓸 수 있다.\n[하] 교사의 전면 도움을 받아 받침이 있는 글자를 짜임과 필순에 맞게 쓸 수 있다."
      }
    ];

    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('월별 계획 조회 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**요청 예시**:
```json
{
  "studentId": "student-1",
  "year": 2024,
  "semester": 1
}
```

**응답 예시**:
```json
[
  {
    "month": "3",
    "goal": "[읽기] 받침이 있는 글자를 보고...",
    "content": "1. 받침이 있는 글자 알기\n2. ...",
    "method": "1. 반복 읽기법\n2. ...",
    "evaluation": "[평가 기준]..."
  },
  {
    "month": "4",
    "goal": "...",
    "content": "...",
    "method": "...",
    "evaluation": "..."
  }
]
```

---

## 🎯 실제 데이터 연동 방법

### 방법 1: 웹사이트 HTML에서 추출

```typescript
// app/api/monthly-plans/route.ts

export async function POST(request: NextRequest) {
  const { studentId, year, semester } = await request.json();
  
  // education-plan 페이지에서 생성된 데이터를 
  // 어딘가에 저장해뒀다가 가져오기
  
  // 예: localStorage, sessionStorage, Supabase, 파일 등
}
```

### 방법 2: Supabase 연동

```typescript
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { studentId, year, semester } = await request.json();
  
  const { data, error } = await supabaseAdmin
    .from('monthly_plans')
    .select('*')
    .eq('student_id', studentId)
    .eq('year', year)
    .eq('semester', semester)
    .order('month', { ascending: true });
    
  if (error) throw error;
  
  // 나이스 형식으로 변환
  const plans = data.map(plan => ({
    month: plan.month.toString(),
    goal: plan.education_goal || '',
    content: plan.education_content || '',
    method: plan.education_method || '',
    evaluation: plan.evaluation_plan || ''
  }));
  
  return NextResponse.json(plans);
}
```

### 방법 3: 캐시 방식 (간단)

```typescript
// 전역 변수로 임시 저장
let cachedPlans: any[] = [];

// POST /api/monthly-plans/cache (저장)
export async function POST(request: NextRequest) {
  const plans = await request.json();
  cachedPlans = plans;
  return NextResponse.json({ success: true });
}

// GET /api/monthly-plans/cache (조회)
export async function GET() {
  return NextResponse.json(cachedPlans);
}
```

그리고 웹사이트 교육계획 페이지에서:

```typescript
// NiceExportButton.tsx
const handleSaveToAPI = async () => {
  const plans = extractAllPlans();
  
  await fetch('/api/monthly-plans/cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plans)
  });
  
  alert('데이터가 저장되었습니다! Chrome 확장에서 불러올 수 있습니다.');
};
```

---

## 🔧 CORS 설정

**next.config.js**:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: 'chrome-extension://*' 
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET,POST,PUT,DELETE,OPTIONS' 
          },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'Content-Type, Authorization' 
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 🧪 테스트 순서

### 1단계: Health Check 테스트

```bash
curl https://www.iepon.site/api/health
```

예상 응답:
```json
{"status":"ok","service":"iepon-education-plan",...}
```

### 2단계: Chrome 확장에서 연결 테스트

```
1. Chrome 확장 열기
2. 웹사이트 URL: https://www.iepon.site (이미 입력됨)
3. "연결 테스트" 버튼 클릭
4. 성공 메시지: "웹사이트 연결 성공"
```

### 3단계: 학생 목록 테스트

```
1. "학생 목록 불러오기" 버튼 클릭
2. 드롭다운에 학생 목록 표시됨
```

### 4단계: 월별 계획 가져오기

```
1. 학생 선택
2. 학년도/학기 선택
3. "데이터 가져오기" 클릭
4. 미리보기에 데이터 표시됨
```

### 5단계: 나이스 입력

```
1. 나이스 시스템 접속
2. "🚀 자동 입력 시작" 클릭
3. 자동으로 데이터 입력됨
```

---

## 📊 최소 구현 (가장 간단)

**가장 간단하게 시작하려면:**

1. ✅ `/api/health` 구현 (연결 테스트용)
2. ✅ `/api/monthly-plans` 구현 (하드코딩된 샘플 데이터)
3. ✅ Chrome 확장에서 테스트

학생 목록(`/api/students`)은 선택사항입니다.
직접 하드코딩된 데이터로 테스트할 수 있습니다.

---

## 🎉 완료!

이제 Chrome 확장 프로그램이 `https://www.iepon.site`와 연동됩니다!

**다음 단계:**
1. 웹사이트에 `/api/health` 추가
2. 웹사이트에 `/api/monthly-plans` 추가
3. Chrome 확장에서 "연결 테스트"
4. 데이터 가져오기 테스트
5. 나이스 자동 입력 테스트

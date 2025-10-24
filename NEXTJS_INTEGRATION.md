# Next.js + Supabase 웹사이트 통합 가이드

## 🎯 목표

사용자의 Next.js 웹사이트에서 Chrome 확장 프로그램과 연동하여 나이스 시스템에 데이터를 자동으로 전송합니다.

## 📁 프로젝트 구조

```
your-nextjs-app/
├── app/
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts          # 연결 테스트
│   │   ├── students/
│   │   │   └── route.ts          # 학생 목록
│   │   ├── monthly-plans/
│   │   │   └── route.ts          # 월별 계획 데이터
│   │   └── nice/
│   │       └── export/
│   │           └── route.ts      # 나이스 형식 내보내기
│   ├── students/
│   │   └── [id]/
│   │       └── page.tsx          # 학생 상세 페이지
│   └── page.tsx                  # 메인 페이지
├── components/
│   ├── NiceExportButton.tsx      # 나이스 내보내기 버튼
│   └── MonthlyPlanForm.tsx       # 월별 계획 입력 폼
├── lib/
│   ├── supabase.ts               # Supabase 클라이언트
│   └── nice-formatter.ts         # 나이스 형식 변환
└── types/
    └── nice.ts                   # 타입 정의
```

## 🔧 1단계: Supabase 설정

### 환경 변수 (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API
NEXT_PUBLIC_API_URL=https://your-site.vercel.app
```

### Supabase 클라이언트 (lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';

// 클라이언트용 (브라우저)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 서버용 (API Routes)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 데이터베이스 스키마

```sql
-- 학생 테이블
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class TEXT NOT NULL,
  number INTEGER,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  student_id TEXT, -- 나이스 학생 ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 월별 계획 테이블
CREATE TABLE monthly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  month INTEGER NOT NULL,
  education_goal TEXT,
  education_content TEXT,
  education_method TEXT,
  evaluation_plan TEXT,
  teacher_name TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, year, semester, month)
);

-- 인덱스
CREATE INDEX idx_students_year_semester ON students(year, semester);
CREATE INDEX idx_monthly_plans_student ON monthly_plans(student_id);
CREATE INDEX idx_monthly_plans_year_semester ON monthly_plans(year, semester);

-- RLS (Row Level Security) 정책
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY;

-- 읽기 권한 (모든 인증된 사용자)
CREATE POLICY "Allow read access for authenticated users" ON students
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users" ON monthly_plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- 쓰기 권한 (소유자만)
CREATE POLICY "Allow insert for authenticated users" ON students
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON monthly_plans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 🚀 2단계: API Routes 구현

### 1. Health Check (app/api/health/route.ts)

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'nice-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  });
}
```

### 2. 학생 목록 (app/api/students/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    if (!year || !semester) {
      return NextResponse.json(
        { error: '학년도와 학기를 입력하세요' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('year', parseInt(year))
      .eq('semester', parseInt(semester))
      .order('grade', { ascending: true })
      .order('class', { ascending: true })
      .order('number', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('학생 목록 조회 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, grade, class: className, number, year, semester } = body;

    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        name,
        grade,
        class: className,
        number,
        year,
        semester
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('학생 추가 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. 월별 계획 (app/api/monthly-plans/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    if (!studentId || !year || !semester) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('year', parseInt(year))
      .eq('semester', parseInt(semester))
      .order('month', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('월별 계획 조회 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

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

    // 월별 계획 조회
    const { data, error } = await supabaseAdmin
      .from('monthly_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('year', parseInt(year))
      .eq('semester', parseInt(semester))
      .order('month', { ascending: true });

    if (error) throw error;

    // 나이스 형식으로 변환
    const niceFormat = data.map(plan => ({
      month: plan.month.toString(),
      goal: plan.education_goal || '',
      content: plan.education_content || '',
      method: plan.education_method || '',
      evaluation: plan.evaluation_plan || ''
    }));

    return NextResponse.json(niceFormat);
  } catch (error: any) {
    console.error('월별 계획 변환 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 4. 나이스 내보내기 (app/api/nice/export/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, year, semester, format = 'json' } = body;

    // 학생 정보 조회
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    // 월별 계획 조회
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('monthly_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('year', parseInt(year))
      .eq('semester', parseInt(semester))
      .order('month', { ascending: true });

    if (plansError) throw plansError;

    // 나이스 형식으로 변환
    const niceData = {
      student: {
        name: student.name,
        grade: student.grade,
        class: student.class,
        number: student.number
      },
      year: parseInt(year),
      semester: parseInt(semester),
      plans: plans.map(plan => ({
        month: plan.month.toString(),
        goal: plan.education_goal || '',
        content: plan.education_content || '',
        method: plan.education_method || '',
        evaluation: plan.evaluation_plan || ''
      }))
    };

    // 형식에 따라 반환
    if (format === 'clipboard') {
      // 클립보드용 특수 형식
      const clipboardText = plans.map(plan => 
        `[NICE_MONTH]${plan.month}[/NICE_MONTH]
[NICE_GOAL]${plan.education_goal || ''}[/NICE_GOAL]
[NICE_CONTENT]${plan.education_content || ''}[/NICE_CONTENT]
[NICE_METHOD]${plan.education_method || ''}[/NICE_METHOD]
[NICE_EVAL]${plan.evaluation_plan || ''}[/NICE_EVAL]`
      ).join('[NICE_SEPARATOR]');

      return NextResponse.json({ 
        format: 'clipboard',
        data: clipboardText 
      });
    }

    return NextResponse.json(niceData);
  } catch (error: any) {
    console.error('나이스 내보내기 오류:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## 🎨 3단계: UI 컴포넌트

### 나이스 내보내기 버튼 (components/NiceExportButton.tsx)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';

interface NiceExportButtonProps {
  studentId: string;
  year: number;
  semester: number;
  variant?: 'default' | 'outline';
}

export function NiceExportButton({ 
  studentId, 
  year, 
  semester,
  variant = 'default' 
}: NiceExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleExportJSON = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/nice/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, year, semester, format: 'json' })
      });

      if (!response.ok) throw new Error('내보내기 실패');

      const data = await response.json();
      
      // JSON 파일 다운로드
      const blob = new Blob([JSON.stringify(data.plans, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `나이스_월별계획_${data.student.name}_${year}_${semester}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('내보내기 오류:', error);
      alert('내보내기 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/nice/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, year, semester, format: 'json' })
      });

      if (!response.ok) throw new Error('복사 실패');

      const data = await response.json();
      
      // 클립보드에 복사
      await navigator.clipboard.writeText(JSON.stringify(data.plans, null, 2));
      
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('복사 오류:', error);
      alert('복사 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleExportJSON}
        disabled={isLoading}
        variant={variant}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        JSON 다운로드
      </Button>
      
      <Button
        onClick={handleCopyToClipboard}
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isCopied ? (
          <>
            <Check className="w-4 h-4" />
            복사됨!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            클립보드 복사
          </>
        )}
      </Button>
    </div>
  );
}
```

### 학생 상세 페이지 (app/students/[id]/page.tsx)

```typescript
import { supabaseAdmin } from '@/lib/supabase';
import { NiceExportButton } from '@/components/NiceExportButton';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    year?: string;
    semester?: string;
  };
}

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const currentYear = new Date().getFullYear();
  const year = searchParams.year ? parseInt(searchParams.year) : currentYear;
  const semester = searchParams.semester ? parseInt(searchParams.semester) : 1;

  // 학생 정보 조회
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', params.id)
    .single();

  if (studentError || !student) {
    notFound();
  }

  // 월별 계획 조회
  const { data: plans } = await supabaseAdmin
    .from('monthly_plans')
    .select('*')
    .eq('student_id', params.id)
    .eq('year', year)
    .eq('semester', semester)
    .order('month', { ascending: true });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {student.name} ({student.grade}학년 {student.class}반)
        </h1>
        <p className="text-gray-600">
          {year}학년도 {semester}학기 월별 개별화교육계획
        </p>
      </div>

      {/* 나이스 내보내기 버튼 */}
      <div className="mb-6">
        <NiceExportButton
          studentId={params.id}
          year={year}
          semester={semester}
        />
      </div>

      {/* 월별 계획 목록 */}
      <div className="space-y-4">
        {plans?.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-3">
              📅 {plan.month}월
            </h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-700">교육목표</h4>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {plan.education_goal || '미입력'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700">교육내용</h4>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {plan.education_content || '미입력'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700">교육방법</h4>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {plan.education_method || '미입력'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700">평가계획</h4>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {plan.evaluation_plan || '미입력'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔐 4단계: CORS 설정

### next.config.js

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

## 🧪 5단계: 테스트

### API 테스트 스크립트

```bash
# Health Check
curl https://your-site.vercel.app/api/health

# 학생 목록
curl "https://your-site.vercel.app/api/students?year=2024&semester=1"

# 월별 계획
curl -X POST https://your-site.vercel.app/api/monthly-plans \
  -H "Content-Type: application/json" \
  -d '{"studentId":"uuid","year":2024,"semester":1}'
```

## 📦 6단계: 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 환경 변수 설정

Vercel Dashboard에서 환경 변수 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## ✅ 완료 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 테이블 생성
- [ ] API Routes 구현
- [ ] UI 컴포넌트 추가
- [ ] CORS 설정
- [ ] 환경 변수 설정
- [ ] Vercel 배포
- [ ] Chrome 확장 프로그램 연동 테스트

## 🎉 완성!

이제 Next.js 웹사이트에서 데이터를 생성하고, Chrome 확장 프로그램을 통해 나이스 시스템에 자동으로 입력할 수 있습니다!

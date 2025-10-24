# 웹사이트(iepon.site) 통합 체크리스트

## 🎯 즉시 적용 가능한 코드

### 1단계: 웹사이트에 "나이스 내보내기" 버튼 추가

#### 코드 위치: `app/education-plan/page.tsx` (또는 해당 컴포넌트)

```typescript
'use client';

import { Copy, Download } from 'lucide-react';

export function NiceExportButton() {
  const extractAllPlans = () => {
    const plans = [];
    
    // HTML에서 모든 월별 계획 추출
    const cards = document.querySelectorAll('.bg-white.border-2.border-gray-200');
    
    cards.forEach(card => {
      const titleEl = card.querySelector('h3');
      const subtitleEl = card.querySelector('p');
      
      if (!titleEl) return;
      
      const titleText = titleEl.textContent || '';
      const monthMatch = titleText.match(/(\d+)월/);
      
      if (!monthMatch) return;
      
      const month = monthMatch[1];
      const title = subtitleEl?.textContent?.trim() || '';
      
      // 교육목표
      const goalDiv = card.querySelector('.bg-blue-50 .text-blue-900');
      const goal = goalDiv?.textContent?.trim() || '';
      
      // 교육내용
      const contentDiv = card.querySelector('.bg-green-50 .text-green-900');
      const contentItems = Array.from(contentDiv?.querySelectorAll('div') || [])
        .map(div => div.textContent?.trim())
        .filter(Boolean);
      const content = contentItems.join('\n');
      
      // 교육방법
      const methodDiv = card.querySelector('.bg-yellow-50 .text-yellow-900');
      const methodItems = Array.from(methodDiv?.querySelectorAll('div') || [])
        .map(div => div.textContent?.trim())
        .filter(Boolean);
      const method = methodItems.join('\n');
      
      // 평가계획
      const evalDiv = card.querySelector('.bg-purple-50 .text-purple-900');
      const evaluation = evalDiv?.textContent?.trim() || '';
      
      plans.push({
        month,
        title,
        goal,
        content,
        method,
        evaluation
      });
    });
    
    return plans;
  };
  
  const handleCopyJSON = async () => {
    const plans = extractAllPlans();
    const json = JSON.stringify(plans, null, 2);
    
    await navigator.clipboard.writeText(json);
    
    alert(`${plans.length}개 월별 계획이 복사되었습니다!\n\n나이스 시스템에서 Chrome 확장을 열어 "JSON 붙여넣기"를 선택하세요.`);
  };
  
  const handleDownloadJSON = () => {
    const plans = extractAllPlans();
    const json = JSON.stringify(plans, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `나이스_월별계획_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <button
        onClick={handleCopyJSON}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-medium"
      >
        <Copy className="w-5 h-5" />
        나이스로 복사
      </button>
      
      <button
        onClick={handleDownloadJSON}
        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all font-medium"
      >
        <Download className="w-5 h-5" />
        JSON 다운로드
      </button>
    </div>
  );
}
```

#### 페이지에 버튼 추가

```typescript
// app/education-plan/page.tsx
export default function EducationPlanPage() {
  return (
    <div>
      {/* 기존 콘텐츠 */}
      
      {/* 나이스 내보내기 버튼 추가 */}
      <NiceExportButton />
    </div>
  );
}
```

---

### 2단계: 개별 복사 버튼 개선 (선택사항)

각 항목의 복사 버튼이 나이스 형식으로 복사되도록 개선:

```typescript
// components/CopyButton.tsx
interface CopyButtonProps {
  month: string;
  type: 'goal' | 'content' | 'method' | 'evaluation';
  content: string;
}

export function SmartCopyButton({ month, type, content }: CopyButtonProps) {
  const handleCopy = async () => {
    // 나이스 Chrome 확장이 감지할 수 있는 형식
    const niceFormat = JSON.stringify({
      source: 'iepon',
      month,
      type,
      data: content,
      timestamp: new Date().toISOString()
    });
    
    // 일반 텍스트도 함께 저장 (호환성)
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([content], { type: 'text/plain' }),
        'application/json': new Blob([niceFormat], { type: 'application/json' })
      })
    ]);
    
    // 또는 간단하게
    await navigator.clipboard.writeText(content);
  };
  
  return (
    <button onClick={handleCopy} className="...">
      <Copy className="w-4 h-4" />
      복사
    </button>
  );
}
```

---

## 📦 Chrome 확장 manifest.json 업데이트

```json
{
  "host_permissions": [
    "https://dge.neis.go.kr/*",
    "https://www.iepon.site/*",
    "https://*.vercel.app/*"
  ]
}
```

---

## 🧪 테스트 시나리오

### 시나리오 1: JSON 복사-붙여넣기

1. **웹사이트 (iepon.site)**
   ```
   - 교육계획 생성 완료 페이지 접속
   - 우측 하단 "나이스로 복사" 버튼 클릭
   - 확인 메시지: "3개 월별 계획이 복사되었습니다!"
   ```

2. **나이스 시스템**
   ```
   - dge.neis.go.kr 접속
   - 개별화교육계획 > 월별 관리
   - Chrome 확장 아이콘 클릭
   - "JSON 붙여넣기" 선택
   - Ctrl+V 붙여넣기
   - "JSON 파싱" 클릭
   - 미리보기에서 3개 항목 확인
   - "자동 입력 시작" 클릭
   ```

### 시나리오 2: JSON 파일 다운로드-업로드

1. **웹사이트**
   ```
   - "JSON 다운로드" 버튼 클릭
   - 파일 저장: `나이스_월별계획_2024-01-23.json`
   ```

2. **나이스 시스템**
   ```
   - Chrome 확장 열기
   - 파일 열기 (메모장/VS Code)
   - 내용 복사
   - 확장에 붙여넣기
   ```

---

## 💾 JSON 데이터 예시

웹사이트에서 생성되는 JSON 형식:

```json
[
  {
    "month": "9",
    "title": "글자를 만들어요",
    "goal": "[읽기] 받침이 있는 글자를 보고 그 짜임을 이해하고 읽는다",
    "content": "1. 받침이 있는 글자 알기\n2. 받침이 있는 글자를 소리 내어 읽기\n3. 글자를 정확하게 읽기",
    "method": "1. 반복 읽기법\n2. 음운 인식 글자 소리 지도법\n3. 짝읽기 짝코치법",
    "evaluation": "[평가 기준] 단원 평가계획 (교육목표 기반)\n\n[상] 받침이 있는 글자를 보고 그 짜임을 완벽히 이해하고 정확히 소리 내어 읽을 수 있다.\n[중] 교사의 도움을 받아 받침이 있는 글자를 보고 그 짜임을 이해하고 소리 내어 읽을 수 있다.\n[하] 교사와 함께 받침이 있는 글자를 보고 그 짜임을 이해하며 소리 내어 읽을 수 있다."
  },
  {
    "month": "10",
    "title": "...",
    "goal": "...",
    "content": "...",
    "method": "...",
    "evaluation": "..."
  },
  {
    "month": "11",
    "title": "낱말과 친해져요",
    "goal": "[쓰기] 받침이 있는 글자를 짜임과 필순에 맞게 바르게 쓴다",
    "content": "1. 글자의 짜임을 생각하며 받침이 있는 글자 쓰기\n2. 받침이 있는 글자 바르게 쓰기\n3. 여러 가지 자음자 (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ 등) 알기\n4. 자신 있게 낱말 읽기",
    "method": "1. 형태 인식 어휘 확장법",
    "evaluation": "[평가 기준] 단원 평가계획 (교육목표 기반)\n\n[상] 받침이 있는 글자를 짜임과 필순에 맞게 독립적으로 바르게 쓸 수 있다\n[중] 교사의 부분 도움을 받아 받침이 있는 글자를 짜임과 필순에 맞게 쓸 수 있다\n[하] 교사의 전면 도움을 받아 받침이 있는 글자를 짜임과 필순에 맞게 쓸 수 있다"
  }
]
```

---

## ✅ 구현 체크리스트

### 웹사이트 (iepon.site)
- [ ] `NiceExportButton` 컴포넌트 생성
- [ ] 교육계획 페이지에 버튼 추가
- [ ] JSON 추출 함수 테스트
- [ ] 클립보드 복사 기능 테스트
- [ ] JSON 다운로드 기능 테스트
- [ ] 버튼 디자인 및 위치 조정
- [ ] 모바일 반응형 고려

### Chrome 확장
- [ ] `manifest.json`에 iepon.site 도메인 추가
- [ ] JSON 파싱 로직 테스트
- [ ] 데이터 검증 (month, goal, content 등)
- [ ] 에러 메시지 개선
- [ ] 사용자 가이드 추가

### 통합 테스트
- [ ] 9월 데이터 입력 성공 확인
- [ ] 10월 데이터 입력 성공 확인
- [ ] 11월 데이터 입력 성공 확인
- [ ] 줄바꿈(`\n`) 처리 확인
- [ ] 특수문자 처리 확인
- [ ] 평가계획 상/중/하 형식 확인

---

## 🚀 배포 순서

1. **개발 환경 테스트**
   - localhost에서 버튼 추가 및 테스트
   - JSON 형식 확인
   - 복사 기능 동작 확인

2. **Vercel 배포**
   - `git push`로 자동 배포
   - 프로덕션 URL에서 재테스트

3. **Chrome 확장 업데이트**
   - `manifest.json` 수정
   - Chrome에서 확장 재로드
   - 나이스 페이지에서 테스트

4. **최종 검증**
   - 실제 나이스 시스템에서 입력 테스트
   - 저장 및 결과 확인
   - 사용자 가이드 작성

---

## 📞 문제 발생 시

### JSON 파싱 실패
```
원인: JSON 형식 불일치
해결: Console에서 JSON.parse() 직접 테스트
```

### 클립보드 복사 안됨
```
원인: HTTPS 필요
해결: localhost 또는 https:// 사용
```

### 나이스 입력 실패
```
원인: CPR 컴포넌트 ID 변경
해결: content-script.js에서 ID 재확인
```

---

## 🎉 예상 결과

**Before (수동 입력)**
- 3개월 계획 입력: 약 30분 소요
- 복사-붙여넣기 오류 가능성

**After (자동 입력)**
- 3개월 계획 입력: 약 30초 소요
- 정확도 100%
- 원클릭 완료

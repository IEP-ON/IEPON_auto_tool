# 사용자 웹사이트 (iepon.site) 심층 분석

## 🔍 웹사이트 개요

- **URL**: https://www.iepon.site/education-plan
- **제목**: 특수학급 현행수준(PLP) 작성 도구
- **기능**: AI 기반 맞춤형 교육계획 생성 시스템

## 📊 생성된 데이터 구조 분석

### 발견된 월별 교육계획

HTML 파일에서 **9월, 10월, 11월** 3개월 교육계획 확인

#### 9월 교육계획 - "글자를 만들어요"

**교육목표**
```
[읽기] 받침이 있는 글자를 보고 그 짜임을 이해하고 읽는다
```

**교육내용**
```
1. 받침이 있는 글자 알기
2. 받침이 있는 글자를 소리 내어 읽기
3. 글자를 정확하게 읽기
```

**교육방법**
```
1. 반복 읽기법
2. 음운 인식 글자 소리 지도법
3. 짝읽기 짝코치법
```

**평가계획**
```
[평가 기준] 단원 평가계획 (교육목표 기반)

[상] 받침이 있는 글자를 보고 그 짜임을 완벽히 이해하고 정확히 소리 내어 읽을 수 있다.
[중] 교사의 도움을 받아 받침이 있는 글자를 보고 그 짜임을 이해하고 소리 내어 읽을 수 있다.
[하] 교사와 함께 받침이 있는 글자를 보고 그 짜임을 이해하며 소리 내어 읽을 수 있다.
```

#### 11월 교육계획 - "낱말과 친해져요"

**교육목표**
```
[쓰기] 받침이 있는 글자를 짜임과 필순에 맞게 바르게 쓴다
```

**교육내용**
```
1. 글자의 짜임을 생각하며 받침이 있는 글자 쓰기
2. 받침이 있는 글자 바르게 쓰기
3. 여러 가지 자음자 (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ 등) 알기
4. 자신 있게 낱말 읽기
```

**교육방법**
```
1. 형태 인식 어휘 확장법
```

**평가계획**
```
[평가 기준] 단원 평가계획 (교육목표 기반)

[상] 받침이 있는 글자를 짜임과 필순에 맞게 독립적으로 바르게 쓸 수 있다
[중] 교사의 부분 도움을 받아 받침이 있는 글자를 짜임과 필순에 맞게 쓸 수 있다
[하] 교사의 전면 도움을 받아 받침이 있는 글자를 짜임과 필순에 맞게 쓸 수 있다
```

## 🎨 UI/UX 특징

### 1. 월별 아코디언 구조
- 각 월별 계획은 접었다 펼 수 있는 아코디언 형태
- 제목: "X월 교육계획"
- 부제목: 단원명 (예: "글자를 만들어요")

### 2. 색상 코드 시스템
- **교육목표**: 파란색 (blue-900)
- **교육내용**: 초록색 (green-900)
- **교육방법**: 노란색 (yellow-900)
- **평가계획**: 보라색 (purple-900)

### 3. 복사 버튼
- 각 항목마다 개별 복사 버튼 존재
- 아이콘: Copy (lucide-copy)
- 클립보드에 개별 복사 가능

### 4. 평가 기준 3단계
- **[상]**: 녹색 배경 (green-50)
- **[중]**: 노란색 배경 (yellow-50)
- **[하]**: 빨간색 배경 (red-50)

## 🔗 Chrome 확장 연동 전략

### 방안 1: 개별 복사 버튼 활용 ⭐⭐⭐⭐⭐

#### 작동 방식
```
1. 사용자가 웹사이트에서 각 항목별 복사 버튼 클릭
2. 클립보드에 특수 형식으로 저장
3. 나이스에서 확장 프로그램이 클립보드 감지
4. 자동으로 해당 필드에 입력
```

#### 웹사이트 수정 (복사 버튼 개선)
```typescript
// 복사 버튼 클릭 시
const copyWithMetadata = (type: 'goal' | 'content' | 'method' | 'evaluation', text: string, month: number) => {
  const niceFormat = JSON.stringify({
    source: 'iepon',
    type,
    month,
    data: text,
    timestamp: new Date().toISOString()
  });
  
  navigator.clipboard.writeText(niceFormat);
};
```

#### 확장 프로그램 감지
```javascript
// Content Script
document.addEventListener('paste', (e) => {
  const text = e.clipboardData.getData('text');
  
  try {
    const data = JSON.parse(text);
    if (data.source === 'iepon') {
      // 나이스 필드에 자동 입력
      fillNiceField(data.type, data.data);
    }
  } catch {}
});
```

### 방안 2: 전체 내보내기 버튼 추가 ⭐⭐⭐⭐⭐

#### 웹사이트에 "나이스로 보내기" 버튼 추가

```typescript
// components/NiceExportButton.tsx
const exportToNice = () => {
  const allPlans = extractAllMonthlyPlans(); // 9월, 10월, 11월 추출
  
  const niceFormat = allPlans.map(plan => ({
    month: plan.month,
    goal: plan.goal,
    content: plan.content,
    method: plan.method,
    evaluation: plan.evaluation
  }));
  
  // 클립보드에 JSON 복사
  navigator.clipboard.writeText(JSON.stringify(niceFormat));
  
  // 또는 Chrome 확장에 직접 전송
  window.postMessage({
    type: 'NICE_EXPORT',
    data: niceFormat
  }, '*');
};
```

### 방안 3: API 연동 (장기 권장) ⭐⭐⭐⭐⭐

#### 데이터 흐름
```
웹사이트 DB (Supabase) → API → Chrome 확장 → 나이스 시스템
```

#### API 엔드포인트 필요
```typescript
// GET /api/education-plans/:studentId
{
  "student": { "name": "홍길동", "grade": 2 },
  "plans": [
    {
      "month": 9,
      "title": "글자를 만들어요",
      "goal": "[읽기] 받침이 있는 글자를...",
      "content": "1. 받침이 있는 글자 알기\n2. ...",
      "method": "1. 반복 읽기법\n2. ...",
      "evaluation": "[평가 기준]..."
    }
  ]
}
```

## 📦 데이터 추출 방법

### HTML 파싱을 통한 추출

```javascript
// Chrome 확장에서 웹사이트 페이지 파싱
const extractPlans = () => {
  const plans = [];
  
  // 모든 월별 계획 찾기
  document.querySelectorAll('.bg-white.border-2.border-gray-200').forEach(card => {
    const title = card.querySelector('h3').textContent; // "9월 교육계획"
    const month = parseInt(title.match(/(\d+)월/)[1]);
    const subtitle = card.querySelector('p').textContent; // "글자를 만들어요"
    
    // 교육목표
    const goalDiv = card.querySelector('.bg-blue-50');
    const goal = goalDiv?.querySelector('.text-blue-900').textContent.trim();
    
    // 교육내용
    const contentDiv = card.querySelector('.bg-green-50');
    const contentItems = Array.from(contentDiv?.querySelectorAll('.space-y-1 > div') || [])
      .map(div => div.textContent.trim());
    const content = contentItems.join('\n');
    
    // 교육방법
    const methodDiv = card.querySelector('.bg-yellow-50');
    const methodItems = Array.from(methodDiv?.querySelectorAll('.space-y-1 > div') || [])
      .map(div => div.textContent.trim());
    const method = methodItems.join('\n');
    
    // 평가계획
    const evalDiv = card.querySelector('.bg-purple-50');
    const evalText = evalDiv?.querySelector('.text-purple-900').textContent.trim();
    
    plans.push({
      month,
      title: subtitle,
      goal,
      content,
      method,
      evaluation: evalText
    });
  });
  
  return plans;
};
```

## 🚀 통합 시나리오

### 시나리오 A: 복사-붙여넣기 방식

1. **웹사이트에서**
   - "전체 내보내기" 버튼 클릭
   - JSON 데이터가 클립보드에 복사됨
   - 알림: "나이스 시스템으로 이동하세요"

2. **나이스 시스템에서**
   - Chrome 확장 아이콘 클릭
   - "JSON 붙여넣기" 탭 선택
   - Ctrl+V로 붙여넣기
   - "JSON 파싱" 클릭
   - 미리보기 확인
   - "자동 입력 시작" 클릭

### 시나리오 B: 직접 연동 방식

1. **웹사이트에서**
   - 학생 정보 입력 및 계획 생성
   - Supabase에 자동 저장

2. **나이스 시스템에서**
   - Chrome 확장 아이콘 클릭
   - 웹사이트 URL 설정: `https://www.iepon.site`
   - 학생 선택
   - "데이터 가져오기" 클릭
   - 자동으로 API 호출하여 최신 데이터 로드
   - "자동 입력 시작" 클릭

## 🎯 추천 구현 단계

### Phase 1: 빠른 MVP (1-2일)

1. **웹사이트 수정**
   - "JSON 다운로드" 버튼 추가
   - 현재 HTML에서 데이터 추출하여 JSON 생성
   
2. **Chrome 확장 사용**
   - 이미 개발된 "JSON 붙여넣기" 기능 활용
   - 테스트 및 피드백

### Phase 2: 복사 개선 (3-5일)

1. **웹사이트 개선**
   - 각 복사 버튼에 메타데이터 추가
   - "전체 복사" 버튼 추가
   - 클립보드 형식 표준화

2. **확장 기능**
   - 클립보드 감지 및 자동 파싱
   - 실시간 미리보기

### Phase 3: API 통합 (1-2주)

1. **백엔드 개발**
   - Supabase 스키마 구축
   - Next.js API Routes 구현
   - 인증/권한 시스템

2. **완전 자동화**
   - 웹사이트 → DB → API → 확장 → 나이스
   - 원클릭 자동 입력

## 📋 체크리스트

### 웹사이트 측
- [ ] 데이터 추출 함수 구현
- [ ] JSON 내보내기 버튼 추가
- [ ] 클립보드 API 활용
- [ ] Supabase 테이블 생성
- [ ] API Routes 개발

### Chrome 확장 측  
- [ ] iepon.site 도메인 허용
- [ ] JSON 파싱 로직 개선
- [ ] 데이터 검증 강화
- [ ] 에러 처리 개선
- [ ] 사용자 가이드 추가

### 테스트
- [ ] 9월 데이터 입력 테스트
- [ ] 10월 데이터 입력 테스트
- [ ] 11월 데이터 입력 테스트
- [ ] 평가계획 형식 확인
- [ ] 줄바꿈 처리 확인

## 🎉 기대 효과

1. **시간 절감**: 수동 입력 30분 → 자동 입력 30초
2. **정확도 향상**: 복사-붙여넣기 오류 제거
3. **일관성 유지**: 동일한 형식으로 입력
4. **편의성 증대**: 원클릭 자동화

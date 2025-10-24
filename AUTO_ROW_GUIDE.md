# 자동 행 추가 및 12개월 전체 입력 가이드

## ✅ 자동 행 추가 기능 (이미 구현됨)

확장 프로그램은 **각 월마다 자동으로 행을 추가**합니다.

### 작동 원리

```javascript
// 247-279번 줄: fillMonthlyPlan() 함수
async fillMonthlyPlan(data) {
  // 1단계: 자동으로 [행추가] 버튼 클릭 ✅
  await this.addRow();
  
  // 2단계: 월 선택 (3, 4, 5... 12, 1, 2)
  this.selectMonth(data.month);
  
  // 3단계: 데이터 입력
  this.setGoal(data.goal);
  this.setContent(data.content);
  this.setMethod(data.method);
  this.setEvaluation(data.evaluation);
}

// 292-334번 줄: fillMultipleMonths() 함수
async fillMultipleMonths(monthsData) {
  // 모든 월에 대해 반복
  for (let i = 0; i < monthsData.length; i++) {
    // 각 월마다 fillMonthlyPlan() 호출
    // → 자동으로 행 추가됨
    await this.fillMonthlyPlan(monthsData[i]);
    
    // 다음 월 처리 전 300ms 대기
    await this.wait(300);
  }
  
  // 모든 월 입력 완료 후 저장
  await this.save();
}
```

## 📅 12개월 전체 입력 예시

### JSON 형식 (3월 ~ 2월)

```json
[
  {
    "month": "3",
    "title": "1학기 3월 단원",
    "goal": "3월 교육목표",
    "content": "3월 교육내용",
    "method": "3월 교육방법",
    "evaluation": "3월 평가계획"
  },
  {
    "month": "4",
    "goal": "4월 교육목표",
    "content": "4월 교육내용",
    "method": "4월 교육방법",
    "evaluation": "4월 평가계획"
  },
  {
    "month": "5",
    "goal": "5월 교육목표",
    "content": "5월 교육내용",
    "method": "5월 교육방법",
    "evaluation": "5월 평가계획"
  },
  {
    "month": "6",
    "goal": "6월 교육목표",
    "content": "6월 교육내용",
    "method": "6월 교육방법",
    "evaluation": "6월 평가계획"
  },
  {
    "month": "7",
    "goal": "7월 교육목표",
    "content": "7월 교육내용",
    "method": "7월 교육방법",
    "evaluation": "7월 평가계획"
  },
  {
    "month": "8",
    "goal": "8월 교육목표",
    "content": "8월 교육내용",
    "method": "8월 교육방법",
    "evaluation": "8월 평가계획"
  },
  {
    "month": "9",
    "goal": "9월 교육목표",
    "content": "9월 교육내용",
    "method": "9월 교육방법",
    "evaluation": "9월 평가계획"
  },
  {
    "month": "10",
    "goal": "10월 교육목표",
    "content": "10월 교육내용",
    "method": "10월 교육방법",
    "evaluation": "10월 평가계획"
  },
  {
    "month": "11",
    "goal": "11월 교육목표",
    "content": "11월 교육내용",
    "method": "11월 교육방법",
    "evaluation": "11월 평가계획"
  },
  {
    "month": "12",
    "goal": "12월 교육목표",
    "content": "12월 교육내용",
    "method": "12월 교육방법",
    "evaluation": "12월 평가계획"
  },
  {
    "month": "1",
    "goal": "1월 교육목표",
    "content": "1월 교육내용",
    "method": "1월 교육방법",
    "evaluation": "1월 평가계획"
  },
  {
    "month": "2",
    "goal": "2월 교육목표",
    "content": "2월 교육내용",
    "method": "2월 교육방법",
    "evaluation": "2월 평가계획"
  }
]
```

## 🎬 실행 과정 시각화

### 사용자가 12개월 데이터를 붙여넣고 실행하면:

```
나이스 시스템 화면:

┌─────────────────────────────────────┐
│  월별 개별화교육계획 관리           │
├─────────────────────────────────────┤
│  [행추가] [저장] [삭제]             │
├─────────────────────────────────────┤
│  월 │ 교육목표 │ 교육내용 │ ...     │
├─────────────────────────────────────┤
│                                     │  ← 비어있음
└─────────────────────────────────────┘

확장 프로그램 실행 ▶

[1/12] 3월 처리 중...
  ✅ 행 추가 (btnAddRow.click())
  ✅ 월 선택 → "3"
  ✅ 교육목표 입력
  ✅ 교육내용 입력
  ✅ 교육방법 입력
  ✅ 평가계획 입력
  ⏳ 300ms 대기

[2/12] 4월 처리 중...
  ✅ 행 추가 (btnAddRow.click())
  ✅ 월 선택 → "4"
  ✅ 교육목표 입력
  ✅ 교육내용 입력
  ✅ 교육방법 입력
  ✅ 평가계획 입력
  ⏳ 300ms 대기

... (5월, 6월, 7월, 8월, 9월, 10월, 11월, 12월)

[11/12] 1월 처리 중...
  ✅ 행 추가 (btnAddRow.click())
  ✅ 월 선택 → "1"
  ✅ 데이터 입력
  ⏳ 300ms 대기

[12/12] 2월 처리 중...
  ✅ 행 추가 (btnAddRow.click())
  ✅ 월 선택 → "2"
  ✅ 데이터 입력

✅ 전체 저장 (btnSave.click())

완료! ✨

┌─────────────────────────────────────┐
│  월별 개별화교육계획 관리           │
├─────────────────────────────────────┤
│  [행추가] [저장] [삭제]             │
├─────────────────────────────────────┤
│  월 │ 교육목표 │ 교육내용 │ ...     │
├─────────────────────────────────────┤
│  3  │ 3월 교육목표...              │
│  4  │ 4월 교육목표...              │
│  5  │ 5월 교육목표...              │
│  6  │ 6월 교육목표...              │
│  7  │ 7월 교육목표...              │
│  8  │ 8월 교육목표...              │
│  9  │ 9월 교육목표...              │
│  10 │ 10월 교육목표...             │
│  11 │ 11월 교육목표...             │
│  12 │ 12월 교육목표...             │
│  1  │ 1월 교육목표...              │
│  2  │ 2월 교육목표...              │
└─────────────────────────────────────┘
```

## ⏱️ 소요 시간

### 12개월 전체 자동 입력

```
행 추가: 500ms × 12 = 6초
데이터 입력: 200ms × 12 = 2.4초
대기 시간: 300ms × 11 = 3.3초
저장: 1초
─────────────────────────
총 예상 시간: 약 12~15초
```

**수동 입력**: 약 60~90분
**자동 입력**: 약 15초

## 🎯 웹사이트에서 12개월 데이터 생성

### iepon.site 수정 예시

```typescript
// components/NiceExportButton.tsx
const extractAllPlans = () => {
  const plans = [];
  
  // 모든 월별 계획 카드 찾기
  const cards = document.querySelectorAll('.bg-white.border-2.border-gray-200');
  
  cards.forEach(card => {
    const titleEl = card.querySelector('h3');
    const monthMatch = titleEl?.textContent?.match(/(\d+)월/);
    
    if (!monthMatch) return;
    
    const month = monthMatch[1]; // "3", "4", "5", ... "12", "1", "2"
    
    // 교육목표, 내용, 방법, 평가 추출
    const goal = card.querySelector('.bg-blue-50 .text-blue-900')?.textContent?.trim() || '';
    const content = extractContent(card.querySelector('.bg-green-50'));
    const method = extractContent(card.querySelector('.bg-yellow-50'));
    const evaluation = card.querySelector('.bg-purple-50 .text-purple-900')?.textContent?.trim() || '';
    
    plans.push({
      month,
      goal,
      content,
      method,
      evaluation
    });
  });
  
  return plans;
};

// 복사 버튼
const handleCopyAll = async () => {
  const plans = extractAllPlans();
  const json = JSON.stringify(plans, null, 2);
  
  await navigator.clipboard.writeText(json);
  
  alert(`${plans.length}개월 계획이 복사되었습니다!\n나이스 시스템에서 확장 프로그램을 실행하세요.`);
};
```

## 📊 실제 사용 시나리오

### 시나리오 1: 1학기만 입력 (3~8월)

```json
[
  { "month": "3", ... },
  { "month": "4", ... },
  { "month": "5", ... },
  { "month": "6", ... },
  { "month": "7", ... },
  { "month": "8", ... }
]
```

**소요 시간**: 약 7~8초

### 시나리오 2: 2학기만 입력 (9~2월)

```json
[
  { "month": "9", ... },
  { "month": "10", ... },
  { "month": "11", ... },
  { "month": "12", ... },
  { "month": "1", ... },
  { "month": "2", ... }
]
```

**소요 시간**: 약 7~8초

### 시나리오 3: 전체 입력 (3~2월)

```json
[
  { "month": "3", ... },
  { "month": "4", ... },
  ... (중략) ...
  { "month": "1", ... },
  { "month": "2", ... }
]
```

**소요 시간**: 약 12~15초

## ✅ 정리

### 자동으로 처리되는 것들

1. ✅ **행 추가**: 각 월마다 자동으로 `[행추가]` 버튼 클릭
2. ✅ **월 선택**: 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2 모두 가능
3. ✅ **데이터 입력**: 교육목표, 내용, 방법, 평가
4. ✅ **저장**: 모든 월 입력 후 자동 저장
5. ✅ **진행 상황**: 실시간 진행률 표시 (1/12, 2/12, ...)

### 사용자가 해야 할 것

1. 웹사이트에서 "나이스로 복사" 클릭
2. 나이스 시스템에서 확장 프로그램 실행
3. "JSON 붙여넣기" → 붙여넣기 → "자동 입력 시작" 클릭
4. 15초 기다리기 ☕

**끝!** 🎉

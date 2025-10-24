(function () {
  const REQUEST_TYPE = 'NICE_BRIDGE_REQUEST';
  const RESPONSE_TYPE = 'NICE_BRIDGE_RESPONSE';

  // 선택자들 (title, aria-label 등 고정 속성 사용)
  const SELECTORS = {
    addRowBtn: '[title="행추가"]',
    saveBtn: '[title="저장"]',
    monthInput: '[title="월"] input',
    goalTextarea: '[title="교육목표"] textarea',
    contentTextarea: '[title="교육내용"] textarea',
    methodTextarea: '[title="교육방법"] textarea',
    evaluationTextarea: '[title="평가계획"] textarea'
  };

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 요소 찾기 (재시도 포함)
  async function findElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) {
        return el;
      }
      await delay(100);
    }
    return null;
  }

  // 요소 클릭 (중복 클릭 방지)
  function clickElement(element) {
    if (!element) {
      throw new Error('Element not found');
    }
    
    // click() 메서드만 사용 (dispatchEvent는 중복 클릭 유발)
    element.click();
  }

  // 입력 필드에 값 설정 (나이스 시스템이 인식할 수 있도록 모든 이벤트 발생)
  function setValue(element, value) {
    if (!element) {
      throw new Error('Element not found');
    }

    // 1. 포커스
    element.focus();

    // 2. 값 설정
    element.value = value;

    // 3. 모든 이벤트 발생 (나이스가 값 변경을 인식하도록)
    const events = [
      new Event('focus', { bubbles: true }),
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new Event('blur', { bubbles: true }),
      new KeyboardEvent('keyup', { bubbles: true })
    ];

    events.forEach(event => element.dispatchEvent(event));

    // 4. 포커스 해제
    element.blur();

    console.log(`[Bridge-DOM] 값 설정 완료: ${value.substring(0, 30)}...`);
  }

  // 초기화 확인
  async function handleEnsureApp() {
    console.log('[Bridge-DOM] 초기화 확인 중...');
    
    // 행추가 버튼이 있는지 확인
    const addBtn = await findElement(SELECTORS.addRowBtn, 3000);
    if (!addBtn) {
      throw new Error('월별계획 페이지를 찾을 수 없습니다');
    }

    console.log('[Bridge-DOM] ✅ 월별계획 페이지 확인됨');
    return {
      ready: true,
      message: '준비 완료'
    };
  }

  // 행 추가
  async function handleAddRow() {
    console.log('[Bridge-DOM] 행 추가 시작...');
    
    const addBtn = await findElement(SELECTORS.addRowBtn);
    if (!addBtn) {
      throw new Error('행추가 버튼을 찾을 수 없습니다');
    }

    clickElement(addBtn);
    console.log('[Bridge-DOM] ✅ 행추가 버튼 클릭 완료');
    
    // 행이 추가될 시간 대기
    await delay(500);
    
    return true;
  }

  // 월 선택 (combobox 드롭다운)
  async function handleSelectMonth(payload) {
    console.log('[Bridge-DOM] 월 선택 시작...', payload);
    
    const month = payload?.month || payload?.months?.[0];
    if (!month) {
      console.warn('[Bridge-DOM] 월 정보 없음');
      return false;
    }

    // 숫자만 추출 (예: "9월" -> "9")
    const monthNum = String(month).replace(/[^0-9]/g, '');
    console.log('[Bridge-DOM] 선택할 월:', monthNum);

    // 1. Combobox 찾기
    const combobox = await findElement('[role="combobox"][title="월"]', 3000);
    if (!combobox) {
      console.warn('[Bridge-DOM] 월 combobox를 찾을 수 없습니다');
      return false;
    }

    // 2. Listbox가 이미 열려있는지 확인
    let listbox = document.querySelector('.cl-combobox-list[role="listbox"]');
    
    if (!listbox) {
      // Listbox가 닫혀있으면 Combobox 클릭하여 열기
      console.log('[Bridge-DOM] Combobox 클릭 (listbox 열기)...');
      clickElement(combobox);
      await delay(300);

      // 3. 드롭다운 옵션 찾기
      // listbox가 나타날 때까지 대기 (.cl-combobox-list 클래스 사용)
      listbox = await findElement('.cl-combobox-list[role="listbox"]', 3000);
      if (!listbox) {
        console.warn('[Bridge-DOM] 드롭다운 listbox를 찾을 수 없습니다');
        return false;
      }
    } else {
      console.log('[Bridge-DOM] Listbox가 이미 열려있음');
    }

    console.log('[Bridge-DOM] Listbox 발견');

    // 학년도 처리: 1월, 2월은 data-id가 13, 14
    const expectedDataId = (monthNum === '1' || monthNum === '2') 
      ? String(parseInt(monthNum) + 12) 
      : monthNum;

    // 1월이나 2월을 찾는 경우, 키보드 이벤트로 listbox를 아래로 이동
    if (monthNum === '1' || monthNum === '2') {
      console.log('[Bridge-DOM] 1월 또는 2월 선택 - 키보드 이벤트로 끝까지 이동 중...');
      
      // combobox에 focus를 주고 End 키 또는 ArrowDown을 연속 전송
      combobox.focus();
      await delay(100);
      
      // 방법 1: End 키로 끝까지 이동
      combobox.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'End', 
        code: 'End',
        keyCode: 35,
        bubbles: true,
        cancelable: true
      }));
      await delay(100);
      
      // 방법 2: ArrowDown 키를 12번 눌러서 3월부터 2월까지 이동
      console.log('[Bridge-DOM] ArrowDown 키 12번 전송...');
      for (let i = 0; i < 12; i++) {
        combobox.dispatchEvent(new KeyboardEvent('keydown', { 
          key: 'ArrowDown', 
          code: 'ArrowDown',
          keyCode: 40,
          bubbles: true,
          cancelable: true
        }));
        combobox.dispatchEvent(new KeyboardEvent('keyup', { 
          key: 'ArrowDown', 
          code: 'ArrowDown',
          keyCode: 40,
          bubbles: true,
          cancelable: true
        }));
        await delay(80);
      }
      
      await delay(300); // DOM 렌더링 대기
      console.log('[Bridge-DOM] 키 이벤트 완료, DOM 다시 쿼리 중...');
    }

    // 4. 옵션들 중에서 해당 월 찾기 (data-id 속성 활용)
    // 스크롤 후 DOM이 업데이트되므로 다시 쿼리
    let options = listbox.querySelectorAll('[role="option"]');
    console.log('[Bridge-DOM] 옵션 개수:', options.length);
    
    // 디버깅: 모든 옵션 출력
    console.log('[Bridge-DOM] 사용 가능한 월:', 
      Array.from(options).map(opt => `${opt.textContent.trim()}(id:${opt.getAttribute('data-id')})`).join(', ')
    );

    let found = false;
    for (const option of options) {
      const dataId = option.getAttribute('data-id');
      const text = option.textContent.trim();
      
      // 정확한 매칭: data-id가 일치하거나, 텍스트가 정확히 "N월" 형태
      if (dataId === expectedDataId || text === (monthNum + '월')) {
        console.log('[Bridge-DOM] 옵션 찾음:', text, '(data-id:', dataId + ')');
        
        // 옵션이 화면에 보이도록 스크롤
        option.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        await delay(100);
        
        clickElement(option);
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn('[Bridge-DOM] 월 옵션을 찾을 수 없습니다:', monthNum);
      return false;
    }

    console.log('[Bridge-DOM] ✅ 월 선택 완료:', monthNum);
    
    // listbox가 사라질 때까지 대기 (자동으로 닫힘)
    await delay(100);
    
    // listbox가 사라졌는지 확인 (최대 1초 대기)
    const startWait = Date.now();
    while (Date.now() - startWait < 1000) {
      const stillOpen = document.querySelector('.cl-combobox-list[role="listbox"]');
      if (!stillOpen) {
        console.log('[Bridge-DOM] Listbox 닫힘 확인');
        break;
      }
      await delay(50);
    }
    
    await delay(100); // 추가 안정화 시간
    
    return true;
  }

  // 필드 설정 (각 필드 간 딜레이 추가)
  async function handleSetFields(payload) {
    console.log('[Bridge-DOM] 필드 설정 시작...', payload);
    
    const { goal, content, method, evaluation } = payload || {};

    // 교육목표
    if (goal !== undefined) {
      const goalEl = await findElement(SELECTORS.goalTextarea);
      if (goalEl) {
        setValue(goalEl, goal);
        await delay(300); // 필드 간 딜레이
      } else {
        console.warn('[Bridge-DOM] 교육목표 필드를 찾을 수 없습니다');
      }
    }

    // 교육내용
    if (content !== undefined) {
      const contentEl = await findElement(SELECTORS.contentTextarea);
      if (contentEl) {
        setValue(contentEl, content);
        await delay(300); // 필드 간 딜레이
      } else {
        console.warn('[Bridge-DOM] 교육내용 필드를 찾을 수 없습니다');
      }
    }

    // 교육방법
    if (method !== undefined) {
      const methodEl = await findElement(SELECTORS.methodTextarea);
      if (methodEl) {
        setValue(methodEl, method);
        await delay(300); // 필드 간 딜레이
      } else {
        console.warn('[Bridge-DOM] 교육방법 필드를 찾을 수 없습니다');
      }
    }

    // 평가계획
    if (evaluation !== undefined) {
      const evalEl = await findElement(SELECTORS.evaluationTextarea);
      if (evalEl) {
        setValue(evalEl, evaluation);
        await delay(300); // 필드 간 딜레이
      } else {
        console.warn('[Bridge-DOM] 평가계획 필드를 찾을 수 없습니다');
      }
    }

    console.log('[Bridge-DOM] ✅ 필드 설정 완료');
    await delay(500); // 저장 전 추가 대기
    
    return true;
  }

  // 저장
  async function handleSave() {
    console.log('[Bridge-DOM] 저장 시작...');
    
    const saveBtn = await findElement(SELECTORS.saveBtn);
    if (!saveBtn) {
      throw new Error('저장 버튼을 찾을 수 없습니다');
    }

    clickElement(saveBtn);
    console.log('[Bridge-DOM] ✅ 저장 버튼 클릭 완료');
    
    // 저장 완료 대기
    await delay(1000);
    
    return true;
  }

  // 학생 선택 (미구현 - 필요시 추가)
  async function handleEnsureStudent(payload) {
    console.log('[Bridge-DOM] 학생 선택 (현재 미구현)');
    return { selected: null };
  }

  // 핸들러 맵
  const handlers = {
    ensureApp: handleEnsureApp,
    addRow: handleAddRow,
    selectMonth: handleSelectMonth,
    setFields: handleSetFields,
    save: handleSave,
    ensureStudent: handleEnsureStudent
  };

  // 메시지 리스너
  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.type !== REQUEST_TYPE) {
      return;
    }

    const { requestId, action, payload } = event.data;

    const respond = (response) => {
      window.postMessage({
        type: RESPONSE_TYPE,
        requestId,
        ...response
      }, '*');
    };

    const handler = handlers[action];
    if (!handler) {
      respond({ success: false, error: `Unsupported action: ${action}` });
      return;
    }

    try {
      const data = await handler(payload || {});
      respond({ success: true, data });
    } catch (error) {
      console.error('[Bridge-DOM] 오류:', error);
      respond({ success: false, error: error?.message || String(error) });
    }
  });

  console.log('[나이스 자동입력] Bridge-DOM script initialized');
})();

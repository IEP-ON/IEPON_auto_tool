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
    evaluationTextarea: '[title="평가계획"] textarea',
    // 월별평가용 (평가 페이지에서 "평가" 필드)
    evalTextarea: '[aria-label*="평가계획"][title="평가계획"]:last-of-type textarea'
  };
  
  // 그리드 행 셀렉터 (평가 페이지용)
  const GRID_SELECTORS = {
    rows: '[role="row"]',
    monthCell: '[role="gridcell"][aria-label*="월"]'
  };

  // 입력 설정 (popup에서 전달받음)
  let inputConfig = {
    speed: 'normal',
    humanMode: true
  };

  // 속도 설정 (ms)
  const SPEED_SETTINGS = {
    fast: { charDelay: [5, 15], fieldDelay: [100, 200] },
    normal: { charDelay: [20, 60], fieldDelay: [200, 400] },
    slow: { charDelay: [50, 120], fieldDelay: [400, 700] }
  };

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 랜덤 딜레이 (사람처럼 불규칙하게)
  function randomDelay(min, max) {
    const base = Math.random() * (max - min) + min;
    // 가끔 약간 더 긴 딜레이 (생각하는 것처럼)
    const extra = Math.random() < 0.1 ? Math.random() * 100 : 0;
    return delay(base + extra);
  }

  // 한글 조합 처리를 위한 유틸리티
  function isKorean(char) {
    const code = char.charCodeAt(0);
    return (code >= 0xAC00 && code <= 0xD7AF) || // 완성형 한글
           (code >= 0x1100 && code <= 0x11FF) || // 한글 자모
           (code >= 0x3130 && code <= 0x318F);   // 호환용 한글 자모
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

  // 입력 필드에 값 설정 (사람처럼 타이핑)
  async function setValue(element, value) {
    if (!element) {
      throw new Error('Element not found');
    }

    const speedConfig = SPEED_SETTINGS[inputConfig.speed] || SPEED_SETTINGS.normal;

    // 1. 마우스 클릭으로 포커스 (사람처럼 약간의 딜레이)
    element.click();
    await randomDelay(30, 80);

    // 2. 포커스 설정
    element.focus();
    
    // 3. 기존 값 초기화
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await randomDelay(20, 50);

    if (inputConfig.humanMode) {
      // 사람처럼 한 글자씩 타이핑
      await typeHuman(element, value, speedConfig);
    } else {
      // 빠른 입력 모드
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 마무리 이벤트
    element.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'End', 
      bubbles: true,
      cancelable: true 
    }));
    element.dispatchEvent(new KeyboardEvent('keyup', { 
      key: 'End', 
      bubbles: true,
      cancelable: true 
    }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    console.log(`[Bridge-DOM] 값 설정 완료: ${value.substring(0, 30)}...`);
  }

  // 사람처럼 타이핑하는 함수
  async function typeHuman(element, text, speedConfig) {
    const [minDelay, maxDelay] = speedConfig.charDelay;
    
    // 청크 단위로 입력 (성능 최적화)
    const chunkSize = inputConfig.speed === 'fast' ? 10 : 
                      inputConfig.speed === 'slow' ? 1 : 3;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, Math.min(i + chunkSize, text.length));
      
      // 현재 값에 청크 추가
      element.value = text.slice(0, i + chunk.length);
      
      // input 이벤트 발생
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 청크 내 각 문자에 대해 keydown/keyup 이벤트 발생 (감지 방지)
      for (const char of chunk) {
        element.dispatchEvent(new KeyboardEvent('keydown', {
          key: char,
          bubbles: true,
          cancelable: true
        }));
        element.dispatchEvent(new KeyboardEvent('keyup', {
          key: char,
          bubbles: true,
          cancelable: true
        }));
      }
      
      // 랜덤 딜레이
      await randomDelay(minDelay, maxDelay);
      
      // 가끔 더 긴 정지 (단어 끝이나 문장 끝에서)
      if (chunk.includes(' ') || chunk.includes('.') || chunk.includes(',')) {
        await randomDelay(minDelay * 2, maxDelay * 2);
      }
    }
  }

  // 초기화 확인
  async function handleEnsureApp() {
    console.log('[Bridge-DOM] 초기화 확인 중...');
    
    // 행추가 버튼이 있는지 확인 (월별계획 페이지)
    const addBtn = await findElement(SELECTORS.addRowBtn, 2000);
    if (addBtn) {
      console.log('[Bridge-DOM] ✅ 월별계획 페이지 확인됨');
      return {
        ready: true,
        pageType: 'plan',
        message: '월별계획 페이지 준비 완료'
      };
    }
    
    // 저장 버튼이 있는지 확인 (월별평가 페이지)
    const saveBtn = await findElement(SELECTORS.saveBtn, 2000);
    if (saveBtn) {
      console.log('[Bridge-DOM] ✅ 월별평가 페이지 확인됨');
      return {
        ready: true,
        pageType: 'evaluation',
        message: '월별평가 페이지 준비 완료'
      };
    }

    throw new Error('월별계획/평가 페이지를 찾을 수 없습니다');
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
    
    // 행이 추가될 시간 대기 (최적화)
    await delay(400); // 800ms -> 400ms
    
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
    
    // listbox가 사라졌는지 확인 (최대 500ms 대기)
    const startWait = Date.now();
    while (Date.now() - startWait < 500) {
      const stillOpen = document.querySelector('.cl-combobox-list[role="listbox"]');
      if (!stillOpen) {
        console.log('[Bridge-DOM] Listbox 닫힘 확인');
        break;
      }
      await delay(50);
    }
    
    await delay(150); // 추가 안정화 시간 (300ms -> 150ms)
    
    return true;
  }

  // 필드 설정 (각 필드 간 딜레이 추가)
  async function handleSetFields(payload) {
    console.log('[Bridge-DOM] 필드 설정 시작...', payload);
    
    const { goal, content, method, evaluation, config } = payload || {};
    
    // 설정 업데이트
    if (config) {
      inputConfig = { ...inputConfig, ...config };
      console.log('[Bridge-DOM] 입력 설정:', inputConfig);
    }
    
    const speedConfig = SPEED_SETTINGS[inputConfig.speed] || SPEED_SETTINGS.normal;
    const [minFieldDelay, maxFieldDelay] = speedConfig.fieldDelay;

    // 교육목표
    if (goal !== undefined && goal !== '') {
      const goalEl = await findElement(SELECTORS.goalTextarea);
      if (goalEl) {
        await setValue(goalEl, goal);
        await randomDelay(minFieldDelay, maxFieldDelay);
      } else {
        console.warn('[Bridge-DOM] 교육목표 필드를 찾을 수 없습니다');
      }
    }

    // 교육내용
    if (content !== undefined && content !== '') {
      const contentEl = await findElement(SELECTORS.contentTextarea);
      if (contentEl) {
        await setValue(contentEl, content);
        await randomDelay(minFieldDelay, maxFieldDelay);
      } else {
        console.warn('[Bridge-DOM] 교육내용 필드를 찾을 수 없습니다');
      }
    }

    // 교육방법
    if (method !== undefined && method !== '') {
      const methodEl = await findElement(SELECTORS.methodTextarea);
      if (methodEl) {
        await setValue(methodEl, method);
        await randomDelay(minFieldDelay, maxFieldDelay);
      } else {
        console.warn('[Bridge-DOM] 교육방법 필드를 찾을 수 없습니다');
      }
    }

    // 평가계획 (마지막 필드)
    if (evaluation !== undefined && evaluation !== '') {
      const evalEl = await findElement(SELECTORS.evaluationTextarea);
      if (evalEl) {
        await setValue(evalEl, evaluation);
        
        // 마지막 필드 입력 후 명시적으로 포커스 해제
        evalEl.blur();
        await randomDelay(80, 150);
        
        // 마지막 필드이므로 대기 시간 필요 (값이 UI에 커밋되는 시간)
        console.log('[Bridge-DOM] 평가계획 입력 완료, UI 커밋 대기 중...');
        await randomDelay(minFieldDelay * 1.5, maxFieldDelay * 1.5);
      } else {
        console.warn('[Bridge-DOM] 평가계획 필드를 찾을 수 없습니다');
      }
    }

    // 모든 필드 입력 완료 후 body 클릭 (포커스를 완전히 빼냄)
    console.log('[Bridge-DOM] 모든 필드 입력 완료, 포커스 해제 중...');
    document.body.click();
    await randomDelay(100, 200);

    console.log('[Bridge-DOM] ✅ 필드 설정 완료');
    await randomDelay(minFieldDelay, maxFieldDelay);
    
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
    
    // 저장 완료 대기 (최적화)
    await delay(800); // 1500ms -> 800ms
    
    return true;
  }

  // 학생 선택 (미구현 - 필요시 추가)
  async function handleEnsureStudent(payload) {
    console.log('[Bridge-DOM] 학생 선택 (현재 미구현)');
    return { selected: null };
  }

  // 그리드에서 행 클릭 헬퍼
  async function clickRowCell(row) {
    const monthCell = row.querySelector('[role="gridcell"][aria-label*="월 "]');
    const numberCell = row.querySelector('[role="gridcell"][aria-label*="순번"]');
    const targetCell = numberCell || monthCell;
    
    if (!targetCell) return false;
    
    const rect = targetCell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY
    };
    
    targetCell.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
    await delay(50);
    targetCell.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
    await delay(50);
    targetCell.dispatchEvent(new MouseEvent('click', mouseOptions));
    await delay(300);
    
    return true;
  }
  
  // 그리드 스크롤 (개선됨: scrollTop 조작 + Wheel 이벤트)
  async function scrollGridDown(times = 3) {
    console.log(`[Bridge-DOM] 그리드 스크롤 시도 (강력 모드)...`);
    
    const rows = document.querySelectorAll('[role="row"]');
    if (rows.length === 0) return;

    const lastRow = rows[rows.length - 1];
    
    // 1. 스크롤 가능한 컨테이너 찾기
    let scrollContainer = null;
    
    // 그리드 요소
    const grid = document.querySelector('[role="grid"]');
    
    if (grid) {
       // 그리드 내부의 모든 div를 검사하여 스크롤 가능한 요소 찾기
       // eXbuilder6 등의 프레임워크는 보통 grid 내부에 별도의 body div가 있고 거기에 스크롤이 있음
       const divs = grid.querySelectorAll('div');
       for (const div of divs) {
           const style = window.getComputedStyle(div);
           // overflowY가 auto/scroll이고 실제 내용이 보여지는 높이보다 큰 경우
           if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
               scrollContainer = div;
               console.log('[Bridge-DOM] 그리드 내부 스크롤 영역 발견');
               break;
           }
       }
    }
    
    // 못 찾았으면 마지막 행의 부모들을 타고 올라가며 찾기
    if (!scrollContainer) {
        let parent = lastRow.parentElement;
        while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                scrollContainer = parent;
                console.log('[Bridge-DOM] 행의 부모에서 스크롤 영역 발견');
                break;
            }
            parent = parent.parentElement;
        }
    }

    // 스크롤 실행
    if (scrollContainer) {
        console.log(`[Bridge-DOM] scrollTop 조작: ${scrollContainer.scrollTop} -> +${150 * times}`);
        const scrollAmount = 150 * times; // 대략적인 행 높이 * 횟수
        scrollContainer.scrollTop += scrollAmount;
        
        // 스크롤 이벤트 강제 발송 (UI 업데이트 트리거)
        scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
        await delay(200);
    } else {
        console.log('[Bridge-DOM] 스크롤 컨테이너 못 찾음, lastRow.scrollIntoView(start) 시도');
        // 컨테이너를 못 찾으면 마지막 행을 화면 상단으로 올려서 강제로 아래 내용이 나오게 함
        lastRow.scrollIntoView({ behavior: 'auto', block: 'start' });
        await delay(200);
    }
    
    // 2. 휠 이벤트도 같이 발송 (보완책 - 일부 프레임워크는 휠 이벤트로 가상 스크롤 처리)
    const target = scrollContainer || grid || lastRow;
    if (target) {
        console.log('[Bridge-DOM] Wheel 이벤트 발송');
        for(let i=0; i<times; i++) {
             target.dispatchEvent(new WheelEvent('wheel', {
                deltaY: 100,
                bubbles: true,
                cancelable: true,
                view: window
            }));
            await delay(50);
        }
    }

    await delay(500); // 렌더링 대기
  }
  
  // 현재 보이는 행에서 월 찾기
  function findMonthRow(month) {
    const rows = document.querySelectorAll('[role="row"]');
    
    for (const row of rows) {
      const monthCell = row.querySelector('[role="gridcell"][aria-label*="월 "]');
      if (monthCell) {
        const cellText = monthCell.textContent.trim();
        if (cellText === String(month)) {
          return row;
        }
      }
    }
    return null;
  }

  // 그리드에서 특정 월 행 클릭
  async function handleSelectRowByMonth(payload) {
    const { month, config } = payload || {};
    console.log(`[Bridge-DOM] ${month}월 행 선택 시작...`);
    
    if (config) {
      inputConfig = { ...inputConfig, ...config };
    }
    
    // 1차 시도: 현재 화면에서 찾기
    let targetRow = findMonthRow(month);
    
    if (targetRow) {
      console.log(`[Bridge-DOM] ${month}월 행 찾음 (1차), 클릭`);
      await clickRowCell(targetRow);
      console.log(`[Bridge-DOM] ✅ ${month}월 행 선택 완료`);
      return true;
    }
    
    // 2차 시도: 아래로 스크롤 후 찾기
    console.log(`[Bridge-DOM] ${month}월 행 안 보임, 스크롤 시도...`);
    await scrollGridDown(3);
    
    targetRow = findMonthRow(month);
    if (targetRow) {
      console.log(`[Bridge-DOM] ${month}월 행 찾음 (스크롤 후), 클릭`);
      await clickRowCell(targetRow);
      console.log(`[Bridge-DOM] ✅ ${month}월 행 선택 완료`);
      return true;
    }
    
    // 3차 시도: 더 스크롤
    console.log(`[Bridge-DOM] 추가 스크롤 시도...`);
    await scrollGridDown(3);
    
    targetRow = findMonthRow(month);
    if (targetRow) {
      console.log(`[Bridge-DOM] ${month}월 행 찾음 (추가 스크롤 후), 클릭`);
      await clickRowCell(targetRow);
      console.log(`[Bridge-DOM] ✅ ${month}월 행 선택 완료`);
      return true;
    }
    
    console.warn(`[Bridge-DOM] ${month}월 행을 찾을 수 없습니다`);
    return false;
  }

  // 월별평가 - 평가 텍스트 입력
  async function handleSetEvalText(payload) {
    const { eval_text, config } = payload || {};
    console.log('[Bridge-DOM] 평가 텍스트 입력 시작...', eval_text);
    
    if (config) {
      inputConfig = { ...inputConfig, ...config };
    }
    
    const speedConfig = SPEED_SETTINGS[inputConfig.speed] || SPEED_SETTINGS.normal;
    const [minFieldDelay, maxFieldDelay] = speedConfig.fieldDelay;
    
    // 평가 필드 찾기: aria-label="평가계획"인 textarea 중 마지막 것 (평가 필드)
    // 평가 페이지에서는 "평가계획" textarea 다음에 "평가" textarea가 있음 (둘 다 aria-label="평가계획")
    const evalTextareas = document.querySelectorAll('textarea[aria-label="평가계획"]');
    console.log(`[Bridge-DOM] 평가계획 textarea 수: ${evalTextareas.length}`);
    
    let evalTextarea = null;
    
    // aria-label="평가계획"인 textarea 중 마지막 것이 "평가" 필드
    if (evalTextareas.length >= 2) {
      evalTextarea = evalTextareas[evalTextareas.length - 1];
    } else if (evalTextareas.length === 1) {
      // 하나뿐이면 그게 평가 필드
      evalTextarea = evalTextareas[0];
    }
    
    // 못 찾으면 마지막 빈 textarea
    if (!evalTextarea) {
      const allTextareas = document.querySelectorAll('textarea');
      for (let i = allTextareas.length - 1; i >= 0; i--) {
        if (allTextareas[i].value === '') {
          evalTextarea = allTextareas[i];
          console.log('[Bridge-DOM] 마지막 빈 textarea 사용');
          break;
        }
      }
    }
    
    if (!evalTextarea) {
      console.warn('[Bridge-DOM] 평가 필드를 찾을 수 없습니다');
      throw new Error('평가 필드를 찾을 수 없습니다');
    }
    
    console.log('[Bridge-DOM] 평가 필드 찾음, 입력 시작');
    await setValue(evalTextarea, eval_text);
    await randomDelay(minFieldDelay, maxFieldDelay);
    
    // 포커스 해제
    evalTextarea.blur();
    document.body.click();
    await randomDelay(100, 200);
    
    console.log('[Bridge-DOM] ✅ 평가 텍스트 입력 완료');
    return true;
  }

  // 핸들러 맵
  const handlers = {
    ensureApp: handleEnsureApp,
    addRow: handleAddRow,
    selectMonth: handleSelectMonth,
    setFields: handleSetFields,
    save: handleSave,
    ensureStudent: handleEnsureStudent,
    selectRowByMonth: handleSelectRowByMonth,
    setEvalText: handleSetEvalText
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

(function () {
  const REQUEST_TYPE = 'NICE_BRIDGE_DOM_REQUEST';
  const RESPONSE_TYPE = 'NICE_BRIDGE_DOM_RESPONSE';

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

  // 월 선택 (combobox 드롭다운 - 단일 또는 다중 선택 지원)
  async function handleSelectMonth(payload) {
    // 단일 월(month) 또는 다중 월(months) 처리 - 하위 호환성 유지
    let monthList = [];
    if (payload?.months && Array.isArray(payload.months)) {
      // 배열로 전달된 경우 (다중 월)
      monthList = payload.months.filter(m => m !== null && m !== undefined && String(m).trim() !== '');
    } else if (payload?.month) {
      // 단일 월로 전달된 경우 (기존 방식)
      monthList = [payload.month];
    }
    
    if (monthList.length === 0) {
      return false;
    }

    // 숫자만 추출하여 정규화 (예: "9월" -> "9", 9 -> "9")
    const normalizedMonths = monthList.map(m => String(m).replace(/[^0-9]/g, '')).filter(Boolean);
    
    if (normalizedMonths.length === 0) {
      return false;
    }
    
    // 월 정렬 (오름차순, 단 1월, 2월은 뒤로)
    const sortedMonths = normalizedMonths.map(m => parseInt(m)).sort((a, b) => {
      const aValue = (a === 1 || a === 2) ? a + 12 : a;
      const bValue = (b === 1 || b === 2) ? b + 12 : b;
      return aValue - bValue;
    });

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
      combobox.focus();
      await delay(100);
      clickElement(combobox);
      await delay(300);

      // 드롭다운 옵션 찾기
      listbox = await findElement('.cl-combobox-list[role="listbox"]', 3000);
      if (!listbox) {
        console.warn('[Bridge-DOM] 드롭다운 listbox를 찾을 수 없습니다');
        return false;
      }
    } else {
      combobox.focus();
      await delay(100);
    }

    // 3. Home 키로 처음으로 이동
    combobox.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'Home', 
      code: 'Home',
      keyCode: 36,
      bubbles: true,
      cancelable: true
    }));
    await delay(150);

    // 4. 각 월을 키보드로 선택 (사람처럼)
    let selectedCount = 0;
    let currentPosition = 3; // 3월부터 시작 (Home 키로 이동 후 첫 위치)
    
    for (const targetMonth of sortedMonths) {
      // 학년도 처리: 1월, 2월은 data-id가 13, 14
      const targetPosition = (targetMonth === 1 || targetMonth === 2) 
        ? targetMonth + 12 
        : targetMonth;
      
      // ArrowDown으로 목표 월까지 이동
      const stepsToMove = targetPosition - currentPosition;
      if (stepsToMove > 0) {
        for (let i = 0; i < stepsToMove; i++) {
          combobox.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'ArrowDown', 
            code: 'ArrowDown',
            keyCode: 40,
            bubbles: true,
            cancelable: true
          }));
          await delay(50);
        }
      } else if (stepsToMove < 0) {
        // 위로 이동 (ArrowUp)
        for (let i = 0; i < Math.abs(stepsToMove); i++) {
          combobox.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'ArrowUp', 
            code: 'ArrowUp',
            keyCode: 38,
            bubbles: true,
            cancelable: true
          }));
          await delay(50);
        }
      }
      
      currentPosition = targetPosition;
      await delay(100);
      
      // Enter 키로 선택
      combobox.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter',
        keyCode: 13,
        bubbles: true,
        cancelable: true
      }));
      await delay(150);
      
      selectedCount++;
    }

    if (selectedCount === 0) {
      return false;
    }

    // 5. Escape 키로 닫기
    combobox.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'Escape', 
      code: 'Escape',
      keyCode: 27,
      bubbles: true,
      cancelable: true
    }));
    await delay(200);
    
    // listbox가 사라졌는지 확인 (최대 500ms 대기)
    const startWait = Date.now();
    while (Date.now() - startWait < 500) {
      const stillOpen = document.querySelector('.cl-combobox-list[role="listbox"]');
      if (!stillOpen) {
        break;
      }
      await delay(50);
    }
    
    await delay(150);
    
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

  // 그리드에서 행 클릭 헬퍼 (강화됨)
  async function clickRowCell(row) {
    console.log('[Bridge-DOM] 행 클릭 시작...');
    
    // 클릭할 셀 찾기 (순번 셀 우선, 없으면 첫 번째 셀)
    let targetCell = row.querySelector('[role="gridcell"][aria-label*="순번"]');
    
    if (!targetCell) {
      targetCell = row.querySelector('[role="gridcell"][aria-label*="월 "]');
    }
    
    if (!targetCell) {
      // 첫 번째 gridcell 사용
      const allCells = row.querySelectorAll('[role="gridcell"]');
      if (allCells.length > 0) {
        targetCell = allCells[0];
      }
    }
    
    if (!targetCell) {
      console.error('[Bridge-DOM] 클릭할 셀을 찾을 수 없습니다');
      return false;
    }
    
    console.log(`[Bridge-DOM] 클릭할 셀: ${targetCell.textContent.trim()}`);
    
    // 셀을 화면에 보이게 스크롤
    targetCell.scrollIntoView({ behavior: 'auto', block: 'center' });
    await delay(100);
    
    const rect = targetCell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    console.log(`[Bridge-DOM] 클릭 좌표: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
    
    const mouseOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY
    };
    
    // 마우스 이벤트 시퀀스
    targetCell.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
    await delay(50);
    targetCell.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
    await delay(50);
    targetCell.dispatchEvent(new MouseEvent('click', mouseOptions));
    await delay(100);
    
    // 더블클릭도 시도 (일부 그리드는 더블클릭으로 선택)
    targetCell.dispatchEvent(new MouseEvent('dblclick', mouseOptions));
    await delay(300);
    
    // 클릭한 행 저장 (평가 텍스트 입력 시 사용)
    lastSelectedRow = row;
    console.log('[Bridge-DOM] ✅ 행 클릭 완료, 선택된 행 저장됨');
    
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
  
  // 마지막으로 선택한 행 저장 (평가 텍스트 입력 시 사용)
  let lastSelectedRow = null;

  // 현재 보이는 행에서 월 찾기 (개선: 유연한 매칭)
  function findMonthRow(month) {
    const targetMonth = String(month).replace(/[^0-9]/g, '');
    const rows = document.querySelectorAll('[role="row"]');
    
    for (const row of rows) {
      // 1차: aria-label에 "월 " 포함된 셀에서 찾기
      const monthCell = row.querySelector('[role="gridcell"][aria-label*="월 "]');
      if (monthCell) {
        const cellText = monthCell.textContent.trim();
        // 숫자만 추출해서 비교 (예: "9월" → "9", "9 " → "9")
        const cellMonth = cellText.replace(/[^0-9]/g, '');
        if (cellMonth === targetMonth) {
          return row;
        }
      }
      
      // 2차: 셀 내용에서 직접 월 숫자 찾기
      const allCells = row.querySelectorAll('[role="gridcell"]');
      for (const cell of allCells) {
        const cellText = cell.textContent.trim();
        // 정확히 월 숫자만 있는 경우 (예: "9", "10", "11")
        if (/^\d{1,2}$/.test(cellText) && cellText === targetMonth) {
          return row;
        }
      }
    }
    return null;
  }

  // 그리드를 맨 위로 스크롤 (강화됨)
  async function scrollGridToTop() {
    console.log('[Bridge-DOM] ========== 그리드 맨 위로 스크롤 ==========');
    
    const grid = document.querySelector('[role="grid"]');
    
    // 1. 스크롤 가능한 컨테이너 찾기
    let scrollContainer = null;
    
    if (grid) {
      const divs = grid.querySelectorAll('div');
      for (const div of divs) {
        const style = window.getComputedStyle(div);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
          scrollContainer = div;
          console.log('[Bridge-DOM] 스크롤 컨테이너 발견');
          break;
        }
      }
    }
    
    // 2. 스크롤 실행
    if (scrollContainer) {
      console.log(`[Bridge-DOM] scrollTop: ${scrollContainer.scrollTop} → 0`);
      scrollContainer.scrollTop = 0;
      scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
      await delay(300);
    }
    
    // 3. 첫 번째 데이터 행으로 스크롤 (보완책)
    const rows = document.querySelectorAll('[role="row"]');
    for (const row of rows) {
      const cells = row.querySelectorAll('[role="gridcell"]');
      if (cells.length > 0) {
        const firstCellText = cells[0].textContent.trim();
        if (firstCellText === '1') {
          console.log('[Bridge-DOM] 순번 1번 행으로 scrollIntoView');
          row.scrollIntoView({ behavior: 'auto', block: 'center' });
          await delay(300);
          break;
        }
      }
    }
    
    // 4. Home 키 이벤트 발송 (추가 보완책)
    if (grid) {
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await delay(200);
    }
    
    console.log('[Bridge-DOM] 그리드 맨 위로 스크롤 완료');
  }

  // 단일 월 행 찾고 선택하는 내부 헬퍼 (개선: 반복 스크롤)
  async function selectSingleMonthRow(month, resetScroll = false) {
    const MAX_SCROLL_ATTEMPTS = 10; // 최대 스크롤 시도 횟수
    
    // 필요 시 맨 위로 초기화
    if (resetScroll) {
      await scrollGridToTop();
    }
    
    // 1차 시도: 현재 화면에서 찾기
    let targetRow = findMonthRow(month);
    
    if (targetRow) {
      console.log(`[Bridge-DOM] ${month}월 행 찾음 (현재 화면), 클릭`);
      await clickRowCell(targetRow);
      return true;
    }
    
    // 반복 스크롤하며 찾기
    for (let attempt = 1; attempt <= MAX_SCROLL_ATTEMPTS; attempt++) {
      console.log(`[Bridge-DOM] ${month}월 행 안 보임, 스크롤 시도 ${attempt}/${MAX_SCROLL_ATTEMPTS}...`);
      await scrollGridDown(2);
      
      targetRow = findMonthRow(month);
      if (targetRow) {
        console.log(`[Bridge-DOM] ${month}월 행 찾음 (스크롤 ${attempt}회 후), 클릭`);
        await clickRowCell(targetRow);
        return true;
      }
      
      // 더 이상 스크롤할 수 없는지 확인 (같은 행들이 계속 보이면 종료)
      const visibleMonths = getVisibleMonths();
      if (visibleMonths.length > 0) {
        const maxVisibleMonth = Math.max(...visibleMonths.map(m => {
          const num = parseInt(m);
          return (num === 1 || num === 2) ? num + 12 : num;
        }));
        const targetMonthValue = (parseInt(month) === 1 || parseInt(month) === 2) ? parseInt(month) + 12 : parseInt(month);
        
        // 이미 대상 월을 지나쳤으면 맨 위에서 다시 시도
        if (maxVisibleMonth > targetMonthValue && attempt === 1) {
          console.log(`[Bridge-DOM] 대상 월(${month})을 지나침, 맨 위로 이동 후 재시도`);
          await scrollGridToTop();
          continue;
        }
      }
    }
    
    console.warn(`[Bridge-DOM] ${month}월 행을 찾을 수 없습니다 (${MAX_SCROLL_ATTEMPTS}회 스크롤 후)`);
    return false;
  }
  
  // 현재 보이는 월 목록 반환
  function getVisibleMonths() {
    const months = [];
    const rows = document.querySelectorAll('[role="row"]');
    for (const row of rows) {
      const monthCell = row.querySelector('[role="gridcell"][aria-label*="월 "]');
      if (monthCell) {
        const cellText = monthCell.textContent.trim();
        if (/^\d+$/.test(cellText)) {
          months.push(cellText);
        }
      }
    }
    return months;
  }

  // 그리드에서 특정 월 행 클릭 (다중 월 지원) - 기존 방식 (월별계획용)
  async function handleSelectRowByMonth(payload) {
    const { month, months, config, isFirst } = payload || {};
    
    if (config) {
      inputConfig = { ...inputConfig, ...config };
    }
    
    // 다중 월 또는 단일 월 처리
    let monthList = [];
    if (months && Array.isArray(months) && months.length > 0) {
      monthList = months.map(m => String(m).replace(/[^0-9]/g, '')).filter(Boolean);
    } else if (month) {
      monthList = [String(month).replace(/[^0-9]/g, '')];
    }
    
    if (monthList.length === 0) {
      console.warn('[Bridge-DOM] 선택할 월이 없습니다');
      return false;
    }
    
    // 학년도 순서로 정렬 (3월~2월)
    const sortedMonths = monthList.map(m => parseInt(m)).sort((a, b) => {
      const aValue = (a === 1 || a === 2) ? a + 12 : a;
      const bValue = (b === 1 || b === 2) ? b + 12 : b;
      return aValue - bValue;
    });
    
    // 첫 번째 항목일 경우 그리드를 맨 위로 초기화
    const resetScroll = isFirst === true;
    
    if (sortedMonths.length === 1) {
      // 단일 월
      console.log(`[Bridge-DOM] ${sortedMonths[0]}월 행 선택 시작...${resetScroll ? ' (그리드 초기화)' : ''}`);
      const result = await selectSingleMonthRow(sortedMonths[0], resetScroll);
      if (result) {
        console.log(`[Bridge-DOM] ✅ ${sortedMonths[0]}월 행 선택 완료`);
      }
      return result;
    }
    
    // 다중 월: 첫 번째 월(학년도 기준 가장 이른 월)을 선택
    // 나이스 월별평가 그리드는 첫 번째 월 기준으로 행이 구성됨
    const firstMonth = sortedMonths[0];
    console.log(`[Bridge-DOM] 그룹 월(${sortedMonths.join(', ')}) 중 첫 번째 월(${firstMonth}월) 행 선택 시작...${resetScroll ? ' (그리드 초기화)' : ''}`);
    
    const result = await selectSingleMonthRow(firstMonth, resetScroll);
    if (result) {
      console.log(`[Bridge-DOM] ✅ 그룹 월 대표(${firstMonth}월) 행 선택 완료`);
    }
    return result;
  }

  // 순번 기반 행 선택 (월별평가용) - 키보드 네비게이션 방식
  // 첫 번째 항목: 순번 1 클릭
  // 이후 항목: 현재 행 클릭 → ArrowDown → 다음 행 자동 선택
  async function handleSelectRowByIndex(payload) {
    const { index, isFirst, config } = payload || {};
    
    if (config) {
      inputConfig = { ...inputConfig, ...config };
    }
    
    const targetIndex = parseInt(index);
    if (isNaN(targetIndex) || targetIndex < 0) {
      console.warn('[Bridge-DOM] 유효하지 않은 인덱스:', index);
      return false;
    }
    
    const targetNumber = targetIndex + 1; // 0-based → 1-based
    console.log(`[Bridge-DOM] ========== 순번 ${targetNumber}번 행 선택 시작 ==========`);
    console.log(`[Bridge-DOM] isFirst=${isFirst}`);
    
    // 월별평가 그리드 찾기
    const evalGrid = document.querySelector('[title="월별개별화교육평가 테이블"]');
    if (!evalGrid) {
      console.error('[Bridge-DOM] 월별평가 그리드를 찾을 수 없습니다');
      return false;
    }
    
    // 데이터 영역만 대상으로
    const dataArea = evalGrid.querySelector('.cl-grid-detail');
    if (!dataArea) {
      console.error('[Bridge-DOM] 데이터 영역을 찾을 수 없습니다');
      return false;
    }
    
    // 순번 1 행 찾기 함수 (데이터 영역만 검색)
    const findFirstRow = () => {
      const dataRows = dataArea.querySelectorAll('[role="row"]');
      console.log(`[Bridge-DOM] 데이터 영역의 행 수: ${dataRows.length}`);
      
      if (dataRows.length === 0) {
        return null;
      }
      
      // 첫 번째 데이터 행 반환 (가상화된 그리드의 첫 행)
      const firstRow = dataRows[0];
      console.log('[Bridge-DOM] 첫 번째 데이터 행 발견!');
      return firstRow;
    };
    
    // ===== 첫 번째 항목 (isFirst=true): 순번 1을 직접 찾아서 클릭 =====
    if (isFirst) {
      console.log('[Bridge-DOM] 첫 항목: 데이터 영역의 첫 행 찾기');
      
      await delay(300);
      
      // 순번 1 행 찾기
      const firstRow = findFirstRow();
      
      if (firstRow) {
        console.log('[Bridge-DOM] 순번 1번 행 클릭');
        firstRow.click();
        await delay(500);
        lastSelectedRow = firstRow; // 선택된 행 저장
        console.log('[Bridge-DOM] ✅ 순번 1번 행 선택 완료');
        return true;
      } else {
        console.error('[Bridge-DOM] ❌ 순번 1번 행을 찾을 수 없습니다');
        return false;
      }
    }
    
    // ===== 이후 항목 (isFirst=false): 현재 행 클릭 → ArrowDown =====
    console.log(`[Bridge-DOM] 다음 항목: ArrowDown으로 순번 ${targetNumber}번으로 이동`);
    
    // 현재 선택된 행 찾기 (데이터 영역에서만)
    let currentRow = dataArea.querySelector('[role="row"].cl-selected, [role="row"][aria-selected="true"]');
    
    if (!currentRow) {
      console.error('[Bridge-DOM] 현재 선택된 행을 찾을 수 없습니다');
      return false;
    }
    
    // 현재 행의 순번 확인 (디버깅용)
    const currentIndexCell = currentRow.querySelector('[data-cellindex="1"] .cl-text');
    const currentIndex = currentIndexCell ? parseInt(currentIndexCell.textContent.trim()) : 0;
    console.log(`[Bridge-DOM] 현재 순번: ${currentIndex}, 목표 순번: ${targetNumber}`);
    
    // 현재 행 클릭
    console.log(`[Bridge-DOM] 현재 행 클릭 (순번: ${currentIndex})`);
    currentRow.click();
    await delay(300);
    
    // ArrowDown 키로 다음 행 이동
    console.log('[Bridge-DOM] ArrowDown 키로 다음 행 이동');
    currentRow.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      code: 'ArrowDown',
      keyCode: 40,
      which: 40,
      bubbles: true,
      cancelable: true
    }));
    
    await delay(500);
    
    // 새로 선택된 행 저장
    const newSelectedRow = dataArea.querySelector('[role="row"].cl-selected, [role="row"][aria-selected="true"]');
    if (newSelectedRow) {
      lastSelectedRow = newSelectedRow;
      console.log(`[Bridge-DOM] ✅ 순번 ${targetNumber}번 행 선택 완료 (ArrowDown)`);
      return true;
    } else {
      console.warn(`[Bridge-DOM] ⚠️ 선택된 행을 확인할 수 없지만 ArrowDown 실행됨`);
      // ArrowDown을 실행했으므로 true 반환 (다음 항목에서 확인)
      if (currentRow) {
        lastSelectedRow = currentRow; // 현재 행을 저장
      }
      return true;
    }
  }

  // 월별평가 - 평가 텍스트 입력
  async function handleSetEvalText(payload) {
    const { eval_text, config } = payload || {};
    console.log('[Bridge-DOM] 평가 텍스트 입력 시작...', eval_text?.substring(0, 30) + '...');
    
    if (config) {
      inputConfig = { ...inputConfig, ...config };
    }
    
    const speedConfig = SPEED_SETTINGS[inputConfig.speed] || SPEED_SETTINGS.normal;
    const [minFieldDelay, maxFieldDelay] = speedConfig.fieldDelay;
    
    let evalTextarea = null;
    
    // 1순위: 마지막으로 선택한 행 내부의 textarea 찾기
    if (lastSelectedRow && document.body.contains(lastSelectedRow)) {
      console.log('[Bridge-DOM] 선택된 행 내부에서 textarea 검색...');
      
      // 선택된 행 내부의 모든 textarea 찾기
      const rowTextareas = lastSelectedRow.querySelectorAll('textarea');
      console.log(`[Bridge-DOM] 선택된 행 내 textarea 수: ${rowTextareas.length}`);
      
      if (rowTextareas.length > 0) {
        // 마지막 textarea가 평가 필드 (보통 평가계획, 평가 순서)
        evalTextarea = rowTextareas[rowTextareas.length - 1];
        console.log('[Bridge-DOM] ✅ 선택된 행 내 textarea 사용');
      }
    }
    
    // 2순위: 현재 활성화된 행(aria-selected) 내부 검색
    if (!evalTextarea) {
      const selectedRow = document.querySelector('[role="row"][aria-selected="true"]');
      if (selectedRow) {
        console.log('[Bridge-DOM] aria-selected 행에서 textarea 검색...');
        const rowTextareas = selectedRow.querySelectorAll('textarea');
        if (rowTextareas.length > 0) {
          evalTextarea = rowTextareas[rowTextareas.length - 1];
          console.log('[Bridge-DOM] ✅ aria-selected 행 내 textarea 사용');
        }
      }
    }
    
    // 3순위: 포커스된 요소의 부모 행에서 검색
    if (!evalTextarea) {
      const activeElement = document.activeElement;
      if (activeElement) {
        const parentRow = activeElement.closest('[role="row"]');
        if (parentRow) {
          console.log('[Bridge-DOM] 포커스된 요소의 부모 행에서 textarea 검색...');
          const rowTextareas = parentRow.querySelectorAll('textarea');
          if (rowTextareas.length > 0) {
            evalTextarea = rowTextareas[rowTextareas.length - 1];
            console.log('[Bridge-DOM] ✅ 포커스 행 내 textarea 사용');
          }
        }
      }
    }
    
    // 4순위 (fallback): 페이지 전체에서 aria-label="평가계획" textarea 검색
    if (!evalTextarea) {
      console.log('[Bridge-DOM] fallback: 전체 페이지에서 textarea 검색...');
    const evalTextareas = document.querySelectorAll('textarea[aria-label="평가계획"]');
    console.log(`[Bridge-DOM] 평가계획 textarea 수: ${evalTextareas.length}`);
    
    if (evalTextareas.length >= 2) {
      evalTextarea = evalTextareas[evalTextareas.length - 1];
    } else if (evalTextareas.length === 1) {
      evalTextarea = evalTextareas[0];
      }
    }
    
    // 5순위: 마지막 빈 textarea
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

  // 페이지 유형 감지 (빠른 감지용 - 팝업에서 호출)
  async function handleDetectPageType() {
    console.log('[Bridge-DOM] 페이지 유형 감지 중...');
    
    // 행추가 버튼이 있는지 확인 (월별계획 페이지)
    const addBtn = document.querySelector(SELECTORS.addRowBtn);
    if (addBtn) {
      console.log('[Bridge-DOM] ✅ 월별계획 페이지 감지됨');
      return { pageType: 'plan' };
    }
    
    // 저장 버튼이 있는지 확인 (월별평가 페이지)
    const saveBtn = document.querySelector(SELECTORS.saveBtn);
    if (saveBtn) {
      console.log('[Bridge-DOM] ✅ 월별평가 페이지 감지됨');
      return { pageType: 'evaluation' };
    }

    console.log('[Bridge-DOM] ⚠️ 페이지 유형을 감지할 수 없음');
    return { pageType: null };
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
    selectRowByIndex: handleSelectRowByIndex,
    setEvalText: handleSetEvalText,
    detectPageType: handleDetectPageType
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

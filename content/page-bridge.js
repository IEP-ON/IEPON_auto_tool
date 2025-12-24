(function () {
  const APP_ID = 'edu/sw/els/iep/ss/els_iepss00_m04';
  const REQUEST_TYPE = 'NICE_BRIDGE_REQUEST';
  const RESPONSE_TYPE = 'NICE_BRIDGE_RESPONSE';

  const state = {
    app: null,
    grid: null,
    dataSet: null,
    studentGrid: null,
    searchDataMap: null,
    monthCombo: null,
    monthInput: null
  };

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitForCPR(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (window.cpr?.core?.Platform?.INSTANCE) {
        console.log('[Bridge] CPR 프레임워크 감지됨');
        return true;
      }
      await delay(200);
    }
    console.error('[Bridge] CPR 프레임워크를 찾을 수 없습니다');
    throw new Error('CPR framework unavailable');
  }

  async function waitForApp(timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const platform = window.cpr?.core?.Platform?.INSTANCE;
        if (!platform) {
          await delay(200);
          continue;
        }

        // platform.lookup이 함수인지 확인
        if (typeof platform.lookup !== 'function') {
          console.error('[Bridge] Platform.INSTANCE.lookup이 함수가 아닙니다:', typeof platform.lookup);
          await delay(200);
          continue;
        }

        // 방법 1: 특정 APP_ID로 찾기
        let app = platform.lookup(APP_ID);
        if (app && typeof app.lookup === 'function') {
          console.log('[Bridge] 앱을 APP_ID로 찾았습니다:', APP_ID);
          return app;
        }

        // 방법 2: 활성 앱 가져오기
        if (typeof platform.getActiveApplication === 'function') {
          app = platform.getActiveApplication();
          if (app && typeof app.lookup === 'function') {
            console.log('[Bridge] 활성 앱을 찾았습니다');
            return app;
          }
        }

        // 방법 3: 전역 lookup으로 컴포넌트 직접 찾기 (가장 확실한 방법)
        // grdListMnbyIduzEdu 컴포넌트가 있는지 확인
        const testGrid = platform.lookup('grdListMnbyIduzEdu');
        if (testGrid) {
          console.log('[Bridge] ✅ 전역 lookup으로 월별계획 그리드를 찾았습니다!');
          console.log('[Bridge] Platform을 app으로 사용합니다.');
          // Platform 자체를 app으로 사용
          return platform;
        }

        // 방법 4: 다른 필수 컴포넌트로도 시도
        const testDataSet = platform.lookup('dsSearchMnbyIduzEduPlan');
        if (testDataSet) {
          console.log('[Bridge] ✅ 전역 lookup으로 데이터셋을 찾았습니다!');
          console.log('[Bridge] Platform을 app으로 사용합니다.');
          return platform;
        }

        // 디버깅: 현재 페이지에 어떤 컴포넌트가 있는지 확인
        if (Date.now() - start > 5000) { // 5초 후부터는 디버깅 정보 출력
          try {
            console.log('[Bridge] 🔍 디버깅: 사용 가능한 컴포넌트 찾기 시도...');
            
            // Platform의 µMO (컴포넌트 맵) 확인
            if (platform.µMO && typeof platform.µMO === 'object') {
              const componentIds = Object.keys(platform.µMO);
              console.log('[Bridge] 발견된 컴포넌트 개수:', componentIds.length);
              if (componentIds.length > 0) {
                console.log('[Bridge] 컴포넌트 ID 목록 (처음 20개):', componentIds.slice(0, 20));
                
                // 월별계획 관련 컴포넌트 찾기
                const monthlyPlanComponents = componentIds.filter(id => 
                  id.includes('Mnby') || id.includes('mnby') || 
                  id.includes('Iduz') || id.includes('iduz') ||
                  id.includes('Edu') || id.includes('edu')
                );
                if (monthlyPlanComponents.length > 0) {
                  console.log('[Bridge] 월별계획 관련 컴포넌트:', monthlyPlanComponents);
                }
              }
            }
          } catch (debugError) {
            console.error('[Bridge] 디버깅 정보 수집 실패:', debugError);
          }
        }
        
        await delay(500);
      } catch (error) {
        console.error('[Bridge] waitForApp 오류:', error);
        await delay(200);
      }
    }
    
    // 디버깅 정보 출력
    try {
      console.error('[Bridge] 앱을 찾지 못했습니다. CPR 상태:');
      console.error('- Platform:', window.cpr?.core?.Platform?.INSTANCE);
      console.error('- Platform.lookup:', typeof window.cpr?.core?.Platform?.INSTANCE?.lookup);
    } catch (e) {
      console.error('[Bridge] 디버깅 정보 출력 실패:', e);
    }
    
    throw new Error('Target app not found or app.lookup is not a function');
  }

  async function ensureInitialized() {
    if (state.app && typeof state.app.lookup === 'function') {
      console.log('[Bridge] 이미 초기화됨');
      return;
    }

    console.log('[Bridge] 초기화 시작...');
    await waitForCPR();
    state.app = await waitForApp();

    // app.lookup이 함수인지 다시 확인
    if (!state.app || typeof state.app.lookup !== 'function') {
      throw new Error('App object is invalid or missing lookup function');
    }

    console.log('[Bridge] UI 컴포넌트 조회 중...');
    
    try {
      state.grid = state.app.lookup('grdListMnbyIduzEdu');
      state.dataSet = state.app.lookup('dsSearchMnbyIduzEduPlan');
      state.studentGrid = state.app.lookup('grdStuList');
      state.searchDataMap = state.app.lookup('dmSearch');
      state.monthCombo = state.app.lookup('cmbMnbyIduzEduPlanMmntValue');
      state.monthInput = state.app.lookup('ipbMnbyIduzEduPlanMmntValue');

      console.log('[Bridge] 컴포넌트 조회 결과:', {
        grid: !!state.grid,
        dataSet: !!state.dataSet,
        studentGrid: !!state.studentGrid,
        searchDataMap: !!state.searchDataMap,
        monthCombo: !!state.monthCombo,
        monthInput: !!state.monthInput
      });

      if (!state.grid || !state.dataSet) {
        throw new Error('필수 UI 컴포넌트를 찾을 수 없습니다 (grid 또는 dataSet이 없음)');
      }
      
      console.log('[Bridge] 초기화 완료');
    } catch (error) {
      console.error('[Bridge] UI 컴포넌트 조회 실패:', error);
      throw error;
    }
  }

  function resolveRowIndex(preferred) {
    if (typeof preferred === 'number' && preferred >= 0) {
      return preferred;
    }

    const index = state.grid.getSelectedRowIndex?.();
    return typeof index === 'number' && index >= 0 ? index : null;
  }

  async function handleEnsureApp() {
    await ensureInitialized();
    return {
      gridReady: !!state.grid,
      dataSetRows: state.dataSet?.getRowCount?.() ?? null,
      studentRows: state.studentGrid?.getRowCount?.() ?? null
    };
  }

  async function handleAddRow() {
    await ensureInitialized();
    
    if (!state.app || typeof state.app.lookup !== 'function') {
      throw new Error('앱이 초기화되지 않았습니다');
    }
    
    const btn = state.app.lookup('btnAddRow');
    if (!btn) {
      throw new Error('행추가 버튼을 찾을 수 없습니다');
    }
    
    console.log('[Bridge] 행 추가 실행');
    btn.click();
    await delay(500);
    return true;
  }

  async function handleSelectMonth(payload) {
    await ensureInitialized();

    const months = Array.isArray(payload?.months) ? payload.months : [payload?.month ?? ''];
    const cleaned = months
      .map(value => (value === null || value === undefined ? '' : String(value).trim()))
      .filter(Boolean);

    if (cleaned.length === 0) {
      return false;
    }

    const firstValue = cleaned[0];
    const year = state.searchDataMap?.getValue?.('ayr');
    const numericMonth = parseInt(firstValue, 10);

    if (parseInt(year, 10) >= 2024 && state.monthCombo) {
      if (!Number.isNaN(numericMonth) && typeof state.monthCombo.open === 'function') {
        state.monthCombo.open();
        const items = state.monthCombo.getItems ? state.monthCombo.getItems() : [];
        const target = items.find(item => {
          const label = String(item?.label ?? item?.content ?? '').replace(/[^0-9]/g, '');
          return label === String(numericMonth);
        });
        if (target) {
          state.monthCombo.selectItem(target.value ?? target.label ?? firstValue);
        } else {
          state.monthCombo.value = cleaned.join(', ');
        }
      } else {
        state.monthCombo.value = cleaned.join(', ');
      }
    } else if (state.monthInput) {
      state.monthInput.value = firstValue;
    }

    const targetRow = resolveRowIndex(payload?.rowIndex);
    if (targetRow !== null) {
      state.dataSet?.setValue?.(targetRow, 'mnbyIduzEduMmntValue', firstValue);
    }

    return true;
  }

  async function handleSetFields(payload) {
    await ensureInitialized();
    
    if (!state.app || typeof state.app.lookup !== 'function') {
      throw new Error('앱이 초기화되지 않았습니다');
    }
    
    const { rowIndex, goal, content, method, evaluation } = payload || {};
    const targetRow = resolveRowIndex(rowIndex);
    
    console.log('[Bridge] 필드 설정 중...', { rowIndex: targetRow, goal, content, method, evaluation });

    const txaGoal = state.app.lookup('txaMnbyIduzEduGoalCn');
    if (txaGoal && goal !== undefined) {
      txaGoal.value = goal;
      if (targetRow !== null) {
        state.dataSet?.setValue?.(targetRow, 'mnbyIduzEduGoalCn', goal);
      }
    }

    const txaContent = state.app.lookup('txaMnbyIduzEduCn');
    if (txaContent && content !== undefined) {
      txaContent.value = content;
      if (targetRow !== null) {
        state.dataSet?.setValue?.(targetRow, 'mnbyIduzEduCn', content);
      }
    }

    const txaMethod = state.app.lookup('txaMnbyIduzEduMthCn');
    if (txaMethod && method !== undefined) {
      txaMethod.value = method;
      if (targetRow !== null) {
        state.dataSet?.setValue?.(targetRow, 'mnbyIduzEduMthCn', method);
      }
    }

    const txaEval = state.app.lookup('txaEvlCriaCn');
    if (txaEval && evaluation !== undefined) {
      txaEval.value = evaluation;
      if (targetRow !== null) {
        state.dataSet?.setValue?.(targetRow, 'evlCriaCn', evaluation);
      }
    }

    console.log('[Bridge] 필드 설정 완료');
    return true;
  }

  async function handleSave() {
    await ensureInitialized();
    
    if (!state.app || typeof state.app.lookup !== 'function') {
      throw new Error('앱이 초기화되지 않았습니다');
    }
    
    const btn = state.app.lookup('btnSave');
    if (!btn) {
      throw new Error('저장 버튼을 찾을 수 없습니다');
    }
    
    console.log('[Bridge] 저장 실행');
    btn.click();
    await delay(1000);
    return true;
  }

  async function handleEnsureStudent(payload) {
    await ensureInitialized();
    if (!state.studentGrid?.getRowCount) {
      return { selected: null };
    }

    const targetName = payload?.name?.trim();
    const targetNumber = payload?.number?.trim();

    const rowCount = state.studentGrid.getRowCount();
    for (let i = 0; i < rowCount; i++) {
      const row = state.studentGrid.getRow(i);
      const name = String(row?.getValue?.('stuFlnm') ?? '').trim();
      const number = String(row?.getValue?.('clsNo') ?? '').trim();

      const matchName = targetName ? name === targetName : true;
      const matchNumber = targetNumber ? number === targetNumber : true;

      if (matchName && matchNumber) {
        state.studentGrid.selectRow(i);
        return { selected: { index: i, name, number } };
      }
    }

    return { selected: null };
  }

  const handlers = {
    ensureApp: handleEnsureApp,
    addRow: handleAddRow,
    selectMonth: handleSelectMonth,
    setFields: handleSetFields,
    save: handleSave,
    ensureStudent: handleEnsureStudent
  };

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
      respond({ success: false, error: error?.message || String(error) });
    }
  });

  console.log('[나이스 자동입력] Bridge script initialized');
})();

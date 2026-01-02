 /**
 * 나이스 시스템 자동 입력 Content Script
 * Bridge 메시지를 통해 페이지 컨텍스트와 통신
 */

const BRIDGE_REQUEST = 'NICE_BRIDGE_DOM_REQUEST';
const BRIDGE_RESPONSE = 'NICE_BRIDGE_DOM_RESPONSE';

const DEFAULT_SNAPSHOT_OPTIONS = {
  maxDepth: 8,
  includeText: true,
  includeAttributes: true,
  includeLabel: true,
  includeFrames: true,
  maxNodes: 4000,
  textMaxLength: 400,
  includeHidden: true,
  rootSelector: null
};

function resolveLabel(element, doc) {
  if (!element) return null;

  const ariaLabel = element.getAttribute?.('aria-label');
  if (ariaLabel) return ariaLabel.trim() || null;

  const ariaLabelledBy = element.getAttribute?.('aria-labelledby');
  if (ariaLabelledBy && doc) {
    const ids = ariaLabelledBy.split(/\s+/).filter(Boolean);
    for (const id of ids) {
      const labelEl = doc.getElementById?.(id);
      if (labelEl) {
        const text = labelEl.textContent?.trim();
        if (text) return text;
      }
    }
  }

  if (element.id && doc?.querySelector) {
    const labelByFor = doc.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (labelByFor) {
      const text = labelByFor.textContent?.trim();
      if (text) return text;
    }
  }

  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    if (parent.tagName === 'LABEL') {
      const text = parent.textContent?.trim();
      if (text) return text;
      break;
    }
    parent = parent.parentElement;
    depth += 1;
  }

  return null;
}

function snapshotDom(options = {}) {
  const opts = { ...DEFAULT_SNAPSHOT_OPTIONS, ...options };
  const state = { count: 0, exceededLimit: false };
  const tree = snapshotDocument(document, opts, state, { applyRootSelector: true, baseDepth: 0 });

  return {
    url: window.location.href,
    capturedAt: new Date().toISOString(),
    totalNodes: state.count,
    exceededLimit: state.exceededLimit,
    options: opts,
    rootTag: tree?.tag ?? null,
    tree
  };
}

function snapshotDocument(doc, opts, state, config = {}) {
  const { applyRootSelector = false, baseDepth = 0 } = config;
  const rootElement = applyRootSelector && opts.rootSelector
    ? doc.querySelector(opts.rootSelector)
    : doc.body;

  if (!rootElement) {
    if (applyRootSelector && opts.rootSelector) {
      throw new Error(`선택자(${opts.rootSelector})에 해당하는 요소를 찾을 수 없습니다`);
    }
    return null;
  }

  const view = doc.defaultView || window;
  return collectNode(rootElement, baseDepth, { doc, view }, opts, state);
}

function collectNode(element, depth, context, opts, state) {
  if (!element) return null;
  if (depth > opts.maxDepth) {
    return null;
  }
  if (state.count >= opts.maxNodes) {
    state.exceededLimit = true;
    return null;
  }

  const { doc, view } = context;

  if (!opts.includeHidden && view?.getComputedStyle) {
    const style = view.getComputedStyle(element);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) {
      return null;
    }
  }

  state.count += 1;

  const node = {
    tag: element.tagName.toLowerCase()
  };

  if (element.id) node.id = element.id;
  if (element.classList && element.classList.length) node.classes = Array.from(element.classList);

  if (opts.includeAttributes && element.attributes) {
    const interestingAttributes = ['role', 'type', 'name', 'title', 'placeholder', 'aria-label', 'aria-describedby'];
    const attrs = {};
    for (const attr of element.attributes) {
      const name = attr.name;
      if (interestingAttributes.includes(name) || name.startsWith('data-') || name.startsWith('aria-')) {
        attrs[name] = attr.value;
      }
    }
    if (Object.keys(attrs).length) {
      node.attributes = attrs;
    }
  }

  if (opts.includeText) {
    const textContent = element.childElementCount === 0 ? element.textContent.trim() : '';
    if (textContent) {
      node.text = textContent.length > opts.textMaxLength
        ? `${textContent.slice(0, opts.textMaxLength)}…`
        : textContent;
    }
  }

  if (opts.includeLabel) {
    const label = resolveLabel(element, doc);
    if (label) {
      node.label = label.length > opts.textMaxLength
        ? `${label.slice(0, opts.textMaxLength)}…`
        : label;
    }
  }

  if (opts.includeFrames && element.tagName === 'IFRAME') {
    const frameInfo = { url: null };
    try {
      const childWindow = element.contentWindow;
      const childDocument = element.contentDocument;
      if (childDocument && childWindow) {
        try {
          frameInfo.url = childWindow.location?.href || null;
        } catch (locationError) {
          frameInfo.url = null;
        }

        const frameTree = snapshotDocument(childDocument, opts, state, {
          applyRootSelector: false,
          baseDepth: depth + 1
        });
        if (frameTree) {
          frameInfo.tree = frameTree;
        }
      } else {
        frameInfo.error = '프레임 문서에 접근할 수 없습니다';
      }
    } catch (error) {
      frameInfo.error = error.message;
    }

    if (frameInfo.url || frameInfo.error || frameInfo.tree) {
      node.frame = frameInfo;
    }
  }

  if (element.children && element.children.length > 0 && state.count < opts.maxNodes) {
    const children = [];
    for (const child of element.children) {
      const childNode = collectNode(child, depth + 1, context, opts, state);
      if (childNode) {
        children.push(childNode);
      }

      if (state.count >= opts.maxNodes) {
        state.exceededLimit = true;
        break;
      }
    }

    if (children.length) {
      node.children = children;
    }
  }

  return node;
}

class BridgeClient {
  constructor() {
    this.requestCounter = 0;
    this.pending = new Map();

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.type !== BRIDGE_RESPONSE) {
        return;
      }

      const { requestId, success, data, error } = event.data;
      const resolver = this.pending.get(requestId);
      if (!resolver) return;
      this.pending.delete(requestId);

      if (success) {
        resolver.resolve(data);
      } else {
        resolver.reject(new Error(error || 'Bridge request failed'));
      }
    });
  }

  send(action, payload = {}) {
    const requestId = `req_${Date.now()}_${++this.requestCounter}`;

    const promise = new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
    });

    window.postMessage({
      type: BRIDGE_REQUEST,
      requestId,
      action,
      payload
    }, '*');

    return promise;
  }
}

class NiceAutoFiller {
  constructor() {
    this.bridge = new BridgeClient();
    this.isInitialized = false;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async init() {
    try {
      const result = await this.bridge.send('ensureApp');
      console.log('[나이스 자동입력] 브리지 초기화 정보:', result);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[나이스 자동입력] 브리지 초기화 실패:', error);
      return false;
    }
  }

  async ensureStudentSelected(filters) {
    if (!filters || (!filters.studentName && !filters.studentNumber)) {
      return;
    }

    try {
      const result = await this.bridge.send('ensureStudent', {
        name: filters.studentName,
        number: filters.studentNumber
      });

      if (!result?.selected) {
        console.warn('[나이스 자동입력] 조건에 맞는 학생을 찾지 못했습니다');
      } else {
        console.log('[나이스 자동입력] 학생 선택 완료:', result.selected);
      }
    } catch (error) {
      console.error('[나이스 자동입력] 학생 선택 실패:', error);
    }
  }

  async addRow() {
    await this.bridge.send('addRow');
  }

  async selectMonth(monthOrMonths, rowIndex = null) {
    // 단일 month 또는 months 배열 모두 지원
    const payload = { rowIndex };
    
    if (Array.isArray(monthOrMonths)) {
      payload.months = monthOrMonths;
    } else if (monthOrMonths) {
      payload.month = monthOrMonths;
    }
    
    await this.bridge.send('selectMonth', payload);
  }

  async setFields(plan, rowIndex = null, config = {}) {
    await this.bridge.send('setFields', {
      rowIndex,
      goal: plan.goal ?? '',
      content: plan.content ?? '',
      method: plan.method ?? '',
      evaluation: plan.evaluation ?? '',
      config: config
    });
  }

  async save() {
    await this.bridge.send('save');
  }

  // 평가 페이지에서 특정 월 행 선택 (다중 월 지원) - 기존 방식 (사용 안함)
  async selectRowByMonth(monthOrMonths, config = {}, isFirst = false) {
    const payload = { config, isFirst };
    
    // 다중 월 배열 또는 단일 월 모두 지원
    if (Array.isArray(monthOrMonths)) {
      payload.months = monthOrMonths;
    } else if (monthOrMonths) {
      payload.month = monthOrMonths;
    }
    
    await this.bridge.send('selectRowByMonth', payload);
  }

  // 순번 기반 행 선택 (월별평가용) - 새로운 방식
  async selectRowByIndex(index, config = {}, isFirst = false) {
    await this.bridge.send('selectRowByIndex', { index, config, isFirst });
  }

  // 평가 텍스트 입력
  async setEvalText(evalText, config = {}) {
    await this.bridge.send('setEvalText', { eval_text: evalText, config });
  }

  // 월별 평가 입력 (순번 기반 - 개선된 방식)
  async fillMonthlyEvalSimple(plan, config = {}, index = 0, isFirst = false) {
    try {
      // 순번 기반으로 행 선택 (index = 0, 1, 2, ... → 순번 1, 2, 3, ...)
      const monthInfo = plan.months ? plan.months.join('-') : plan.month;
      console.log(`[나이스 자동입력] 순번 ${index + 1}번 (${monthInfo}월) 평가 입력 중...${isFirst ? ' (첫 항목)' : ''}`);
      
      await this.selectRowByIndex(index, config, isFirst);

      // 평가 텍스트 입력
      if (plan.eval_text) {
        await this.setEvalText(plan.eval_text, config);
      }

      return { success: true };
    } catch (error) {
      console.error('[나이스 자동입력] 월별 평가 입력 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 평가 일괄 입력 워크플로우
  async fillEvalWorkflow(payload) {
    try {
      if (!payload || !Array.isArray(payload.plans) || payload.plans.length === 0) {
        throw new Error('입력할 평가 데이터가 없습니다');
      }

      // 데이터를 학년도 순서(3월~2월)로 정렬 - 그리드 순서와 맞추기 위해
      const sortedPlans = [...payload.plans].sort((a, b) => {
        // 첫 번째 월을 기준으로 정렬 (그룹화된 경우 months[0] 사용)
        const getFirstMonth = (plan) => {
          if (plan.months && Array.isArray(plan.months) && plan.months.length > 0) {
            return parseInt(String(plan.months[0]).replace(/[^0-9]/g, ''));
          }
          return parseInt(String(plan.month || '0').replace(/[^0-9]/g, ''));
        };
        
        const aMonth = getFirstMonth(a);
        const bMonth = getFirstMonth(b);
        
        // 학년도 순서: 3, 4, 5, ... 12, 1, 2
        const aValue = (aMonth === 1 || aMonth === 2) ? aMonth + 12 : aMonth;
        const bValue = (bMonth === 1 || bMonth === 2) ? bMonth + 12 : bMonth;
        
        return aValue - bValue;
      });

      const results = [];
      const total = sortedPlans.length;
      
      // 입력 설정 추출
      const config = {
        speed: payload.speed || 'normal',
        humanMode: payload.humanMode !== false
      };

      console.log(`[나이스 자동입력] 평가 일괄 입력 시작: ${total}개 항목`);
      console.log(`[나이스 자동입력] 정렬된 월 순서:`, sortedPlans.map(p => p.months || p.month).join(' → '));
      console.log(`[나이스 자동입력] 설정: 속도=${config.speed}, 휴먼모드=${config.humanMode}`);
      
      // 팝업이 닫힐 시간을 충분히 줌
      console.log('[나이스 자동입력] 팝업 닫힘 대기 중...');
      await this.wait(300);
      
      // 페이지에 포커스 설정
      document.body.click();
      await this.wait(150);

      for (let i = 0; i < total; i++) {
        const data = sortedPlans[i];
        const isFirst = (i === 0); // 첫 번째 항목 여부
        
        try {
          // 진행 상황 전송
          chrome.runtime.sendMessage({
            action: 'progress',
            current: i,
            total: total
          });

          // 월별 평가 입력 (순번 기반: i = 0, 1, 2 → 순번 1, 2, 3)
          const result = await this.fillMonthlyEvalSimple(data, config, i, isFirst);
          results.push(result);

          // 각 입력 사이 간격
          const betweenDelay = config.speed === 'fast' ? 100 : 
                               config.speed === 'slow' ? 400 : 200;
          await this.wait(betweenDelay);

        } catch (error) {
          console.error(`[나이스 자동입력] ${i + 1}번째 평가 입력 실패:`, error);
          results.push({ success: false, error: error.message });
        }
      }

      // 마지막에 저장
      try {
        await this.save();
      } catch (error) {
        console.error('[나이스 자동입력] 최종 저장 실패:', error);
      }

      // 완료 진행 상황 전송
      chrome.runtime.sendMessage({
        action: 'progress',
        current: total,
        total: total
      });

      const successCount = results.filter(r => r.success).length;
      console.log(`[나이스 자동입력] 평가 일괄 입력 완료: ${successCount}/${total} 성공`);

      return {
        success: successCount === total,
        results: results,
        successCount: successCount,
        totalCount: total
      };
    } catch (error) {
      console.error('[나이스 자동입력] 평가 워크플로우 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async fillMonthlyPlanSimple(plan, config = {}) {
    try {
      await this.addRow();

      // months 배열 또는 단일 month 모두 처리
      if (plan.months && Array.isArray(plan.months) && plan.months.length > 0) {
        const monthsStr = plan.months.join(', ');
        console.log(`[나이스 자동입력] 그룹 월(${monthsStr}) 계획 입력 중...`);
        await this.selectMonth(plan.months);
      } else if (plan.month) {
        console.log(`[나이스 자동입력] 단일 월(${plan.month}) 계획 입력 중...`);
        await this.selectMonth(plan.month);
      }

      await this.setFields(plan, null, config);
      return { success: true };
    } catch (error) {
      console.error('[나이스 자동입력] 월별 계획 입력 실패:', error);
      return { success: false, error: error.message };
    }
  }

  async fillWorkflow(payload) {
    try {
      if (!payload || !Array.isArray(payload.plans) || payload.plans.length === 0) {
        throw new Error('입력할 데이터가 없습니다');
      }

      const results = [];
      const total = payload.plans.length;
      
      // 입력 설정 추출
      const config = {
        speed: payload.speed || 'normal',
        humanMode: payload.humanMode !== false
      };

      console.log(`[나이스 자동입력] 일괄 입력 시작: ${total}개 항목`);
      console.log(`[나이스 자동입력] 설정: 속도=${config.speed}, 휴먼모드=${config.humanMode}`);
      
      // 팝업이 닫힐 시간을 충분히 줌 (매우 중요!)
      console.log('[나이스 자동입력] 팝업 닫힘 대기 중...');
      await this.wait(300);
      
      // 페이지에 포커스를 주기 위해 body 클릭
      console.log('[나이스 자동입력] 페이지 포커스 설정 중...');
      document.body.click();
      await this.wait(150);

      for (let i = 0; i < total; i++) {
        const data = payload.plans[i];
        
        try {
          // 진행 상황 전송
          chrome.runtime.sendMessage({
            action: 'progress',
            current: i,
            total: total
          });

          // 월별 계획 입력 (config 전달)
          const result = await this.fillMonthlyPlanSimple(data, config);
          results.push(result);

          // 각 입력 사이 간격 (속도에 따라 조절)
          const betweenDelay = config.speed === 'fast' ? 100 : 
                               config.speed === 'slow' ? 400 : 200;
          await this.wait(betweenDelay);

        } catch (error) {
          console.error(`[나이스 자동입력] ${i + 1}번째 항목 입력 실패:`, error);
          results.push({ success: false, error: error.message });
        }
      }

      // 마지막에 한번 저장
      try {
        await this.save();
      } catch (error) {
        console.error('[나이스 자동입력] 최종 저장 실패:', error);
      }

      // 완료 진행 상황 전송
      chrome.runtime.sendMessage({
        action: 'progress',
        current: total,
        total: total
      });

      const successCount = results.filter(r => r.success).length;
      console.log(`[나이스 자동입력] 일괄 입력 완료: ${successCount}/${total} 성공`);

      return {
        success: successCount === total,
        results: results,
        successCount: successCount,
        totalCount: total
      };
    } catch (error) {
      console.error('[나이스 자동입력] 자동화 워크플로우 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

let autoFiller = null;

// 페이지 브리지 스크립트 주입
function injectPageBridge() {
  return new Promise((resolve, reject) => {
    // 이미 주입되었는지 확인
    if (document.getElementById('nice-auto-filler-bridge')) {
      console.log('[나이스 자동입력] 브리지 스크립트가 이미 주입됨');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'nice-auto-filler-bridge';
    script.src = chrome.runtime.getURL('content/page-bridge-dom.js');
    script.onload = () => {
      console.log('[나이스 자동입력] 브리지 스크립트 주입 완료');
      resolve();
    };
    script.onerror = (error) => {
      console.error('[나이스 자동입력] 브리지 스크립트 주입 실패', error);
      reject(new Error('브리지 스크립트 주입 실패'));
    };
    
    (document.head || document.documentElement).appendChild(script);
  });
}

// 초기화 함수
async function initialize() {
  console.log('[나이스 자동입력] Content Script 로드됨');

  if (!window.location.href.includes('dge.neis.go.kr')) {
    console.log('[나이스 자동입력] 나이스 페이지가 아님');
    return;
  }

  // 브리지 주입 및 로드 완료 대기
  try {
    await injectPageBridge();
  } catch (error) {
    console.error('[나이스 자동입력] 브리지 주입 오류:', error);
    return;
  }

  // 브리지와 CPR 프레임워크 초기화 대기 (더 긴 시간 - 나이스는 SPA라서 페이지 전환 후 시간이 필요)
  console.log('[나이스 자동입력] 브리지 및 CPR 초기화 대기 중... (3초)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  autoFiller = new NiceAutoFiller();
  
  // 재시도 로직 추가
  let initialized = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`[나이스 자동입력] 초기화 시도 ${attempt}/5`);
    initialized = await autoFiller.init();
    
    if (initialized) {
      console.log('[나이스 자동입력] ✅ 사용 준비 완료!');
      break;
    } else {
      console.warn(`[나이스 자동입력] ❌ 초기화 실패 (시도 ${attempt}/5)`);
      if (attempt < 5) {
        console.log('[나이스 자동입력] 3초 후 재시도...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  if (!initialized) {
    console.error('[나이스 자동입력] ⚠️ 초기화 최종 실패');
    console.error('다음을 확인해주세요:');
    console.error('1. 월별계획 페이지로 이동했나요?');
    console.error('2. 페이지가 완전히 로드되었나요?');
    console.error('3. 페이지를 새로고침한 후 다시 시도해보세요.');
  }
}

// 페이지 로드 시에는 브리지만 주입하고, 초기화는 하지 않음
// (나이스는 SPA라서 페이지 로드 시점에는 앱이 없음)
(async function() {
  console.log('[나이스 자동입력] Content Script 로드됨');

  if (!window.location.href.includes('dge.neis.go.kr')) {
    console.log('[나이스 자동입력] 나이스 페이지가 아님');
    return;
  }

  // 브리지만 주입 (초기화는 하지 않음)
  try {
    await injectPageBridge();
    console.log('[나이스 자동입력] 브리지 주입 완료. 자동입력 시작 버튼을 클릭하면 초기화됩니다.');
  } catch (error) {
    console.error('[나이스 자동입력] 브리지 주입 오류:', error);
  }
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 페이지 유형 감지 요청
  if (message.action === 'getPageType') {
    (async () => {
      try {
        console.log('[나이스 자동입력] getPageType 메시지 받음');
        
        const result = await bridgeRequest('detectPageType', {});
        
        if (result && result.pageType) {
          console.log(`[나이스 자동입력] 페이지 유형: ${result.pageType}`);
          sendResponse({ success: true, pageType: result.pageType });
        } else {
          sendResponse({ success: false, pageType: null });
        }
      } catch (error) {
        console.error('[나이스 자동입력] 페이지 유형 감지 오류:', error);
        sendResponse({ success: false, pageType: null, error: error.message });
      }
    })();
    
    return true;
  }

  if (message.action === 'fillMonthlyPlans') {
    (async () => {
      try {
        console.log('[나이스 자동입력] fillMonthlyPlans 메시지 받음');
        
        if (!autoFiller) {
          autoFiller = new NiceAutoFiller();
        }

        if (!autoFiller.isInitialized) {
          console.log('[나이스 자동입력] 초기화 시작...');
          
          // 재시도 로직
          let initialized = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`[나이스 자동입력] 초기화 시도 ${attempt}/3`);
            
            // 첫 시도 전에 1초 대기 (앱 로드 시간 확보)
            if (attempt === 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            initialized = await autoFiller.init();
            
            if (initialized) {
              console.log('[나이스 자동입력] ✅ 초기화 성공!');
              break;
            } else {
              console.warn(`[나이스 자동입력] ❌ 초기화 실패 (시도 ${attempt}/3)`);
              if (attempt < 3) {
                console.log('[나이스 자동입력] 2초 후 재시도...');
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          if (!initialized) {
            sendResponse({ 
              success: false, 
              error: '나이스 시스템 초기화 실패. 월별계획 페이지에서 실행 중인지 확인해주세요.' 
            });
            return;
          }
        }

        console.log('[나이스 자동입력] 자동입력 워크플로우 시작');
        const result = await autoFiller.fillWorkflow(message.data);
        sendResponse(result);
      } catch (error) {
        console.error('[나이스 자동입력] 오류:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }

  // 월별평가 자동입력
  if (message.action === 'fillMonthlyEvaluations') {
    (async () => {
      try {
        console.log('[나이스 자동입력] fillMonthlyEvaluations 메시지 받음');
        
        if (!autoFiller) {
          autoFiller = new NiceAutoFiller();
        }

        if (!autoFiller.isInitialized) {
          console.log('[나이스 자동입력] 초기화 시작...');
          
          let initialized = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`[나이스 자동입력] 초기화 시도 ${attempt}/3`);
            
            if (attempt === 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            initialized = await autoFiller.init();
            
            if (initialized) {
              console.log('[나이스 자동입력] ✅ 초기화 성공!');
              break;
            } else {
              console.warn(`[나이스 자동입력] ❌ 초기화 실패 (시도 ${attempt}/3)`);
              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          if (!initialized) {
            sendResponse({ 
              success: false, 
              error: '나이스 시스템 초기화 실패. 월별평가 페이지에서 실행 중인지 확인해주세요.' 
            });
            return;
          }
        }

        console.log('[나이스 자동입력] 평가 자동입력 워크플로우 시작');
        const result = await autoFiller.fillEvalWorkflow(message.data);
        sendResponse(result);
      } catch (error) {
        console.error('[나이스 자동입력] 오류:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }

  if (message.action === 'getCurrentStudent') {
    const student = autoFiller ? autoFiller.getCurrentStudent() : null;
    sendResponse({ success: true, data: student });
    return true;
  }

  if (message.action === 'getCurrentPlans') {
    const plans = autoFiller ? autoFiller.getCurrentPlans() : [];
    sendResponse({ success: true, data: plans });
    return true;
  }

  if (message.action === 'captureDomStructure') {
    try {
      const snapshot = snapshotDom(message.options || {});
      sendResponse({ success: true, data: snapshot });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});

console.log('[나이스 자동입력] Content Script 준비 완료');

// 페이지 로드 완료 후 초기화 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // 이미 로드되었으면 바로 실행
  initialize();
}

 /**
 * 나이스 시스템 자동 입력 Content Script
 * Bridge 메시지를 통해 페이지 컨텍스트와 통신
 */

const BRIDGE_REQUEST = 'NICE_BRIDGE_REQUEST';
const BRIDGE_RESPONSE = 'NICE_BRIDGE_RESPONSE';

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

  async selectMonth(month, rowIndex = null) {
    await this.bridge.send('selectMonth', {
      month,
      rowIndex
    });
  }

  async setFields(plan, rowIndex = null) {
    await this.bridge.send('setFields', {
      rowIndex,
      goal: plan.goal ?? '',
      content: plan.content ?? '',
      method: plan.method ?? '',
      evaluation: plan.evaluation ?? ''
    });
  }

  async save() {
    await this.bridge.send('save');
  }

  async fillMonthlyPlanSimple(plan) {
    try {
      await this.addRow();

      if (plan.month) {
        await this.selectMonth(plan.month);
      }

      await this.setFields(plan);
      return { success: true };
    } catch (error) {
      console.error('[나이스 자동입력] 단일 월 입력 실패:', error);
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

      console.log(`[나이스 자동입력] 일괄 입력 시작: ${total}개 항목`);

      for (let i = 0; i < total; i++) {
        const data = payload.plans[i];
        
        try {
          // 진행 상황 전송
          chrome.runtime.sendMessage({
            action: 'progress',
            current: i,
            total: total
          });

          // 월별 계획 입력
          const result = await this.fillMonthlyPlanSimple(data);
          results.push(result);

          // 각 입력 사이 간격
          await this.wait(300);

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
});

console.log('[나이스 자동입력] Content Script 준비 완료');

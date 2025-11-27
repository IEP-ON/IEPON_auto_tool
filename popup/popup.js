// 상태 관리
let state = {
  websiteUrl: '',
  apiKey: '',
  inputMethod: 'json',
  monthlyPlans: [],
  currentStudent: null,
  isProcessing: false,
  filters: {},
  speed: 'normal', // fast, normal, slow
  humanMode: true,
  mode: 'plan' // plan(월별계획) 또는 evaluation(월별평가)
};

// 속도 설정 (ms)
const SPEED_CONFIG = {
  fast: { typing: 10, between: 100, field: 150 },
  normal: { typing: 30, between: 200, field: 300 },
  slow: { typing: 80, between: 400, field: 600 }
};

// 샘플 데이터 - 월별계획 (3월~2월)
const SAMPLE_PLAN_DATA = [
  { month: "3", goal: "기초 학습 능력 형성", content: "학습 환경 적응 및 기본 규칙 익히기", method: "개별 지도 및 모델링", evaluation: "관찰 평가 및 체크리스트" },
  { month: "4", goal: "의사소통 능력 향상", content: "일상생활 관련 어휘 확장", method: "그림카드 활용 언어 지도", evaluation: "수행 평가" },
  { month: "5", goal: "사회성 기술 발달", content: "또래와 함께하는 활동 참여", method: "소그룹 협동 학습", evaluation: "행동 관찰 기록" },
  { month: "6", goal: "자조 기술 향상", content: "개인 위생 관리 습관 형성", method: "단계별 시범 및 연습", evaluation: "일상생활 수행 체크" },
  { month: "7", goal: "1학기 학습 정리", content: "학습 내용 복습 및 점검", method: "개별 피드백 제공", evaluation: "포트폴리오 평가" },
  { month: "8", goal: "방학 중 기술 유지", content: "가정 연계 프로그램 제공", method: "가정통신문 및 과제", evaluation: "가정 연계 평가" },
  { month: "9", goal: "2학기 학습 준비", content: "새 학기 적응 및 목표 설정", method: "개별 상담 및 목표 수립", evaluation: "면담 및 관찰" },
  { month: "10", goal: "인지 능력 강화", content: "기본 개념 학습 심화", method: "구체물 조작 학습", evaluation: "형성 평가" },
  { month: "11", goal: "표현력 향상", content: "자신의 생각과 감정 표현하기", method: "역할놀이 및 토의", evaluation: "발표 및 참여도 평가" },
  { month: "12", goal: "2학기 학습 마무리", content: "학습 성취 점검 및 정리", method: "종합 복습 활동", evaluation: "총괄 평가" },
  { month: "1", goal: "새해 목표 수립", content: "다음 학년 준비 활동", method: "개별 진로 상담", evaluation: "목표 달성도 평가" },
  { month: "2", goal: "학년 전환 준비", content: "상급 학년 적응 프로그램", method: "전환 교육 실시", evaluation: "종합 발달 평가" }
];

// 샘플 데이터 - 월별평가 (8월~2월 2학기 기준)
const SAMPLE_EVAL_DATA = [
  { month: "8", eval_text: "방학 중 가정에서 기본 생활습관을 잘 유지하였으며, 가정 연계 활동에 성실히 참여함." },
  { month: "9", eval_text: "2학기 새로운 학습 목표에 대한 이해도가 높으며, 학교생활 적응이 양호함." },
  { month: "10", eval_text: "기본 개념 학습에 적극적으로 참여하였고, 구체물 조작 능력이 향상됨." },
  { month: "11", eval_text: "자신의 생각과 감정을 표현하는 능력이 발전하였으며, 발표 활동에 자신감을 보임." },
  { month: "12", eval_text: "2학기 학습 목표를 대부분 달성하였으며, 전반적인 성장이 관찰됨." },
  { month: "1", eval_text: "새해 목표를 스스로 설정하였고, 상급 학년에 대한 기대감을 표현함." },
  { month: "2", eval_text: "한 해 동안 전반적인 발달이 이루어졌으며, 상급 학년 전환 준비가 양호함." }
];

// 기존 호환성 유지
const SAMPLE_DATA = SAMPLE_PLAN_DATA;

// DOM 요소
const elements = {
  // 새 UI 요소
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettings: document.getElementById('closeSettings'),
  toast: document.getElementById('toast'),
  loadSample: document.getElementById('loadSample'),
  clearJson: document.getElementById('clearJson'),
  speedBtns: document.querySelectorAll('.speed-btn'),
  humanMode: document.getElementById('humanMode'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  
  // 기존 요소
  websiteUrl: document.getElementById('websiteUrl'),
  apiKey: document.getElementById('apiKey'),
  testConnection: document.getElementById('testConnection'),
  saveSettings: document.getElementById('saveSettings'),
  studentSelect: document.getElementById('studentSelect'),
  loadStudents: document.getElementById('loadStudents'),
  studentName: document.getElementById('studentName'),
  year: document.getElementById('year'),
  semester: document.getElementById('semester'),
  grade: document.getElementById('grade'),
  className: document.getElementById('className'),
  studentNumber: document.getElementById('studentNumber'),
  inputType: document.getElementById('inputType'),
  subject: document.getElementById('subject'),
  fetchData: document.getElementById('fetchData'),
  manualMonth: document.getElementById('manualMonth'),
  manualGoal: document.getElementById('manualGoal'),
  manualContent: document.getElementById('manualContent'),
  manualMethod: document.getElementById('manualMethod'),
  manualEvaluation: document.getElementById('manualEvaluation'),
  addManualData: document.getElementById('addManualData'),
  jsonData: document.getElementById('jsonData'),
  parseJson: document.getElementById('parseJson'),
  dataPreview: document.getElementById('dataPreview'),
  dataCount: document.getElementById('dataCount'),
  clearData: document.getElementById('clearData'),
  startAutoFill: document.getElementById('startAutoFill'),
  progressContainer: document.getElementById('progressContainer'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  logContainer: document.getElementById('logContainer'),
  captureDom: document.getElementById('captureDom'),
  captureRoot: document.getElementById('captureRoot'),
  captureMaxDepth: document.getElementById('captureMaxDepth'),
  captureMaxNodes: document.getElementById('captureMaxNodes'),
  captureTextLength: document.getElementById('captureTextLength'),
  captureIncludeHidden: document.getElementById('captureIncludeHidden'),
  captureIncludeAttributes: document.getElementById('captureIncludeAttributes'),
  captureIncludeLabel: document.getElementById('captureIncludeLabel')
};

const DEFAULT_CAPTURE = {
  maxDepth: 8,
  maxNodes: 4000,
  textMaxLength: 400
};

function collectCaptureOptions() {
  const numberOrDefault = (input, fallback) => {
    if (!input) return fallback;
    const value = parseInt(input.value, 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    rootSelector: elements.captureRoot ? elements.captureRoot.value.trim() || null : null,
    maxDepth: numberOrDefault(elements.captureMaxDepth, DEFAULT_CAPTURE.maxDepth),
    maxNodes: numberOrDefault(elements.captureMaxNodes, DEFAULT_CAPTURE.maxNodes),
    textMaxLength: numberOrDefault(elements.captureTextLength, DEFAULT_CAPTURE.textMaxLength),
    includeHidden: elements.captureIncludeHidden ? elements.captureIncludeHidden.checked : true,
    includeAttributes: elements.captureIncludeAttributes ? elements.captureIncludeAttributes.checked : true,
    includeLabel: elements.captureIncludeLabel ? elements.captureIncludeLabel.checked : true,
    includeText: true
  };
}

// 초기화
async function init() {
  // 저장된 설정 불러오기
  try {
    const settings = await chrome.storage.local.get(['websiteUrl', 'apiKey', 'speed', 'humanMode']);
    
    if (settings.websiteUrl) {
      elements.websiteUrl.value = settings.websiteUrl;
      state.websiteUrl = settings.websiteUrl;
    } else {
      elements.websiteUrl.value = 'https://www.iepon.site';
      state.websiteUrl = 'https://www.iepon.site';
    }
    
    if (settings.apiKey) {
      elements.apiKey.value = settings.apiKey;
      state.apiKey = settings.apiKey;
    }
    
    if (settings.speed) {
      state.speed = settings.speed;
      updateSpeedButtons();
    }
    
    if (settings.humanMode !== undefined) {
      state.humanMode = settings.humanMode;
      if (elements.humanMode) {
        elements.humanMode.checked = state.humanMode;
      }
    }
  } catch (e) {
    console.log('[테스트 모드] Chrome Storage API 없음');
    elements.websiteUrl.value = 'https://www.iepon.site';
    state.websiteUrl = 'https://www.iepon.site';
  }
  
  // 현재 학년도 설정
  const currentYear = new Date().getFullYear();
  if (elements.year) elements.year.value = currentYear;

  // 이벤트 리스너 등록
  registerEventListeners();

  // 나이스 페이지 확인
  checkNicePage();

  addLog('확장 프로그램이 시작되었습니다', 'info');
}

// 속도 버튼 상태 업데이트
function updateSpeedButtons() {
  elements.speedBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.speed === state.speed);
  });
}

// 모드 UI 업데이트
function updateModeUI() {
  // 탭 활성화 상태 업데이트
  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === state.mode);
  });
  
  // placeholder 텍스트 변경
  if (state.mode === 'plan') {
    elements.jsonData.placeholder = `JSON 데이터를 붙여넣으세요

예시:
[
  {
    "month": "3",
    "goal": "읽기 능력 향상",
    "content": "그림책 읽기",
    "method": "1:1 지도",
    "evaluation": "수행평가"
  }
]`;
  } else {
    elements.jsonData.placeholder = `JSON 데이터를 붙여넣으세요

예시:
[
  {
    "month": "8",
    "eval_text": "목표를 달성하였으며 전반적인 성장이 관찰됨"
  }
]`;
  }
}

// 이벤트 리스너 등록
function registerEventListeners() {
  // 모드 탭 이벤트
  elements.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const newMode = tab.dataset.mode;
      if (newMode !== state.mode) {
        state.mode = newMode;
        updateModeUI();
        // 데이터 초기화
        state.monthlyPlans = [];
        renderDataPreview();
        elements.jsonData.value = '';
        showToast(newMode === 'plan' ? '월별계획 모드' : '월별평가 모드', 'info');
      }
    });
  });

  // 새 UI 이벤트
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', () => {
      elements.settingsModal.classList.remove('hidden');
    });
  }
  
  if (elements.closeSettings) {
    elements.closeSettings.addEventListener('click', () => {
      elements.settingsModal.classList.add('hidden');
    });
  }
  
  // 모달 백드롭 클릭으로 닫기
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      elements.settingsModal.classList.add('hidden');
    });
  }
  
  // 샘플 데이터 불러오기
  if (elements.loadSample) {
    elements.loadSample.addEventListener('click', loadSampleData);
  }
  
  // JSON 지우기
  if (elements.clearJson) {
    elements.clearJson.addEventListener('click', () => {
      elements.jsonData.value = '';
      elements.jsonData.focus();
    });
  }
  
  // 속도 선택
  elements.speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.speed = btn.dataset.speed;
      updateSpeedButtons();
      chrome.storage.local.set({ speed: state.speed });
      showToast(`입력 속도: ${getSpeedLabel(state.speed)}`);
    });
  });
  
  // 사람모드 설정
  if (elements.humanMode) {
    elements.humanMode.addEventListener('change', (e) => {
      state.humanMode = e.target.checked;
      chrome.storage.local.set({ humanMode: state.humanMode });
    });
  }
  
  // 설정 저장
  if (elements.saveSettings) {
    elements.saveSettings.addEventListener('click', saveSettings);
  }
  
  if (elements.testConnection) {
    elements.testConnection.addEventListener('click', testConnection);
  }

  // 웹사이트 연동
  if (elements.loadStudents) {
    elements.loadStudents.addEventListener('click', loadStudents);
  }
  
  if (elements.fetchData) {
    elements.fetchData.addEventListener('click', fetchDataFromWebsite);
  }
  
  if (elements.studentSelect) {
    elements.studentSelect.addEventListener('change', handleStudentSelection);
  }

  // 수동 입력
  if (elements.addManualData) {
    elements.addManualData.addEventListener('click', addManualData);
  }

  // JSON 입력
  if (elements.parseJson) {
    elements.parseJson.addEventListener('click', parseJsonData);
  }

  // 데이터 관리
  if (elements.clearData) {
    elements.clearData.addEventListener('click', clearAllData);
  }

  // 자동 입력 시작
  if (elements.startAutoFill) {
    elements.startAutoFill.addEventListener('click', startAutoFill);
  }

  if (elements.captureDom) {
    elements.captureDom.addEventListener('click', captureDomStructure);
  }
}

// 샘플 데이터 불러오기
function loadSampleData() {
  const sampleData = state.mode === 'plan' ? SAMPLE_PLAN_DATA : SAMPLE_EVAL_DATA;
  elements.jsonData.value = JSON.stringify(sampleData, null, 2);
  showToast(`${state.mode === 'plan' ? '월별계획' : '월별평가'} 예시 데이터를 불러왔습니다`, 'success');
}

// 속도 라벨
function getSpeedLabel(speed) {
  const labels = { fast: '빠르게', normal: '보통', slow: '천천히' };
  return labels[speed] || '보통';
}

// 토스트 알림
function showToast(message, type = 'info') {
  const toast = elements.toast;
  if (!toast) return;
  
  toast.className = `toast ${type}`;
  toast.querySelector('.toast-message').textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

// 설정 저장
async function saveSettings() {
  const websiteUrl = elements.websiteUrl.value.trim();
  const apiKey = elements.apiKey.value.trim();

  await chrome.storage.local.set({ websiteUrl, apiKey });
  state.websiteUrl = websiteUrl;
  state.apiKey = apiKey;

  // 모달 닫기
  if (elements.settingsModal) {
    elements.settingsModal.classList.add('hidden');
  }

  showToast('설정이 저장되었습니다', 'success');
  addLog('설정 저장 완료', 'success');
}

// 연결 테스트
async function testConnection() {
  const websiteUrl = elements.websiteUrl.value.trim();
  
  if (!websiteUrl) {
    showNotification('웹사이트 URL을 입력하세요', 'error');
    return;
  }

  try {
    updateConnectionStatus('connecting', '연결 중...');
    
    const response = await fetch(`${websiteUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      updateConnectionStatus('connected', '연결 성공');
      showNotification('웹사이트 연결 성공', 'success');
      addLog('웹사이트 연결 테스트 성공', 'success');
    } else {
      throw new Error('연결 실패');
    }
  } catch (error) {
    updateConnectionStatus('error', '연결 실패');
    showNotification('웹사이트 연결 실패', 'error');
    addLog(`연결 테스트 실패: ${error.message}`, 'error');
  }
}

// 연결 상태 업데이트
function updateConnectionStatus(status, text) {
  if (elements.statusBadge) {
    elements.statusBadge.className = `status-badge ${status}`;
  }
  if (elements.statusText) {
    elements.statusText.textContent = text;
  }
}

// 입력 방식 변경 (레거시 호환용)
function handleInputMethodChange(e) {
  state.inputMethod = e.target.value;
  addLog(`입력 방식 변경: ${state.inputMethod}`, 'info');
}

// 학생 목록 불러오기
async function loadStudents() {
  if (!state.websiteUrl) {
    showNotification('먼저 웹사이트 URL을 설정하세요', 'error');
    return;
  }

  try {
    const year = elements.year.value;
    const semester = elements.semester.value;

    const response = await fetch(`${state.websiteUrl}/api/students?year=${year}&semester=${semester}`, {
      headers: {
        'Authorization': `Bearer ${state.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('학생 목록 불러오기 실패');

    const students = await response.json();
    
    // 학생 목록 업데이트
    elements.studentSelect.innerHTML = '<option value="">학생을 선택하세요</option>';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.grade}학년 ${student.class}반)`;
      option.dataset.student = JSON.stringify(student);
      elements.studentSelect.appendChild(option);
    });

    showNotification(`${students.length}명의 학생을 불러왔습니다`, 'success');
    addLog(`학생 목록 불러오기 성공: ${students.length}명`, 'success');
  } catch (error) {
    showNotification('학생 목록 불러오기 실패', 'error');
    addLog(`학생 목록 불러오기 실패: ${error.message}`, 'error');
  }
}

// 웹사이트에서 데이터 가져오기
async function fetchDataFromWebsite() {
  const selectedOption = elements.studentSelect.selectedOptions[0];
  
  if (!selectedOption || !selectedOption.value) {
    showNotification('학생을 선택하세요', 'error');
    return;
  }

  try {
    const student = JSON.parse(selectedOption.dataset.student);
    const year = elements.year.value;
    const semester = elements.semester.value;

    const response = await fetch(`${state.websiteUrl}/api/monthly-plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId: student.id,
        year,
        semester
      })
    });

    if (!response.ok) throw new Error('데이터 가져오기 실패');

    const plans = await response.json();
    
    state.monthlyPlans = plans;
    state.currentStudent = student;
    
    renderDataPreview();
    showNotification(`${plans.length}개의 월별 계획을 가져왔습니다`, 'success');
    addLog(`데이터 가져오기 성공: ${plans.length}개 항목`, 'success');
  } catch (error) {
    showNotification('데이터 가져오기 실패', 'error');
    addLog(`데이터 가져오기 실패: ${error.message}`, 'error');
  }
}

// 수동 데이터 추가
function addManualData() {
  const month = elements.manualMonth.value.trim();
  const goal = elements.manualGoal.value.trim();
  const content = elements.manualContent.value.trim();
  const method = elements.manualMethod.value.trim();
  const evaluation = elements.manualEvaluation.value.trim();

  if (!month) {
    showNotification('월을 입력하세요', 'error');
    return;
  }

  if (!goal && !content && !method && !evaluation) {
    showNotification('최소 하나의 항목을 입력하세요', 'error');
    return;
  }

  const plan = {
    month,
    goal,
    content,
    method,
    evaluation
  };

  state.monthlyPlans.push(plan);
  renderDataPreview();

  // 입력 필드 초기화
  elements.manualMonth.value = '';
  elements.manualGoal.value = '';
  elements.manualContent.value = '';
  elements.manualMethod.value = '';
  elements.manualEvaluation.value = '';

  showNotification('데이터가 추가되었습니다', 'success');
  addLog(`수동 데이터 추가: ${month}월`, 'success');
}

// JSON 데이터 파싱
function parseJsonData() {
  const jsonText = elements.jsonData.value.trim();

  if (!jsonText) {
    showNotification('JSON 데이터를 입력하세요', 'error');
    return;
  }

  try {
    const parsed = JSON.parse(jsonText);
    
    let plans = [];
    
    // 배열인 경우
    if (Array.isArray(parsed)) {
      plans = parsed;
    }
    // 객체에 plans 속성이 있는 경우
    else if (parsed && Array.isArray(parsed.plans)) {
      plans = parsed.plans;
      
      // 학생 정보도 추출
      if (parsed.studentName) {
        elements.studentName.value = parsed.studentName;
      }
      if (parsed.studentNumber) {
        elements.studentNumber.value = parsed.studentNumber;
      }
    }
    // 단일 객체인 경우 배열로 감싸기
    else if (parsed && typeof parsed === 'object') {
      plans = [parsed];
    }
    else {
      throw new Error('올바른 JSON 형식이 아닙니다');
    }

    if (plans.length === 0) {
      throw new Error('입력할 데이터가 없습니다');
    }

    // 필드명 정규화 (다양한 필드명 지원)
    if (state.mode === 'plan') {
      // 월별계획 모드
      state.monthlyPlans = plans.map(plan => ({
        month: plan.month || plan.mmnt || plan.월,
        goal: plan.goal || plan.educationGoals || plan.교육목표 || '',
        content: plan.content || plan.educationContent || plan.교육내용 || '',
        method: plan.method || plan.educationMethod || plan.교육방법 || '',
        evaluation: plan.evaluation || plan.evaluationPlan || plan.평가계획 || ''
      }));
    } else {
      // 월별평가 모드
      state.monthlyPlans = plans.map(plan => ({
        month: plan.month || plan.mmnt || plan.월,
        eval_text: plan.eval_text || plan.evaluation || plan.평가 || plan.평가내용 || ''
      }));
    }

    renderDataPreview();

    showNotification(`${plans.length}개의 데이터를 파싱했습니다`, 'success');
    addLog(`JSON 파싱 성공: ${plans.length}개 항목`, 'success');
  } catch (error) {
    showNotification('JSON 파싱 실패', 'error');
    addLog(`JSON 파싱 실패: ${error.message}`, 'error');
    console.error('[나이스 자동입력] JSON 파싱 오류:', error);
  }
}

// 데이터 미리보기 렌더링
function renderDataPreview() {
  if (state.monthlyPlans.length === 0) {
    elements.dataPreview.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p>데이터를 입력하면 여기에 표시됩니다</p>
      </div>
    `;
    elements.dataCount.textContent = '0개';
    elements.dataCount.classList.remove('active');
    elements.startAutoFill.disabled = true;
    return;
  }

  if (state.mode === 'plan') {
    // 월별계획 모드 미리보기
    elements.dataPreview.innerHTML = state.monthlyPlans.map((plan, index) => `
      <div class="preview-item">
        <button class="preview-remove" data-index="${index}">×</button>
        <div class="preview-month">
          ${plan.month}
          <small>월</small>
        </div>
        <div class="preview-content">
          ${plan.goal ? `<div class="preview-field"><strong>목표:</strong> ${truncate(plan.goal, 35)}</div>` : ''}
          ${plan.content ? `<div class="preview-field"><strong>내용:</strong> ${truncate(plan.content, 35)}</div>` : ''}
          ${plan.method ? `<div class="preview-field"><strong>방법:</strong> ${truncate(plan.method, 35)}</div>` : ''}
          ${plan.evaluation ? `<div class="preview-field"><strong>평가:</strong> ${truncate(plan.evaluation, 35)}</div>` : ''}
        </div>
      </div>
    `).join('');
  } else {
    // 월별평가 모드 미리보기
    elements.dataPreview.innerHTML = state.monthlyPlans.map((plan, index) => `
      <div class="preview-item preview-eval">
        <button class="preview-remove" data-index="${index}">×</button>
        <div class="preview-month">
          ${plan.month}
          <small>월</small>
        </div>
        <div class="preview-content">
          <div class="preview-field"><strong>평가:</strong> ${truncate(plan.eval_text, 60)}</div>
        </div>
      </div>
    `).join('');
  }

  // 삭제 버튼 이벤트 리스너
  elements.dataPreview.querySelectorAll('.preview-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeDataItem(index);
    });
  });

  elements.dataCount.textContent = `${state.monthlyPlans.length}개`;
  elements.dataCount.classList.add('active');
  elements.startAutoFill.disabled = false;
}

// 데이터 항목 삭제
function removeDataItem(index) {
  state.monthlyPlans.splice(index, 1);
  renderDataPreview();
  addLog(`데이터 삭제: 인덱스 ${index}`, 'info');
}

// 전체 데이터 삭제
function clearAllData() {
  if (confirm('모든 데이터를 삭제하시겠습니까?')) {
    state.monthlyPlans = [];
    renderDataPreview();
    addLog('전체 데이터 삭제', 'info');
  }
}

// 자동 입력 시작
async function startAutoFill() {
  console.log('[나이스 자동입력] startAutoFill 함수 호출됨');
  addLog('자동 입력 시작...', 'info');

  if (state.monthlyPlans.length === 0) {
    showNotification('입력할 데이터가 없습니다', 'error');
    return;
  }

  if (state.isProcessing) {
    showNotification('이미 처리 중입니다', 'error');
    return;
  }

  state.isProcessing = true;
  elements.startAutoFill.disabled = true;
  elements.progressContainer.classList.remove('hidden');

  try {
    addLog('현재 탭 확인 중...', 'info');
    // 현재 탭이 나이스 페이지인지 확인
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[나이스 자동입력] 현재 탭:', tab.url);
    
    if (!tab.url.includes('dge.neis.go.kr')) {
      throw new Error('나이스 페이지에서 실행해주세요');
    }

    addLog('데이터 준비 중...', 'info');
    const filters = collectFilters();
    state.filters = filters;

    const payload = {
      filters,
      studentName: filters.studentName || state.currentStudent?.name || '',
      plans: state.monthlyPlans,
      speed: state.speed,
      humanMode: state.humanMode,
      mode: state.mode
    };

    // 모드에 따라 action 결정
    const action = state.mode === 'plan' ? 'fillMonthlyPlans' : 'fillMonthlyEvaluations';
    const modeLabel = state.mode === 'plan' ? '월별계획' : '월별평가';

    console.log(`[나이스 자동입력] ${modeLabel} 전송할 데이터:`, payload);
    addLog(`${state.monthlyPlans.length}개 ${modeLabel} 항목 전송 준비 완료`, 'info');

    // 1. 먼저 NICE 탭 활성화
    addLog('나이스 웹을 활성화 중...', 'info');
    await chrome.tabs.update(tab.id, { active: true });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 2. Content Script에 메시지 전송
    try {
      addLog('Content Script에 메시지 전송 중...', 'info');
      
      // 메시지 전송 시도
      chrome.tabs.sendMessage(tab.id, {
        action: action,
        data: payload
      }).catch(async (err) => {
        console.error('[나이스 자동입력] 메시지 전송 오류:', err);
        const message = err?.message || '';
        if (message.includes('Could not establish connection') || message.includes('Receiving end does not exist')) {
          console.log('[나이스 자동입력] Content Script 재주입 시도...');
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content-script.js']
          });
          
          // 재시도
          chrome.tabs.sendMessage(tab.id, {
            action: action,
            data: payload
          });
        }
      });
      
      // 3. 메시지 전송 후 즉시 팝업 닫기 (응답 기다리지 않음)
      addLog('팝업을 닫고 자동입력 시작...', 'info');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[나이스 자동입력] 팝업 닫기 시작');
      window.close();
      
    } catch (err) {
      console.error('[나이스 자동입력] 메시지 전송 오류:', err);
      const message = err?.message || '';
      if (message.includes('Could not establish connection') || message.includes('Receiving end does not exist')) {
        addLog('Content Script 재주입 중...', 'info');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-script.js']
        });

        addLog('재시도 후 팝업 닫기...', 'info');
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillMonthlyPlans',
          data: payload
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        window.close();
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('[나이스 자동입력] 오류 발생:', error);
    showNotification(`오류: ${error.message}`, 'error');
    addLog(`자동 입력 실패: ${error.message}`, 'error');
  } finally {
    state.isProcessing = false;
    elements.startAutoFill.disabled = false;
  }
}

async function captureDomStructure() {
  try {
    if (elements.captureDom) {
      elements.captureDom.disabled = true;
      elements.captureDom.textContent = '캡처 중...';
    }

    addLog('DOM 구조 캡처 요청 중...', 'info');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('활성 탭을 찾을 수 없습니다');
    }

    let response;
    const captureOptions = collectCaptureOptions();
    addLog(
      `옵션: 루트=${captureOptions.rootSelector || '(전체)'} | 깊이=${captureOptions.maxDepth} | 노드=${captureOptions.maxNodes} | 프레임=${captureOptions.includeFrames ? '포함' : '미포함'}`,
      'info'
    );

    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'captureDomStructure',
        options: captureOptions
      });
    } catch (error) {
      const message = error?.message || '';
      if (message.includes('Could not establish connection') || message.includes('Receiving end does not exist')) {
        addLog('Content Script가 없어 재주입 후 재시도합니다', 'info');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-script.js']
        });

        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'captureDomStructure',
          options: captureOptions
        });
      } else {
        throw error;
      }
    }

    if (!response?.success) {
      throw new Error(response?.error || 'DOM 캡처 실패');
    }

    const snapshot = response.data;
    const fileName = `nice-dom-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog(`DOM 구조 캡처 완료: ${snapshot.totalNodes}개 노드`, 'success');
    showNotification('DOM 구조 캡처 파일을 다운로드했습니다', 'success');
  } catch (error) {
    console.error('[나이스 자동입력] DOM 캡처 오류:', error);
    showNotification(`DOM 캡처 실패: ${error.message}`, 'error');
    addLog(`DOM 캡처 실패: ${error.message}`, 'error');
  } finally {
    if (elements.captureDom) {
      elements.captureDom.disabled = false;
      elements.captureDom.textContent = '📥 현재 페이지 DOM 구조 캡처';
    }
  }
}

// 진행 상황 업데이트
function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressText.textContent = `${current} / ${total} 완료`;
}

// 나이스 페이지 확인
async function checkNicePage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.includes('dge.neis.go.kr')) {
      updateConnectionStatus('connected', '나이스 페이지 감지됨');
      addLog('나이스 페이지에서 실행 중', 'success');
    } else {
      updateConnectionStatus('error', '나이스 페이지가 아닙니다');
      addLog('나이스 페이지로 이동하세요', 'info');
    }
  } catch (error) {
    updateConnectionStatus('', '테스트 모드');
    console.log('[테스트 모드] Chrome Tabs API 없음');
  }
}

// 로그 추가
function addLog(message, type = 'info') {
  const time = new Date().toLocaleTimeString('ko-KR');
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-${type}">${message}</span>
  `;

  // 빈 상태 메시지 제거
  const emptyLog = elements.logContainer.querySelector('.log-empty');
  if (emptyLog) {
    emptyLog.remove();
  }

  elements.logContainer.appendChild(logEntry);
  elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

// 알림 표시
function showNotification(message, type = 'info') {
  showToast(message, type);
  addLog(message, type);
}

// 텍스트 자르기
function truncate(text, length) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Content Script로부터 메시지 수신
try {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'progress') {
      updateProgress(message.current, message.total);
      addLog(`진행 중: ${message.current}/${message.total}`, 'info');
    }
  });
} catch (e) {
  console.log('[테스트 모드] Chrome API 없음');
}

function collectFilters() {
  const text = el => (el ? el.value.trim() : '');

  return {
    studentName: text(elements.studentName) || (state.currentStudent?.name || ''),
    year: text(elements.year),
    semester: elements.semester ? elements.semester.value : '',
    grade: elements.grade ? elements.grade.value : '',
    className: text(elements.className),
    studentNumber: text(elements.studentNumber),
    inputType: elements.inputType ? elements.inputType.value : '',
    subject: text(elements.subject)
  };
}

// 학생 선택 시 필드 자동 채움
function handleStudentSelection() {
  const selectedOption = elements.studentSelect.selectedOptions[0];
  if (!selectedOption || !selectedOption.dataset.student) {
    return;
  }

  try {
    const student = JSON.parse(selectedOption.dataset.student);
    state.currentStudent = student;

    if (elements.studentName && student.name) {
      elements.studentName.value = student.name;
    }
    if (elements.grade && student.grade !== undefined) {
      elements.grade.value = String(student.grade);
    }
    if (elements.className && student.class !== undefined) {
      elements.className.value = String(student.class);
    }
    if (elements.studentNumber && student.number !== undefined) {
      elements.studentNumber.value = String(student.number);
    }

    addLog(`학생 선택: ${student.name}`, 'info');
  } catch (error) {
    console.error(error);
  }
}


// 초기화 실행
init();

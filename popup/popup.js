// 상태 관리
let state = {
  websiteUrl: '',
  apiKey: '',
  inputMethod: 'website',
  monthlyPlans: [],
  currentStudent: null,
  isProcessing: false,
  filters: {}
};

// DOM 요소
const elements = {
  websiteUrl: document.getElementById('websiteUrl'),
  apiKey: document.getElementById('apiKey'),
  testConnection: document.getElementById('testConnection'),
  saveSettings: document.getElementById('saveSettings'),
  inputMethodRadios: document.querySelectorAll('input[name="inputMethod"]'),
  websiteDataSection: document.getElementById('websiteDataSection'),
  manualInputSection: document.getElementById('manualInputSection'),
  jsonInputSection: document.getElementById('jsonInputSection'),
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
  previewActions: document.getElementById('previewActions'),
  dataCount: document.getElementById('dataCount'),
  clearData: document.getElementById('clearData'),
  startAutoFill: document.getElementById('startAutoFill'),
  progressContainer: document.getElementById('progressContainer'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  logContainer: document.getElementById('logContainer'),
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.getElementById('statusText'),
  connectionStatus: document.getElementById('connectionStatus')
};

// 초기화
async function init() {
  // 저장된 설정 불러오기
  const settings = await chrome.storage.local.get(['websiteUrl', 'apiKey']);
  if (settings.websiteUrl) {
    elements.websiteUrl.value = settings.websiteUrl;
    state.websiteUrl = settings.websiteUrl;
  } else {
    // 기본 URL 설정
    elements.websiteUrl.value = 'https://www.iepon.site';
    state.websiteUrl = 'https://www.iepon.site';
  }
  if (settings.apiKey) {
    elements.apiKey.value = settings.apiKey;
    state.apiKey = settings.apiKey;
  }

  // 현재 학년도 설정
  const currentYear = new Date().getFullYear();
  elements.year.value = currentYear;

  // 이벤트 리스너 등록
  registerEventListeners();

  // 나이스 페이지 확인
  checkNicePage();

  addLog('확장 프로그램이 시작되었습니다', 'info');
}

// 이벤트 리스너 등록
function registerEventListeners() {
  // 설정 저장
  elements.saveSettings.addEventListener('click', saveSettings);
  elements.testConnection.addEventListener('click', testConnection);

  // 입력 방식 변경
  elements.inputMethodRadios.forEach(radio => {
    radio.addEventListener('change', handleInputMethodChange);
  });

  // 웹사이트 연동
  elements.loadStudents.addEventListener('click', loadStudents);
  elements.fetchData.addEventListener('click', fetchDataFromWebsite);
  elements.studentSelect.addEventListener('change', handleStudentSelection);

  // 수동 입력
  elements.addManualData.addEventListener('click', addManualData);

  // JSON 입력
  elements.parseJson.addEventListener('click', parseJsonData);

  // 데이터 관리
  elements.clearData.addEventListener('click', clearAllData);

  // 자동 입력 시작
  elements.startAutoFill.addEventListener('click', startAutoFill);
}

// 설정 저장
async function saveSettings() {
  const websiteUrl = elements.websiteUrl.value.trim();
  const apiKey = elements.apiKey.value.trim();

  if (!websiteUrl) {
    showNotification('웹사이트 URL을 입력하세요', 'error');
    return;
  }

  await chrome.storage.local.set({ websiteUrl, apiKey });
  state.websiteUrl = websiteUrl;
  state.apiKey = apiKey;

  showNotification('설정이 저장되었습니다', 'success');
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
  elements.statusIndicator.className = `status-indicator ${status}`;
  elements.statusText.textContent = text;
}

// 입력 방식 변경
function handleInputMethodChange(e) {
  state.inputMethod = e.target.value;

  // 모든 섹션 숨기기
  elements.websiteDataSection.classList.add('hidden');
  elements.manualInputSection.classList.add('hidden');
  elements.jsonInputSection.classList.add('hidden');

  // 선택된 섹션만 표시
  switch (state.inputMethod) {
    case 'website':
      elements.websiteDataSection.classList.remove('hidden');
      break;
    case 'manual':
      elements.manualInputSection.classList.remove('hidden');
      break;
    case 'json':
      elements.jsonInputSection.classList.remove('hidden');
      break;
  }

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
    state.monthlyPlans = plans.map(plan => ({
      month: plan.month || plan.mmnt || plan.월,
      goal: plan.goal || plan.educationGoals || plan.교육목표 || '',
      content: plan.content || plan.educationContent || plan.교육내용 || '',
      method: plan.method || plan.educationMethod || plan.교육방법 || '',
      evaluation: plan.evaluation || plan.evaluationPlan || plan.평가계획 || ''
    }));

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
    elements.dataPreview.innerHTML = '<p class="empty-state">데이터를 가져오거나 입력하세요</p>';
    elements.previewActions.classList.add('hidden');
    elements.startAutoFill.disabled = true;
    return;
  }

  elements.dataPreview.innerHTML = state.monthlyPlans.map((plan, index) => `
    <div class="preview-item">
      <button class="preview-remove" data-index="${index}">×</button>
      <div class="preview-month">📅 ${plan.month}월</div>
      ${plan.goal ? `<div class="preview-field"><strong>목표:</strong> ${truncate(plan.goal, 50)}</div>` : ''}
      ${plan.content ? `<div class="preview-field"><strong>내용:</strong> ${truncate(plan.content, 50)}</div>` : ''}
      ${plan.method ? `<div class="preview-field"><strong>방법:</strong> ${truncate(plan.method, 50)}</div>` : ''}
      ${plan.evaluation ? `<div class="preview-field"><strong>평가:</strong> ${truncate(plan.evaluation, 50)}</div>` : ''}
    </div>
  `).join('');

  // 삭제 버튼 이벤트 리스너
  elements.dataPreview.querySelectorAll('.preview-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeDataItem(index);
    });
  });

  elements.previewActions.classList.remove('hidden');
  elements.dataCount.textContent = `${state.monthlyPlans.length}개 항목`;
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
      plans: state.monthlyPlans
    };

    console.log('[나이스 자동입력] 전송할 데이터:', payload);
    addLog(`${state.monthlyPlans.length}개 항목 전송 준비 완료`, 'info');

    // Content Script에 메시지 전송
    let response;
    try {
      addLog('Content Script에 메시지 전송 중...', 'info');
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillMonthlyPlans',
        data: payload
      });
      console.log('[나이스 자동입력] 응답 받음:', response);
    } catch (err) {
      console.error('[나이스 자동입력] 메시지 전송 오류:', err);
      const message = err?.message || '';
      if (message.includes('Could not establish connection') || message.includes('Receiving end does not exist')) {
        addLog('Content Script 재주입 중...', 'info');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-script.js']
        });

        addLog('재시도 중...', 'info');
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'fillMonthlyPlans',
          data: payload
        });
        console.log('[나이스 자동입력] 재시도 응답:', response);
      } else {
        throw err;
      }
    }

    if (response.success) {
      showNotification('자동 입력이 완료되었습니다', 'success');
      addLog('자동 입력 완료', 'success');
      
      // 진행 상황 100%
      updateProgress(state.monthlyPlans.length, state.monthlyPlans.length);
    } else {
      throw new Error(response.error || '알 수 없는 오류');
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
    addLog('페이지 확인 실패', 'error');
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
  // 간단한 알림 (추후 토스트 UI로 개선 가능)
  addLog(message, type);
}

// 텍스트 자르기
function truncate(text, length) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Content Script로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'progress') {
    updateProgress(message.current, message.total);
    addLog(`진행 중: ${message.current}/${message.total}`, 'info');
  }
});

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

// 고급 설정 토글
const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
if (toggleAdvancedBtn) {
  toggleAdvancedBtn.addEventListener('click', () => {
    const advancedSections = [
      document.getElementById('connectionStatus'),
      document.getElementById('websiteConnectionSection'),
      document.getElementById('inputMethodSection'),
      document.getElementById('websiteDataSection'),
      document.getElementById('manualInputSection')
    ];
    
    const isHidden = advancedSections[0].classList.contains('hidden');
    
    advancedSections.forEach(section => {
      if (section) {
        if (isHidden) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      }
    });
    
    toggleAdvancedBtn.textContent = isHidden ? '⚙️ 고급 설정 숨기기' : '⚙️ 고급 설정 보기';
    addLog(isHidden ? '고급 설정 활성화' : '고급 설정 비활성화', 'info');
  });
}

// 초기화 실행
init();

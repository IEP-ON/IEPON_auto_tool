/**
 * Background Service Worker
 * Chrome Extension의 백그라운드 작업 처리
 */

// 확장 프로그램 설치/업데이트 시
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[나이스 자동입력] 확장 프로그램 설치됨');

    chrome.storage.local.set({
      websiteUrl: '',
      apiKey: '',
      autoSave: true,
      notificationEnabled: true
    });
  } else if (details.reason === 'update') {
    console.log('[나이스 자동입력] 확장 프로그램 업데이트됨');
  }

  if (chrome.contextMenus && chrome.contextMenus.create) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'nice-auto-fill',
        title: '나이스 자동입력 실행',
        contexts: ['page'],
        documentUrlPatterns: ['https://dge.neis.go.kr/*']
      });
    });
  }
});

// 확장 프로그램 아이콘 클릭 시
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    console.log('[나이스 자동입력] 아이콘 클릭됨');

    if (tab.url && tab.url.includes('dge.neis.go.kr')) {
      // 나이스 페이지에서는 팝업이 자동으로 열림
      return;
    }

    if (chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/logo.png',
        title: '나이스 월별계획 자동입력',
        message: '나이스 시스템 페이지에서 사용해주세요.',
        priority: 2
      });
    }
  });
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] 메시지 수신:', message);

  // Popup에서 Content Script로 메시지 전달
  if (message.action === 'relayToContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message.data, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // 비동기 응답
  }

  // 진행 상황 업데이트
  if (message.action === 'progress') {
    chrome.storage.local.set({ lastProgress: message });

    chrome.runtime.sendMessage(message);

    chrome.runtime.sendMessage({ action: 'progress', ...message });

    chrome.runtime.sendMessage({ action: 'progress_update', data: message });
  }

  // 알림 표시
  if (message.action === 'notify') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/logo.png',
      title: message.title || '나이스 자동입력',
      message: message.message,
      priority: message.priority || 1
    });
  }
});

// 탭 업데이트 감지
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 나이스 페이지 로드 완료 시
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('dge.neis.go.kr')) {
    console.log('[Background] 나이스 페이지 로드 완료');
    
    // Content Script 주입 확인 (이미 manifest.json에서 자동 주입됨)
    // 필요시 추가 작업 수행
  }
});

// 컨텍스트 메뉴 클릭 시
if (chrome.contextMenus && chrome.contextMenus.onClicked && chrome.action && chrome.action.openPopup) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'nice-auto-fill') {
      chrome.action.openPopup();
    }
  });
}

// 저장소 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('[Background] 저장소 변경됨:', changes);
  }
});

// 주기적 작업 (선택사항)
// chrome.alarms.create('checkConnection', { periodInMinutes: 30 });

if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkConnection') {
      console.log('[Background] 주기적 작업 실행');
    }
  });
}

console.log('[Background] Service Worker 시작됨');

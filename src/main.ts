// 앱 부트스트랩. 하위 레이어/뷰를 초기화하고 헤더 상태/네비/키 게이트를 배선한다.
import './styles/main.css';

import { $ } from './ui/dom';
import { initDB } from './lib/db';
import { hasApiKey } from './lib/apiKey';
import {
  initApiKeySheet,
  ensureApiKey,
  openApiKeySettings,
  updateKeyStatus,
} from './ui/apiKeyModal';
import { initNav, switchPage } from './ui/nav';
import {
  initPersonaView,
  loadPersonas,
  renderPersonaSelector,
  getPersonaName,
  openCreateSheet,
} from './ui/personaView';
import { initAnalyzeView } from './ui/analyzeView';
import { initHistoryView, loadHistory } from './ui/historyView';

async function main(): Promise<void> {
  await initDB();

  // API 키 시트(온보딩 + 설정) 바인딩
  initApiKeySheet();

  // 뷰 초기화 + 이벤트 바인딩
  initPersonaView({
    goToAnalyze: () => switchPage('analyze'),
    refreshSelector: () => renderPersonaSelector(),
    ensureKey: ensureApiKey,
  });
  initAnalyzeView({
    ensureKey: ensureApiKey,
    getSelectedPersonaName: (id) => getPersonaName(id),
  });
  initHistoryView();

  // 네비게이션 배선 (페이지 전환 시 선택기 갱신/기록 로드)
  initNav({
    onRefreshSelector: () => renderPersonaSelector(),
    onLoadHistory: () => void loadHistory(),
    onOpenCreate: () => openCreateSheet(),
  });

  // 헤더 상태 버튼 → 키 설정 시트
  $('#keyStatus').addEventListener('click', () => openApiKeySettings());

  // 헤더 상태 초기 표시
  updateKeyStatus();

  // 첫 로드 시 키가 없으면 온보딩 게이트
  if (!hasApiKey()) {
    void ensureApiKey();
  }

  // 페르소나 로드
  await loadPersonas();
}

void main();

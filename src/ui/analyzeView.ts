// 메시지 분석 화면. 원본 index.html analyzeMessage / renderResults / copyResponse 이식.
import type { AnalysisRecord, CandidateReply } from '../types';
import { $, escHtml } from './dom';
import { showToast } from './toast';
import { showLoading, hideLoading } from './loading';
import { getSelectedPersonaId } from './state';
import * as analysisService from '../services/analysisService';

export interface AnalyzeViewDeps {
  /** 키 게이트: 키가 있으면 true, 없으면 모달 띄우고 결과 반환 */
  ensureKey: () => Promise<boolean>;
  /** 선택된 페르소나 이름(로딩 메시지용) */
  getSelectedPersonaName: (id: string) => string;
}

let deps: AnalyzeViewDeps;
let currentCandidates: CandidateReply[] = [];

const COPY_ICON =
  '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';

export async function analyzeMessage(): Promise<void> {
  const selectedPersonaId = getSelectedPersonaId();
  if (!selectedPersonaId) {
    showToast('페르소나를 선택해주세요', 'error');
    return;
  }
  const message = ($('#messageInput') as HTMLTextAreaElement).value.trim();
  if (!message) {
    showToast('메시지를 입력해주세요', 'error');
    return;
  }

  // 키 게이트
  const ok = await deps.ensureKey();
  if (!ok) return;

  const personaName = deps.getSelectedPersonaName(selectedPersonaId);
  showLoading('메시지 분석 중...', `${personaName}의 심리를 파악하고 있어요 🔍`);

  try {
    const data = await analysisService.analyzeMessage(selectedPersonaId, message);
    renderResults(data);
    hideLoading();
    // 결과로 스크롤
    setTimeout(() => {
      $('#analyzeResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch {
    hideLoading();
    showToast('분석에 실패했습니다. API 키 설정을 확인해주세요', 'error');
  }
}

function renderResults(data: AnalysisRecord): void {
  currentCandidates = data.candidates || [];
  const results = $('#analyzeResults');
  $('#analysisText').textContent = data.analysis || '';
  $('#candidateList').innerHTML = currentCandidates
    .map(
      (c, i) => `
      <div class="candidate-card">
        <div class="candidate-header">
          <div class="candidate-num">${i + 1}</div>
          <div class="candidate-label">${escHtml(c.label || `후보 ${i + 1}`)}</div>
        </div>
        <div class="candidate-body">
          <div class="candidate-reason">
            <strong>원하는 이유:</strong> ${escHtml(c.reason || '')}
          </div>
          <div class="candidate-response">${escHtml(c.response || '')}</div>
          <button class="candidate-copy" data-copy="${i}">
            ${COPY_ICON}
            복사하기
          </button>
        </div>
      </div>
    `,
    )
    .join('');
  results.style.display = 'block';
}

async function copyResponse(btn: HTMLElement, idx: number): Promise<void> {
  const text = (currentCandidates[idx] || ({} as CandidateReply)).response || '';
  try {
    await navigator.clipboard.writeText(text);
    btn.classList.add('copied');
    btn.innerHTML = '✓ 복사됨';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `${COPY_ICON} 복사하기`;
    }, 2000);
  } catch {
    showToast('클립보드 복사 실패', 'error');
  }
}

export function initAnalyzeView(d: AnalyzeViewDeps): void {
  deps = d;

  $('#analyzeBtn').addEventListener('click', () => {
    void analyzeMessage();
  });

  // 후보 복사 버튼 (이벤트 위임 — 동적 렌더링)
  $('#candidateList').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.candidate-copy');
    if (!btn) return;
    const idx = Number(btn.dataset['copy']);
    if (!Number.isNaN(idx)) void copyResponse(btn, idx);
  });

  // cmd+Enter → 분석 페이지일 때만 분석
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      const activePage = document.querySelector('.page.active');
      if (activePage && activePage.id === 'page-analyze') void analyzeMessage();
    }
  });
}

// 분석 기록 화면. 원본 index.html loadHistory / renderHistory / toggle / delete 이식.
import type { AnalysisRecord } from '../types';
import { $, escHtml, formatDate } from './dom';
import { showToast } from './toast';
import * as analysisService from '../services/analysisService';

let analyses: AnalysisRecord[] = [];

export async function loadHistory(): Promise<void> {
  try {
    analyses = await analysisService.listAnalyses();
    renderHistory();
  } catch {
    showToast('기록을 불러오지 못했습니다', 'error');
  }
}

function renderHistory(): void {
  const list = $('#historyList');
  const empty = $('#historyEmpty');
  if (analyses.length === 0) {
    empty.style.display = '';
    list.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  list.style.display = 'flex';
  list.innerHTML = analyses
    .map((a) => {
      const preview = a.message.length > 55 ? a.message.slice(0, 55) + '…' : a.message;
      const candidatesHtml = (a.candidates || [])
        .map(
          (c, i) => `
        <div class="candidate-card">
          <div class="candidate-header">
            <div class="candidate-num">${i + 1}</div>
            <div class="candidate-label">${escHtml(c.label || `후보 ${i + 1}`)}</div>
          </div>
          <div class="candidate-body">
            <div class="candidate-reason"><strong>원하는 이유:</strong> ${escHtml(c.reason || '')}</div>
            <div class="candidate-response">${escHtml(c.response || '')}</div>
          </div>
        </div>
      `,
        )
        .join('');
      return `
        <div class="history-card" id="hcard-${escHtml(a.id)}">
          <div class="history-card-header" data-toggle="${escHtml(a.id)}">
            <div class="history-card-info">
              <div class="history-persona-name">${escHtml(a.persona_name)}</div>
              <div class="history-msg-preview">"${escHtml(preview)}"</div>
              <div class="history-card-date">${formatDate(a.created_at)}</div>
            </div>
            <svg class="history-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          <div class="history-card-body" id="hbody-${escHtml(a.id)}">
            <div class="analysis-box" style="margin-bottom:12px">
              <div class="analysis-box-label"><span>🔍</span> AI 심리 분석</div>
              <p class="analysis-box-text">${escHtml(a.analysis || '')}</p>
            </div>
            <p class="section-title" style="margin-bottom:10px">원하는 답변 후보</p>
            <div class="candidate-list">${candidatesHtml}</div>
            <button class="history-delete-btn" data-delete="${escHtml(a.id)}">기록 삭제</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function toggleHistoryCard(id: string): void {
  $(`#hbody-${CSS.escape(id)}`).classList.toggle('open');
  $(`#hcard-${CSS.escape(id)}`).classList.toggle('expanded');
}

async function deleteHistory(id: string): Promise<void> {
  if (!confirm('이 분석 기록을 삭제할까요?')) return;
  try {
    await analysisService.removeAnalysis(id);
    analyses = analyses.filter((a) => a.id !== id);
    renderHistory();
    showToast('기록 삭제 완료', 'success');
  } catch {
    showToast('삭제에 실패했습니다', 'error');
  }
}

export function initHistoryView(): void {
  $('#historyList').addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const deleteBtn = target.closest<HTMLElement>('[data-delete]');
    if (deleteBtn) {
      const id = deleteBtn.dataset['delete'];
      if (id) void deleteHistory(id);
      return;
    }

    const header = target.closest<HTMLElement>('[data-toggle]');
    if (header) {
      const id = header.dataset['toggle'];
      if (id) toggleHistoryCard(id);
    }
  });
}

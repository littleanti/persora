// 페르소나 목록 + 생성 시트 + 상세 시트.
// 원본 index.html의 persona CRUD / detail 렌더링을 충실히 이식하되,
// inline onclick 대신 이벤트 위임/리스너를 사용한다.
import type { PersonaRecord, PersonaSummary, PersonaFields } from '../types';
import { $, $opt, escHtml, formatDate, getInitial } from './dom';
import { showToast } from './toast';
import { showLoading, hideLoading } from './loading';
import { getSelectedPersonaId, setSelectedPersonaId } from './state';
import * as personaService from '../services/personaService';

export interface PersonaViewDeps {
  /** 분석 페이지로 이동(상세 시트의 "이 페르소나로 분석") */
  goToAnalyze: () => void;
  /** 분석 페이지 선택기 갱신 트리거 */
  refreshSelector: () => void;
  /** 키 게이트: 키가 있으면 true, 없으면 모달 띄우고 결과 반환 */
  ensureKey: () => Promise<boolean>;
}

let deps: PersonaViewDeps;
let personas: PersonaSummary[] = [];
let currentDetailData: PersonaRecord | null = null;

// ── 목록 / 선택기 ─────────────────────────────────────────────────────────────

export async function loadPersonas(): Promise<void> {
  try {
    personas = await personaService.listPersonaSummaries();
    renderPersonaList();
    renderPersonaSelector();
    updateBadge();
  } catch {
    showToast('페르소나를 불러오지 못했습니다', 'error');
  }
}

function updateBadge(): void {
  const badge = $('#personaBadge');
  if (personas.length > 0) {
    badge.style.display = 'flex';
    badge.textContent = String(personas.length);
  } else {
    badge.style.display = 'none';
  }
}

function renderPersonaList(): void {
  const empty = $('#emptyPersonas');
  const list = $('#personaList');
  if (personas.length === 0) {
    empty.style.display = '';
    list.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  list.style.display = 'flex';
  list.innerHTML = personas
    .map(
      (p) => `
      <div class="persona-card" data-id="${escHtml(p.id)}">
        <div class="persona-avatar">${getInitial(p.name)}</div>
        <div class="persona-info">
          <div class="persona-name">
            ${escHtml(p.name)}
            ${p.my_name ? `<span style="font-size:12px;font-weight:500;color:var(--primary);background:var(--primary-bg);padding:2px 7px;border-radius:20px;margin-left:6px;">나: ${escHtml(p.my_name)}</span>` : ''}
          </div>
          <div class="persona-summary">${escHtml(p.summary || '페르소나 분석 완료')}</div>
          <div class="persona-date">${formatDate(p.created_at)}</div>
        </div>
        <div class="persona-arrow">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    `,
    )
    .join('');
}

export function renderPersonaSelector(): void {
  const sel = $('#personaSelector');
  const hint = $('#noPersonaHint');
  if (personas.length === 0) {
    sel.innerHTML = '';
    hint.style.display = 'flex';
    return;
  }
  hint.style.display = 'none';
  const selectedId = getSelectedPersonaId();
  sel.innerHTML = personas
    .map(
      (p) => `
      <div class="persona-chip ${selectedId === p.id ? 'selected' : ''}" data-id="${escHtml(p.id)}">
        <div class="chip-avatar">${getInitial(p.name)}</div>
        ${escHtml(p.name)}${p.my_name ? ` <span style="opacity:.6;font-size:12px;">/ 나: ${escHtml(p.my_name)}</span>` : ''}
      </div>
    `,
    )
    .join('');
}

export function selectPersona(id: string): void {
  setSelectedPersonaId(id);
  renderPersonaSelector();
}

export function getSelectedPersona(): string | null {
  return getSelectedPersonaId();
}

/** 로드된 요약 목록에서 페르소나 이름을 조회(로딩 메시지용). */
export function getPersonaName(id: string): string {
  return personas.find((p) => p.id === id)?.name ?? '';
}

// ── 생성 시트 ─────────────────────────────────────────────────────────────────

export function openCreateSheet(): void {
  $('#createOverlay').classList.add('open');
  $('#createSheet').classList.add('open');
  setTimeout(() => ($('#personaName') as HTMLInputElement).focus(), 350);
}

function closeCreateSheet(): void {
  $('#createOverlay').classList.remove('open');
  $('#createSheet').classList.remove('open');
}

async function createPersona(): Promise<void> {
  const name = ($('#personaName') as HTMLInputElement).value.trim();
  const myName = ($('#myName') as HTMLInputElement).value.trim();
  const conversation = ($('#conversationInput') as HTMLTextAreaElement).value.trim();
  if (!name) {
    showToast('이름을 입력해주세요', 'error');
    return;
  }
  if (conversation.length < 20) {
    showToast('대화 기록이 너무 짧아요', 'error');
    return;
  }

  // 키 게이트: 없으면 모달을 띄우고, 저장 없이 닫으면 중단
  const ok = await deps.ensureKey();
  if (!ok) return;

  closeCreateSheet();
  const loadingSub = myName
    ? `${name}과 ${myName}의 페르소나를 동시에 분석하고 있어요`
    : `${name}의 대화를 분석하고 있어요`;
  showLoading('페르소나 생성 중...', loadingSub);

  try {
    await personaService.createPersona({ name, my_name: myName, conversation });
    showToast(`${name} 페르소나 생성 완료!`, 'success');
    ($('#personaName') as HTMLInputElement).value = '';
    ($('#myName') as HTMLInputElement).value = '';
    ($('#conversationInput') as HTMLTextAreaElement).value = '';
    await loadPersonas();
  } catch {
    showToast('페르소나 생성에 실패했습니다', 'error');
  } finally {
    hideLoading();
  }
}

// ── 상세 시트 ─────────────────────────────────────────────────────────────────

async function openDetailSheet(id: string): Promise<void> {
  currentDetailData = null;
  showLoading('불러오는 중...', '');
  try {
    const data = await personaService.getPersona(id);
    if (!data) throw new Error('not found');
    currentDetailData = data;
    renderDetail(data);
    hideLoading();
    $('#detailOverlay').classList.add('open');
    $('#detailSheet').classList.add('open');
  } catch {
    hideLoading();
    showToast('상세 정보를 불러오지 못했습니다', 'error');
  }
}

function closeDetailSheet(): void {
  $('#detailOverlay').classList.remove('open');
  $('#detailSheet').classList.remove('open');
}

function buildPersonaFields(obj: Record<string, unknown>): string {
  const LABEL_MAP: Record<string, [string, boolean]> = {
    communication_style: ['소통 방식', false],
    speech_level: ['경어/어미 패턴', false],
    vocabulary_examples: ['자주 쓰는 표현', true],
    sentence_style: ['문장 스타일', false],
    emoji_symbol_usage: ['이모지/특수문자', false],
    emotional_tendencies: ['감정 표현', false],
    what_they_value: ['중요 가치', false],
    how_they_seek_response: ['원하는 반응', false],
    relationship_dynamics: ['관계 역학', false],
    tone: ['말투', false],
    key_interactions: ['상호작용 패턴', true],
  };
  // 어떤 값이든 사람이 읽을 수 있는 문자열로 변환
  const toStr = (v: unknown): string => {
    if (v == null) return '';
    if (typeof v !== 'object') return String(v);
    if (Array.isArray(v)) return v.map(toStr).filter(Boolean).join(', ');
    return Object.values(v as Record<string, unknown>).map(toStr).filter(Boolean).join(' / ');
  };
  const isEmpty = (v: unknown): boolean => {
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length === 0;
    return !String(v).trim();
  };
  return Object.entries(obj)
    .filter(([k, v]) => k !== 'summary' && !isEmpty(v))
    .map(([k, v]) => {
      const known = LABEL_MAP[k];
      const label = known ? known[0] : k.replace(/_/g, ' ');
      const isArr = known ? known[1] : Array.isArray(v);
      const val =
        isArr && Array.isArray(v)
          ? v
              .map(
                (item) =>
                  `<span style="display:inline-block;background:var(--primary-bg);color:var(--primary);border-radius:6px;padding:2px 8px;margin:2px;font-size:13px;">${escHtml(toStr(item))}</span>`,
              )
              .join('')
          : `<span>${escHtml(toStr(v))}</span>`;
      return `
          <div class="persona-tag">
            <div class="persona-tag-label">${label}</div>
            <div class="persona-tag-value" style="${isArr ? 'display:flex;flex-wrap:wrap;gap:2px;' : ''}">${val}</div>
          </div>
        `;
    })
    .join('');
}

function normalizePersonaData(data: PersonaRecord): {
  personaData: PersonaFields;
  myPersonaData: PersonaFields;
} {
  let personaData: PersonaFields = data.persona || {};
  let myPersonaData: PersonaFields = data.my_persona || {};
  // LLM이 {other: {...}, self: {...}} 구조로 반환한 경우 펼치기
  if (
    personaData['other'] &&
    typeof personaData['other'] === 'object' &&
    !personaData.summary &&
    !personaData.communication_style &&
    !personaData['tone']
  ) {
    if (!Object.keys(myPersonaData).length && personaData['self'])
      myPersonaData = personaData['self'] as PersonaFields;
    personaData = personaData['other'] as PersonaFields;
  }
  // LLM이 {other_persona: {...}, my_persona: {...}} 구조로 반환한 경우 펼치기
  else if (personaData['other_persona'] && typeof personaData['other_persona'] === 'object') {
    if (!Object.keys(myPersonaData).length && personaData['my_persona'])
      myPersonaData = personaData['my_persona'] as PersonaFields;
    personaData = personaData['other_persona'] as PersonaFields;
  }
  return { personaData, myPersonaData };
}

function renderDetail(data: PersonaRecord): void {
  const { personaData, myPersonaData } = normalizePersonaData(data);
  const hasDual = !!data.my_name && Object.keys(myPersonaData).length > 0;

  const tabsHtml = hasDual
    ? `
      <div class="persona-tabs">
        <button class="persona-tab active" id="tab-other" data-tab="other">
          👤 ${escHtml(data.name)}
        </button>
        <button class="persona-tab" id="tab-me" data-tab="me">
          🙋 나 (${escHtml(data.my_name)})
        </button>
      </div>
    `
    : '';

  const otherFields = buildPersonaFields(personaData as Record<string, unknown>);
  const myFields = hasDual ? buildPersonaFields(myPersonaData as Record<string, unknown>) : '';

  const summaryBlock = (s: unknown): string =>
    s ? `<div class="detail-summary">${escHtml(s)}</div>` : '';

  const personaHtml = hasDual
    ? `
      ${tabsHtml}
      <div class="persona-tab-pane active" id="pane-other">
        ${summaryBlock(personaData.summary)}
        <div class="persona-tag-grid">${otherFields}</div>
      </div>
      <div class="persona-tab-pane" id="pane-me">
        <div class="my-persona-badge">✦ ${escHtml(data.my_name)}와 ${escHtml(data.name)}의 관계에서의 나</div>
        ${summaryBlock(myPersonaData.summary)}
        <div class="persona-tag-grid" style="margin-top:10px;">${myFields}</div>
      </div>
    `
    : `${summaryBlock(personaData.summary)}<div class="persona-tag-grid">${otherFields}</div>`;

  $('#detailBody').innerHTML = `
      <div class="detail-hero">
        <div class="detail-avatar">${getInitial(data.name)}</div>
        <div class="detail-name">${escHtml(data.name)}</div>
        ${hasDual ? `<div class="my-persona-badge" style="margin:6px auto 0;">나: ${escHtml(data.my_name)}</div>` : ''}
        <div class="detail-date" style="margin-top:6px;">생성일 ${formatDate(data.created_at)}</div>
      </div>
      ${personaHtml}
      <div class="conv-preview">
        <button class="conv-preview-toggle" data-action="toggle-conv">
          <span>📝 원본 대화 기록 보기</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 9l-7 7-7-7"/></svg>
        </button>
        <div class="conv-preview-body">
          <pre class="conv-text">${escHtml(data.conversation || '')}</pre>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;gap:10px;align-items:stretch;">
        <button class="btn btn-secondary" style="flex:1;" data-action="use">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          이 페르소나로 분석
        </button>
        <button class="btn btn-danger" style="flex-shrink:0;white-space:nowrap;" data-action="delete">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          삭제
        </button>
      </div>
    `;
}

function switchDetailTab(which: 'other' | 'me'): void {
  $opt('#pane-other')?.classList.toggle('active', which === 'other');
  $opt('#pane-me')?.classList.toggle('active', which === 'me');
  $opt('#tab-other')?.classList.toggle('active', which === 'other');
  $opt('#tab-me')?.classList.toggle('active', which === 'me');
}

function toggleConvPreview(btn: HTMLElement): void {
  const body = btn.nextElementSibling;
  body?.classList.toggle('open');
}

function usePersonaForAnalysis(): void {
  if (!currentDetailData) return;
  setSelectedPersonaId(currentDetailData.id);
  const name = currentDetailData.name;
  closeDetailSheet();
  deps.goToAnalyze();
  renderPersonaSelector();
  showToast(`${name} 페르소나 선택됨`, 'success');
}

async function deletePersona(): Promise<void> {
  if (!currentDetailData) return;
  const { id, name } = currentDetailData;
  if (!confirm(`"${name}" 페르소나를 삭제할까요?`)) return;
  try {
    await personaService.removePersona(id);
    closeDetailSheet();
    if (getSelectedPersonaId() === id) setSelectedPersonaId(null);
    await loadPersonas();
    deps.refreshSelector();
    showToast(`${name} 삭제 완료`, 'success');
  } catch {
    showToast('삭제에 실패했습니다', 'error');
  }
}

// ── 초기화 (이벤트 바인딩) ────────────────────────────────────────────────────

export function initPersonaView(d: PersonaViewDeps): void {
  deps = d;

  // 목록 카드 클릭 → 상세 (이벤트 위임)
  $('#personaList').addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.persona-card');
    const id = card?.dataset['id'];
    if (id) void openDetailSheet(id);
  });

  // 선택기 칩 클릭 → 선택 (이벤트 위임)
  $('#personaSelector').addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('.persona-chip');
    const id = chip?.dataset['id'];
    if (id) selectPersona(id);
  });

  // 생성 시트
  $('#createBtn').addEventListener('click', () => {
    void createPersona();
  });
  $('#createSheetClose').addEventListener('click', () => closeCreateSheet());
  $('#createOverlay').addEventListener('click', () => closeCreateSheet());

  // 상세 시트 닫기
  $('#detailSheetClose').addEventListener('click', () => closeDetailSheet());
  $('#detailOverlay').addEventListener('click', () => closeDetailSheet());

  // 상세 시트 내부 동적 요소(탭/대화 토글/버튼) → 이벤트 위임
  $('#detailBody').addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const tabBtn = target.closest<HTMLElement>('[data-tab]');
    if (tabBtn) {
      switchDetailTab(tabBtn.dataset['tab'] as 'other' | 'me');
      return;
    }
    const actionBtn = target.closest<HTMLElement>('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset['action'];
    if (action === 'toggle-conv') toggleConvPreview(actionBtn);
    else if (action === 'use') usePersonaForAnalysis();
    else if (action === 'delete') void deletePersona();
  });
}

// Gemini API 키 온보딩/설정 시트.
// - 온보딩 모드: 키가 없을 때 강제로 열어 유효한 키를 받을 때까지 게이트
// - 설정 모드: 헤더 상태 버튼에서 열며 키 삭제 버튼 노출
import { $ } from './dom';
import { GEMINI_API_KEY_HELP_URL } from '../config';
import { hasApiKey, setApiKey, clearApiKey, looksLikeKey } from '../lib/apiKey';
import { validateKey } from '../lib/gemini';
import { showToast } from './toast';
import { showLoading, hideLoading } from './loading';

type Mode = 'onboarding' | 'settings';

let mode: Mode = 'settings';
// 온보딩 모드에서 ensureApiKey()가 대기 중인 resolve.
let onboardingResolve: ((ok: boolean) => void) | null = null;

/** 헤더 상태 표시(statusDot/statusText)를 키 보유 여부로 갱신. */
export function updateKeyStatus(): void {
  const dot = $('#statusDot');
  const text = $('#statusText');
  if (hasApiKey()) {
    dot.classList.add('online');
    text.textContent = 'Gemini 준비됨';
  } else {
    dot.classList.remove('online');
    text.textContent = 'API 키 미등록';
  }
}

function openSheet(): void {
  $('#apikeyOverlay').classList.add('open');
  $('#apikeySheet').classList.add('open');
  ($('#apikeyInput') as HTMLInputElement).value = '';
  // 모드에 따라 삭제 버튼 표시
  $('#apikeyClearBtn').style.display = mode === 'settings' && hasApiKey() ? '' : 'none';
  setTimeout(() => ($('#apikeyInput') as HTMLInputElement).focus(), 350);
}

function closeSheet(): void {
  $('#apikeyOverlay').classList.remove('open');
  $('#apikeySheet').classList.remove('open');
}

/** 사용자가 저장 없이 시트를 닫았을 때 — 온보딩 대기 중이면 false로 resolve. */
function handleClosed(): void {
  closeSheet();
  if (mode === 'onboarding' && onboardingResolve) {
    const resolve = onboardingResolve;
    onboardingResolve = null;
    resolve(false);
  }
}

async function handleSave(): Promise<void> {
  const key = ($('#apikeyInput') as HTMLInputElement).value.trim();
  if (!looksLikeKey(key)) {
    showToast('API 키 형식이 올바르지 않습니다', 'error');
    return;
  }

  showLoading('키 확인 중...', 'Gemini에 연결하고 있어요');
  const result = await validateKey(key);
  hideLoading();

  if (!result.ok) {
    showToast(result.error ?? 'API 키 검증에 실패했습니다', 'error');
    return;
  }

  setApiKey(key);
  closeSheet();
  updateKeyStatus();
  showToast('API 키가 저장되었습니다', 'success');

  if (mode === 'onboarding' && onboardingResolve) {
    const resolve = onboardingResolve;
    onboardingResolve = null;
    resolve(true);
  }
}

function handleClear(): void {
  clearApiKey();
  updateKeyStatus();
  showToast('저장된 키를 삭제했습니다', 'success');
  // 키가 사라졌으니 다시 잠금 상태처럼 보이게 삭제 버튼 숨김
  $('#apikeyClearBtn').style.display = 'none';
}

/** apikeySaveBtn/apikeyClearBtn/닫기/오버레이 바인딩 + 도움말 링크 설정. */
export function initApiKeySheet(): void {
  ($('#apikeyHelpLink') as HTMLAnchorElement).href = GEMINI_API_KEY_HELP_URL;

  $('#apikeySaveBtn').addEventListener('click', () => {
    void handleSave();
  });
  $('#apikeyClearBtn').addEventListener('click', () => handleClear());
  $('#apikeySheetClose').addEventListener('click', () => handleClosed());
  $('#apikeyOverlay').addEventListener('click', () => handleClosed());
}

/**
 * 키가 있으면 즉시 true.
 * 없으면 온보딩 모드로 시트를 열고, 유효한 키 저장 시 true / 저장 없이 닫으면 false.
 */
export function ensureApiKey(): Promise<boolean> {
  if (hasApiKey()) return Promise.resolve(true);
  mode = 'onboarding';
  return new Promise<boolean>((resolve) => {
    onboardingResolve = resolve;
    openSheet();
  });
}

/** 설정 모드로 시트 열기 (보안상 기존 키는 채우지 않음, 삭제 버튼 노출). */
export function openApiKeySettings(): void {
  mode = 'settings';
  openSheet();
}

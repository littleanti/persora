// 페르소나별 분석 스레드 드래프트 영속 (localStorage).
// 붙여넣은 최근 대화를 페르소나 단위로 저장해 다음에 다시 쓸 수 있게 한다.
// localStorage 접근이 불가한 환경(프라이빗 모드/비활성)에서도 throw하지 않는다.

const PREFIX = 'pm_thread_draft:';

export function getThreadDraft(personaId: string): string {
  if (!personaId) return '';
  try {
    return localStorage.getItem(PREFIX + personaId) ?? '';
  } catch {
    return '';
  }
}

export function setThreadDraft(personaId: string, text: string): void {
  if (!personaId) return;
  try {
    if (text.trim()) {
      localStorage.setItem(PREFIX + personaId, text);
    } else {
      localStorage.removeItem(PREFIX + personaId);
    }
  } catch {
    // 저장 실패는 무시 (세션 한정 동작)
  }
}

export function clearThreadDraft(personaId: string): void {
  if (!personaId) return;
  try {
    localStorage.removeItem(PREFIX + personaId);
  } catch {
    // 무시
  }
}

export function listThreadDrafts(): Record<string, string> {
  const drafts: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const personaId = key.slice(PREFIX.length);
      const value = localStorage.getItem(key);
      if (personaId && value) drafts[personaId] = value;
    }
  } catch {
    // 무시
  }
  return drafts;
}

export function importThreadDrafts(drafts: Record<string, unknown>): void {
  Object.entries(drafts).forEach(([personaId, value]) => {
    if (typeof value === 'string') setThreadDraft(personaId, value);
  });
}

export function clearAllThreadDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // 무시
  }
}

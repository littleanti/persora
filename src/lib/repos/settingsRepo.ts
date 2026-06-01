// API 키를 localStorage에 저장/읽기/삭제하는 유틸리티.
// 브라우저가 Gemini를 직접 호출하므로 JS에서 읽을 수 있는 저장소가 필요하다.

import { API_KEY_STORAGE_KEY, LEGACY_COOKIE_KEY_NAME } from '@/lib/config';

let memoryApiKey = '';

function readLegacyCookie(): string | null {
  const prefix = `${LEGACY_COOKIE_KEY_NAME}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      try {
        return decodeURIComponent(value) || null;
      } catch {
        return value || null;
      }
    }
  }
  return null;
}

function clearLegacyCookie(): void {
  document.cookie =
    `${LEGACY_COOKIE_KEY_NAME}=` +
    `; max-age=0` +
    `; path=/` +
    `; SameSite=Lax`;
}

/** localStorage에서 API 키를 읽는다. 구버전 쿠키가 있으면 localStorage로 옮기고 쿠키는 삭제한다. */
export function getApiKey(): string | null {
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    if (memoryApiKey) return memoryApiKey;
  }

  const legacy = readLegacyCookie();
  if (legacy) {
    setApiKey(legacy);
    clearLegacyCookie();
    return legacy;
  }

  return memoryApiKey || null;
}

/** API 키를 localStorage에 저장한다. */
export function setApiKey(key: string): void {
  memoryApiKey = key;
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch {
    // localStorage 비활성 환경에서는 현재 세션 메모리로만 유지한다.
  }
  clearLegacyCookie();
}

/** 저장된 API 키를 제거한다. */
export function clearApiKey(): void {
  memoryApiKey = '';
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch {
    // 무시
  }
  clearLegacyCookie();
}

/** API 키가 저장되어 있으면 true. */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

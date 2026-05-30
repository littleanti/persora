// API 키를 쿠키에 저장/읽기/삭제하는 유틸리티.
// HttpOnly 불가(브라우저 JS가 직접 Gemini 호출에 키를 써야 함) — TRD §8 참고.

import { COOKIE_KEY_NAME, COOKIE_MAX_AGE_DAYS } from '../config';

/** 쿠키에서 API 키를 읽는다. 없으면 null 반환. */
export function getApiKey(): string | null {
  const prefix = `${COOKIE_KEY_NAME}=`;
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

/** API 키를 쿠키에 저장한다. HTTPS면 Secure 플래그 추가. */
export function setApiKey(key: string): void {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${COOKIE_KEY_NAME}=${encodeURIComponent(key)}` +
    `; max-age=${maxAge}` +
    `; path=/` +
    `; SameSite=Lax` +
    secure;
}

/** 쿠키를 만료시켜 API 키를 제거한다. */
export function clearApiKey(): void {
  document.cookie =
    `${COOKIE_KEY_NAME}=` +
    `; max-age=0` +
    `; path=/` +
    `; SameSite=Lax`;
}

/** API 키가 저장되어 있으면 true. */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

/**
 * 키 형식 사전 검증 (서버 호출 없이 빠른 클라이언트 측 체크).
 * 비어 있지 않고, trim 후 길이 >= 20, 공백 없음.
 */
export function looksLikeKey(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.length >= 20 && !/\s/.test(trimmed);
}

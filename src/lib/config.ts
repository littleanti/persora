// 앱 전역 상수 — 모델/쿠키/DB 설정의 단일 출처(single source of truth).

/** Gemini/Gemma 모델명. 변경 시 이 한 곳만 수정. */
export const GEMINI_MODEL = 'gemma-4-31b-it';

/** API 키를 보관하는 쿠키 이름 (사용자 요구사항: 쿠키 저장). */
export const COOKIE_KEY_NAME = 'pm_gemini_key';

/** 쿠키 만료 (일). */
export const COOKIE_MAX_AGE_DAYS = 365;

/** IndexedDB 설정. */
export const DB_NAME = 'persona-mirror';
export const DB_VERSION = 1;
export const STORE_PERSONAS = 'personas';
export const STORE_ANALYSES = 'analyses';

/** Google AI Studio API 키 발급 안내 링크. */
export const GEMINI_API_KEY_HELP_URL = 'https://aistudio.google.com/app/apikey';

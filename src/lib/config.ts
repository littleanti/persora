// 앱 전역 상수 — 모델/스토리지/DB 설정의 단일 출처(single source of truth).

// 입력 방식에 따라 모델을 분기한다.
// - 텍스트(붙여넣기): gemini-3.1-flash-lite — thinking을 끌 수 있어 ~6.5s로 가장 빠름.
// - 캡처 이미지(비전): gemma-4-31b-it — 멀티모달. 한글 채팅 캡처 판독용.
//   (gemma는 thinking을 끌 수 없어 ~60s까지 느릴 수 있어 별도 타임아웃을 넉넉히 준다.)
/** 텍스트 분석/키 검증 기본 모델. */
export const TEXT_MODEL = 'gemini-3.1-flash-lite';
/** 캡처 이미지(비전) 입력 전용 모델. */
export const IMAGE_MODEL = 'gemma-4-31b-it';

/**
 * 모델이 thinking budget 제어를 지원하는지 여부.
 * gemini-* 계열은 thinkingConfig를 지원하지만 gemma-* 계열은 400을 던진다
 * ("Thinking budget is not supported for this model"). 모델별로 안전하게 판단.
 */
export function modelSupportsThinkingConfig(model: string): boolean {
  return model.startsWith('gemini-');
}

/**
 * 요청 타임아웃(ms).
 * 이미지+gemma 경로는 응답이 느려(~60s+) 넉넉히 잡아 조기 실패(타임아웃)를 막는다.
 */
export const TEXT_REQUEST_TIMEOUT_MS = 60_000;
export const IMAGE_REQUEST_TIMEOUT_MS = 180_000;

/** 페르소나 생성에 사용할 첨부 대화 파일(.txt)의 말미 글자 수 상한. 최근 대화일수록 현재 말투/관계를 잘 반영하므로 tail만 사용한다. */
export const PERSONA_CHAT_TAIL_CHARS = 16000;

/** API 키를 보관하는 localStorage 키. */
export const API_KEY_STORAGE_KEY = 'pm_gemini_key';

/** 쿠키에 저장하던 구버전 API 키 이름. 읽으면 localStorage로 옮기고 쿠키는 삭제한다. */
export const LEGACY_COOKIE_KEY_NAME = 'pm_gemini_key';

/** IndexedDB 설정. */
export const DB_NAME = 'persona-mirror';
export const DB_VERSION = 1;
export const STORE_PERSONAS = 'personas';
export const STORE_ANALYSES = 'analyses';

/** Google AI Studio API 키 발급 안내 링크. */
export const GEMINI_API_KEY_HELP_URL = 'https://aistudio.google.com/app/apikey';

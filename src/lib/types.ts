// 모든 모듈이 공유하는 타입 계약(single source of truth).
// 변경 시 docs/TRD.md §3 도 함께 갱신할 것.

/** LLM이 생성하는 페르소나 항목. LLM이 추가 키를 줄 수 있어 인덱스 시그니처를 둔다. */
export interface PersonaFields {
  summary?: string;
  communication_style?: string;
  speech_level?: string;
  vocabulary_examples?: string[];
  sentence_style?: string;
  emoji_symbol_usage?: string;
  texting_habits?: string;
  emotional_tendencies?: string;
  what_they_value?: string;
  how_they_seek_response?: string;
  relationship_dynamics?: string;
  [key: string]: unknown;
}

/** IndexedDB에 저장되는 페르소나 레코드. */
export interface PersonaRecord {
  id: string; // uuid
  name: string; // 상대방 이름
  my_name: string; // 나의 이름(없으면 "")
  created_at: string; // ISO 8601
  conversation: string; // 원본 대화 (브라우저에만 저장)
  persona: PersonaFields; // 상대 페르소나
  my_persona: PersonaFields; // 나의 페르소나(없으면 {})
  updated_at?: string; // ISO 8601, 수동 업데이트 시각(없으면 미갱신 — 구 레코드 무회귀)
}

/** 분석 결과의 답변 후보. */
export interface CandidateReply {
  label: string;
  reason: string;
  response: string;
}

/** IndexedDB에 저장되는 분석 기록. */
export interface AnalysisRecord {
  id: string;
  persona_id: string;
  persona_name: string;
  message: string; // 답장 대상(타겟) 메시지. 구 스키마 호환을 위해 유지.
  analysis: string;
  candidates: CandidateReply[];
  created_at: string;
  // ── Phase 1 추가(선택 필드, 구 레코드 무회귀) ──
  thread?: string; // 붙여넣은 최근 대화 원문
  target_message?: string; // 자동 검출된 상대의 마지막 메시지(없으면 message로 폴백)
  intent?: string; // 선택/입력된 답장 의도 키 또는 자유 텍스트('' = 공감 기본)
}

/** 답장 의도 프리셋 키. 빈 문자열('')은 "의도 미지정 = 공감 기본". */
export type ReplyIntentKey =
  | 'comfort'
  | 'solve'
  | 'lighten'
  | 'decline'
  | 'boundary'
  | 'persuade';

/** 답장 의도 프리셋 목록(키 + i18n 라벨 키). UI 칩/프롬프트 디렉티브 공용 단일 출처. */
export const REPLY_INTENTS: ReadonlyArray<{ key: ReplyIntentKey; labelKey: string }> = [
  { key: 'comfort', labelKey: 'intent.comfort' },
  { key: 'solve', labelKey: 'intent.solve' },
  { key: 'lighten', labelKey: 'intent.lighten' },
  { key: 'decline', labelKey: 'intent.decline' },
  { key: 'boundary', labelKey: 'intent.boundary' },
  { key: 'persuade', labelKey: 'intent.persuade' },
];

/**
 * 분석(답장 생성) 입력.
 * - 텍스트 모드: thread 에 최근 대화를 넣는다(의도는 자유 문자열, '' 허용).
 * - 이미지 모드: images 에 채팅 캡처를 넣는다. 멀티모달 모델이 캡처에서 직접 대화를 읽어
 *   답장 대상(상대의 마지막 메시지)을 판별하므로 thread/targetOverride 는 비운다.
 */
export interface AnalyzeReplyInput {
  personaId: string;
  thread: string;
  intent: string;
  targetOverride?: string;
  images?: InlineImage[];
}

/** 페르소나 목록 화면용 경량 요약. */
export interface PersonaSummary {
  id: string;
  name: string;
  my_name: string;
  created_at: string;
  summary: string;
}

/**
 * 멀티모달 입력용 인라인 이미지.
 * Gemini는 멀티모달 모델이므로 채팅 캡처 이미지를 그대로 전달하면
 * 별도 OCR 없이 이미지에서 대화 텍스트를 읽어 페르소나를 생성한다.
 */
export interface InlineImage {
  mimeType: string; // 예: 'image/png', 'image/jpeg'
  data: string; // base64 (data URL 접두어 제외)
}

/**
 * 페르소나 생성 입력.
 * - 텍스트 모드: conversation 에 대화 텍스트를 넣는다 (images 비움).
 * - 이미지 모드: images 에 채팅 캡처를 넣는다 (conversation 은 표시용 플레이스홀더/빈 값).
 */
export interface CreatePersonaInput {
  name: string;
  my_name: string;
  conversation: string;
  images?: InlineImage[];
}

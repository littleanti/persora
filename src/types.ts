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
  message: string;
  analysis: string;
  candidates: CandidateReply[];
  created_at: string;
}

/** 페르소나 목록 화면용 경량 요약. */
export interface PersonaSummary {
  id: string;
  name: string;
  my_name: string;
  created_at: string;
  summary: string;
}

/** 페르소나 생성 입력. */
export interface CreatePersonaInput {
  name: string;
  my_name: string;
  conversation: string;
}

/** 키 검증 결과. */
export interface KeyValidationResult {
  ok: boolean;
  error?: string;
}

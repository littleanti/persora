# TRD — Persona Mirror (Client-First 아키텍처)

> 문서 버전: 1.0 · 작성일: 2026-05-30 · 기준: PRD 1.0

## 1. 아키텍처 개요

```
┌────────────────────────── 사용자 브라우저 ──────────────────────────┐
│                                                                      │
│   index.html (기존 UI)                                               │
│        │                                                             │
│   src/main.ts ── bootstrap, 라우팅(탭), 온보딩 게이트                │
│        │                                                             │
│   ┌─ ui/* ────────┐   ┌─ services/* ──────────┐                     │
│   │ personaView   │──▶│ personaService        │──┐                  │
│   │ analyzeView   │   │ analysisService       │  │                  │
│   │ historyView   │   └───────────┬───────────┘  │                  │
│   │ apiKeyModal   │               │              │                  │
│   │ toast/loading │        ┌──────┴──────┐       │                  │
│   └───────────────┘        │             │       │                  │
│                      ┌─ lib/db.ts ─┐ ┌─ lib/gemini.ts ─┐            │
│                      │ IndexedDB   │ │ @google/genai   │            │
│                      │ personas    │ │ + prompts.ts    │            │
│                      │ analyses    │ │ + apiKey.ts(쿠키)│           │
│                      └─────────────┘ └────────┬────────┘            │
└───────────────────────────────────────────────┼────────────────────┘
                                                 │ HTTPS (사용자 키)
                                                 ▼
                              generativelanguage.googleapis.com (Gemini)

         정적 자산(GET /, /assets/*) ──▶ Node(Express) 정적 서버 ──▶ dist/
```

- **데이터 평면**: 페르소나/분석 = IndexedDB. API 키 = 쿠키. 둘 다 브라우저 로컬.
- **연산 평면**: 브라우저 → Gemini 직접 호출(사용자 키). 서버 미경유.
- **서버 평면**: 빌드된 `dist/`를 서빙하는 무상태 정적 서버. API 라우트 없음.

## 2. 기술 스택

| 구분 | 선택 | 비고 |
|------|------|------|
| 언어 | TypeScript (strict) | 타입 안전 |
| 빌드 | Vite | 기존 vanilla UI 유지, 모듈 번들 |
| UI | Vanilla DOM + 기존 CSS | 프레임워크 없음, 디자인 보존 |
| LLM | `@google/genai` (Gemini) | 브라우저 직접 호출 |
| 저장 | IndexedDB(개인 데이터) + Cookie(API 키) | 서버 미저장 |
| 서버 | Node + Express(`compression`, `sirv` 대체 가능) | `dist/` 정적 서빙 + SPA fallback |
| 런타임 | Node 18+ | |

> SDK 미사용 대안: `fetch`로 `v1beta/models/{model}:generateContent?key=...` 직접 호출도 가능. 기본은 `@google/genai`, 폴백 가능하도록 `gemini.ts`에 캡슐화.

## 3. 모듈 설계 & 인터페이스 계약

> 아래 시그니처는 **모든 작업자가 따라야 하는 계약**이다. 변경 시 `types.ts`/본 문서를 먼저 갱신한다.

### 3.1 `src/types.ts`
```ts
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
  [key: string]: unknown; // LLM이 추가 키를 줄 수 있음(UI가 관대하게 처리)
}

export interface PersonaRecord {
  id: string;              // uuid
  name: string;            // 상대방 이름
  my_name: string;         // 나의 이름(없으면 "")
  created_at: string;      // ISO
  conversation: string;    // 원본 대화(브라우저에만 저장)
  persona: PersonaFields;  // 상대 페르소나
  my_persona: PersonaFields; // 나의 페르소나(없으면 {})
}

export interface CandidateReply {
  label: string;
  reason: string;
  response: string;
}

export interface AnalysisRecord {
  id: string;
  persona_id: string;
  persona_name: string;
  message: string;
  analysis: string;
  candidates: CandidateReply[];
  created_at: string;
}

// 목록 화면용 경량 요약
export interface PersonaSummary {
  id: string; name: string; my_name: string; created_at: string; summary: string;
}
```

### 3.2 `src/config.ts`
```ts
export const GEMINI_MODEL = 'gemini-2.5-flash'; // config 한 곳에서 관리
export const COOKIE_KEY_NAME = 'pm_gemini_key';
export const COOKIE_MAX_AGE_DAYS = 365;
export const DB_NAME = 'persona-mirror';
export const DB_VERSION = 1;
export const STORE_PERSONAS = 'personas';
export const STORE_ANALYSES = 'analyses';
export const GEMINI_API_KEY_HELP_URL = 'https://aistudio.google.com/app/apikey';
```

### 3.3 `src/lib/apiKey.ts` (쿠키 — Wave 1: AI)
```ts
export function getApiKey(): string | null;
export function setApiKey(key: string): void;     // 쿠키 저장(만료/Secure/SameSite 처리)
export function clearApiKey(): void;
export function hasApiKey(): boolean;
export function looksLikeKey(key: string): boolean; // 형식 사전검증(공백/길이)
```

### 3.4 `src/lib/gemini.ts` (Gemini — Wave 1: AI)
```ts
// 원시 텍스트 생성(프롬프트 → 텍스트). 키는 apiKey.getApiKey() 사용.
export async function generate(prompt: string): Promise<string>;
// 키 동작 확인용 경량 호출(true/false 또는 사유)
export async function validateKey(key: string): Promise<{ ok: boolean; error?: string }>;
// LLM 응답에서 JSON 객체 추출(server.py extract_json 이식)
export function extractJson(text: string): Record<string, unknown>;
```

### 3.5 `src/lib/prompts.ts` (프롬프트 — Wave 1: AI)
```ts
// server.py의 프롬프트를 그대로 이식
export function buildPersonaPrompt(input: { name: string; my_name: string; conversation: string; }): string;
export function buildAnalyzePrompt(input: { persona: PersonaRecord; message: string; }): string;
export const PERSONA_FIELDS: string;       // JSON 스키마 텍스트
```

### 3.6 `src/lib/db.ts` (IndexedDB — Wave 1: 데이터)
```ts
export async function initDB(): Promise<IDBDatabase>;
// personas
export async function putPersona(p: PersonaRecord): Promise<void>;
export async function getPersona(id: string): Promise<PersonaRecord | null>;
export async function listPersonas(): Promise<PersonaRecord[]>; // created_at desc
export async function deletePersona(id: string): Promise<void>;
// analyses
export async function putAnalysis(a: AnalysisRecord): Promise<void>;
export async function listAnalyses(): Promise<AnalysisRecord[]>; // created_at desc
export async function deleteAnalysis(id: string): Promise<void>;
```

### 3.7 `src/services/personaService.ts` (Wave 2)
```ts
export async function createPersona(input: { name: string; my_name: string; conversation: string; }): Promise<PersonaRecord>;
export async function listPersonaSummaries(): Promise<PersonaSummary[]>;
export async function getPersona(id: string): Promise<PersonaRecord | null>;
export async function removePersona(id: string): Promise<void>;
```
- `createPersona`: `buildPersonaPrompt` → `gemini.generate` → `extractJson` → 정규화(other/my 분리) → `db.putPersona`.

### 3.8 `src/services/analysisService.ts` (Wave 2)
```ts
export async function analyzeMessage(personaId: string, message: string): Promise<AnalysisRecord>;
export async function listAnalyses(): Promise<AnalysisRecord[]>;
export async function removeAnalysis(id: string): Promise<void>;
```
- `analyzeMessage`: 페르소나 조회 → `buildAnalyzePrompt` → `gemini.generate` → `extractJson` → 후보 정규화 → `db.putAnalysis`.

### 3.9 `src/ui/*` (Wave 2)
- `toast.ts`: `showToast(msg, type?)`
- `loading.ts`: `showLoading(text?, sub?)`, `hideLoading()`
- `nav.ts`: `switchPage(page)`, FAB 토글
- `apiKeyModal.ts`: `ensureApiKey(): Promise<boolean>` — 키 없으면 모달, 검증 후 저장; `openApiKeySettings()`
- `personaView.ts`: 목록/생성 시트/상세 시트 렌더 + 이벤트
- `analyzeView.ts`: 선택/입력/결과 렌더
- `historyView.ts`: 기록 목록/펼치기/삭제
- `main.ts`: `initDB` → 상태표시 → 온보딩 게이트 → 뷰 초기화 + 전역 이벤트 바인딩

## 4. 핵심 변환 규칙 (기존 → 신규)

| 기존(server.py / index.html) | 신규 |
|---|---|
| `fetch('/api/personas')` (GET) | `personaService.listPersonaSummaries()` |
| `fetch('/api/personas', POST)` | `personaService.createPersona()` |
| `fetch('/api/personas/{id}')` | `personaService.getPersona(id)` |
| `fetch('/api/personas/{id}', DELETE)` | `personaService.removePersona(id)` |
| `fetch('/api/analyze', POST)` | `analysisService.analyzeMessage()` |
| `fetch('/api/analyses')` | `analysisService.listAnalyses()` |
| `fetch('/api/analyses/{id}', DELETE)` | `analysisService.removeAnalysis(id)` |
| `fetch('/api/health')` | `apiKey.hasApiKey()` 기반 상태표시 |
| `call_ollama(prompt)` | `gemini.generate(prompt)` |
| `extract_json` (Python) | `gemini.extractJson` (TS, 동일 로직) |
| 서버 세션 쿠키 + 디스크 JSON | IndexedDB |
| 인라인 `<script>` | `src/main.ts` 모듈 + 뷰 분리 |

- HTML 마크업/CSS/클래스명/문구는 **변경 없이** 보존(스크립트만 분리·교체). `escHtml` 등 유틸 유지.
- 인라인 `onclick` 핸들러는 가능하면 이벤트 위임/`addEventListener`로 이전하되, **DOM 구조와 외형은 동일**하게.

## 5. Gemini 호출 상세
- 라이브러리: `@google/genai`. 클라이언트: `new GoogleGenAI({ apiKey })`.
- 호출: `ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt })` → `.text`.
- 키 검증(`validateKey`): 매우 짧은 프롬프트("ping")로 1회 호출, 200/정상 텍스트면 ok. 4xx면 사유 반환.
- 타임아웃/에러: 네트워크/4xx/5xx를 사용자 친화 토스트로 변환. 키 인증 실패(400/403) 시 키 재입력 유도.
- JSON 강제: 프롬프트로 JSON-only 지시(기존과 동일). 필요 시 `responseMimeType: 'application/json'` 옵션 적용 가능(폴백 유지).

## 6. 서버 (`server/index.js`)
- Express로 `dist/`를 정적 서빙. `compression` 적용. SPA fallback(`*` → `index.html`)은 단일 페이지라 선택.
- 포트 `process.env.PORT || 8000`. `host 0.0.0.0`(모바일 동일망 접속 유지).
- **API 라우트/DB/세션/CORS 미들웨어 없음.** (Gemini는 브라우저가 직접 호출하므로 서버 CORS 불필요)
- 보안 헤더(기본): `X-Content-Type-Options: nosniff` 등 경량 적용 가능.

## 7. 빌드 & 실행
- `npm run dev` — Vite 개발 서버(HMR).
- `npm run build` — `tsc --noEmit` + `vite build` → `dist/`.
- `npm start` — `node server/index.js` (dist 서빙).
- `start.bat` — Windows 원클릭(설치→빌드→start) 갱신.

## 8. 보안 고려
- XSS: 모든 사용자/LLM 출력은 기존 `escHtml`로 이스케이프(유지). 의존성 최소화.
- 키 저장: 쿠키 `SameSite=Lax`, HTTPS 시 `Secure`. `HttpOnly`는 JS가 키를 읽어 Gemini 호출에 써야 하므로 **불가**(설계상 클라이언트 보관). 사용자 키이며 사용자 기기 한정임을 명시.
- 로깅: 키/대화/프롬프트를 콘솔에 남기지 않음(디버그 로그 가드).

## 9. 테스트 전략
- 빌드 게이트: `tsc --noEmit` 무에러.
- 수동 시나리오(Acceptance A1~A5) 점검.
- 유닛(선택): `extractJson`, `prompts` 빌더, `db` CRUD(Node IndexedDB shim 또는 브라우저 수동).

# TRD — Persora (Client-First React 아키텍처)

> 문서 버전: 1.4 · 갱신일: 2026-06-09 · 기준: PRD 1.4
>
> 1.4 변경: 페르소나 생성 입력을 캡처 이미지 → 카카오톡 대화 파일(.txt) 첨부 + tail 컷으로 변경. `CreatePersonaInput.images` 제거(텍스트 전용), `buildPersonaPrompt`의 이미지 분기 제거. 새 모듈 `src/lib/chatFile.ts`(`parseKakaoChatTail`)와 `config.ts` 상수 `PERSONA_CHAT_TAIL_CHARS` 추가. 분석 경로(`analyzeReply`/`AnalyzeReplyInput.images`/`gemini.generate`의 images 인자/`src/lib/image.ts`/`InlineImage`)는 그대로 유지.
> 1.3 변경: 메시지 분석(`analyzeReply`)도 캡처 이미지 입력을 받도록 확장. 이미지 모드는 thread 파싱/타겟 검출을 건너뛰고 `generate(prompt, images)`로 멀티모달 호출하며, `buildAnalyzePrompt`가 `useImages` 플래그로 분기한다. `fileToInlineImage`를 `src/lib/image.ts` 공용 모듈로 추출.
> 1.2 변경: `@google/genai` 2.7.0 업그레이드(런타임 Node 20+), 멀티모달(캡처 이미지) 입력 반영, 텍스트/이미지 이중 모델·thinking budget·요청 타임아웃 명시, API 키 온보딩/관리 흐름 단순화 반영.

## 1. 아키텍처 개요

```
┌────────────────────────── 사용자 브라우저 ──────────────────────────┐
│                                                                      │
│   index.html (#root)                                                 │
│        │                                                             │
│   src/main.tsx ─▶ src/App.tsx ── React Router, 앱 셸, 온보딩 게이트 │
│        │                                                             │
│   ┌─ routes/* ─────┐   ┌─ lib/persona.ts / analysis.ts ─┐           │
│   │ PersonaPage    │──▶│ 유스케이스 / 정규화 / 저장 호출 │──┐        │
│   │ AnalyzePage    │   └──────────────┬─────────────────┘  │        │
│   │ HistoryPage    │                  │                    │        │
│   │ SettingsPage   │                  │                    │        │
│   └──────┬─────────┘       ┌──────────┴─────────┐          │        │
│          │                 │                    │          │        │
│   ┌─ components/* ─┐ ┌─ lib/repos/*Repo.ts ─┐ ┌─ lib/gemini.ts ─┐   │
│   │ modal/toast/nav│ │ IndexedDB + storage  │ │ @google/genai   │   │
│   │ status/loading │ │ personas/analyses/key│ │ + prompts.ts    │   │
│   └───────────────┘ └──────────────────────┘ └────────┬────────┘   │
└───────────────────────────────────────────────┼────────────────────┘
                                                 │ HTTPS (사용자 키)
                                                 ▼
                              generativelanguage.googleapis.com (Gemini)

         정적 자산(GET /persora/, /persora/assets/*) ──▶ GitHub Pages ──▶ dist/
```

- **데이터 평면**: 페르소나/분석 = IndexedDB. API 키/드래프트 = localStorage. 둘 다 브라우저 로컬.
- **연산 평면**: 브라우저 → Gemini 직접 호출(사용자 키). 서버 미경유.
- **서버 평면**: GitHub Pages가 빌드된 `dist/`를 정적 서빙. 로컬 `server/index.js`는 선택적 미리보기 서버.

## 2. 기술 스택

| 구분 | 선택 | 비고 |
|------|------|------|
| 언어 | TypeScript (strict) | 타입 안전 |
| 빌드 | Vite | 기존 vanilla UI 유지, 모듈 번들 |
| UI | React 18 + React Router + Zustand | 형제 앱 `say-awsomely`와 셸/상태/모달 패턴 동기화 |
| 스타일 | Tailwind CSS + 공용 토큰 | 형제 앱의 인디고/슬레이트 토큰, soft shadow, fade/slide animation 재사용 |
| LLM | `@google/genai` 2.7.0 (Gemini) | 브라우저 직접 호출. 2.x breaking change는 Interactions API 한정이라 `generateContent` 경로는 무영향 |
| 저장 | IndexedDB(개인 데이터) + localStorage(API 키/드래프트) | 서버 미저장 |
| 서버 | GitHub Pages + 선택적 Node Express preview | `dist/` 정적 서빙 |
| 런타임 | Node 20+ | `@google/genai` 2.x `engines` 요구(>=20.0.0) |

> SDK 미사용 대안: `fetch`로 `v1beta/models/{model}:generateContent?key=...` 직접 호출도 가능. 기본은 `@google/genai`, 폴백 가능하도록 `gemini.ts`에 캡슐화.

## 3. 모듈 설계 & 인터페이스 계약

> 아래 시그니처는 **모든 작업자가 따라야 하는 계약**이다. 변경 시 `src/lib/types.ts`/본 문서를 먼저 갱신한다.

### 3.1 `src/lib/types.ts`
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

// 멀티모달 입력용 인라인 이미지(채팅 캡처). Gemini가 OCR 없이 이미지에서 대화를 읽음.
// 메시지 분석(AnalyzeReplyInput.images) 전용. 페르소나 생성은 더 이상 이미지를 받지 않는다.
export interface InlineImage {
  mimeType: string;        // 'image/png' | 'image/jpeg' ...
  data: string;            // base64 (data URL 접두어 제외)
}

// 페르소나 생성 입력. 텍스트 전용(대화 붙여넣기 또는 .txt 첨부 → tail 컷 결과를 conversation 에 담음).
// 이미지 분기는 제거되었다(InlineImage 는 분석 경로 AnalyzeReplyInput.images 가 계속 사용).
export interface CreatePersonaInput {
  name: string; my_name: string; conversation: string;
}
```
> 그 외 코드에는 `PersonaFields.texting_habits`, `PersonaRecord.updated_at`, 답장 의도(`ReplyIntentKey`/`REPLY_INTENTS`/`AnalyzeReplyInput`)와 `AnalysisRecord`의 선택 필드(`thread`/`target_message`/`intent`)가 추가되어 있다. 모두 선택 필드로 구 레코드 무회귀를 유지한다. 단일 진실은 `src/lib/types.ts`.

### 3.2 `src/lib/config.ts`
```ts
export const TEXT_MODEL = 'gemini-3.1-flash-lite';   // 텍스트(붙여넣기) 분석 기본 모델
export const IMAGE_MODEL = 'gemma-4-31b-it';         // 캡처 이미지(비전) 전용 멀티모달 모델

// gemini-* 계열만 thinking budget 제어 지원. gemma-* 는 보내면 400 → 모델별 판단.
export function modelSupportsThinkingConfig(model: string): boolean; // model.startsWith('gemini-')

export const TEXT_REQUEST_TIMEOUT_MS = 60_000;       // 텍스트 경로
export const IMAGE_REQUEST_TIMEOUT_MS = 180_000;     // 이미지+gemma 경로(응답 ~60s+ 대비 넉넉히)

export const PERSONA_CHAT_TAIL_CHARS = 16000;        // 페르소나 생성에 사용할 첨부 대화 파일의 말미 글자 수 상한

export const API_KEY_STORAGE_KEY = 'pm_gemini_key';
export const LEGACY_COOKIE_KEY_NAME = 'pm_gemini_key';
export const DB_NAME = 'persona-mirror';
export const DB_VERSION = 1;
export const STORE_PERSONAS = 'personas';
export const STORE_ANALYSES = 'analyses';
export const GEMINI_API_KEY_HELP_URL = 'https://aistudio.google.com/app/apikey';
```

### 3.3 `src/lib/repos/settingsRepo.ts` (localStorage — Wave 1: AI)
```ts
export function getApiKey(): string | null;
export function setApiKey(key: string): void;     // localStorage 저장
export function clearApiKey(): void;
export function hasApiKey(): boolean;
```
- 구버전 쿠키(`pm_gemini_key`)는 최초 읽기 시 localStorage로 마이그레이션하고 쿠키는 만료시킨다.

### 3.4 `src/lib/gemini.ts` (Gemini — Wave 1: AI)
```ts
// 원시 텍스트 생성(프롬프트 → 텍스트). 키는 settingsRepo.getApiKey() 사용.
// images 가 있으면 멀티모달 요청을 구성하고 IMAGE_MODEL(gemma)로 분기, 없으면 TEXT_MODEL.
export async function generate(prompt: string, images?: InlineImage[]): Promise<string>;
// LLM 응답에서 JSON 객체 추출(server.py extract_json 이식)
export function extractJson(text: string): Record<string, unknown>;
```

### 3.5 `src/lib/prompts.ts` (프롬프트 — Wave 1: AI)
```ts
// server.py의 프롬프트를 그대로 이식. 페르소나는 텍스트 전용(이미지 분기 제거),
// 분석은 useImages 분기로 캡처 이미지 입력을 계속 지원.
export function buildPersonaPrompt(input: CreatePersonaInput, lang?: Lang): string;
export function buildAnalyzePrompt(input: {
  persona: PersonaRecord; thread: string; targetMessage: string; intent: string; useImages?: boolean;
}, lang?: Lang): string; // useImages=true 면 "첨부 캡처에서 대화·답장 대상을 직접 읽으라"로 분기
export const PERSONA_FIELDS: string;       // JSON 스키마 텍스트
```

### 3.6 `src/lib/db.ts` + `src/lib/repos/*Repo.ts` (IndexedDB — Wave 1: 데이터)
```ts
export async function initDB(): Promise<IDBDatabase>;
export function promisifyRequest<T>(req: IDBRequest<T>): Promise<T>;
export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T>;

export const personaRepo: {
  put(record: PersonaRecord): Promise<void>;
  get(id: string): Promise<PersonaRecord | null>;
  list(): Promise<PersonaRecord[]>; // created_at desc
  remove(id: string): Promise<void>;
};

export const analysisRepo: {
  put(record: AnalysisRecord): Promise<void>;
  list(): Promise<AnalysisRecord[]>; // created_at desc
  remove(id: string): Promise<void>;
};
```

### 3.7 `src/lib/persona.ts` (Wave 2)
```ts
export async function createPersona(input: { name: string; my_name: string; conversation: string; }): Promise<PersonaRecord>;
export async function listPersonaSummaries(): Promise<PersonaSummary[]>;
export async function getPersona(id: string): Promise<PersonaRecord | null>;
export async function removePersona(id: string): Promise<void>;
```
- `createPersona`: `buildPersonaPrompt` → `gemini.generate(prompt)`(이미지 인자 없음, 텍스트 전용) → `extractJson` → 정규화(other/my 분리) → `personaRepo.put`. `conversation`이 비거나 너무 짧으면 기존 검증(`toast.convTooShort`)을 유지한다.

### 3.7b `src/lib/chatFile.ts` (Wave 2 — 페르소나 생성 전용)
```ts
// 카카오톡 export(.txt) 또는 평문 라인-단위 샘플을 받아 말미(tail)만 잘라 반환한다.
export function parseKakaoChatTail(rawText: string, maxChars: number): string;
```
- 동작: ① CRLF/CR → LF 정규화 → ② 선두 export 머리말 제거(예: "…님과의 대화", "저장한 날짜 : …", "Date Saved : …", "--------------- YYYY년 M월 D일 … ---------------" 날짜 구분선). 매칭 안 되면 원문 유지(견고하게, 평문 샘플도 통과) → ③ 말미에서 `maxChars`자만 취하되, 잘릴 경우 줄 중간 절단을 피하기 위해 첫 줄바꿈 이후부터 시작(부분 줄 버림) → ④ `trim` 후 반환.
- 화자 라벨/타임스탬프는 보존한다(LLM이 화자 구분에 사용). 평문 라인-단위 샘플(헤더 없음)과 실제 export 형식(타임스탬프/이름 라벨 포함) 양쪽에서 합리적으로 동작해야 한다.
- 호출처: `PersonaPage`의 새 페르소나 모달이 `.txt` 첨부를 읽어 `parseKakaoChatTail(text, PERSONA_CHAT_TAIL_CHARS)` 결과를 conversation textarea에 채운다. 메시지 분석(`AnalyzePage`)은 이 모듈을 사용하지 않는다(캡처 이미지 모드 유지, `src/lib/image.ts` 사용).

### 3.8 `src/lib/analysis.ts` (Wave 2)
```ts
export async function analyzeReply(
  personaId: string,
  input: { thread: string; intent: string; targetOverride?: string; images?: InlineImage[] },
): Promise<AnalysisRecord>;
export async function listAnalyses(): Promise<AnalysisRecord[]>;
export async function removeAnalysis(id: string): Promise<void>;
```
- `analyzeReply`(텍스트): 페르소나 조회 → thread 파싱·타겟 메시지 검출(`thread.ts`) → `buildAnalyzePrompt` → `gemini.generate(prompt)` → `extractJson` → 후보 정규화 → `analysisRepo.put`.
- `analyzeReply`(이미지): `images`가 있으면 thread 파싱/타겟 검출을 건너뛰고 `buildAnalyzePrompt({…, useImages:true})` → `gemini.generate(prompt, images)`(IMAGE_MODEL 분기)로 호출. 멀티모달 모델이 캡처에서 대화·답장 대상을 직접 판별한다. 기록의 `message`/`target_message`에는 캡처 장수 플레이스홀더를 저장한다.

### 3.9 `src/components/*` + `src/routes/*` (React Wave)
- `components/Toast.tsx`: Zustand toast queue를 렌더한다. 형제 앱의 bottom-right rounded toast 패턴을 따른다.
- `components/OnboardingModal.tsx`: 키가 없을 때 화면을 점유하는 중앙 카드 모달을 렌더한다. 키 입력 + 동의 체크박스만으로 localStorage에 저장한다("나중에 하기"/실시간 검증 호출 없이 단순화). 키가 있으면 렌더하지 않는다.
- `components/ApiKeyStatus.tsx`: 키가 있을 때만 헤더에 "● Gemini 준비됨" 인디케이터를 렌더하고, 클릭 시 인라인 변경/삭제 UI를 연다. (키 변경·삭제 진입점은 설정이 아니라 헤더다.)
- `components/LanguageToggle.tsx`: KO/EN segmented pill 토글을 렌더한다.
- `routes/PersonaPage.tsx`: 페르소나 목록/생성 모달/상세 모달을 React state로 렌더한다. 생성 모달은 텍스트/이미지 토글 없이 단일 흐름이다: 대화 텍스트 textarea + "카카오톡 대화 파일(.txt) 첨부" 버튼. 첨부 시 `chatFile.parseKakaoChatTail`로 머리말 제거·tail 컷한 결과를 textarea에 채우고, 사용한 분량(글자수)을 짧게 안내한다.
- `routes/AnalyzePage.tsx`: 페르소나 선택, 받은 메시지 분석, 후보 복사 UI를 React state로 렌더한다.
- `routes/HistoryPage.tsx`: 기록 목록/펼치기/삭제를 React state로 렌더한다.
- `routes/SettingsPage.tsx`: 백업 내보내기/가져오기, 전체 로컬 데이터 삭제, 개인정보/면책 고지를 렌더한다.
- `main.tsx`는 형제 앱과 동일하게 `HashRouter`를 사용한다. `App.tsx`는 route shell, top status bar, bottom nav, onboarding gate, toast container를 담당한다.

## 4. 핵심 변환 규칙 (기존 → 신규)

| 기존(server.py / index.html) | 신규 |
|---|---|
| `fetch('/api/personas')` (GET) | `persona.listPersonaSummaries()` |
| `fetch('/api/personas', POST)` | `persona.createPersona()` |
| `fetch('/api/personas/{id}')` | `persona.getPersona(id)` |
| `fetch('/api/personas/{id}', DELETE)` | `persona.removePersona(id)` |
| `fetch('/api/analyze', POST)` | `analysis.analyzeReply()` |
| `fetch('/api/analyses')` | `analysis.listAnalyses()` |
| `fetch('/api/analyses/{id}', DELETE)` | `analysis.removeAnalysis(id)` |
| `fetch('/api/health')` | `settingsRepo.hasApiKey()` 기반 상태표시 |
| `call_ollama(prompt)` | `gemini.generate(prompt)` |
| `extract_json` (Python) | `gemini.extractJson` (TS, 동일 로직) |
| 서버 세션 쿠키 + 디스크 JSON | IndexedDB |
| 인라인 `<script>` | `src/main.ts` + `src/App.ts` + routes/components 분리 |

- 기존 HTML/vanilla DOM 렌더링은 React 컴포넌트로 대체한다.
- 기존 도메인 계약(`lib/persona.ts`, `lib/analysis.ts`, `repos/*`, `gemini.ts`, `prompts.ts`)은 유지해 UI 전환의 위험을 줄인다.
- 외형 기준은 기존 vanilla CSS가 아니라 `say-awsomely`의 React/Tailwind 셸이다. 앱 고유 콘텐츠만 다르게 둔다.

## 5. Gemini 호출 상세
- 라이브러리: `@google/genai` 2.7.0. 클라이언트: `new GoogleGenAI({ apiKey })`.
- 호출: `ai.models.generateContent({ model, contents, config })` → `.text`.
- 입력별 모델 분기: 텍스트(붙여넣기)는 `TEXT_MODEL`(gemini-3.1-flash-lite), 캡처 이미지는 `IMAGE_MODEL`(gemma-4-31b-it). 이미지 입력 시 `contents`를 `{ role, parts: [{text}, {inlineData:{mimeType,data}}] }` 배열로 구성한다(별도 OCR 불필요).
- 요청 설정(`buildConfig`): `httpOptions.timeout`으로 모델별 타임아웃(텍스트 60s / 이미지 180s)을 명시한다. gemini 계열은 `thinkingConfig.thinkingBudget=0`으로 추론 토큰을 꺼 지연을 크게 줄인다(~58s → ~6.5s); gemma는 미지원이라 보내지 않는다(400 방지).
- 키 검증: 별도 사전 검증 호출은 두지 않는다. 키 유효성은 첫 분석 호출의 인증 오류(400/403) 처리로 드러난다.
- 타임아웃/에러: 네트워크/4xx/5xx를 사용자 친화 토스트로 변환. 키 인증 실패(400/403) 시 키 재입력 유도.
- 2.x 호환: 2.0.0 breaking change는 Interactions API 한정이며, 위 `generateContent` 경로·생성자·`config`·`.text` 게터는 변경 없이 동작한다.
- JSON 강제: 프롬프트로 JSON-only 지시(기존과 동일). 필요 시 `responseMimeType: 'application/json'` 옵션 적용 가능(폴백 유지).

## 6. 배포 / 서버
- 프로덕션 배포 대상은 GitHub Pages 프로젝트 사이트 `https://littleanti.github.io/persora/`.
- `vite.config.ts`의 `base`는 `/persora/`.
- `.github/workflows/deploy-pages.yml`이 `main` push 시 `npm ci` → `npm run build` → `dist/` artifact 업로드 → Pages 배포를 수행한다.
- 로컬 `server/index.js`는 선택적 정적 미리보기 서버다. GitHub Pages에서는 이 서버의 HTTP 보안 헤더가 적용되지 않으므로 `index.html`에 referrer policy와 CSP meta를 둔다.
- **API 라우트/DB/세션/CORS 미들웨어 없음.** (Gemini는 브라우저가 직접 호출하므로 서버 CORS 불필요)

## 7. 빌드 & 실행
- `npm run dev` — Vite React 개발 서버(HMR).
- `npm run build` — `tsc --noEmit` + `vite build` → `dist/`.
- `npm start` — `node server/index.js` (dist 서빙).

## 8. 보안 고려
- XSS: 사용자/LLM 출력은 React 텍스트 렌더링으로 처리한다. HTML/Markdown 렌더링을 추가하면 sanitizer가 필요하다.
- 키 저장: API 키는 localStorage에 저장한다. 브라우저 JS가 Gemini 호출에 키를 사용해야 하므로 클라이언트에서 읽을 수 있다. 사용자에게 Google Cloud에서 Gemini API 제한과 HTTP referrer 제한을 권장한다.
- 데이터 전송: 페르소나 생성 시 대화 텍스트(첨부 .txt의 tail 컷 결과 포함), 메시지 분석 시 대화 텍스트와 캡처 이미지는 Google Gemini API로 직접 전송된다. 앱 자체 서버에는 저장하지 않는다.
- 운영 기능: 설정 화면에서 API 키를 제외한 백업을 내보내고, 백업을 가져오고, API 키/페르소나/기록/드래프트 전체 삭제를 수행한다.
- 배포 헤더: GitHub Pages에서는 Express 보안 헤더가 적용되지 않으므로 CSP/referrer meta를 사용한다. 헤더 수준 정책이 필요하면 커스텀 도메인 + 프록시/CDN을 고려한다.
- 로깅: 키/대화/프롬프트를 콘솔에 남기지 않음(디버그 로그 가드).

## 9. 테스트 전략
- 빌드 게이트: React TSX 포함 `tsc --noEmit` 무에러.
- 수동 시나리오(Acceptance A1~A5) 점검.
- 유닛(선택): `extractJson`, `prompts` 빌더, `db` CRUD(Node IndexedDB shim 또는 브라우저 수동).

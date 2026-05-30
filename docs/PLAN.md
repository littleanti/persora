# PLAN — Persona Mirror 리팩토링 실행 계획

> 문서 버전: 1.0 · 작성일: 2026-05-30 · 기준: PRD 1.0 / TRD 1.0

## 1. 목표 디렉터리 구조

```
persona-mirror/
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   └── PLAN.md
├── index.html                  # Vite 엔트리 (기존 마크업 보존 + main.ts/main.css 링크)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
├── start.bat                   # 설치→빌드→start
├── server/
│   └── index.js                # Express 정적 서버 (dist/ 서빙)
├── src/
│   ├── main.ts                 # 부트스트랩: DB init, 온보딩 게이트, 뷰 초기화
│   ├── config.ts               # 모델명/쿠키명/DB 상수
│   ├── types.ts                # 공유 타입 계약
│   ├── styles/
│   │   └── main.css            # index.html에서 추출한 CSS(동일 내용)
│   ├── lib/
│   │   ├── apiKey.ts           # 쿠키 기반 키 관리
│   │   ├── gemini.ts           # @google/genai 호출 + extractJson + validateKey
│   │   ├── prompts.ts          # 페르소나/분석 프롬프트(server.py 이식)
│   │   └── db.ts               # IndexedDB 래퍼(personas/analyses)
│   ├── services/
│   │   ├── personaService.ts   # 페르소나 유스케이스
│   │   └── analysisService.ts  # 분석 유스케이스
│   └── ui/
│       ├── dom.ts              # $/$$ 헬퍼 + escHtml (공용)
│       ├── toast.ts
│       ├── loading.ts
│       ├── nav.ts
│       ├── apiKeyModal.ts
│       ├── personaView.ts
│       ├── analyzeView.ts
│       └── historyView.ts
└── (제거) server.py, requirements.txt, static/, data/
```

> 마이그레이션 시 기존 `static/index.html`의 마크업/CSS는 보존 대상이므로, 새 `index.html`+`src/styles/main.css`로 정확히 옮긴다. 기존 Python 파일은 마지막 정리 단계에서 제거(또는 `legacy/`로 보관 후 커밋 메시지에 명시).

## 2. 작업 분해 & 의존성 (waves)

### Wave 0 — 기반 + 계약 (lead, 선행 필수)
- package.json / tsconfig.json / vite.config.ts / .gitignore
- server/index.js (Express 정적)
- index.html (마크업 이식 + `<link>`/`<script type=module>`)
- src/styles/main.css (CSS 추출)
- src/config.ts, src/types.ts (계약), src/ui/dom.ts (escHtml/$ 헬퍼)
- **출구 조건**: 모든 후속 작업이 의존하는 타입/상수/HTML/CSS 골격 존재.

### Wave 1 — 독립 라이브러리 (병렬, 2 executor)
- **T-data**: `src/lib/db.ts` (IndexedDB). 의존: types/config.
- **T-ai**: `src/lib/apiKey.ts`, `src/lib/gemini.ts`, `src/lib/prompts.ts`. 의존: types/config.
- 두 작업은 서로 독립 → 동시 실행. 계약(3.x)을 엄격히 준수.

### Wave 2 — 통합(서비스/UI/부트스트랩) (1 executor)
- `src/services/*`, `src/ui/*`(dom.ts 제외), `src/main.ts`.
- Wave 1 실제 파일을 import하여 작성(인터페이스 불일치 최소화).
- 기존 index.html의 모든 동작(탭 전환, 시트 열기/닫기, 생성/분석/기록/복사) 재현.

### Wave 3 — 검증 + 수정 루프 (lead, ralph)
- `npm install` → `npm run build`(tsc + vite). 타입/임포트 오류를 green까지 수정.
- README/start.bat 갱신, 레거시 파일 정리.
- code-review/verifier 패스(별도 레인).

## 3. 단계별 체크리스트

- [ ] Wave 0: 기반 파일 생성, `npm install` 가능 상태
- [ ] Wave 1: db.ts, apiKey/gemini/prompts.ts 작성 (계약 준수)
- [ ] Wave 2: 서비스/UI/main 작성, 인라인 스크립트 완전 대체
- [ ] Wave 3: `tsc --noEmit` 0 에러, `vite build` 성공
- [ ] 수동 점검: 온보딩 모달 → 키 저장 → 페르소나 생성 → 분석 → 기록
- [ ] DevTools: 우리 서버엔 정적 요청만, LLM은 Google 직접 호출
- [ ] README/start.bat 갱신, 레거시(server.py 등) 제거
- [ ] 커밋

## 4. 검증 기준 (PRD Acceptance 매핑)
- A1 온보딩 모달: `apiKeyModal.ensureApiKey` 경로 점검
- A2 기능 동등성: 페르소나/분석/기록 수동 시나리오
- A3 네트워크 분리: Network 탭 확인(정적 vs Gemini)
- A4 영속성: 새로고침 후 IndexedDB/쿠키 유지
- A5 빌드: `npm run build` 통과 + `npm start` 서빙

## 5. 롤백/안전장치
- 리팩토링은 새 파일 추가 중심. 레거시 제거는 **마지막 단계**에서 한 번에(되돌리기 쉬움).
- 모델명/키쿠키명/DB명은 `config.ts` 단일 출처 → 빠른 조정 가능.
- Gemini 호출은 `gemini.ts`에 캡슐화 → SDK/REST 전환 용이.

## 6. 위험 & 대응
- 인터페이스 불일치(병렬 작업): 계약(TRD §3)을 단일 진실로, Wave 2는 실제 파일 기준 작성, 빌드로 최종 검출.
- Gemini JSON 일관성: 프롬프트 JSON-only 지시 + `extractJson` 방어 파싱(기존 동일) + 필요 시 `responseMimeType`.
- 모바일 동일망 접속: 서버 `host 0.0.0.0` 유지.

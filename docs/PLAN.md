# PLAN — Persora React UI/UX 동기화 실행 계획

> 문서 버전: 1.1 · 작성일: 2026-05-31 · 기준: PRD 1.1 / TRD 1.1 / WIREFRAMES 1.0

## 1. 목표 디렉터리 구조

```
persora/
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   ├── WIREFRAMES.md
│   └── PLAN.md
├── index.html                  # Vite React 엔트리 (#root)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
├── server/
│   └── index.js                # 선택적 Express 정적 미리보기 서버 (dist/ 서빙)
├── src/
│   ├── main.tsx                # Vite React 엔트리: CSS import + HashRouter + App
│   ├── App.tsx                 # 형제 앱과 동기화된 top bar/bottom nav/route shell
│   ├── index.css               # Tailwind base + 형제 앱 공용 유틸
│   ├── components/
│   │   ├── ApiKeyStatus.tsx
│   │   ├── LanguageToggle.tsx
│   │   ├── OnboardingModal.tsx
│   │   └── Toast.tsx
│   ├── routes/
│   │   ├── PersonaPage.tsx
│   │   ├── AnalyzePage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── SettingsPage.tsx
│   ├── lib/
│   │   ├── config.ts           # 모델명/localStorage 키/DB 상수
│   │   ├── types.ts            # 공유 타입 계약
│   │   ├── persona.ts          # 페르소나 유스케이스
│   │   ├── analysis.ts         # 분석 유스케이스
│   │   ├── dataManagement.ts   # 백업/가져오기/전체 삭제
│   │   ├── gemini.ts           # @google/genai 호출 + extractJson + validateKey
│   │   ├── prompts.ts          # 페르소나/분석 프롬프트(server.py 이식)
│   │   ├── db.ts               # IndexedDB 연결/트랜잭션 공용 레이어
│   │   ├── dom.ts              # $/$$ 헬퍼 + escHtml (공용)
│   │   ├── store.ts            # Zustand: settings/toasts
│   │   └── repos/
│   │       ├── settingsRepo.ts # localStorage 기반 키 관리
│   │       ├── personaRepo.ts  # personas 저장소
│   │       └── analysisRepo.ts # analyses 저장소
└── (제거) server.py, requirements.txt, static/, data/
```

> 마이그레이션 기준은 기존 vanilla 마크업 보존이 아니라 `D:\yoon\codes\say-awsomely`의 React/Tailwind UI 셸이다. Persora 고유 기능만 별도 React 화면으로 구현한다.

## 2. 작업 분해 & 의존성 (waves)

### Wave 0 — 문서 + React 기반 (선행 필수)
- `docs/WIREFRAMES.md` 작성.
- PRD/TRD/PLAN을 React + 형제 앱 UI/UX 동기화 기준으로 갱신.
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`를 React/Tailwind 기준으로 갱신.
- `index.html`은 `#root`만 두는 Vite React 엔트리로 축소한다.
- **출구 조건**: React 빌드 파이프라인과 문서 기준이 일치한다.

### Wave 1 — 도메인 레이어 보존
- 기존 `src/lib/db.ts`, `src/lib/repos/*Repo.ts`, `src/lib/gemini.ts`, `src/lib/prompts.ts`, `src/lib/persona.ts`, `src/lib/analysis.ts`는 가능한 한 유지한다.
- React UI가 호출하기 쉽게 타입/반환값만 필요한 범위에서 보완한다.

### Wave 2 — React UI 구현
- `src/main.tsx`, `src/App.tsx`를 형제 앱 구조로 구현한다.
- `components/OnboardingModal.tsx`, `ApiKeyStatus.tsx`, `LanguageToggle.tsx`, `Toast.tsx`는 형제 앱 패턴을 포팅한다.
- `routes/PersonaPage.tsx`, `AnalyzePage.tsx`, `HistoryPage.tsx`는 현재 앱의 핵심 기능만 React로 구현한다.
- `routes/SettingsPage.tsx`는 개인정보 고지, 백업 내보내기/가져오기, 전체 로컬 데이터 삭제를 구현한다.
- 기존 vanilla DOM용 `src/components/*.ts`, `src/routes/*.ts`, `src/App.ts`, `src/main.ts`는 React 파일로 대체한다.

### Wave 2.5 — 보안/운영 보강
- API 키 저장소를 쿠키에서 localStorage로 전환하고, 기존 쿠키 값은 자동 마이그레이션 후 삭제한다.
- 온보딩/설정/README에 Gemini API 전송, 로컬 데이터 손실 가능성, 민감정보 주의, AI 결과 면책을 명시한다.
- GitHub Pages 하위 경로(`/persora/`) 배포를 위해 Vite base와 public asset 경로를 조정한다.
- `index.html`에 referrer policy와 CSP meta를 적용한다.

### Wave 3 — 검증 + 수정 루프 (lead, ralph)
- `npm install` → `npm run build`(tsc + vite). 타입/임포트 오류를 green까지 수정.
- Vite dev server를 띄우고 브라우저에서 상단/하단바, 모달, 기본 라우팅을 시각 검증한다.
- README 갱신, 레거시 파일 정리.
- code-review/verifier 패스(별도 레인).

## 3. 단계별 체크리스트

- [x] Wave 0a: `docs/WIREFRAMES.md` 작성 및 PRD/TRD/PLAN 갱신
- [x] Wave 0b: React/Tailwind 의존성 및 빌드 설정 갱신
- [x] Wave 1: 기존 도메인 레이어 React 호출 적합성 확인
- [x] Wave 2: React components/routes/App/main 작성, vanilla DOM 완전 대체
- [x] Wave 3: `tsc --noEmit` 0 에러, `vite build` 성공
- [ ] 수동 점검: 온보딩 모달 → 키 저장 → 페르소나 생성 → 분석 → 기록 → 설정
- [x] UI 점검: 형제 앱과 동일한 상태바/하단바/토스트/모달 애니메이션
- [ ] DevTools: 우리 서버엔 정적 요청만, LLM은 Google 직접 호출
- [x] README 갱신
- [x] GitHub Pages workflow 추가
- [ ] 커밋

## 4. 검증 기준 (PRD Acceptance 매핑)
- A1 온보딩 모달: `OnboardingModal.ensureApiKey` 경로 점검
- A2 기능 동등성: 페르소나/분석/기록 수동 시나리오
- A3 네트워크 분리: Network 탭 확인(정적 vs Gemini)
- A4 영속성: 새로고침 후 IndexedDB/localStorage 유지
- A5 빌드: `npm run build` 통과 + `npm start` 서빙

## 5. 롤백/안전장치
- 리팩토링은 새 파일 추가 중심. 레거시 제거는 **마지막 단계**에서 한 번에(되돌리기 쉬움).
- 모델명/키 저장소명/DB명은 `src/lib/config.ts` 단일 출처 → 빠른 조정 가능.
- Gemini 호출은 `gemini.ts`에 캡슐화 → SDK/REST 전환 용이.

## 6. 위험 & 대응
- 인터페이스 불일치(병렬 작업): 계약(TRD §3)을 단일 진실로, Wave 2는 실제 파일 기준 작성, 빌드로 최종 검출.
- Gemini JSON 일관성: 프롬프트 JSON-only 지시 + `extractJson` 방어 파싱(기존 동일) + 필요 시 `responseMimeType`.
- 모바일 동일망 접속: 서버 `host 0.0.0.0` 유지.

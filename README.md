# 🧠 Persora

> 대화 기록으로 상대방의 페르소나를 분석하고, 받은 메시지에서 **"상대방이 원하는 답변"** 을 추론해주는 모바일 웹 앱

**v2 — Client-First 아키텍처**: 개인 데이터는 전부 **내 브라우저**에 저장되고, AI 분석은 **내 Google AI Studio API 키**로 브라우저가 직접 수행합니다. 배포 서버는 정적 파일만 서빙하며 대화 내용을 보관하지 않습니다.

> 저장소/패키지: `persora` · 앱 표시명: **Persora** (한·영 단일 표기)
> (브라우저 IndexedDB 이름은 기존 사용자 데이터 호환을 위해 `persona-mirror`로 유지)

---

## 주요 기능

### 1. 페르소나 생성
- 카카오톡, 문자 등 대화 기록을 붙여넣으면 Gemini가 상대방의 페르소나를 분석
- **나의 이름**도 함께 입력하면 상대방 페르소나 + 나의 페르소나를 동시에 추출
- 소통 방식, 어조, 말버릇, 감정 패턴, 관계 역학 등 8가지 항목 분석
- 분석 결과는 **브라우저 IndexedDB**에 저장

### 2. 메시지 분석
- 저장된 페르소나를 선택하고 받은 메시지를 입력
- Gemini가 상대방의 심리를 분석하여 "듣고 싶어하는 답변" 후보 3개 제시
- 나의 페르소나가 등록된 경우, 내 말투와 성격에 맞는 답변까지 고려
- 각 후보마다 이유 설명 + 한 번에 복사 기능 제공

### 3. 기록
- 분석 기록을 브라우저에 저장하고 다시 조회/삭제

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 18 + TypeScript + Vite + Tailwind CSS (모바일 웹 SPA) |
| AI 엔진 | Google AI Studio (Gemini API) · `@google/genai` 브라우저 직접 호출 |
| 개인 데이터 저장 | IndexedDB + localStorage (브라우저 로컬) |
| API 키 저장 | localStorage (브라우저 로컬, 백업 파일에는 제외) |
| 배포 | GitHub Pages 정적 호스팅 (`/persora/`) |
| 로컬 서버 | Node + Express (선택적 정적 미리보기) |

> 자세한 설계는 [`docs/WIREFRAMES.md`](docs/WIREFRAMES.md), [`docs/PRD.md`](docs/PRD.md), [`docs/TRD.md`](docs/TRD.md), [`docs/PLAN.md`](docs/PLAN.md) 참고.

---

## 실행 방법

### 사전 조건
- Node.js 18 이상
- [Google AI Studio](https://aistudio.google.com/app/apikey) 에서 발급한 Gemini API 키

### 설치 & 빌드 & 실행

```bash
# 1. 의존성 설치
npm install

# 2. 프로덕션 빌드 (dist/ 생성)
npm run build

# 3. 정적 서버 시작
npm start
```

> 개발 모드(HMR): `npm run dev` → http://localhost:4121  
> 이미 4121 포트가 사용 중이면 `npm run dev -- --port 5560 --strictPort`처럼 다른 포트를 지정하세요.

### 접속 방법

| 기기 | 주소 |
|------|------|
| PC | http://localhost:8000 |
| 휴대폰 | http://[PC의 IP주소]:8000 |

> PC IP 확인: `ipconfig` (Windows) / `ifconfig` (Mac/Linux)

### 첫 실행 — API 키 등록
앱을 처음 열면 **Gemini API 키 입력 모달**이 나타납니다. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) 에서 키를 발급받아 입력하면 브라우저 `localStorage`에 저장되고, 이후 모든 분석이 이 키로 동작합니다. 헤더의 상태 영역을 눌러 언제든 키를 변경/삭제할 수 있습니다.

운영 권장:
- Google Cloud/API Console에서 키 사용 API를 Gemini API로 제한하세요.
- 가능하면 HTTP referrer를 `https://littleanti.github.io/*` 또는 `https://littleanti.github.io/persora/*`로 제한하세요.
- 키가 노출되었다고 판단되면 즉시 회전하거나 삭제하세요.

---

## 프로젝트 구조

```
persora/
├── docs/                       # WIREFRAMES / PRD / TRD / PLAN
├── index.html                  # Vite React 엔트리 (#root)
├── server/index.js             # Express 정적 서버 (dist/ 서빙)
├── src/
│   ├── main.tsx                # React 엔트리 + HashRouter
│   ├── App.tsx                 # 형제 앱과 동기화된 상태바/하단바/라우트 셸
│   ├── index.css               # Tailwind base + 공용 유틸
│   ├── components/             # 상태 버튼 · 온보딩 모달 · 토스트 · 언어 토글
│   ├── routes/                 # PersonaPage · AnalyzePage · HistoryPage · SettingsPage
│   └── lib/                    # 도메인 로직 · Gemini · i18n · 타입 · repos · 백업/삭제
│       └── repos/              # IndexedDB / localStorage 저장소 경계
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 개인정보 보호

- 페르소나·대화 기록·분석 결과는 **브라우저 IndexedDB**에만 저장됩니다.
- Gemini API 키와 작성 중인 분석 드래프트는 **브라우저 localStorage**에 저장됩니다.
- AI 분석은 브라우저 → Google(Gemini) **직접 호출**로 수행됩니다. 분석을 실행하면 입력한 대화 텍스트와 캡처 이미지는 Google Gemini API로 전송됩니다.
- 이 앱의 배포 서버는 빌드된 정적 파일만 서빙합니다. (API·DB·세션 없음)
- 브라우저 데이터 삭제, 시크릿 모드 종료, 기기 변경 시 로컬 데이터는 복구할 수 없습니다. 설정 탭에서 백업을 내보내고 가져올 수 있습니다.
- 설정 탭에서 API 키, 페르소나, 분석 기록, 작성 중인 대화를 한 번에 삭제할 수 있습니다.
- AI가 만든 페르소나와 답변 후보는 참고용이며 의료, 법률, 심리 진단이나 중요한 관계 결정을 대신하지 않습니다.

## 배포

현재 저장소(`littleanti/persora`)는 GitHub Pages 프로젝트 사이트로 배포됩니다.

- 배포 URL: `https://littleanti.github.io/persora/`
- Vite base: `/persora/`
- 배포 workflow: `.github/workflows/deploy-pages.yml`
- `main` 브랜치에 push하면 GitHub Actions가 `npm ci` → `npm run build` → `dist/` Pages 배포를 수행합니다.

GitHub Pages에서는 `server/index.js`의 HTTP 보안 헤더가 적용되지 않습니다. 정적 배포에 맞춰 `index.html`에 referrer policy와 CSP meta를 둡니다. 더 강한 헤더 정책이 필요하면 커스텀 도메인과 CDN/프록시를 고려하세요.

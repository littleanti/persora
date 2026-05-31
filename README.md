# 🧠 Persona Mirror

> 대화 기록으로 상대방의 페르소나를 분석하고, 받은 메시지에서 **"상대방이 원하는 답변"** 을 추론해주는 모바일 웹 앱

**v2 — Client-First 아키텍처**: 개인 데이터는 전부 **내 브라우저**에 저장되고, AI 분석은 **내 Google Gemini API 키**로 브라우저가 직접 수행합니다. 서버는 정적 파일만 서빙하며 대화 내용을 절대 보관하지 않습니다.

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
| AI 엔진 | Google Gemini (`@google/genai`, 브라우저 직접 호출) |
| 개인 데이터 저장 | IndexedDB (브라우저 로컬) |
| API 키 저장 | Cookie (브라우저 로컬) |
| 서버 | Node + Express (정적 파일 서빙 전용) |

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
앱을 처음 열면 **Gemini API 키 입력 모달**이 나타납니다. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) 에서 키를 발급받아 입력하면 쿠키에 저장되고, 이후 모든 분석이 이 키로 동작합니다. 헤더의 상태 영역을 눌러 언제든 키를 변경/삭제할 수 있습니다.

---

## 프로젝트 구조

```
persona-mirror/
├── docs/                       # WIREFRAMES / PRD / TRD / PLAN
├── index.html                  # Vite React 엔트리 (#root)
├── server/index.js             # Express 정적 서버 (dist/ 서빙)
├── src/
│   ├── main.tsx                # React 엔트리 + HashRouter
│   ├── App.tsx                 # 형제 앱과 동기화된 상태바/하단바/라우트 셸
│   ├── index.css               # Tailwind base + 공용 유틸
│   ├── components/             # 상태 버튼 · 온보딩 모달 · 토스트 · 언어 토글
│   ├── routes/                 # PersonaPage · AnalyzePage · HistoryPage (React)
│   └── lib/                    # 도메인 로직 · Gemini · i18n · 타입 · repos
│       └── repos/              # IndexedDB / 쿠키 저장소 경계
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 개인정보 보호

- 페르소나·대화 기록·분석 결과는 **브라우저 IndexedDB**에만 저장됩니다.
- Gemini API 키는 **브라우저 쿠키**에만 저장됩니다.
- AI 분석은 브라우저 → Google(Gemini) **직접 호출**로 수행되며, 대화 내용이 이 앱의 서버를 경유하지 않습니다.
- 서버는 빌드된 정적 파일만 서빙합니다. (API·DB·세션 없음)

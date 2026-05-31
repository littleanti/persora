// 경량 i18n 레이어 — 프레임워크 없이 ko/en 전환을 담당하는 단일 출처.
// - 초기 언어: localStorage(pm_lang) → 없으면 navigator.language 자동 감지
// - applyTranslations(): data-i18n* 속성을 가진 정적 DOM을 현재 언어로 채움
// - t(): 동적으로 생성되는 문자열용 ({param} 보간 지원)
// - onLangChange(): 동적 뷰가 스스로 다시 렌더링하도록 구독

export type Lang = 'ko' | 'en';

const LANG_STORAGE_KEY = 'pm_lang';

type Dict = Record<string, string>;

/** ko/en 메시지 사전. 키는 모듈 전반에서 공유한다. */
const MESSAGES: Record<Lang, Dict> = {
  ko: {
    // 헤더 / 상태
    'app.title': 'Persora',
    'status.checking': '연결 확인 중',
    'status.ready': 'Gemini 준비됨',
    'status.noKey': 'API 키 미등록',
    'lang.switchTitle': '언어 전환 (한국어/English)',

    // 하단 네비
    'nav.personas': '페르소나',
    'nav.analyze': '분석하기',
    'nav.history': '기록',
    'fab.newPersona': '새 페르소나',

    // 페르소나 페이지 (빈 상태)
    'personas.empty.title': '저장된 페르소나 없음',
    'personas.empty.desc': '대화 기록을 입력하면<br>AI가 상대방의 페르소나를 분석해요',
    'btn.createPersona': '새 페르소나 만들기',
    'persona.summaryFallback': '페르소나 분석 완료',

    // 분석 페이지
    'analyze.noPersonaHint': '먼저 <strong>페르소나 탭</strong>에서 상대방의 대화를 분석해 페르소나를 만들어주세요.',
    'analyze.selectPersona': '페르소나 선택',
    'common.loading': '불러오는 중...',
    'common.save': '저장',
    'common.saving': '저장 중...',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'analyze.messageLabel': '받은 메시지 입력',
    'analyze.messageLabelHint': '— 상대방이 보낸 메시지를 입력하세요',
    'analyze.messagePlaceholder': '예) 야 오늘 뭐해? 시간 돼?',
    'btn.analyze': '분석하기',
    'analyze.aiLabel': 'AI 심리 분석',
    'analyze.candidatesTitle': '원하는 답변 후보 3가지',
    'btn.copy': '복사하기',
    'btn.copied': '✓ 복사됨',

    // 기록 페이지
    'history.empty': '아직 분석 기록이 없어요',
    'history.reason': '원하는 이유:',
    'history.candidatesTitle': '원하는 답변 후보',
    'history.deleteBtn': '기록 삭제',
    'common.candidateN': '후보 {n}',

    // 생성 시트
    'create.title': '새 페르소나 만들기',
    'create.otherName': '상대방 이름',
    'create.required': '* 필수',
    'create.myName': '나의 이름',
    'create.optional': '선택',
    'create.otherNamePlaceholder': '예) 김민준',
    'create.myNamePlaceholder': '예) 나',
    'create.inputMode': '대화 입력 방식',
    'create.inputModeHint': '* 텍스트 붙여넣기 또는 캡처 이미지',
    'create.tabText': '✍️ 텍스트',
    'create.tabImage': '🖼️ 캡처 이미지',
    'create.convPlaceholder':
      '김민준: 야 오늘 뭐해?\n나: 집에 있어. 왜?\n김민준: 아 그냥... 오늘 약속 있나 해서\n나: 없는데 왜?\n...',
    'create.textHint': '📋 대화가 많을수록 더 정확한 페르소나가 만들어져요. 최소 10줄 이상 권장합니다.',
    'create.imageDropzone': '카카오톡·문자 캡처 이미지 선택',
    'create.imageHint': '🖼️ AI가 캡처에서 대화를 직접 읽어 페르소나를 만들어요. 여러 장을 시간 순서대로 올리면 더 정확해요.',
    'btn.create': '페르소나 생성',

    // 상세 시트
    'detail.title': '페르소나 상세',
    'detail.useForAnalysis': '이 페르소나로 분석',
    'detail.delete': '삭제',
    'detail.convToggle': '📝 원본 대화 기록 보기',
    'detail.tabMe': '🙋 나 ({my})',
    'detail.myBadgeRelation': '✦ {my}와 {other}의 관계에서의 나',
    'detail.createdAt': '생성일 {date}',
    'detail.myLabel': '나: {my}',
    'detail.myChip': '나: {my}',

    // 페르소나 필드 라벨
    'field.communication_style': '소통 방식',
    'field.speech_level': '경어/어미 패턴',
    'field.vocabulary_examples': '자주 쓰는 표현',
    'field.sentence_style': '문장 스타일',
    'field.emoji_symbol_usage': '이모지/특수문자',
    'field.texting_habits': '메시징 습관',
    'field.emotional_tendencies': '감정 표현',
    'field.what_they_value': '중요 가치',
    'field.how_they_seek_response': '원하는 반응',
    'field.relationship_dynamics': '관계 역학',
    'field.tone': '말투',
    'field.key_interactions': '상호작용 패턴',

    // API 키 시트
    'apikey.title': 'Gemini API 키 설정',
    'apikey.welcomeTitle': 'Persora에 오신 걸 환영합니다',
    'apikey.welcomeDesc': '분석은 Google AI Studio (Gemini)를 사용합니다. 본인 API 키를 입력해 주세요.',
    'apikey.intro':
      '이 앱은 <strong>당신의 Google AI Studio(Gemini) API 키</strong>로 동작합니다. 키와 모든 데이터는 <strong>이 브라우저에만</strong> 저장되며 서버로 전송되지 않습니다.',
    'apikey.keyLabel': 'API 키',
    'apikey.keyLabelHint': '* Google AI Studio에서 발급',
    'apikey.consent': '본 기기에만 저장되며 서버로 전송되지 않음을 이해했습니다.',
    'apikey.helpCta': 'AI Studio에서 키 발급받기 ↗',
    'btn.saveKey': '키 저장하고 시작하기',
    'btn.clearKey': '저장된 키 삭제',

    // 로딩
    'loading.default': 'AI 분석 중...',
    'loading.defaultSub': 'Gemini가 열심히 생각하고 있어요 ☕',
    'loading.checkingKey': '키 확인 중...',
    'loading.checkingKeySub': 'Gemini에 연결하고 있어요',
    'loading.creatingPersona': '페르소나 생성 중...',
    'loading.creatingDual': '{other}과 {my}의 페르소나를 동시에 분석하고 있어요',
    'loading.creatingSingle': '{name}의 대화를 분석하고 있어요',
    'loading.analyzing': '메시지 분석 중...',
    'loading.analyzingSub': '{name}의 심리를 파악하고 있어요 🔍',

    // 토스트
    'toast.selectPersona': '페르소나를 선택해주세요',
    'toast.enterMessage': '메시지를 입력해주세요',
    'toast.analyzeFail': '분석에 실패했습니다. API 키 설정을 확인해주세요',
    'toast.copyFail': '클립보드 복사 실패',
    'toast.enterName': '이름을 입력해주세요',
    'toast.convTooShort': '대화 기록이 너무 짧아요',
    'toast.addImage': '캡처 이미지를 추가해주세요',
    'toast.imageLoadFail': '이미지를 불러오지 못했습니다',
    'toast.personaCreated': '{name} 페르소나 생성 완료!',
    'toast.personaCreateFail': '페르소나 생성에 실패했습니다',
    'toast.loadPersonaFail': '페르소나를 불러오지 못했습니다',
    'toast.loadDetailFail': '상세 정보를 불러오지 못했습니다',
    'toast.personaSelected': '{name} 페르소나 선택됨',
    'toast.deleteFail': '삭제에 실패했습니다',
    'toast.personaDeleted': '{name} 삭제 완료',
    'toast.invalidKeyFormat': 'API 키 형식이 올바르지 않습니다',
    'toast.confirmLocalOnly': '로컬 저장 안내를 확인해주세요',
    'toast.keyValidateFail': 'API 키 검증에 실패했습니다',
    'toast.keySaved': 'API 키가 저장되었습니다',
    'toast.keyDeleted': '저장된 키를 삭제했습니다',
    'toast.loadHistoryFail': '기록을 불러오지 못했습니다',
    'toast.historyDeleted': '기록 삭제 완료',

    // 확인 다이얼로그
    'confirm.deletePersona': '"{name}" 페르소나를 삭제할까요?',
    'confirm.deleteHistory': '이 분석 기록을 삭제할까요?',

    // 저장 데이터 플레이스홀더
    'placeholder.imageCreated': '[채팅 캡처 이미지 {n}장으로 생성된 페르소나]',

    // Gemini 오류 (사용자 노출)
    'err.invalidKey': 'API 키가 유효하지 않습니다. 키를 다시 확인해주세요.',
    'err.network': '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
    'err.keyValidate': '키 검증 중 오류가 발생했습니다: {msg}',
    'err.keyNotSet': 'API 키가 설정되지 않았습니다. 키를 먼저 입력해주세요.',
    'err.serviceTemp': 'Gemini 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'err.rateLimit': 'API 사용 한도(무료 할당량)를 초과했습니다. 잠시 후 다시 시도하거나 결제/할당량을 확인해주세요.',
    'err.timeout': '응답이 너무 오래 걸려 시간 초과되었습니다. 캡처 이미지 수를 줄이거나 잠시 후 다시 시도해주세요.',
    'err.aiGeneric': 'AI 응답 중 오류가 발생했습니다: {msg}',
    'err.dbOpen': '브라우저 저장소를 여는 데 실패했습니다.',

    // 에러 경계 (렌더 예외 폴백)
    'error.boundaryTitle': '화면을 표시하는 중 문제가 발생했어요',
    'error.boundaryDesc': '잠시 후 다시 시도해주세요. 저장된 데이터는 안전합니다.',
    'error.boundaryRetry': '다시 시도',

    // 분석 응답 파싱 실패 폴백 (저장됨 — 생성 시점 언어로 고정)
    'parse.failAnalysis': 'AI 응답을 파싱하는 데 문제가 발생했습니다. 원본 응답을 확인하세요.',
    'parse.failLabel': '원본 응답',
    'parse.failReason': 'JSON 파싱 실패',
  },
  en: {
    // Header / status
    'app.title': 'Persora',
    'status.checking': 'Checking…',
    'status.ready': 'Gemini ready',
    'status.noKey': 'No API key',
    'lang.switchTitle': 'Switch language (한국어/English)',

    // Bottom nav
    'nav.personas': 'Personas',
    'nav.analyze': 'Analyze',
    'nav.history': 'History',
    'fab.newPersona': 'New persona',

    // Personas page (empty state)
    'personas.empty.title': 'No saved personas',
    'personas.empty.desc': 'Paste a conversation and<br>AI will analyze the other person’s persona',
    'btn.createPersona': 'Create persona',
    'persona.summaryFallback': 'Persona analysis complete',

    // Analyze page
    'analyze.noPersonaHint': 'First create a persona by analyzing a conversation in the <strong>Personas tab</strong>.',
    'analyze.selectPersona': 'Select a persona',
    'common.loading': 'Loading…',
    'common.save': 'Save',
    'common.saving': 'Saving…',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'analyze.messageLabel': 'Incoming message',
    'analyze.messageLabelHint': '— paste the message you received',
    'analyze.messagePlaceholder': 'e.g. Hey, what are you up to today? Free to talk?',
    'btn.analyze': 'Analyze',
    'analyze.aiLabel': 'AI psychological analysis',
    'analyze.candidatesTitle': '3 suggested replies',
    'btn.copy': 'Copy',
    'btn.copied': '✓ Copied',

    // History page
    'history.empty': 'No analysis history yet',
    'history.reason': 'Why they want it:',
    'history.candidatesTitle': 'Suggested replies',
    'history.deleteBtn': 'Delete record',
    'common.candidateN': 'Option {n}',

    // Create sheet
    'create.title': 'Create persona',
    'create.otherName': 'Their name',
    'create.required': '* required',
    'create.myName': 'Your name',
    'create.optional': 'optional',
    'create.otherNamePlaceholder': 'e.g. Alex',
    'create.myNamePlaceholder': 'e.g. Me',
    'create.inputMode': 'Conversation input',
    'create.inputModeHint': '* paste text or upload screenshots',
    'create.tabText': '✍️ Text',
    'create.tabImage': '🖼️ Screenshots',
    'create.convPlaceholder':
      'Alex: Hey, what are you up to today?\nMe: Just home. Why?\nAlex: Oh nothing... just wondering if you’re free\nMe: I am, what’s up?\n...',
    'create.textHint': '📋 The more conversation you paste, the more accurate the persona. At least 10 lines recommended.',
    'create.imageDropzone': 'Select chat screenshots',
    'create.imageHint': '🖼️ AI reads the conversation straight from your screenshots. Upload several in time order for better accuracy.',
    'btn.create': 'Create persona',

    // Detail sheet
    'detail.title': 'Persona details',
    'detail.useForAnalysis': 'Analyze with this persona',
    'detail.delete': 'Delete',
    'detail.convToggle': '📝 View original conversation',
    'detail.tabMe': '🙋 Me ({my})',
    'detail.myBadgeRelation': '✦ Me, in my relationship with {other}',
    'detail.createdAt': 'Created {date}',
    'detail.myLabel': 'Me: {my}',
    'detail.myChip': 'me: {my}',

    // Persona field labels
    'field.communication_style': 'Communication style',
    'field.speech_level': 'Politeness / endings',
    'field.vocabulary_examples': 'Frequent expressions',
    'field.sentence_style': 'Sentence style',
    'field.emoji_symbol_usage': 'Emoji / symbols',
    'field.texting_habits': 'Texting habits',
    'field.emotional_tendencies': 'Emotional expression',
    'field.what_they_value': 'What they value',
    'field.how_they_seek_response': 'Desired response',
    'field.relationship_dynamics': 'Relationship dynamics',
    'field.tone': 'Tone',
    'field.key_interactions': 'Interaction patterns',

    // API key sheet
    'apikey.title': 'Gemini API key',
    'apikey.welcomeTitle': 'Welcome to Persora',
    'apikey.welcomeDesc': 'Analysis uses Google AI Studio (Gemini). Enter your own API key to begin.',
    'apikey.intro':
      'This app runs on <strong>your own Google AI Studio (Gemini) API key</strong>. Your key and all data are stored <strong>only in this browser</strong> and never sent to any server.',
    'apikey.keyLabel': 'API key',
    'apikey.keyLabelHint': '* issued by Google AI Studio',
    'apikey.consent': 'I understand this is stored only on this device and is not sent to this app server.',
    'apikey.helpCta': 'Get a key from AI Studio ↗',
    'btn.saveKey': 'Save key & start',
    'btn.clearKey': 'Delete saved key',

    // Loading
    'loading.default': 'AI analyzing…',
    'loading.defaultSub': 'Gemini is thinking hard ☕',
    'loading.checkingKey': 'Checking key…',
    'loading.checkingKeySub': 'Connecting to Gemini',
    'loading.creatingPersona': 'Creating persona…',
    'loading.creatingDual': 'Analyzing {other}’s and {my}’s personas together',
    'loading.creatingSingle': 'Analyzing {name}’s conversation',
    'loading.analyzing': 'Analyzing message…',
    'loading.analyzingSub': 'Reading {name}’s mind 🔍',

    // Toasts
    'toast.selectPersona': 'Please select a persona',
    'toast.enterMessage': 'Please enter a message',
    'toast.analyzeFail': 'Analysis failed. Please check your API key.',
    'toast.copyFail': 'Failed to copy to clipboard',
    'toast.enterName': 'Please enter a name',
    'toast.convTooShort': 'The conversation is too short',
    'toast.addImage': 'Please add a screenshot',
    'toast.imageLoadFail': 'Failed to load the image',
    'toast.personaCreated': '{name} persona created!',
    'toast.personaCreateFail': 'Failed to create the persona',
    'toast.loadPersonaFail': 'Failed to load personas',
    'toast.loadDetailFail': 'Failed to load the details',
    'toast.personaSelected': '{name} persona selected',
    'toast.deleteFail': 'Failed to delete',
    'toast.personaDeleted': '{name} deleted',
    'toast.invalidKeyFormat': 'Invalid API key format',
    'toast.confirmLocalOnly': 'Please confirm the local-only storage notice',
    'toast.keyValidateFail': 'Failed to validate the API key',
    'toast.keySaved': 'API key saved',
    'toast.keyDeleted': 'Saved key deleted',
    'toast.loadHistoryFail': 'Failed to load history',
    'toast.historyDeleted': 'Record deleted',

    // Confirm dialogs
    'confirm.deletePersona': 'Delete the "{name}" persona?',
    'confirm.deleteHistory': 'Delete this analysis record?',

    // Stored-data placeholder
    'placeholder.imageCreated': '[Persona created from {n} chat screenshot(s)]',

    // Gemini errors (user-facing)
    'err.invalidKey': 'The API key is invalid. Please check it again.',
    'err.network': 'A network error occurred. Please check your internet connection.',
    'err.keyValidate': 'An error occurred while validating the key: {msg}',
    'err.keyNotSet': 'No API key is set. Please enter your key first.',
    'err.serviceTemp': 'Gemini had a temporary error. Please try again in a moment.',
    'err.rateLimit': 'API usage limit (free quota) exceeded. Please retry later or check your billing/quota.',
    'err.timeout': 'The response took too long and timed out. Try fewer screenshots or retry in a moment.',
    'err.aiGeneric': 'An error occurred while getting the AI response: {msg}',
    'err.dbOpen': 'Failed to open browser storage.',

    // Error boundary (render-exception fallback)
    'error.boundaryTitle': 'Something went wrong while rendering',
    'error.boundaryDesc': 'Please try again in a moment. Your saved data is safe.',
    'error.boundaryRetry': 'Try again',

    // Analysis parse-failure fallback (persisted — frozen at creation-time language)
    'parse.failAnalysis': 'There was a problem parsing the AI response. See the raw response below.',
    'parse.failLabel': 'Raw response',
    'parse.failReason': 'JSON parsing failed',
  },
};

let currentLang: Lang = detectInitialLang();
const listeners = new Set<() => void>();

/** localStorage → navigator.language 순으로 초기 언어 결정. */
function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // localStorage 접근 불가 — 감지로 폴백
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'ko';
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function getLang(): Lang {
  return currentLang;
}

/** {param} 보간을 적용해 현재 언어의 문자열을 반환. 키가 없으면 키 자체를 반환. */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = MESSAGES[currentLang][key] ?? MESSAGES.ko[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, p: string) =>
    params[p] !== undefined ? String(params[p]) : `{${p}}`,
  );
}

/**
 * data-i18n* 속성을 가진 정적 DOM을 현재 언어로 채운다.
 * - data-i18n: textContent
 * - data-i18n-html: innerHTML (마크업 포함 문자열)
 * - data-i18n-placeholder: placeholder 속성
 * - data-i18n-title: title 속성
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset['i18n'] as string);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset['i18nHtml'] as string);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    (el as HTMLInputElement | HTMLTextAreaElement).placeholder = t(
      el.dataset['i18nPlaceholder'] as string,
    );
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset['i18nTitle'] as string);
  });
}

/** 언어 변경 구독 — 동적 뷰가 자신을 다시 렌더링하도록. 해제 함수 반환. */
export function onLangChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 언어를 설정하고 저장 → <html lang> 갱신 → 정적 DOM 재적용 → 구독자 통지. */
export function setLang(lang: Lang): void {
  if (lang === currentLang) return;
  currentLang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // 저장 실패는 무시 (세션 한정으로 동작)
  }
  document.documentElement.lang = lang;
  document.title = t('app.title');
  applyTranslations(document);
  listeners.forEach((cb) => cb());
}

export function toggleLang(): void {
  setLang(currentLang === 'ko' ? 'en' : 'ko');
}

/** 부팅 시 호출 — <html lang> 동기화 + 문서 제목 + 정적 DOM 최초 적용. */
export function initI18n(): void {
  document.documentElement.lang = currentLang;
  document.title = t('app.title');
  applyTranslations(document);
}

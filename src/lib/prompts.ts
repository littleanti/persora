// server.py의 프롬프트를 TypeScript로 이식.
// 한국어 프롬프트 텍스트와 JSON 형식 지시는 원본과 동일하게 유지.

import type { PersonaRecord, CreatePersonaInput } from '../types';

/**
 * LLM에게 요청할 페르소나 JSON 필드 스펙.
 * server.py PERSONA_FIELDS 상수와 동일.
 */
export const PERSONA_FIELDS: string =
  `  "summary": "요약 (2-3문장, 핵심 성격과 관계 특성 포함)",
  "communication_style": "소통 방식 (직접적/간접적, 솔직한/우회적, 감정적/이성적 등)",
  "speech_level": "경어 수준 — 반말/해요체/합쇼체/혼합 중 어떤 어미를 주로 쓰는지 구체적으로 (예: ~야, ~어?, ~지, ~해요, ~거든요)",
  "vocabulary_examples": ["대화에서 실제로 자주 등장한 단어나 표현을 5개 이상 직접 인용 (예: ㅋㅋ, 진짜?, 아 그거, 나중에, ㅠㅠ)"],
  "sentence_style": "문장 길이와 구조 특징 — 짧은 단답 위주인지 길고 설명적인지, 완성된 문장인지 단편적인지, 실제 문장 예시 2-3개 포함",
  "emoji_symbol_usage": "이모지/이모티콘/특수문자 사용 패턴 — 어떤 것을 얼마나 자주 쓰는지, 없으면 '사용 안 함'",
  "emotional_tendencies": "감정 표현 방식 — 감정을 직접 드러내는지 간접적으로 암시하는지, 강조 표현 패턴",
  "what_they_value": "대화에서 중요하게 여기는 가치와 요소",
  "how_they_seek_response": "어떤 종류의 반응과 답변을 원하는 경향이 있는지",
  "relationship_dynamics": "이 관계에서 보이는 역할과 패턴"`;

/**
 * 페르소나 생성 프롬프트 빌더.
 * my_name 유무에 따라 단일(상대방만) / 이중(other_persona + my_persona) 형식으로 분기.
 * server.py create_persona 라우트와 동일한 로직.
 */
export function buildPersonaPrompt(input: CreatePersonaInput): string {
  const { name, conversation } = input;
  const myName = input.my_name.trim();

  const personaInstruction = `페르소나 분석 시 다음 사항을 반드시 지켜주세요:
- vocabulary_examples: 대화에서 실제로 등장한 단어/표현을 그대로 인용하세요. 추상적 설명 금지.
- sentence_style: 실제 문장 예시를 2-3개 직접 인용하세요.
- speech_level: 실제 사용된 어미 패턴을 구체적으로 명시하세요 (예: ~야, ~지, ~어?, ~ㄴ데).
- emoji_symbol_usage: 실제 사용된 이모지/이모티콘을 그대로 나열하세요.`;

  if (myName) {
    return `다음은 "${myName}"과 "${name}" 사이의 실제 대화 기록입니다.
두 사람 각각의 페르소나와 말투를 분석해주세요.

${personaInstruction}

대화 기록:
${conversation}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트, 설명, 마크다운은 절대 포함하지 마세요:
{
  "other_persona": {
${PERSONA_FIELDS}
  },
  "my_persona": {
${PERSONA_FIELDS}
  }
}

other_persona는 "${name}"의 페르소나이고, my_persona는 "${myName}"의 페르소나입니다.
각 페르소나는 이 두 사람의 관계 맥락에서 분석되어야 합니다.`;
  } else {
    return `다음은 "${name}"과의 실제 대화 기록입니다. 이 대화를 깊이 분석하여 ${name}의 페르소나와 말투를 만들어주세요.

${personaInstruction}

대화 기록:
${conversation}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트, 설명, 마크다운은 절대 포함하지 마세요:
{
${PERSONA_FIELDS}
}`;
  }
}

/**
 * 페르소나 필드에서 말투 요약 문자열을 생성한다.
 * server.py speech_summary() 헬퍼와 동일한 로직.
 */
function speechSummary(p: Record<string, unknown>, personName: string): string {
  const parts: string[] = [];

  if (p['speech_level']) {
    parts.push(`- 경어 수준: ${p['speech_level']}`);
  }

  const vocab = p['vocabulary_examples'];
  // server.py: `if vocab:` — 빈 배열([])은 Python에서 falsy이므로 건너뛴다.
  if (Array.isArray(vocab) ? vocab.length > 0 : vocab) {
    if (Array.isArray(vocab)) {
      const items = vocab.slice(0, 8).map((v) => String(v));
      parts.push(`- 자주 쓰는 표현: ${items.join(', ')}`);
    } else {
      parts.push(`- 자주 쓰는 표현: ${vocab}`);
    }
  }

  if (p['sentence_style']) {
    parts.push(`- 문장 스타일: ${p['sentence_style']}`);
  }

  if (p['emoji_symbol_usage']) {
    parts.push(`- 이모지/특수문자: ${p['emoji_symbol_usage']}`);
  }

  if (parts.length === 0) return '';
  return `${personName}의 말투 특징:\n` + parts.join('\n');
}

/**
 * 메시지 분석 프롬프트 빌더.
 * server.py analyze_message 라우트와 동일한 로직.
 */
export function buildAnalyzePrompt(input: {
  persona: PersonaRecord;
  message: string;
}): string {
  const { persona: record, message } = input;
  const { name, my_name, persona, my_persona } = record;
  const myName = my_name.trim();

  const personaStr = JSON.stringify(persona, null, 2);
  const receiverLabel = myName || '상대방';

  const otherSpeech = speechSummary(persona as Record<string, unknown>, name);

  let myPersonaSection = '';
  let mySpeechInstruction = '';

  if (myName && my_persona && Object.keys(my_persona).length > 0) {
    const myPersonaStr = JSON.stringify(my_persona, null, 2);
    const mySpeech = speechSummary(my_persona as Record<string, unknown>, myName);

    myPersonaSection = `
${myName}(메시지를 받는 사람)의 페르소나 - ${name}과의 관계에서:
${myPersonaStr}

`;

    if (mySpeech) {
      mySpeechInstruction = `
★ 중요: 답변(response)은 반드시 ${myName}의 실제 말투로 작성하세요.
${mySpeech}
위 말투를 그대로 반영하여 ${myName}이 실제로 보낼 법한 문자/메시지 형식으로 작성하세요.
어색한 문어체, 존댓말, 격식체를 쓰지 마세요. ${myName}의 평소 말투 그대로 써주세요.`;
    }
  }

  // 말투 섹션 — 있을 때만 앞뒤 줄바꿈 포함 (server.py: other_speech and chr(10) + other_speech + chr(10) or "")
  const otherSpeechBlock = otherSpeech ? `\n${otherSpeech}\n` : '';

  // 조건부 분석 질문 (server.py 원본 inline 조건과 동일)
  const speechToneQuestion = otherSpeech
    ? `- ${name}의 말투와 표현 방식을 고려할 때, ${name}이 기대하는 답변의 톤은?`
    : '';
  const myPersonaQuestion = myName
    ? `- ${myName}의 말투와 성격을 고려할 때, 어떤 답변이 가장 자연스럽고 효과적인가?`
    : '';

  // response 필드 설명 (my_name 유무에 따라 분기)
  const responseDesc = myName
    ? `${myName}의 말투로 작성`
    : '자연스러운 말투로 작성';

  return `당신은 지금 "${name}"의 내면 심리를 완벽히 이해하는 분석가입니다.

${name}의 성격 및 소통 방식 분석:
${personaStr}
${otherSpeechBlock}
${myPersonaSection}
${name}이(가) ${receiverLabel}에게 다음 메시지를 보냈습니다:
"${message}"

${name}의 성격, 소통 방식, 말투, 감정 표현 방식, 관계 패턴을 깊이 고려하여 분석하세요:
- ${name}이 이 메시지를 보낸 진짜 심리적 이유는 무엇인가?
- ${name}은 ${receiverLabel}으로부터 어떤 종류의 답변을 듣고 싶어하는가?
${speechToneQuestion}
${myPersonaQuestion}
- 가능한 답변 후보 3가지는 무엇인가? (각각 다른 뉘앙스와 방향으로)
${mySpeechInstruction}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운은 절대 포함하지 마세요:
{
  "analysis": "${name}이(가) 이 메시지를 보낸 심리적 배경과 기대하는 반응에 대한 분석 (2-3문장)",
  "candidates": [
    {
      "label": "답변 유형 (예: 공감형, 해결책 제시형, 감정 표현형 등)",
      "reason": "${name}이 이 답변을 원하는 구체적인 이유",
      "response": "${receiverLabel}이(가) ${name}에게 보낼 수 있는 실제 답변 — ${responseDesc}"
    },
    {
      "label": "답변 유형",
      "reason": "${name}이 이 답변을 원하는 구체적인 이유",
      "response": "${receiverLabel}이(가) ${name}에게 보낼 수 있는 실제 답변 — ${responseDesc}"
    },
    {
      "label": "답변 유형",
      "reason": "${name}이 이 답변을 원하는 구체적인 이유",
      "response": "${receiverLabel}이(가) ${name}에게 보낼 수 있는 실제 답변 — ${responseDesc}"
    }
  ]
}`;
}

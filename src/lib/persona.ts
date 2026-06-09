// 페르소나 도메인 서비스.
// server.py의 create_persona / list_personas / get_persona / delete_persona 로직을
// 브라우저 로컬(IndexedDB + Gemini 직접 호출)로 이식한다.

import type {
  PersonaRecord,
  PersonaSummary,
  CreatePersonaInput,
  PersonaFields,
} from '@/lib/types';
import { uuid } from '@/lib/id';
import { buildPersonaPrompt } from '@/lib/prompts';
import { generate, extractJson } from '@/lib/gemini';
import { getLang } from '@/lib/i18n';
import { personaRepo } from '@/lib/repos/personaRepo';

/**
 * LLM raw 응답을 상대/나 페르소나로 분리한다.
 * - my_name 이 있으면 raw.other_persona / raw.my_persona 로 분리
 * - 없으면 persona=raw, my_persona={}
 */
function splitPersonaRaw(
  raw: Record<string, unknown>,
  myName: string,
): { personaData: PersonaFields; myPersonaData: PersonaFields } {
  if (myName) {
    return {
      personaData: (raw['other_persona'] as PersonaFields | undefined) ?? (raw as PersonaFields),
      myPersonaData: (raw['my_persona'] as PersonaFields | undefined) ?? {},
    };
  }
  return { personaData: raw as PersonaFields, myPersonaData: {} };
}

/**
 * 페르소나를 생성한다.
 */
export async function createPersona(input: CreatePersonaInput): Promise<PersonaRecord> {
  const myName = input.my_name.trim();

  const prompt = buildPersonaPrompt(input, getLang());
  const text = await generate(prompt);
  const { personaData, myPersonaData } = splitPersonaRaw(extractJson(text), myName);

  const record: PersonaRecord = {
    id: uuid(),
    name: input.name,
    my_name: myName,
    created_at: new Date().toISOString(),
    conversation: input.conversation,
    persona: personaData,
    my_persona: myPersonaData,
  };

  await personaRepo.put(record);
  return record;
}

/**
 * 기존 페르소나를 추가 대화로 수동 업데이트한다.
 * 기존 대화 + 신규 대화를 합쳐 재분석하고, 같은 id/created_at을 유지한 채
 * persona/my_persona/conversation을 갱신한다(updated_at 기록).
 */
export async function updatePersona(
  id: string,
  input: { conversation: string },
): Promise<PersonaRecord> {
  const existing = await personaRepo.get(id);
  if (!existing) {
    throw new Error('페르소나를 찾을 수 없습니다.');
  }

  const addition = input.conversation.trim();
  const combined = existing.conversation
    ? `${existing.conversation}\n${addition}`.trim()
    : addition;

  const prompt = buildPersonaPrompt(
    { name: existing.name, my_name: existing.my_name, conversation: combined },
    getLang(),
  );
  const text = await generate(prompt);
  const { personaData, myPersonaData } = splitPersonaRaw(extractJson(text), existing.my_name.trim());

  const updated: PersonaRecord = {
    ...existing,
    conversation: combined,
    persona: personaData,
    my_persona: myPersonaData,
    updated_at: new Date().toISOString(),
  };

  await personaRepo.put(updated);
  return updated;
}

/** 목록 화면용 경량 요약 리스트. */
export async function listPersonaSummaries(): Promise<PersonaSummary[]> {
  const records = await personaRepo.list();
  return records.map((p) => ({
    id: p.id,
    name: p.name,
    my_name: p.my_name,
    created_at: p.created_at,
    summary: p.persona?.summary ?? '',
  }));
}

export function getPersona(id: string): Promise<PersonaRecord | null> {
  return personaRepo.get(id);
}

export function removePersona(id: string): Promise<void> {
  return personaRepo.remove(id);
}

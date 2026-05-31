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
 * 페르소나를 생성한다.
 * server.py create_persona와 동일하게:
 * - my_name 이 있으면 raw.other_persona / raw.my_persona 로 분리
 * - 없으면 persona=raw, my_persona={}
 */
export async function createPersona(input: CreatePersonaInput): Promise<PersonaRecord> {
  const myName = input.my_name.trim();

  const prompt = buildPersonaPrompt(input, getLang());
  const text = await generate(prompt, input.images);
  const raw = extractJson(text);

  let personaData: PersonaFields;
  let myPersonaData: PersonaFields;

  if (myName) {
    // raw.get("other_persona", raw) / raw.get("my_persona", {})
    personaData = (raw['other_persona'] as PersonaFields | undefined) ?? (raw as PersonaFields);
    myPersonaData = (raw['my_persona'] as PersonaFields | undefined) ?? {};
  } else {
    personaData = raw as PersonaFields;
    myPersonaData = {};
  }

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

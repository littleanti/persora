// 메시지 분석 도메인 서비스.
// server.py analyze_message / list_analyses / delete_analysis 로직 이식.

import type { AnalysisRecord, CandidateReply } from '@/lib/types';
import { uuid } from '@/lib/id';
import { buildAnalyzePrompt } from '@/lib/prompts';
import { generate, extractJson } from '@/lib/gemini';
import { getLang, t } from '@/lib/i18n';
import { analysisRepo } from '@/lib/repos/analysisRepo';
import { personaRepo } from '@/lib/repos/personaRepo';

/**
 * 메시지를 분석한다.
 * - 페르소나가 없으면 throw
 * - LLM 응답이 'raw' 키를 가지면 server.py와 동일한 파싱 실패 fallback 객체 생성
 */
export async function analyzeMessage(personaId: string, message: string): Promise<AnalysisRecord> {
  const persona = await personaRepo.get(personaId);
  if (!persona) {
    throw new Error('페르소나를 찾을 수 없습니다.');
  }

  const prompt = buildAnalyzePrompt({ persona, message }, getLang());
  const text = await generate(prompt);
  const result = extractJson(text);

  let analysis: string;
  let candidates: CandidateReply[];

  if ('raw' in result) {
    // server.py: JSON 파싱 실패 fallback (현재 UI 언어로 표시)
    analysis = t('parse.failAnalysis');
    candidates = [
      {
        label: t('parse.failLabel'),
        reason: t('parse.failReason'),
        response: String(result['raw'] ?? ''),
      },
    ];
  } else {
    analysis = typeof result['analysis'] === 'string' ? (result['analysis'] as string) : '';
    candidates = Array.isArray(result['candidates'])
      ? (result['candidates'] as CandidateReply[])
      : [];
  }

  const record: AnalysisRecord = {
    id: uuid(),
    persona_id: personaId,
    persona_name: persona.name,
    message,
    analysis,
    candidates,
    created_at: new Date().toISOString(),
  };

  await analysisRepo.put(record);
  return record;
}

export function listAnalyses(): Promise<AnalysisRecord[]> {
  return analysisRepo.list();
}

export function removeAnalysis(id: string): Promise<void> {
  return analysisRepo.remove(id);
}

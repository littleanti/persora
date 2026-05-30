// 메시지 분석 도메인 서비스.
// server.py analyze_message / list_analyses / delete_analysis 로직 이식.

import type { AnalysisRecord, CandidateReply } from '../types';
import { uuid } from '../ui/dom';
import { buildAnalyzePrompt } from '../lib/prompts';
import { generate, extractJson } from '../lib/gemini';
import * as db from '../lib/db';

/**
 * 메시지를 분석한다.
 * - 페르소나가 없으면 throw
 * - LLM 응답이 'raw' 키를 가지면 server.py와 동일한 파싱 실패 fallback 객체 생성
 */
export async function analyzeMessage(personaId: string, message: string): Promise<AnalysisRecord> {
  const persona = await db.getPersona(personaId);
  if (!persona) {
    throw new Error('페르소나를 찾을 수 없습니다.');
  }

  const prompt = buildAnalyzePrompt({ persona, message });
  const text = await generate(prompt);
  const result = extractJson(text);

  let analysis: string;
  let candidates: CandidateReply[];

  if ('raw' in result) {
    // server.py: JSON 파싱 실패 fallback
    analysis = 'AI 응답을 파싱하는 데 문제가 발생했습니다. 원본 응답을 확인하세요.';
    candidates = [
      {
        label: '원본 응답',
        reason: 'JSON 파싱 실패',
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

  await db.putAnalysis(record);
  return record;
}

export function listAnalyses(): Promise<AnalysisRecord[]> {
  return db.listAnalyses();
}

export function removeAnalysis(id: string): Promise<void> {
  return db.deleteAnalysis(id);
}

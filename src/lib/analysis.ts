// 메시지 분석 도메인 서비스.
// server.py analyze_message / list_analyses / delete_analysis 로직 이식.

import type { AnalysisRecord, CandidateReply } from '@/lib/types';
import { uuid } from '@/lib/id';
import { buildAnalyzePrompt } from '@/lib/prompts';
import { generate, extractJson } from '@/lib/gemini';
import { getLang, t } from '@/lib/i18n';
import { parseThread, detectTarget } from '@/lib/thread';
import { analysisRepo } from '@/lib/repos/analysisRepo';
import { personaRepo } from '@/lib/repos/personaRepo';

/**
 * 최근 대화 스레드 기반 맞춤 답장을 생성한다.
 * - 페르소나(장기)는 정적, thread(단기 맥락)와 intent(답장 의도)는 매 호출 입력
 * - thread를 화자 라벨로 파싱해 상대의 마지막 메시지를 타겟으로 자동 검출
 * - LLM 응답이 'raw' 키면 파싱 실패 fallback 객체 생성
 */
export async function analyzeReply(
  personaId: string,
  input: { thread: string; intent: string },
): Promise<AnalysisRecord> {
  const persona = await personaRepo.get(personaId);
  if (!persona) {
    throw new Error('페르소나를 찾을 수 없습니다.');
  }

  const parsed = parseThread(input.thread, { name: persona.name, myName: persona.my_name });
  const targetMessage = detectTarget(parsed);

  const prompt = buildAnalyzePrompt(
    { persona, thread: input.thread, targetMessage, intent: input.intent },
    getLang(),
  );
  const text = await generate(prompt);
  const result = extractJson(text);

  let analysis: string;
  let candidates: CandidateReply[];

  if ('raw' in result) {
    // JSON 파싱 실패 fallback (현재 UI 언어로 표시)
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
    message: targetMessage, // 구 스키마 호환: 타겟 메시지를 message로도 보존
    analysis,
    candidates,
    created_at: new Date().toISOString(),
    thread: input.thread,
    target_message: targetMessage,
    intent: input.intent,
  };

  await analysisRepo.put(record);
  return record;
}

/**
 * 하위 호환 래퍼 — 단일 메시지를 스레드(=마지막 메시지)로 간주하고 의도 없이 분석.
 * @deprecated analyzeReply 사용 권장.
 */
export function analyzeMessage(personaId: string, message: string): Promise<AnalysisRecord> {
  return analyzeReply(personaId, { thread: message, intent: '' });
}

export function listAnalyses(): Promise<AnalysisRecord[]> {
  return analysisRepo.list();
}

export function removeAnalysis(id: string): Promise<void> {
  return analysisRepo.remove(id);
}

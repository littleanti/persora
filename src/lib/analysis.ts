// 메시지 분석 도메인 서비스.
// server.py analyze_message / list_analyses / delete_analysis 로직 이식.

import type { AnalysisRecord, CandidateReply, InlineImage } from '@/lib/types';
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
  input: { thread: string; intent: string; targetOverride?: string; images?: InlineImage[] },
): Promise<AnalysisRecord> {
  const persona = await personaRepo.get(personaId);
  if (!persona) {
    throw new Error('페르소나를 찾을 수 없습니다.');
  }

  const images = input.images;
  const useImages = !!images && images.length > 0;

  // 이미지 모드는 텍스트 thread가 없으므로 파싱/타겟 검출을 건너뛴다.
  // 멀티모달 모델이 첨부 캡처에서 직접 대화를 읽어 답장 대상(상대의 마지막 메시지)을 판별한다.
  const targetMessage = useImages
    ? ''
    : input.targetOverride?.trim() ||
      detectTarget(parseThread(input.thread, { name: persona.name, myName: persona.my_name }));

  const prompt = buildAnalyzePrompt(
    { persona, thread: input.thread, targetMessage, intent: input.intent, useImages },
    getLang(),
  );
  const text = await generate(prompt, images);
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

  // 이미지 모드는 답장 대상을 AI가 캡처에서 판별하므로 클라이언트에 타겟 텍스트가 없다.
  // 기록 목록 미리보기가 비지 않도록 캡처 장수 플레이스홀더를 저장한다(생성 시점 언어로 고정).
  const storedTarget = useImages ? t('placeholder.imageAnalyzed', { n: images!.length }) : targetMessage;

  const record: AnalysisRecord = {
    id: uuid(),
    persona_id: personaId,
    persona_name: persona.name,
    message: storedTarget, // 구 스키마 호환: 타겟 메시지를 message로도 보존
    analysis,
    candidates,
    created_at: new Date().toISOString(),
    thread: useImages ? '' : input.thread,
    target_message: storedTarget,
    intent: input.intent,
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

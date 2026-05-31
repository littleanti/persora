// Gemini API 클라이언트.
// 키/프롬프트는 콘솔에 출력하지 않는다 (TRD §8).

import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from '@/lib/config';
import { getApiKey } from '@/lib/repos/settingsRepo';
import { t } from './i18n';
import type { KeyValidationResult, InlineImage } from '@/lib/types';

/**
 * 저장된 API 키로 Gemini에 프롬프트를 전송하고 텍스트를 반환한다.
 * images 가 주어지면 멀티모달 요청을 구성한다 — Gemini가 이미지에서
 * 직접 대화 텍스트를 읽어 분석한다(별도 OCR 불필요).
 */
export async function generate(prompt: string, images?: InlineImage[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(t('err.keyNotSet'));
  }

  const ai = new GoogleGenAI({ apiKey });

  // 텍스트 전용이면 문자열 그대로, 이미지가 있으면 parts 배열로 멀티모달 구성.
  const contents = images && images.length > 0
    ? [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...images.map((img) => ({
              inlineData: { mimeType: img.mimeType, data: img.data },
            })),
          ],
        },
      ]
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });
    return response.text ?? '';
  } catch (err: unknown) {
    // 인증 오류(400/403)는 키 재입력을 유도하는 명확한 메시지로 변환
    if (isAuthError(err)) {
      throw new Error(t('err.invalidKey'));
    }
    throw toUserFriendlyError(err);
  }
}

/**
 * 주어진 키가 실제로 동작하는지 경량 호출로 확인한다.
 * server.py와 달리 Gemini 직접 호출이므로 "ping" 프롬프트 사용.
 */
export async function validateKey(key: string): Promise<KeyValidationResult> {
  const ai = new GoogleGenAI({ apiKey: key });

  try {
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'ping',
    });
    return { ok: true };
  } catch (err: unknown) {
    if (isAuthError(err)) {
      return { ok: false, error: t('err.invalidKey') };
    }
    if (isNetworkError(err)) {
      return { ok: false, error: t('err.network') };
    }
    return { ok: false, error: t('err.keyValidate', { msg: getErrorMessage(err) }) };
  }
}

/**
 * LLM 응답 텍스트에서 JSON 객체를 추출한다.
 * server.py extract_json()의 faithful 이식:
 * 1) ```json 펜스 제거
 * 2) 첫 번째 균형 잡힌 {...} 블록 찾기
 * 3) 실패 시 전체 텍스트를 JSON.parse
 * 4) 그것도 실패하면 { raw: text } 반환
 */
export function extractJson(text: string): Record<string, unknown> {
  // ``` 펜스 제거 (server.py: re.sub(r"```(?:json)?\s*", "", text) 및 re.sub(r"```", "", text))
  let cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();

  // 첫 번째 균형 잡힌 {...} 블록 탐색
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1)) as Record<string, unknown>;
          } catch {
            // 파싱 실패 — 다음 단계로 넘어감
            break;
          }
        }
      }
    }
  }

  // 전체 텍스트 파싱 시도
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // server.py와 동일하게 펜스 제거된 텍스트(cleaned)를 반환한다.
    return { raw: cleaned };
  }
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

/** HTTP 400/403 계열 인증 오류 여부 판단. */
function isAuthError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  // @google/genai SDK는 status code를 메시지나 status 프로퍼티에 노출
  if (msg.includes('400') || msg.includes('403')) return true;
  if (msg.includes('api key') || msg.includes('api_key')) return true;
  if (msg.includes('invalid') && msg.includes('key')) return true;
  if (msg.includes('unauthorized') || msg.includes('forbidden')) return true;
  // SDK가 던지는 GoogleGenerativeAIError의 status 프로퍼티 확인
  const status = (err as Record<string, unknown>)?.['status'];
  if (status === 400 || status === 403) return true;
  return false;
}

/** 네트워크 오류 여부 판단. */
function isNetworkError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('networkerror') ||
    msg.includes('fetch')
  );
}

/** 오류 객체에서 메시지 문자열을 안전하게 추출. */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

/** 오류를 사용자 친화적인 Error로 변환. */
function toUserFriendlyError(err: unknown): Error {
  if (isNetworkError(err)) {
    return new Error(t('err.network'));
  }
  const msg = getErrorMessage(err);
  if (msg.includes('500') || msg.includes('503')) {
    return new Error(t('err.serviceTemp'));
  }
  return new Error(t('err.aiGeneric', { msg }));
}

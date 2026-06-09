// 카카오톡 대화 파일(.txt) 파서 — 페르소나 생성 전용.
// 첨부된 대화 파일은 매우 클 수 있으므로 말미(tail)만 적당히 잘라 페르소나 생성에 쓴다.
// (최근 대화일수록 현재 말투/관계를 잘 반영하기 때문)
// 메시지 분석(AnalyzePage)은 이 모듈을 쓰지 않는다(캡처 이미지 모드 유지, src/lib/image.ts 사용).

/**
 * 카카오톡 export 머리말로 보이는 선두 메타 줄 패턴.
 * - "...님과의 대화" / "...님과 카카오톡 대화"
 * - "저장한 날짜 : ..." / "Date Saved : ..."
 * - "--------------- YYYY년 M월 D일 ... ---------------" 같은 날짜 구분선
 * 매칭되는 동안 선두 줄을 한 줄씩 떼어낸다. 매칭 안 되면 멈춰 원문을 보존한다(평문 샘플 안전).
 */
function isKakaoHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true; // 머리말 사이의 빈 줄은 함께 흡수
  if (/님과의 (카카오톡 )?대화$/.test(trimmed)) return true;
  if (/^저장한 날짜\s*:/.test(trimmed)) return true;
  if (/^Date Saved\s*:/i.test(trimmed)) return true;
  // 날짜 구분선: 양끝 하이픈으로 감싼 "YYYY년 M월 D일 ..." 형태
  if (/^-{3,}.*\d{4}년.*-{3,}$/.test(trimmed)) return true;
  return false;
}

/**
 * 카카오톡 export(.txt) 또는 평문 라인-단위 샘플을 받아 말미(tail)만 잘라 반환한다.
 * 동작:
 *  1. CRLF/CR → LF 정규화.
 *  2. 선두 export 머리말 줄을 가능하면 제거(매칭 안 되면 원문 유지 — 견고하게, 평문 샘플도 통과).
 *  3. 말미에서 maxChars 자만 취하되, 잘릴 경우 줄 중간 절단을 피해 첫 줄바꿈 이후부터 시작(부분 줄 버림).
 *  4. 앞뒤 공백 trim 후 반환.
 * 화자 라벨/타임스탬프는 보존한다(LLM이 화자 구분에 사용).
 */
export function parseKakaoChatTail(rawText: string, maxChars: number): string {
  // 1) 줄바꿈 정규화
  const normalized = rawText.replace(/\r\n?/g, '\n');

  // 2) 선두 머리말 제거 — 머리말이 아닌 첫 줄을 만날 때까지만 떼어낸다.
  const lines = normalized.split('\n');
  let start = 0;
  while (start < lines.length && isKakaoHeaderLine(lines[start])) {
    start += 1;
  }
  // 모든 줄이 머리말처럼 보이면(예: 헤더만 있는 파일) 원문을 그대로 둔다.
  const body = start >= lines.length ? normalized : lines.slice(start).join('\n');

  // 3) 말미 maxChars 컷
  if (body.length <= maxChars) {
    return body.trim();
  }
  let tail = body.slice(body.length - maxChars);
  // 줄 중간에서 끊겼다면 첫 줄바꿈 이후부터 시작해 부분 줄을 버린다.
  const firstBreak = tail.indexOf('\n');
  if (firstBreak >= 0) {
    tail = tail.slice(firstBreak + 1);
  }

  // 4) trim
  return tail.trim();
}

// 표시용 포맷 헬퍼.

/** ISO 문자열 → YYYY.MM.DD */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 이름 첫 글자(아바타용). */
export function getInitial(name: string): string {
  return name ? name[0].toUpperCase() : '?';
}

// 공용 DOM 헬퍼.

/** querySelector 단축 (없으면 throw — 정적 마크업 기준). */
export function $<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}

/** querySelector 단축 (없으면 null). */
export function $opt<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

/** querySelectorAll → 배열. */
export function $$<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

/** HTML 이스케이프 (기존 index.html escHtml과 동일 동작). */
export function escHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** ISO 문자열 → YYYY.MM.DD */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 이름 첫 글자(아바타용). */
export function getInitial(name: string): string {
  return name ? name[0].toUpperCase() : '?';
}

/** uuid v4 (브라우저 crypto). */
export function uuid(): string {
  return crypto.randomUUID();
}

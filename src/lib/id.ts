// 브라우저 crypto 기반 id 생성기.
export function uuid(): string {
  return crypto.randomUUID();
}

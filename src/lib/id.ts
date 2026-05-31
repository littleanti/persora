// UUID v4 생성기.
// crypto.randomUUID()는 보안 컨텍스트(HTTPS 또는 localhost)에서만 제공된다.
// 휴대폰에서 LAN IP(http://192.168.x.x)로 접속하면 비보안 컨텍스트라
// crypto.randomUUID가 undefined → "is not a function"으로 실패한다.
// 따라서 단계적으로 폴백한다: randomUUID → getRandomValues → Math.random.

function fromRandomBytes(bytes: Uint8Array): string {
  // RFC 4122 v4: version/variant 비트 설정
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i]!.toString(16).padStart(2, '0'));
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}

export function uuid(): string {
  const c = (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) as Crypto | undefined;

  // 1) 보안 컨텍스트: 표준 API
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }

  // 2) 비보안 컨텍스트라도 getRandomValues는 대개 사용 가능 (CSPRNG)
  if (c && typeof c.getRandomValues === 'function') {
    return fromRandomBytes(c.getRandomValues(new Uint8Array(16)));
  }

  // 3) 최후 폴백: Math.random (암호학적으로 안전하지 않지만 id 충돌 방지 용도로 충분)
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return fromRandomBytes(bytes);
}

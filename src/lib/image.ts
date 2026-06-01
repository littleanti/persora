// File → InlineImage 변환 헬퍼.
// 페르소나 생성/메시지 분석의 캡처 이미지 입력에서 공용으로 쓴다.
// data URL 접두어(`data:image/...;base64,`)를 떼고 순수 base64만 보관한다(Gemini inlineData 계약).

import type { InlineImage } from '@/lib/types';

export function fileToInlineImage(file: File): Promise<InlineImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve({
        mimeType: file.type || 'image/png',
        data: comma >= 0 ? result.slice(comma + 1) : result,
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

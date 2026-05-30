// 전체 화면 로딩 오버레이. 원본 index.html showLoading/hideLoading 이식.
import { $ } from './dom';

export function showLoading(
  text = 'AI 분석 중...',
  sub = 'Gemini가 열심히 생각하고 있어요 ☕',
): void {
  $('#loadingText').textContent = text;
  $('#loadingSub').textContent = sub;
  $('#loadingOverlay').classList.add('show');
}

export function hideLoading(): void {
  $('#loadingOverlay').classList.remove('show');
}

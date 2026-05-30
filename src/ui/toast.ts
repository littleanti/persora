// 토스트 알림. 원본 index.html showToast와 동일 동작.
import { $ } from './dom';

export function showToast(msg: string, type: '' | 'success' | 'error' = ''): void {
  const container = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : 'ℹ ') + msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

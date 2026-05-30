// 하단 네비게이션 + 페이지 전환. 원본 index.html switchPage 이식.
// main.ts가 핸들러를 주입해 결합을 낮춘다.
import { $, $$, $opt } from './dom';

export type Page = 'personas' | 'analyze' | 'history';

export interface NavHandlers {
  /** 비-페르소나 페이지로 갈 때 선택기 갱신 */
  onRefreshSelector: () => void;
  /** 기록 페이지 진입 시 기록 로드 */
  onLoadHistory: () => void;
  /** 새 페르소나 생성 시트 열기 (fab / emptyCreateBtn) */
  onOpenCreate: () => void;
}

export function switchPage(page: Page): void {
  $$('.page').forEach((p) => p.classList.remove('active'));
  $$('.nav-item').forEach((n) => n.classList.remove('active'));
  $(`#page-${page}`).classList.add('active');
  $(`#nav-${page}`).classList.add('active');

  const fab = $('#fab');
  if (page === 'personas') {
    fab.classList.remove('fab-hidden');
  } else {
    fab.classList.add('fab-hidden');
  }
  if (page !== 'personas') navHandlers?.onRefreshSelector();
  if (page === 'history') navHandlers?.onLoadHistory();
  window.scrollTo(0, 0);
}

let navHandlers: NavHandlers | null = null;

export function initNav(handlers: NavHandlers): void {
  navHandlers = handlers;

  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.dataset['page'] as Page | undefined;
      if (page) switchPage(page);
    });
  });

  $('#fab').addEventListener('click', () => handlers.onOpenCreate());
  $opt('#emptyCreateBtn')?.addEventListener('click', () => handlers.onOpenCreate());
}

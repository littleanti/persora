import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@/lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 최상위 에러 경계.
 * 렌더 중 예외가 던져져도 전체 화면이 백지로 사라지지 않도록 폴백 UI를 보여준다.
 * ("텍스트 에디터 클릭 시 UI가 꺼진다"류 증상의 안전망 — 주 원인인 백드롭 닫힘 버그와 별개.)
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 키/프롬프트가 콘솔에 남지 않도록 메시지 위주로만 기록.
    console.error('[Persora] render error:', error.message, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-2xl">!</div>
          <div>
            <p className="text-slate-800 font-semibold">{t('error.boundaryTitle')}</p>
            <p className="text-slate-500 text-sm mt-1">{t('error.boundaryDesc')}</p>
          </div>
          <button
            onClick={this.reset}
            className="px-5 py-2.5 rounded-full bg-wordrobe-gradient text-white font-semibold text-sm shadow-glow-sm active:scale-[.98] transition-all"
          >
            {t('error.boundaryRetry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

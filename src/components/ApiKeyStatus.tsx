import { useState } from 'react';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/useI18n';

export default function ApiKeyStatus() {
  const apiKey = useApp((s) => s.apiKey);
  const setApiKey = useApp((s) => s.setApiKey);
  const clearApiKey = useApp((s) => s.clearApiKey);
  const pushToast = useApp((s) => s.pushToast);
  const t = useT();

  const [editing, setEditing] = useState(false);
  const [next, setNext] = useState('');

  // 키가 없으면 온보딩 모달이 화면을 점유하므로 헤더 인디케이터는 렌더하지 않는다.
  if (!apiKey) return null;

  const save = () => {
    const trimmed = next.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    pushToast(t('toast.keySaved'), 'success');
    setEditing(false);
    setNext('');
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="password"
          autoFocus
          value={next}
          onChange={(e) => setNext(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="AIgo..."
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-32 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={() => save()}
          className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
        >
          {t('common.save')}
        </button>
        <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
          {t('common.cancel')}
        </button>
        <button
          onClick={() => {
            clearApiKey();
            pushToast(t('toast.keyDeleted'), 'success');
            setEditing(false);
            setNext('');
          }}
          className="text-red-400 hover:text-red-600 font-medium transition-colors"
        >
          {t('common.delete')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 hover:text-slate-700 transition-colors group text-xs text-slate-500"
      title={t('onboarding.title')}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      <span className="group-hover:text-slate-700 transition-colors font-medium whitespace-nowrap">{t('status.ready')}</span>
    </button>
  );
}

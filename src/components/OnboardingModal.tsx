import { useState } from 'react';
import { GEMINI_API_KEY_HELP_URL } from '@/lib/config';
import { validateKey } from '@/lib/gemini';
import { APP_LOGO_SRC } from '@/lib/assets';
import { looksLikeKey } from '@/lib/repos/settingsRepo';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/useI18n';

export default function OnboardingModal({ onSkip }: { onSkip?: () => void }) {
  const apiKey = useApp((s) => s.apiKey);
  const setApiKey = useApp((s) => s.setApiKey);
  const pushToast = useApp((s) => s.pushToast);
  const t = useT();

  const [key, setKey] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (apiKey) return null;

  const onSubmit = async () => {
    const trimmed = key.trim();
    if (!looksLikeKey(trimmed)) {
      pushToast(t('toast.invalidKeyFormat'), 'error');
      return;
    }
    if (!agreed) {
      pushToast(t('toast.confirmLocalOnly'), 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await validateKey(trimmed);
      if (!result.ok) {
        pushToast(result.error ?? t('toast.keyValidateFail'), 'error');
        return;
      }
      setApiKey(trimmed);
      pushToast(t('toast.keySaved'), 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-300/15 blur-3xl" />
      </div>

      <div className="relative max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-soft-lg animate-fade-in">
        <div className="text-center mb-8">
          <img src={APP_LOGO_SRC} alt="" className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover" />
          <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('apikey.welcomeTitle')}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{t('apikey.welcomeDesc')}</p>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{t('apikey.intro').replace(/<[^>]*>/g, '')}</p>

        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-500 mb-2">{t('apikey.keyLabel')}</label>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="AIza..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onSubmit();
            }}
            className="w-full bg-slate-50 border-[1.5px] border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <a
          href={GEMINI_API_KEY_HELP_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full mt-2 mb-6 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {t('apikey.helpCta')}
        </a>

        <label className="flex items-start gap-3 mb-6 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-indigo-500"
          />
          <span className="leading-relaxed">{t('apikey.consent')}</span>
        </label>

        <button
          onClick={() => void onSubmit()}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-wordrobe-gradient text-white font-semibold text-sm shadow-glow hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('loading.checkingKey') : t('btn.saveKey')}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            {t('btn.later')}
          </button>
        )}
      </div>
    </div>
  );
}

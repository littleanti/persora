import { useEffect, useMemo, useState } from 'react';
import type { AnalysisRecord, PersonaSummary } from '@/lib/types';
import { REPLY_INTENTS } from '@/lib/types';
import { analyzeReply } from '@/lib/analysis';
import { listPersonaSummaries } from '@/lib/persona';
import { detectTarget, parseThread } from '@/lib/thread';
import { useApp } from '@/lib/store';
import { useLocale, useT } from '@/lib/useI18n';

const CUSTOM = '__custom__';

export default function AnalyzePage() {
  const selectedPersonaId = useApp((s) => s.selectedPersonaId);
  const setSelectedPersonaId = useApp((s) => s.setSelectedPersonaId);
  const apiKey = useApp((s) => s.apiKey);
  const pushToast = useApp((s) => s.pushToast);
  const translate = useT();
  useLocale();

  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [thread, setThread] = useState('');
  const [intentKey, setIntentKey] = useState(''); // '' = 기본(공감), preset key, 또는 CUSTOM
  const [customIntent, setCustomIntent] = useState('');
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listPersonaSummaries();
      setPersonas(list);
      if (!selectedPersonaId && list[0]) setSelectedPersonaId(list[0].id);
    } catch {
      pushToast(translate('toast.loadPersonaFail'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  // 붙여넣은 스레드에서 답장할 대상(상대 마지막 메시지)을 실시간 검출해 표시.
  const targetPreview = useMemo(() => {
    if (!thread.trim() || !selectedPersona) return '';
    const parsed = parseThread(thread, { name: selectedPersona.name, myName: selectedPersona.my_name });
    return detectTarget(parsed);
  }, [thread, selectedPersona]);

  // analyzeReply에 넘길 의도 문자열: preset이면 키, custom이면 입력 텍스트, 기본이면 ''.
  const intentValue = intentKey === CUSTOM ? customIntent.trim() : intentKey;

  const onAnalyze = async () => {
    if (!selectedPersonaId) {
      pushToast(translate('toast.selectPersona'), 'error');
      return;
    }
    if (!thread.trim()) {
      pushToast(translate('toast.enterMessage'), 'error');
      return;
    }
    if (!apiKey) {
      pushToast(translate('status.noKey'), 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const next = await analyzeReply(selectedPersonaId, { thread: thread.trim(), intent: intentValue });
      setResult(next);
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : translate('toast.analyzeFail');
      pushToast(msg, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(translate('btn.copied'), 'success');
    } catch {
      pushToast(translate('toast.copyFail'), 'error');
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {personas.length === 0 && !loading && (
        <div className="rounded-2xl px-4 py-3 bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700">{translate('analyze.noPersonaHint').replace(/<[^>]*>/g, '')}</p>
        </div>
      )}

      <div>
        <h1 className="text-lg font-bold text-slate-900">{translate('nav.analyze')}</h1>
        <p className="text-sm text-slate-500 mt-1">{translate('analyze.threadHint')}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate('analyze.selectPersona')}</p>
        {loading ? (
          <p className="text-sm text-slate-400 py-3">{translate('common.loading')}</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {personas.map((persona) => {
              const active = selectedPersonaId === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-avatar-gradient text-white text-xs font-bold flex items-center justify-center">
                    {persona.name[0]?.toUpperCase() ?? '?'}
                  </span>
                  {persona.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 최근 대화 스레드 입력 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate('analyze.threadLabel')}</p>
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-soft-sm">
          <textarea
            value={thread}
            onChange={(e) => setThread(e.target.value)}
            rows={7}
            placeholder={translate('analyze.threadPlaceholder')}
            className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
          />
          <div className="px-4 pb-3 pt-1 border-t border-slate-100">
            {targetPreview ? (
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-indigo-600">{translate('analyze.target')}</span>{' '}
                <span className="text-slate-700">"{targetPreview.length > 60 ? `${targetPreview.slice(0, 60)}…` : targetPreview}"</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400">{translate('analyze.targetEmpty')}</p>
            )}
          </div>
        </div>
      </div>

      {/* 답장 의도 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate('analyze.intentLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {[{ key: '', labelKey: 'intent.none' }, ...REPLY_INTENTS, { key: CUSTOM, labelKey: 'intent.custom' }].map((opt) => {
            const active = intentKey === opt.key;
            return (
              <button
                key={opt.key || 'none'}
                onClick={() => setIntentKey(opt.key)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  active
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                }`}
              >
                {translate(opt.labelKey)}
              </button>
            );
          })}
        </div>
        {intentKey === CUSTOM && (
          <input
            value={customIntent}
            onChange={(e) => setCustomIntent(e.target.value)}
            placeholder={translate('intent.customPlaceholder')}
            className="w-full bg-white border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400 truncate">
          {selectedPersona ? `${selectedPersona.name} · Gemini` : 'Gemini'}
        </p>
        <button
          onClick={() => void onAnalyze()}
          disabled={analyzing || personas.length === 0 || !apiKey || !thread.trim() || (intentKey === CUSTOM && !customIntent.trim())}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-wordrobe-gradient shadow-glow-sm disabled:opacity-40 disabled:shadow-none transition-all hover:opacity-90 active:scale-[.98]"
        >
          {analyzing ? translate('loading.analyzing') : translate('btn.analyze')}
        </button>
      </div>

      {analyzing && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm border border-slate-200 px-4 py-3 bg-white shadow-soft-sm">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">{translate('analyze.aiLabel')}</p>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{result.analysis}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate('analyze.candidatesTitle')}</p>
            {result.candidates.map((candidate, index) => (
              <div key={index} className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-soft-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-wordrobe-gradient text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">{candidate.label || translate('common.candidateN', { n: index + 1 })}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    <strong className="text-slate-700">{translate('history.reason')}</strong> {candidate.reason}
                  </p>
                  <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{candidate.response}</p>
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => void onCopy(candidate.response)}
                      className="text-xs text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {translate('btn.copy')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

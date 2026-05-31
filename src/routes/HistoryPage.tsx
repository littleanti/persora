import { useEffect, useState } from 'react';
import type { AnalysisRecord } from '@/lib/types';
import { listAnalyses, removeAnalysis } from '@/lib/analysis';
import { formatDate } from '@/lib/dom';
import { useApp } from '@/lib/store';
import { useLocale, useT } from '@/lib/useI18n';

export default function HistoryPage() {
  const pushToast = useApp((s) => s.pushToast);
  const translate = useT();
  useLocale();

  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRecords(await listAnalyses());
    } catch {
      pushToast(translate('toast.loadHistoryFail'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm(translate('confirm.deleteHistory'))) return;
    try {
      await removeAnalysis(id);
      setRecords((current) => current.filter((record) => record.id !== id));
      pushToast(translate('toast.historyDeleted'), 'success');
    } catch {
      pushToast(translate('toast.deleteFail'), 'error');
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{translate('nav.history')}</h1>
        <p className="text-sm text-slate-500 mt-1">{translate('history.candidatesTitle')}</p>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-8">{translate('common.loading')}</p>}

      {!loading && records.length === 0 && (
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
          <p className="text-slate-600 text-sm font-medium">{translate('history.empty')}</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="space-y-3">
          {records.map((record) => {
            const isOpen = expanded === record.id;
            const preview = record.message.length > 55 ? `${record.message.slice(0, 55)}...` : record.message;
            return (
              <div key={record.id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-soft-sm">
                <button
                  onClick={() => setExpanded(isOpen ? null : record.id)}
                  className="w-full px-4 py-4 text-left flex items-start gap-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-indigo-600 mb-1">{record.persona_name}</p>
                    <p className="text-sm text-slate-800 truncate">"{preview}"</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(record.created_at)}</p>
                  </div>
                  <svg viewBox="0 0 24 24" className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-4 animate-fade-in">
                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">{translate('analyze.aiLabel')}</p>
                      <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{record.analysis}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{translate('history.candidatesTitle')}</p>
                      {record.candidates.map((candidate, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 overflow-hidden">
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
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => void onDelete(record.id)}
                      className="w-full py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-500 text-sm font-semibold transition-all active:scale-[.98]"
                    >
                      {translate('history.deleteBtn')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

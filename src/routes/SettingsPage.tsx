import { useRef, useState } from 'react';
import { clearAllLocalAppData, downloadBackup, exportAppData, importAppData } from '@/lib/dataManagement';
import { useApp } from '@/lib/store';
import { useLocale, useT } from '@/lib/useI18n';

export default function SettingsPage() {
  const pushToast = useApp((s) => s.pushToast);
  const refreshApiKey = useApp((s) => s.refreshApiKey);
  const setSelectedPersonaId = useApp((s) => s.setSelectedPersonaId);
  const translate = useT();
  useLocale();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | 'clear' | null>(null);

  const onExport = async () => {
    setBusy('export');
    try {
      downloadBackup(await exportAppData());
      pushToast(translate('settings.toastExported'), 'success');
    } catch {
      pushToast(translate('settings.toastExportFailed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy('import');
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const result = await importAppData(parsed);
      pushToast(
        translate('settings.toastImported', {
          personas: result.personas,
          analyses: result.analyses,
          drafts: result.drafts,
        }),
        'success',
      );
    } catch {
      pushToast(translate('settings.toastImportFailed'), 'error');
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onClearAll = async () => {
    if (!window.confirm(translate('settings.confirmClearAll'))) return;
    setBusy('clear');
    try {
      await clearAllLocalAppData();
      setSelectedPersonaId(null);
      refreshApiKey();
      pushToast(translate('settings.toastCleared'), 'success');
    } catch {
      pushToast(translate('settings.toastClearFailed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{translate('nav.settings')}</h1>
        <p className="text-sm text-slate-500 mt-1">{translate('settings.subtitle')}</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-soft-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">{translate('settings.dataTitle')}</p>
          <p className="text-xs text-slate-500 mt-1">{translate('settings.dataDesc')}</p>
        </div>
        <div className="p-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void onExport()}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-50"
          >
            <span aria-hidden="true">↓</span>
            {busy === 'export' ? translate('common.saving') : translate('settings.exportBtn')}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-white disabled:opacity-50"
          >
            <span aria-hidden="true">↑</span>
            {busy === 'import' ? translate('common.loading') : translate('settings.importBtn')}
          </button>
          <button
            type="button"
            onClick={() => void onClearAll()}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            <span aria-hidden="true">×</span>
            {busy === 'clear' ? translate('common.loading') : translate('settings.clearBtn')}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-soft-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">{translate('settings.privacyTitle')}</p>
          <p className="text-xs text-slate-500 mt-1">{translate('settings.privacyDesc')}</p>
        </div>
        <div className="p-4 space-y-3">
          {[
            'settings.privacyLocal',
            'settings.privacyGemini',
            'settings.privacyKey',
            'settings.privacyLoss',
            'settings.privacyConsent',
          ].map((key) => (
            <div key={key} className="flex gap-3 text-sm leading-relaxed text-slate-600">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <p>{translate(key)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-sm font-semibold text-amber-800">{translate('settings.disclaimerTitle')}</p>
        <p className="text-xs leading-relaxed text-amber-700 mt-1">{translate('settings.disclaimerDesc')}</p>
      </div>
    </section>
  );
}

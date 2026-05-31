import { useApp } from '@/lib/store';

export default function ToastContainer() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);

  return (
    <div className="fixed bottom-24 right-4 flex flex-col gap-2 z-50 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-soft-lg text-sm text-left transition-all bg-slate-800 text-white"
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              toast.tone === 'error'
                ? 'bg-red-400'
                : toast.tone === 'success'
                  ? 'bg-emerald-400'
                  : 'bg-slate-400'
            }`}
          />
          <span className="break-words">{toast.message}</span>
        </button>
      ))}
    </div>
  );
}

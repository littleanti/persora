import { setLang, type Lang } from '@/lib/i18n';
import { useLocale } from '@/lib/useI18n';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'ko', label: '한' },
  { value: 'en', label: 'EN' },
];

export default function LanguageToggle() {
  const locale = useLocale();

  return (
    <div
      className="flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold shadow-soft-sm"
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setLang(opt.value)}
            aria-pressed={active}
            className={`px-2.5 py-1 rounded-full leading-none transition-colors ${
              active ? 'bg-wordrobe-gradient text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

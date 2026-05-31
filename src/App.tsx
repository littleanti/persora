import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ApiKeyStatus from '@/components/ApiKeyStatus';
import LanguageToggle from '@/components/LanguageToggle';
import OnboardingModal from '@/components/OnboardingModal';
import ToastContainer from '@/components/Toast';
import AnalyzePage from '@/routes/AnalyzePage';
import HistoryPage from '@/routes/HistoryPage';
import PersonaPage from '@/routes/PersonaPage';
import { initDB } from '@/lib/db';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/useI18n';

const tabs = [
  {
    to: '/personas',
    labelKey: 'nav.personas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: '/analyze',
    labelKey: 'nav.analyze',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
  },
  {
    to: '/history',
    labelKey: 'nav.history',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
];

export default function App() {
  const apiKey = useApp((s) => s.apiKey);
  const pushToast = useApp((s) => s.pushToast);
  const t = useT();

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  useEffect(() => {
    initDB().catch(() => pushToast(t('err.dbOpen'), 'error'));
  }, [pushToast, t]);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      <header className="px-5 py-3 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/app-logo.png" alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          <span className="font-semibold tracking-tight text-slate-900 truncate">{t('app.title')}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ApiKeyStatus />
          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<Navigate to="/personas" replace />} />
          <Route path="/personas" element={<PersonaPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,.06)]">
        <div className="flex items-stretch max-w-lg mx-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-all ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'scale-110 transition-transform' : 'transition-transform'}>
                    {tab.icon}
                  </span>
                  <span>{t(tab.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {!apiKey && <OnboardingModal />}
      <ToastContainer />
    </div>
  );
}

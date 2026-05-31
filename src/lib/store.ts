import { create } from 'zustand';
import { getApiKey, setApiKey as persistApiKey, clearApiKey as clearPersistedApiKey } from '@/lib/repos/settingsRepo';

export interface ToastEntry {
  id: number;
  message: string;
  tone: 'info' | 'error' | 'success';
}

interface AppState {
  apiKey: string;
  selectedPersonaId: string | null;
  toasts: ToastEntry[];
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  refreshApiKey: () => void;
  setSelectedPersonaId: (id: string | null) => void;
  pushToast: (message: string, tone?: ToastEntry['tone']) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

export const useApp = create<AppState>((set, get) => ({
  apiKey: getApiKey() ?? '',
  selectedPersonaId: null,
  toasts: [],

  setApiKey: (key) => {
    persistApiKey(key);
    set({ apiKey: key });
  },

  clearApiKey: () => {
    clearPersistedApiKey();
    set({ apiKey: '' });
  },

  refreshApiKey: () => {
    set({ apiKey: getApiKey() ?? '' });
  },

  setSelectedPersonaId: (id) => set({ selectedPersonaId: id }),

  pushToast: (message, tone = 'info') => {
    const id = toastSeq++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    window.setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id) => {
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
  },
}));

export function hasApiKey(): boolean {
  return useApp.getState().apiKey.trim().length > 0;
}

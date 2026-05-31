import { STORE_ANALYSES, STORE_PERSONAS } from '@/lib/config';
import { initDB } from '@/lib/db';
import { clearAllThreadDrafts, importThreadDrafts, listThreadDrafts } from '@/lib/drafts';
import { clearApiKey } from '@/lib/repos/settingsRepo';
import { analysisRepo } from '@/lib/repos/analysisRepo';
import { personaRepo } from '@/lib/repos/personaRepo';
import type { AnalysisRecord, PersonaRecord } from '@/lib/types';

export interface PersoraBackup {
  app: 'persora';
  version: 1;
  exported_at: string;
  personas: PersonaRecord[];
  analyses: AnalysisRecord[];
  drafts: Record<string, string>;
}

export interface ImportResult {
  personas: number;
  analyses: number;
  drafts: number;
}

export async function exportAppData(): Promise<PersoraBackup> {
  return {
    app: 'persora',
    version: 1,
    exported_at: new Date().toISOString(),
    personas: await personaRepo.list(),
    analyses: await analysisRepo.list(),
    drafts: listThreadDrafts(),
  };
}

export function downloadBackup(data: PersoraBackup): void {
  const date = data.exported_at.slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `persora-backup-${date}.json`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importAppData(raw: unknown): Promise<ImportResult> {
  const data = parseBackup(raw);
  await putBackupRecords(data.personas, data.analyses);
  importThreadDrafts(data.drafts);
  return {
    personas: data.personas.length,
    analyses: data.analyses.length,
    drafts: Object.keys(data.drafts).length,
  };
}

export async function clearAllLocalAppData(): Promise<void> {
  clearApiKey();
  clearAllThreadDrafts();
  await clearStores();
}

function parseBackup(raw: unknown): PersoraBackup {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file');
  }

  const data = raw as Partial<PersoraBackup>;
  if (data.app !== 'persora' || data.version !== 1) {
    throw new Error('Unsupported backup file');
  }

  if (!Array.isArray(data.personas) || !Array.isArray(data.analyses)) {
    throw new Error('Backup file is missing data arrays');
  }

  const drafts = data.drafts && typeof data.drafts === 'object' && !Array.isArray(data.drafts)
    ? (data.drafts as Record<string, string>)
    : {};

  return {
    app: 'persora',
    version: 1,
    exported_at: typeof data.exported_at === 'string' ? data.exported_at : new Date().toISOString(),
    personas: data.personas,
    analyses: data.analyses,
    drafts,
  };
}

async function putBackupRecords(personas: PersonaRecord[], analyses: AnalysisRecord[]): Promise<void> {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PERSONAS, STORE_ANALYSES], 'readwrite');
    const personaStore = tx.objectStore(STORE_PERSONAS);
    const analysisStore = tx.objectStore(STORE_ANALYSES);

    personas.forEach((record) => personaStore.put(record));
    analyses.forEach((record) => analysisStore.put(record));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to import backup'));
    tx.onabort = () => reject(tx.error ?? new Error('Import was aborted'));
  });
}

async function clearStores(): Promise<void> {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PERSONAS, STORE_ANALYSES], 'readwrite');
    tx.objectStore(STORE_PERSONAS).clear();
    tx.objectStore(STORE_ANALYSES).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear local data'));
    tx.onabort = () => reject(tx.error ?? new Error('Clear was aborted'));
  });
}

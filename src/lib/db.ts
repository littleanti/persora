// IndexedDB 데이터 계층.
// 페르소나/분석 기록은 서버가 아닌 이 브라우저에만 저장된다.
import { DB_NAME, DB_VERSION, STORE_PERSONAS, STORE_ANALYSES } from '../config';
import type { PersonaRecord, AnalysisRecord } from '../types';

let dbPromise: Promise<IDBDatabase> | null = null;

/** DB 연결을 1회 열고 재사용한다. */
export function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PERSONAS)) {
        const store = db.createObjectStore(STORE_PERSONAS, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ANALYSES)) {
        const store = db.createObjectStore(STORE_ANALYSES, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open 실패'));
  });

  return dbPromise;
}

/** IDBRequest를 Promise로 감싼다. */
function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 요청 실패'));
  });
}

/** 쓰기 트랜잭션 완료를 보장한다. */
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await initDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result: T;
    Promise.resolve(fn(store)).then((r) => {
      result = r;
    }, reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB 트랜잭션 실패'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB 트랜잭션 중단'));
  });
}

/** created_at 내림차순 정렬(최신 우선). */
function sortByCreatedDesc<T extends { created_at: string }>(rows: T[]): T[] {
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

// ── Personas ──────────────────────────────────────────────────────────────

export function putPersona(p: PersonaRecord): Promise<void> {
  return withStore(STORE_PERSONAS, 'readwrite', (store) => {
    store.put(p);
  });
}

export async function getPersona(id: string): Promise<PersonaRecord | null> {
  const db = await initDB();
  const tx = db.transaction(STORE_PERSONAS, 'readonly');
  const result = await promisifyRequest(tx.objectStore(STORE_PERSONAS).get(id));
  return (result as PersonaRecord | undefined) ?? null;
}

export async function listPersonas(): Promise<PersonaRecord[]> {
  const db = await initDB();
  const tx = db.transaction(STORE_PERSONAS, 'readonly');
  const rows = await promisifyRequest(tx.objectStore(STORE_PERSONAS).getAll());
  return sortByCreatedDesc(rows as PersonaRecord[]);
}

export function deletePersona(id: string): Promise<void> {
  return withStore(STORE_PERSONAS, 'readwrite', (store) => {
    store.delete(id);
  });
}

// ── Analyses ──────────────────────────────────────────────────────────────

export function putAnalysis(a: AnalysisRecord): Promise<void> {
  return withStore(STORE_ANALYSES, 'readwrite', (store) => {
    store.put(a);
  });
}

export async function listAnalyses(): Promise<AnalysisRecord[]> {
  const db = await initDB();
  const tx = db.transaction(STORE_ANALYSES, 'readonly');
  const rows = await promisifyRequest(tx.objectStore(STORE_ANALYSES).getAll());
  return sortByCreatedDesc(rows as AnalysisRecord[]);
}

export function deleteAnalysis(id: string): Promise<void> {
  return withStore(STORE_ANALYSES, 'readwrite', (store) => {
    store.delete(id);
  });
}

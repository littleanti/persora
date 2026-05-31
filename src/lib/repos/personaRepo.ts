import { STORE_PERSONAS } from '@/lib/config';
import type { PersonaRecord } from '@/lib/types';
import { initDB, promisifyRequest, sortByCreatedDesc, withStore } from '@/lib/db';

export const personaRepo = {
  put(record: PersonaRecord): Promise<void> {
    return withStore(STORE_PERSONAS, 'readwrite', (store) => {
      store.put(record);
    });
  },

  async get(id: string): Promise<PersonaRecord | null> {
    const db = await initDB();
    const tx = db.transaction(STORE_PERSONAS, 'readonly');
    const result = await promisifyRequest(tx.objectStore(STORE_PERSONAS).get(id));
    return (result as PersonaRecord | undefined) ?? null;
  },

  async list(): Promise<PersonaRecord[]> {
    const db = await initDB();
    const tx = db.transaction(STORE_PERSONAS, 'readonly');
    const rows = await promisifyRequest(tx.objectStore(STORE_PERSONAS).getAll());
    return sortByCreatedDesc(rows as PersonaRecord[]);
  },

  remove(id: string): Promise<void> {
    return withStore(STORE_PERSONAS, 'readwrite', (store) => {
      store.delete(id);
    });
  },
};
